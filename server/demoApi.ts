/**
 * SchemeSaathi account server, mounted into the Vite dev/preview server.
 *
 *   - accounts, sessions, saved schemes, applications, notifications and a login log live in PostgreSQL (server/db.ts)
 *   - passwords are stored only as salted PBKDF2-SHA256 hashes; session tokens only as SHA-256 hashes
 *   - /db-viewer shows login details after signing in with a PostgreSQL role (read-only viewer role)
 *
 * This is a prototype stand-in. For production add HTTPS, OTP-based recovery and edge rate limiting
 * behind the same routes.
 */
import { createHash, pbkdf2Sync, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import type { Plugin, Connect } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type pg from 'pg';
import { TRANSLATABLE, chat, rateLimited, speak, translateBatch, understand, type AIConfig } from './aiService';
import { database, importJsonDb, migrate, viewerClient, type DbConfig } from './db';

const SESSION_DAYS = 30;

type Json = Record<string, unknown>;
interface UserRow {
  id: string;
  full_name: string;
  username: string;
  email: string;
  mobile: string;
  password_hash: string;
  salt: string;
  category: string;
  state: string;
  district: string;
  preferred_lang: string;
  gender: string | null;
  details: Json;
  registered_at: Date;
  updated_at: Date;
}

/* ---------------- passwords & tokens ---------------- */
function hash(password: string, salt: string) {
  return pbkdf2Sync(password, salt, 120_000, 32, 'sha256').toString('hex');
}
function checkPassword(u: UserRow, password: string) {
  const a = Buffer.from(hash(password, u.salt), 'hex');
  const b = Buffer.from(u.password_hash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}
const tokenHash = (t: string) => createHash('sha256').update(t).digest('hex');

/* ---------------- data access ---------------- */
async function insertUser(db: pg.Pool, u: { fullName: string; username: string; email: string; mobile: string; password: string; category: string; state: string; district: string; preferredLang: string; gender?: string; details: Json }) {
  const salt = randomBytes(16).toString('hex');
  const id = randomUUID();
  await db.query(
    `INSERT INTO users (id, full_name, username, email, mobile, password_hash, salt, category, state, district, preferred_lang, gender, details)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [id, u.fullName, u.username, u.email, u.mobile, hash(u.password, salt), salt, u.category, u.state, u.district, u.preferredLang, u.gender ?? null, u.details],
  );
  return id;
}

/** Replaces the saved schemes / checklist / applications / notifications that are present in `data`. */
async function saveData(db: pg.Pool, userId: string, data: Json) {
  const c = await db.connect();
  try {
    await c.query('BEGIN');
    if (Array.isArray(data.saved)) {
      await c.query('DELETE FROM saved_schemes WHERE user_id = $1', [userId]);
      const ids = [...new Set((data.saved as unknown[]).map(String))].slice(0, 200);
      for (const [i, id] of ids.entries()) await c.query('INSERT INTO saved_schemes (user_id, scheme_id, position) VALUES ($1,$2,$3)', [userId, id.slice(0, 60), i]);
    }
    if (data.checklist && typeof data.checklist === 'object') {
      await c.query('DELETE FROM document_checklists WHERE user_id = $1', [userId]);
      for (const [id, done] of Object.entries(data.checklist as Json).slice(0, 200))
        await c.query('INSERT INTO document_checklists (user_id, scheme_id, done_items) VALUES ($1,$2,$3)', [userId, id.slice(0, 60), JSON.stringify(Array.isArray(done) ? done : [])]);
    }
    if (data.applications && typeof data.applications === 'object') {
      await c.query('DELETE FROM applications WHERE user_id = $1', [userId]);
      for (const a of Object.values(data.applications as Record<string, Json>).slice(0, 200))
        await c.query('INSERT INTO applications (user_id, scheme_id, applied_on, reference, status, updated_at, history) VALUES ($1,$2,$3,$4,$5,$6,$7)', [
          userId,
          String(a.schemeId).slice(0, 60),
          String(a.appliedOn).slice(0, 10),
          a.reference ? String(a.reference).slice(0, 80) : null,
          String(a.status).slice(0, 30),
          String(a.updatedAt),
          JSON.stringify(Array.isArray(a.history) ? a.history.slice(-50) : []),
        ]);
    }
    if (Array.isArray(data.notices)) {
      await c.query('DELETE FROM notifications WHERE user_id = $1', [userId]);
      for (const n of (data.notices as Json[]).slice(0, 50))
        await c.query('INSERT INTO notifications (id, user_id, scheme_id, status, created_at, read) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING', [String(n.id).slice(0, 80), userId, String(n.schemeId).slice(0, 60), String(n.status).slice(0, 30), String(n.at), !!n.read]);
    }
    await c.query('COMMIT');
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
  }
}

/** The account shape the website expects (never includes the hash or salt). */
async function loadAccount(db: pg.Pool, userId: string) {
  const u = (await db.query<UserRow>('SELECT * FROM users WHERE id = $1', [userId])).rows[0];
  if (!u) return null;
  const [saved, checklists, apps, notes] = await Promise.all([
    db.query('SELECT scheme_id FROM saved_schemes WHERE user_id = $1 ORDER BY position', [userId]),
    db.query('SELECT scheme_id, done_items FROM document_checklists WHERE user_id = $1', [userId]),
    db.query("SELECT scheme_id, to_char(applied_on, 'YYYY-MM-DD') AS applied_on, reference, status, updated_at, history FROM applications WHERE user_id = $1", [userId]),
    db.query('SELECT id, scheme_id, status, created_at, read FROM notifications WHERE user_id = $1 ORDER BY created_at DESC', [userId]),
  ]);
  return {
    id: u.id,
    fullName: u.full_name,
    username: u.username,
    email: u.email,
    mobile: u.mobile,
    category: u.category,
    state: u.state,
    district: u.district,
    preferredLang: u.preferred_lang,
    gender: u.gender ?? undefined,
    details: u.details,
    registeredAt: u.registered_at.toISOString(),
    updatedAt: u.updated_at.toISOString(),
    data: {
      saved: saved.rows.map((r) => r.scheme_id),
      checklist: Object.fromEntries(checklists.rows.map((r) => [r.scheme_id, r.done_items])),
      applications: Object.fromEntries(
        apps.rows.map((r) => [r.scheme_id, { schemeId: r.scheme_id, appliedOn: r.applied_on, reference: r.reference ?? undefined, status: r.status, updatedAt: new Date(r.updated_at).toISOString(), history: r.history }]),
      ),
      notices: notes.rows.map((r) => ({ id: r.id, schemeId: r.scheme_id, status: r.status, at: new Date(r.created_at).toISOString(), read: r.read })),
    },
  };
}

async function newSession(db: pg.Pool, userId: string) {
  const token = randomBytes(32).toString('hex');
  await db.query("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, now() + make_interval(days => $3))", [tokenHash(token), userId, SESSION_DAYS]);
  return token;
}
async function userIdFromAuth(db: pg.Pool, req: Req) {
  const m = /^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization ?? '');
  if (!m) return null;
  const r = await db.query('SELECT user_id FROM sessions WHERE token_hash = $1 AND expires_at > now()', [tokenHash(m[1])]);
  return (r.rows[0]?.user_id as string | undefined) ?? null;
}
function logEvent(db: pg.Pool, req: Req, e: { userId?: string | null; identifier: string; event: string; success: boolean; reason?: string }) {
  return db
    .query('INSERT INTO login_events (user_id, identifier, event, success, reason, ip, user_agent) VALUES ($1,$2,$3,$4,$5,$6,$7)', [
      e.userId ?? null,
      e.identifier.slice(0, 120),
      e.event,
      e.success,
      e.reason ?? null,
      req.socket.remoteAddress ?? null,
      String(req.headers['user-agent'] ?? '').slice(0, 300),
    ])
    .catch(() => undefined);
}

let prepared: Promise<pg.Pool> | null = null;
function ready(cfg: DbConfig) {
  prepared ??= database(cfg)
    .then(async (db) => {
      await migrate(db, cfg);
      const n = await importJsonDb(db, (id, data) => saveData(db, id, data));
      if (n) console.log(`[schemesaathi] imported ${n} account(s) from server-data/db.json into PostgreSQL`);
      return db;
    })
    .catch((e) => {
      prepared = null;
      console.error('[schemesaathi] PostgreSQL is not available:', e instanceof Error ? e.message : e);
      throw e;
    });
  return prepared;
}

/* ---------------- translation with a PostgreSQL cache ---------------- */
const memoryTranslations = new Map<string, string>();
async function translate(ai: AIConfig, cfg: DbConfig, b: Json) {
  const lang = String(b.lang ?? '');
  if (!TRANSLATABLE.includes(lang) || !Array.isArray(b.texts)) throw new Error('invalid');
  const texts = (b.texts as unknown[]).slice(0, 120).map((x) => String(x ?? '').slice(0, 3000));
  const key = (t: string) => createHash('sha256').update(t).digest('hex');
  const db = await ready(cfg).catch(() => null);
  const out: (string | null)[] = texts.map((t) => memoryTranslations.get(`${lang}:${key(t)}`) ?? null);
  if (db) {
    const missing = texts.filter((_, i) => out[i] === null).map(key);
    if (missing.length) {
      const rows = (await db.query('SELECT source_hash, translated FROM translations WHERE lang = $1 AND source_hash = ANY($2)', [lang, missing])).rows;
      const hit = new Map(rows.map((r) => [r.source_hash as string, r.translated as string]));
      texts.forEach((t, i) => out[i] ??= hit.get(key(t)) ?? null);
    }
  }
  // translate what is still missing: chunks of 20 strings, sent to Gemini in parallel
  const todo = [...new Set(texts.filter((t, i) => out[i] === null && /[A-Za-z]/.test(t)))];
  const chunks = Array.from({ length: Math.ceil(todo.length / 20) }, (_, i) => todo.slice(i * 20, i * 20 + 20));
  const results = await Promise.all(chunks.map((chunk) => translateBatch(ai, lang, chunk).catch(() => chunk.map(() => null))));
  for (const [ci, chunk] of chunks.entries()) {
    const res = results[ci];
    for (const [j, src] of chunk.entries()) {
      const tr = res[j];
      if (!tr) continue;
      memoryTranslations.set(`${lang}:${key(src)}`, tr);
      if (db) await db.query('INSERT INTO translations (lang, source_hash, source, translated, engine) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING', [lang, key(src), src, tr, 'gemini']).catch((e) => console.error('[translate cache]', e instanceof Error ? e.message : e));
      texts.forEach((t, k) => t === src && (out[k] = tr));
    }
  }
  return { translations: out };
}

/* ---------------- helpers ---------------- */
type Req = IncomingMessage & { body?: unknown };

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}
async function readBody(req: Req): Promise<Json> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const c of req) {
    size += (c as Buffer).length;
    if (size > 4_500_000) throw new Error('too large'); // allows a ~30 s voice clip (base64)
    chunks.push(c as Buffer);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? (JSON.parse(raw) as Json) : {};
}
const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const isLocal = (req: Req) => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress ?? '');

const USERNAME = /^[A-Za-z0-9_]{3,20}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MOBILE = /^[6-9]\d{9}$/;
const PASSWORD = /^(?=.*[A-Za-z])(?=.*\d).{8,64}$/;

/* ---------------- /db-viewer: login details, authenticated by PostgreSQL itself ---------------- */
const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
function table(title: string, rows: Json[]) {
  if (!rows.length) return `<h2>${esc(title)}</h2><p class="empty">No rows yet.</p>`;
  const cols = Object.keys(rows[0]);
  const cell = (v: unknown) => (v instanceof Date ? v.toLocaleString('en-IN') : typeof v === 'object' && v !== null ? JSON.stringify(v) : v);
  return `<h2>${esc(title)} <small>(${rows.length})</small></h2><div class="wrap"><table><thead><tr>${cols.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows
    .map((r) => `<tr>${cols.map((c) => `<td class="${r[c] === false ? 'no' : r[c] === true ? 'yes' : ''}">${esc(cell(r[c]))}</td>`).join('')}</tr>`)
    .join('')}</tbody></table></div>`;
}
async function dbViewer(req: Req, res: ServerResponse, cfg: DbConfig) {
  if (!isLocal(req)) {
    res.statusCode = 403;
    return res.end('The database viewer is only available on this computer.');
  }
  const ask = () => {
    res.statusCode = 401;
    res.setHeader('WWW-Authenticate', 'Basic realm="SchemeSaathi PostgreSQL", charset="UTF-8"');
    res.end('Sign in with a PostgreSQL username and password (see .env.local).');
  };
  const m = /^Basic (.+)$/.exec(req.headers.authorization ?? '');
  if (!m) return ask();
  const [user, ...rest] = Buffer.from(m[1], 'base64').toString('utf8').split(':');
  let c: pg.Client;
  try {
    await ready(cfg);
    c = await viewerClient(cfg, user, rest.join(':'));
  } catch {
    return ask();
  }
  try {
    const q = async (sql: string) => (await c.query(sql)).rows as Json[];
    const [details, events, apps] = await Promise.all([
      q('SELECT * FROM login_details'),
      q('SELECT e.created_at, e.event, e.identifier, e.success, e.reason, e.ip, left(e.user_agent, 60) AS browser FROM login_events e ORDER BY e.id DESC LIMIT 100'),
      q('SELECT u.username, a.scheme_id, a.status, a.applied_on, a.reference, a.updated_at FROM applications a JOIN users u ON u.id = a.user_id ORDER BY a.updated_at DESC LIMIT 100'),
    ]);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SchemeSaathi database viewer</title>
<style>body{font:14px system-ui,sans-serif;margin:0;background:#f6f9fc;color:#1e293b}header{background:#173f86;color:#fff;padding:14px 20px}header p{margin:4px 0 0;color:#d9e4f5;font-size:13px}main{padding:16px 20px 40px}h2{font-size:17px;margin:24px 0 8px}small{color:#64748b;font-weight:normal}.wrap{overflow-x:auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px}table{border-collapse:collapse;width:100%;white-space:nowrap}th,td{padding:7px 10px;border-bottom:1px solid #f1f5f9;text-align:left}th{background:#eef3fb;color:#12306a;position:sticky;top:0}td.yes{color:#116637;font-weight:600}td.no{color:#b91c1c;font-weight:600}.empty{color:#64748b}</style></head><body>
<header><strong>SchemeSaathi · PostgreSQL</strong><p>Signed in as <b>${esc(user)}</b> · database <b>schemesaathi</b> · read-only view. Passwords are stored only as hashes and are never shown.</p></header>
<main>${table('Login details (one row per account)', details)}${table('Login events (latest 100)', events)}${table('Applications', apps)}</main></body></html>`);
  } catch (e) {
    res.statusCode = 500;
    res.end(`Query failed: ${esc(e instanceof Error ? e.message : e)}`);
  } finally {
    await c.end().catch(() => undefined);
  }
}

/* ---------------- routes ---------------- */
async function handle(req: Req, res: ServerResponse, next: () => void, ai: AIConfig, cfg: DbConfig) {
  const url = (req.url ?? '').split('?')[0];
  if (url === '/db-viewer') return dbViewer(req, res, cfg);
  if (!url.startsWith('/api/')) return next();
  try {
    const route = `${req.method} ${url}`;

    if (route === 'GET /api/health') {
      const db = await ready(cfg).catch(() => null);
      return send(res, db ? 200 : 503, { ok: !!db, database: db ? 'postgresql' : 'unavailable' });
    }

    /* AI (Gemini). The key stays on this server; the browser only sees answers. */
    if (route === 'GET /api/ai/status') return send(res, 200, { enabled: !!ai.apiKey });
    if (url.startsWith('/api/ai/')) {
      if (!ai.apiKey) return send(res, 503, { error: 'ai-disabled' });
      const limits: Record<string, number> = { '/api/ai/speak': 60, '/api/ai/translate': 240 };
      if (rateLimited(`${req.socket.remoteAddress ?? 'local'}:${url}`, limits[url] ?? 30)) return send(res, 429, { error: 'rate' });
      const b = await readBody(req);
      try {
        if (route === 'POST /api/ai/understand')
          return send(res, 200, await understand(ai, { text: typeof b.text === 'string' ? b.text.slice(0, 600) : undefined, audio: typeof b.audio === 'string' ? b.audio : undefined, mime: typeof b.mime === 'string' ? b.mime : undefined }, b.context));
        if (route === 'POST /api/ai/chat') return send(res, 200, await chat(ai, b));
        if (route === 'POST /api/ai/translate') return send(res, 200, await translate(ai, cfg, b));
        if (route === 'POST /api/ai/speak') {
          const audio = await speak(ai, String(b.text ?? ''));
          res.statusCode = 200;
          res.setHeader('Content-Type', 'audio/wav');
          res.setHeader('Cache-Control', 'no-store');
          return res.end(audio);
        }
      } catch {
        return send(res, 502, { error: 'ai-failed' });
      }
      return send(res, 404, { error: 'not found' });
    }

    let db: pg.Pool;
    try {
      db = await ready(cfg);
    } catch {
      return send(res, 503, { error: 'database' });
    }

    if (route === 'POST /api/register') {
      const b = await readBody(req);
      const username = str(b.username, 20);
      const email = str(b.email, 120).toLowerCase();
      const mobile = str(b.mobile, 10);
      const password = typeof b.password === 'string' ? b.password : '';
      if (!str(b.fullName) || !USERNAME.test(username) || !EMAIL.test(email) || !MOBILE.test(mobile) || !PASSWORD.test(password) || !str(b.category) || !str(b.state))
        return send(res, 400, { error: 'invalid' });
      if ((await db.query('SELECT 1 FROM users WHERE lower(username) = lower($1) OR lower(email) = $2', [username, email])).rowCount) {
        await logEvent(db, req, { identifier: username, event: 'register', success: false, reason: 'username or email taken' });
        return send(res, 409, { error: 'taken' });
      }
      const id = await insertUser(db, {
        fullName: str(b.fullName, 100), username, email, mobile, password,
        category: str(b.category, 20), state: str(b.state, 60), district: str(b.district, 60),
        preferredLang: str(b.preferredLang, 5) || 'en', gender: str(b.gender, 10) || undefined,
        details: (b.details as Json) ?? {},
      });
      if (b.data && typeof b.data === 'object') await saveData(db, id, b.data as Json);
      await db.query('UPDATE users SET last_login_at = now() WHERE id = $1', [id]);
      await logEvent(db, req, { userId: id, identifier: username, event: 'register', success: true });
      const token = await newSession(db, id);
      return send(res, 201, { token, user: await loadAccount(db, id) });
    }

    if (route === 'POST /api/login') {
      const b = await readBody(req);
      const identifier = str(b.identifier, 120);
      const u = (await db.query<UserRow>('SELECT * FROM users WHERE lower(username) = lower($1) OR lower(email) = lower($1)', [identifier])).rows[0];
      if (!u || !checkPassword(u, typeof b.password === 'string' ? b.password : '')) {
        await logEvent(db, req, { userId: u?.id, identifier, event: 'login', success: false, reason: u ? 'wrong password' : 'unknown user' });
        return send(res, 401, { error: 'credentials' });
      }
      await db.query('UPDATE users SET last_login_at = now() WHERE id = $1', [u.id]);
      await logEvent(db, req, { userId: u.id, identifier, event: 'login', success: true });
      const token = await newSession(db, u.id);
      return send(res, 200, { token, user: await loadAccount(db, u.id) });
    }

    if (route === 'POST /api/reset-password') {
      const b = await readBody(req);
      const identifier = str(b.identifier, 120);
      const password = typeof b.password === 'string' ? b.password : '';
      const u = (await db.query<UserRow>('SELECT * FROM users WHERE (lower(username) = lower($1) OR lower(email) = lower($1)) AND mobile = $2', [identifier, str(b.mobile, 10)])).rows[0];
      if (!u) {
        await logEvent(db, req, { identifier, event: 'password_reset', success: false, reason: 'no matching account' });
        return send(res, 404, { error: 'nomatch' });
      }
      if (!PASSWORD.test(password)) return send(res, 400, { error: 'invalid' });
      const salt = randomBytes(16).toString('hex');
      await db.query('UPDATE users SET salt = $1, password_hash = $2, updated_at = now() WHERE id = $3', [salt, hash(password, salt), u.id]);
      // sign out every existing session for this account
      await db.query('DELETE FROM sessions WHERE user_id = $1', [u.id]);
      await logEvent(db, req, { userId: u.id, identifier, event: 'password_reset', success: true });
      return send(res, 200, { ok: true });
    }

    const userId = await userIdFromAuth(db, req);
    if (url.startsWith('/api/me') && !userId) return send(res, 401, { error: 'session' });

    if (route === 'GET /api/me') return send(res, 200, { user: await loadAccount(db, userId!) });

    if (route === 'PATCH /api/me') {
      const b = await readBody(req);
      const sets: string[] = [];
      const vals: unknown[] = [];
      const set = (col: string, v: unknown) => {
        vals.push(v);
        sets.push(`${col} = $${vals.length}`);
      };
      if (b.fullName !== undefined && str(b.fullName, 100)) set('full_name', str(b.fullName, 100));
      if (b.email !== undefined) {
        const email = str(b.email, 120).toLowerCase();
        if (!EMAIL.test(email)) return send(res, 400, { error: 'invalid' });
        if ((await db.query('SELECT 1 FROM users WHERE lower(email) = $1 AND id <> $2', [email, userId])).rowCount) return send(res, 409, { error: 'taken' });
        set('email', email);
      }
      if (b.mobile !== undefined) {
        if (!MOBILE.test(str(b.mobile, 10))) return send(res, 400, { error: 'invalid' });
        set('mobile', str(b.mobile, 10));
      }
      const cols = { category: 'category', state: 'state', district: 'district', preferredLang: 'preferred_lang', gender: 'gender' } as const;
      for (const [k, col] of Object.entries(cols)) if (b[k] !== undefined) set(col, str(b[k], 60) || (k === 'gender' ? null : ''));
      if (b.details && typeof b.details === 'object') set('details', b.details);
      if (sets.length) {
        vals.push(userId);
        await db.query(`UPDATE users SET ${sets.join(', ')}, updated_at = now() WHERE id = $${vals.length}`, vals);
      }
      if (b.data && typeof b.data === 'object') await saveData(db, userId!, b.data as Json);
      return send(res, 200, { user: await loadAccount(db, userId!) });
    }

    if (route === 'POST /api/me/logout') {
      const token = (req.headers.authorization ?? '').slice(7);
      await db.query('DELETE FROM sessions WHERE token_hash = $1', [tokenHash(token)]);
      const u = (await db.query('SELECT username FROM users WHERE id = $1', [userId])).rows[0];
      await logEvent(db, req, { userId, identifier: u?.username ?? '', event: 'logout', success: true });
      return send(res, 200, { ok: true });
    }

    return send(res, 404, { error: 'not found' });
  } catch {
    return send(res, 400, { error: 'bad request' });
  }
}

export default function demoApi(ai: AIConfig = {}, cfg: DbConfig): Plugin {
  const mw: Connect.NextHandleFunction = (req, res, next) => void handle(req as Req, res, next, ai, cfg);
  return {
    name: 'schemesaathi-demo-api',
    configureServer(server) {
      server.middlewares.use(mw);
      // start PostgreSQL with the dev server instead of on the first request
      void ready(cfg).then(() => server.config.logger.info('  ➜  Database: PostgreSQL on localhost:' + cfg.port + '  ·  viewer: /db-viewer'), () => undefined);
    },
    configurePreviewServer(server) {
      server.middlewares.use(mw);
      void ready(cfg).catch(() => undefined);
    },
  };
}

/**
 * PostgreSQL for SchemeSaathi.
 *
 * A portable PostgreSQL server (official binaries from the `embedded-postgres` package) runs from
 * server-data/postgres on localhost only, so no admin install is needed. Three roles:
 *   postgres              superuser, administration only
 *   schemesaathi_app      owns the schemesaathi database; used by the website backend
 *   schemesaathi_viewer   read-only, for viewing data; cannot read password hashes or salts
 * Passwords come from .env.local. To use a hosted PostgreSQL instead, set DATABASE_URL and the
 * embedded server is skipped.
 */
import EmbeddedPostgres from 'embedded-postgres';
import pg from 'pg';
import { existsSync, readFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';

export interface DbConfig {
  port: number;
  superPassword: string;
  appPassword: string;
  viewerUser: string;
  viewerPassword: string;
  databaseUrl?: string;
}

export const DB_NAME = 'schemesaathi';
export const APP_USER = 'schemesaathi_app';
const DATA_DIR = join(process.cwd(), 'server-data');
const PG_DIR = join(DATA_DIR, 'postgres');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id             uuid PRIMARY KEY,
  full_name      text NOT NULL,
  username       text NOT NULL,
  email          text NOT NULL,
  mobile         text NOT NULL,
  password_hash  text NOT NULL,          -- PBKDF2-SHA256, never the password itself
  salt           text NOT NULL,
  category       text NOT NULL,
  state          text NOT NULL,
  district       text NOT NULL DEFAULT '',
  preferred_lang text NOT NULL DEFAULT 'en',
  gender         text,
  details        jsonb NOT NULL DEFAULT '{}',
  registered_at  timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  last_login_at  timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS users_username_key ON users (lower(username));
CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users (lower(email));

CREATE TABLE IF NOT EXISTS sessions (
  token_hash  text PRIMARY KEY,          -- SHA-256 of the bearer token
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS login_events (
  id          bigserial PRIMARY KEY,
  user_id     uuid REFERENCES users(id) ON DELETE SET NULL,
  identifier  text NOT NULL,             -- what was typed (username or email)
  event       text NOT NULL,             -- login / register / logout / password_reset
  success     boolean NOT NULL,
  reason      text,
  ip          text,
  user_agent  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS login_events_user_idx ON login_events (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS saved_schemes (
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scheme_id  text NOT NULL,
  position   int  NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, scheme_id)
);

CREATE TABLE IF NOT EXISTS applications (
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scheme_id   text NOT NULL,
  applied_on  date NOT NULL,
  reference   text,
  status      text NOT NULL,
  updated_at  timestamptz NOT NULL,
  history     jsonb NOT NULL DEFAULT '[]',
  PRIMARY KEY (user_id, scheme_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id          text NOT NULL,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scheme_id   text NOT NULL,
  status      text NOT NULL,
  created_at  timestamptz NOT NULL,
  read        boolean NOT NULL DEFAULT false,
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS document_checklists (
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scheme_id   text NOT NULL,
  done_items  jsonb NOT NULL DEFAULT '[]',
  PRIMARY KEY (user_id, scheme_id)
);

-- machine translations of interface and scheme text, cached so each string is translated once per language
CREATE TABLE IF NOT EXISTS translations (
  lang         text NOT NULL,
  source_hash  text NOT NULL,            -- SHA-256 of the English source text
  source       text NOT NULL,
  translated   text NOT NULL,
  engine       text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (lang, source_hash)
);

CREATE OR REPLACE VIEW login_details AS
SELECT u.username, u.full_name, u.email, u.mobile, u.category, u.state, u.district, u.preferred_lang,
       u.registered_at, u.last_login_at,
       (SELECT count(*) FROM login_events e WHERE e.user_id = u.id AND e.event = 'login' AND e.success)     AS successful_logins,
       (SELECT count(*) FROM login_events e WHERE e.user_id = u.id AND e.event = 'login' AND NOT e.success) AS failed_logins,
       (SELECT count(*) FROM sessions s WHERE s.user_id = u.id AND s.expires_at > now())                   AS active_sessions
FROM users u
ORDER BY u.registered_at DESC;
`;

function grants(viewer: string) {
  const cols = 'id, full_name, username, email, mobile, category, state, district, preferred_lang, gender, details, registered_at, updated_at, last_login_at';
  return `
GRANT USAGE ON SCHEMA public TO ${viewer};
GRANT SELECT (${cols}) ON users TO ${viewer};
GRANT SELECT ON login_details, login_events, saved_schemes, applications, notifications, document_checklists, translations TO ${viewer};
REVOKE ALL ON sessions FROM ${viewer};`;
}

const ident = (s: string) => {
  if (!/^[a-z_][a-z0-9_]{0,40}$/.test(s)) throw new Error(`bad identifier ${s}`);
  return s;
};
const lit = (s: string) => `'${s.replace(/'/g, "''")}'`;

async function canConnect(cfg: DbConfig) {
  const c = new pg.Client({ host: 'localhost', port: cfg.port, user: APP_USER, password: cfg.appPassword, database: DB_NAME, connectionTimeoutMillis: 1500 });
  c.on('error', () => undefined); // a dropped socket must never crash the dev server
  try {
    await c.connect();
    await c.end();
    return true;
  } catch {
    return false;
  }
}

/** Starts (or reuses) the server, ensures roles, database and schema, and returns a pool for the app role. */
async function boot(cfg: DbConfig): Promise<pg.Pool> {
  if (cfg.databaseUrl) {
    return poolWithErrorHandler(new pg.Pool({ connectionString: cfg.databaseUrl, max: 5 }));
  }
  const viewer = ident(cfg.viewerUser);
  // a server left running by a previous `npm run dev` (or a Vite restart) is simply reused
  if (!(await canConnect(cfg))) {
    const server = new EmbeddedPostgres({
      databaseDir: PG_DIR,
      port: cfg.port,
      user: 'postgres',
      password: cfg.superPassword,
      authMethod: 'scram-sha-256',
      persistent: true,
      // UTF-8 is required for Indian-language names and translations (Windows would default to WIN1252)
      initdbFlags: ['--encoding=UTF8', '--locale=C'],
      postgresFlags: ['-c', 'listen_addresses=localhost'],
      onLog: () => undefined,
      onError: (e) => console.error('[postgres]', e),
    });
    if (!existsSync(join(PG_DIR, 'PG_VERSION'))) await server.initialise();
    await server.start();
    stopHooks(server);

    const su = new pg.Client({ host: 'localhost', port: cfg.port, user: 'postgres', password: cfg.superPassword, database: 'postgres' });
    su.on('error', (e) => console.error('[postgres]', e.message));
    await su.connect();
    for (const [role, pw] of [[APP_USER, cfg.appPassword], [viewer, cfg.viewerPassword]]) {
      const exists = (await su.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [role])).rowCount;
      await su.query(`${exists ? 'ALTER' : 'CREATE'} ROLE ${role} WITH LOGIN PASSWORD ${lit(pw)}`);
    }
    await ensureUtf8Database(su);
    await su.query(`REVOKE CONNECT ON DATABASE ${DB_NAME} FROM PUBLIC; GRANT CONNECT ON DATABASE ${DB_NAME} TO ${APP_USER}, ${viewer}`);
    await su.end();
  }
  return poolWithErrorHandler(new pg.Pool({ host: 'localhost', port: cfg.port, user: APP_USER, password: cfg.appPassword, database: DB_NAME, max: 8 }));
}

/** Creates/updates tables and grants. Idempotent; runs on every backend (re)load so new tables appear without a restart. */
export async function migrate(pool: pg.Pool, cfg: DbConfig) {
  await pool.query(SCHEMA);
  if (!cfg.databaseUrl) await pool.query(grants(ident(cfg.viewerUser)));
}

/** Idle-client errors (e.g. the database restarting) are logged instead of crashing the dev server. */
function poolWithErrorHandler(pool: pg.Pool) {
  pool.on('error', (e) => console.error('[postgres pool]', e.message));
  return pool;
}

/** Creates the database as UTF-8; an existing non-UTF-8 database is recreated only if it holds no accounts. */
async function ensureUtf8Database(su: pg.Client) {
  const row = (await su.query('SELECT pg_encoding_to_char(encoding) AS enc FROM pg_database WHERE datname = $1', [DB_NAME])).rows[0];
  if (row && row.enc !== 'UTF8') {
    const check = new pg.Client({ ...su, database: DB_NAME } as pg.ClientConfig);
    let users = 1;
    try {
      await check.connect();
      users = Number((await check.query('SELECT count(*) FROM users').catch(() => ({ rows: [{ count: 0 }] }))).rows[0].count);
    } finally {
      await check.end().catch(() => undefined);
    }
    if (users > 0) throw new Error(`Database ${DB_NAME} uses ${row.enc}, not UTF8, and already has accounts — migrate it manually.`);
    await su.query(`DROP DATABASE ${DB_NAME} WITH (FORCE)`);
  }
  if (!row || row.enc !== 'UTF8') await su.query(`CREATE DATABASE ${DB_NAME} OWNER ${APP_USER} ENCODING 'UTF8' LC_COLLATE 'C' LC_CTYPE 'C' TEMPLATE template0`);
}

function stopHooks(server: EmbeddedPostgres) {
  let stopping = false;
  const stop = () => {
    if (stopping) return;
    stopping = true;
    server.stop().finally(() => process.exit(0));
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}

/* The Vite config is re-evaluated on restarts; keep one database per process. */
const g = globalThis as unknown as { __schemesaathiDb?: Promise<pg.Pool> };
export function database(cfg: DbConfig): Promise<pg.Pool> {
  g.__schemesaathiDb ??= boot(cfg).catch((e) => {
    g.__schemesaathiDb = undefined;
    throw e;
  });
  return g.__schemesaathiDb;
}

/** Connects with credentials someone typed (used by the /db-viewer page) — real PostgreSQL authentication. */
export async function viewerClient(cfg: DbConfig, user: string, password: string) {
  const c = new pg.Client({ host: 'localhost', port: cfg.port, user, password, database: DB_NAME, connectionTimeoutMillis: 3000 });
  c.on('error', () => undefined);
  await c.connect();
  return c;
}

/** One-time import of accounts from the earlier JSON-file prototype (server-data/db.json). */
export async function importJsonDb(pool: pg.Pool, save: (userId: string, data: Record<string, unknown>) => Promise<void>) {
  const file = join(DATA_DIR, 'db.json');
  if (!existsSync(file)) return 0;
  const json = JSON.parse(readFileSync(file, 'utf8')) as { users: Record<string, never>[] };
  let n = 0;
  for (const u of json.users ?? []) {
    const r = await pool.query(
      `INSERT INTO users (id, full_name, username, email, mobile, password_hash, salt, category, state, district, preferred_lang, gender, details, registered_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) ON CONFLICT DO NOTHING`,
      [u.id, u.fullName, u.username, u.email, u.mobile, u.passwordHash, u.salt, u.category, u.state, u.district ?? '', u.preferredLang ?? 'en', u.gender ?? null, u.details ?? {}, u.registeredAt, u.updatedAt],
    );
    if (r.rowCount) {
      await save(u.id, u.data ?? {});
      n++;
    }
  }
  renameSync(file, `${file}.imported`);
  return n;
}

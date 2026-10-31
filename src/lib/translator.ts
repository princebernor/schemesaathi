import type { Lang } from '../types';

/**
 * Machine translation of English interface and scheme text into the selected language.
 *
 * Hand-written dictionaries and Tamil scheme text always win; this only fills what is missing.
 * Lookups are synchronous: a missing string is queued, sent in batches to /api/ai/translate
 * (Gemini on the server, cached in PostgreSQL), stored in localStorage, and listeners re-render.
 * Until a translation arrives — or if the service is unavailable — the English text is shown and
 * `status()` reports it, so the UI can say clearly that some text is untranslated.
 */
type Entry = string | null; // null = translation failed / not possible
const caches = new Map<Lang, Map<string, Entry>>();
const queued = new Map<Lang, Set<string>>();
/** Strings already queued or in flight, so each is requested once. */
const requested = new Map<Lang, Set<string>>();
const inFlight = new Map<Lang, number>();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

const KEY = (l: Lang) => `schemesaathi:tr:${l}`;
const needsTranslation = (text: string) => /[A-Za-z]{2}/.test(text);

function cache(lang: Lang) {
  let c = caches.get(lang);
  if (!c) {
    c = new Map();
    try {
      const raw = localStorage.getItem(KEY(lang));
      if (raw) for (const [k, v] of Object.entries(JSON.parse(raw) as Record<string, string>)) c.set(k, v);
    } catch {
      /* storage unavailable */
    }
    caches.set(lang, c);
  }
  return c;
}

function persist() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    for (const [lang, c] of caches) {
      const ok = Object.fromEntries([...c].filter(([, v]) => v !== null));
      try {
        localStorage.setItem(KEY(lang), JSON.stringify(ok));
      } catch {
        /* quota or private mode: the server cache still has it */
      }
    }
  }, 800);
}

const notify = () => listeners.forEach((l) => l());

async function send(lang: Lang, texts: string[]) {
  inFlight.set(lang, (inFlight.get(lang) ?? 0) + texts.length);
  notify();
  let result: (string | null)[] = texts.map(() => null);
  try {
    const res = await fetch('/api/ai/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lang, texts }),
      signal: AbortSignal.timeout(90000),
    });
    if (res.ok) result = ((await res.json()) as { translations: (string | null)[] }).translations;
  } catch {
    /* service unavailable: keep English, reported as untranslated */
  }
  const c = cache(lang);
  texts.forEach((t, i) => {
    c.set(t, result[i] ?? null);
    requested.get(lang)?.delete(t);
  });
  inFlight.set(lang, (inFlight.get(lang) ?? 0) - texts.length);
  persist();
  notify();
}

function flush() {
  timer = null;
  for (const [lang, set] of queued) {
    const all = [...set];
    set.clear();
    for (let i = 0; i < all.length; i += 60) void send(lang, all.slice(i, i + 60));
  }
}

/** Cached translation, or undefined while it is being fetched (the caller shows English meanwhile). */
export function translateSync(lang: Lang, text: string): string | undefined {
  if (lang === 'en' || !text || !needsTranslation(text)) return text;
  const c = cache(lang);
  if (c.has(text)) return c.get(text) ?? undefined;
  let r = requested.get(lang);
  if (!r) requested.set(lang, (r = new Set()));
  if (!r.has(text)) {
    r.add(text);
    let q = queued.get(lang);
    if (!q) queued.set(lang, (q = new Set()));
    q.add(text);
    timer ??= setTimeout(flush, 60);
  }
  return undefined;
}

/** Translates now (used for voice replies that must be spoken in the user's language). */
export async function translateNow(lang: Lang, texts: string[]): Promise<string[]> {
  if (lang === 'en') return texts;
  const c = cache(lang);
  const missing = [...new Set(texts.filter((t) => needsTranslation(t) && !c.has(t)))];
  if (missing.length) await send(lang, missing);
  return texts.map((t) => c.get(t) ?? t);
}

/** Number of strings still being translated, and how many could not be translated. */
export function status(lang: Lang) {
  if (lang === 'en') return { pending: 0, failed: 0 };
  let failed = 0;
  for (const v of cache(lang).values()) if (v === null) failed++;
  return { pending: (inFlight.get(lang) ?? 0) + (queued.get(lang)?.size ?? 0), failed };
}

/** Lets a failed language try again (e.g. after the service comes back). */
export function retryFailed(lang: Lang) {
  const c = cache(lang);
  for (const [k, v] of c) if (v === null) c.delete(k);
  notify();
}

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * Gemini-backed AI for SchemeSaathi (server side only — the API key never reaches the browser).
 *
 *   POST /api/ai/understand  one sentence → language, intent, category, place, age, land, benefits (+ answer)
 *   POST /api/ai/chat        a question about a scheme → certainty-tagged statements grounded in scheme data
 *   GET  /api/ai/status      whether a key is configured
 *
 * Key: GEMINI_API_KEY in .env.local (git-ignored). Model: GEMINI_MODEL, with fallbacks.
 * Answers are grounded in the demo dataset; the client falls back to rule-based logic on any failure.
 */
import { SCHEMES } from '../src/data/schemes';
import { STATES } from '../src/data/locations';

const LANGS = ['en', 'ta', 'hi', 'te', 'kn', 'ml', 'bn', 'mr', 'gu', 'pa', 'or', 'as', 'ur'];
const LANG_NAMES = 'en English, ta Tamil, hi Hindi, te Telugu, kn Kannada, ml Malayalam, bn Bengali, mr Marathi, gu Gujarati, pa Punjabi, or Odia, as Assamese, ur Urdu';
const CATEGORIES = ['student', 'farmer', 'senior', 'business', 'women', 'pwd', 'jobseeker', 'general'];
const BENEFITS = ['cash', 'pension', 'loan', 'subsidy', 'insurance', 'scholarship', 'training', 'housing', 'food', 'health'];
const INTENTS = ['change_lang', 'find', 'yes', 'no', 'greet', 'navigate', 'question', 'unknown'];
const PAGES = ['saved', 'checklist', 'compare', 'account', 'auth', 'schemes'];

export interface AIConfig {
  apiKey?: string;
  model?: string;
  /** Gemini text-to-speech model (default gemini-3.1-flash-tts-preview) */
  ttsModel?: string;
}

/* ---------------- Gemini call with model fallback, timeout and a small rate limit ---------------- */
const hits = new Map<string, number[]>();
export function rateLimited(ip: string, perMinute = 30) {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  list.push(now);
  hits.set(ip, list);
  return list.length > perMinute;
}

/* Models whose quota is used up (HTTP 429) are skipped for a while instead of slowing every request down. */
const cooling = new Map<string, number>();
const COOLDOWN_MS = 10 * 60_000;
const available = (m: string) => (cooling.get(m) ?? 0) < Date.now();
export const markExhausted = (m: string) => cooling.set(m, Date.now() + COOLDOWN_MS);

/** Best quality first; the lite models have separate, larger quotas and keep the assistant working when the others run out. */
const QUALITY_MODELS = ['gemini-3.5-flash', 'gemini-flash-lite-latest', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'];
/** Bulk work (translation) uses the lite models first so it does not eat the quota the voice assistant needs. */
const BULK_MODELS = ['gemini-flash-lite-latest', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.5-flash'];

async function gemini(cfg: AIConfig, system: string, user: string | object[], schema: object, prefer: 'quality' | 'bulk' = 'quality'): Promise<unknown> {
  if (!cfg.apiKey) throw new Error('no key');
  const all = [cfg.model, ...(prefer === 'bulk' ? BULK_MODELS : QUALITY_MODELS)].filter((m, i, a): m is string => !!m && a.indexOf(m) === i);
  // if every model is cooling down, still try them rather than fail without asking
  const models = all.some(available) ? all.filter(available) : all;
  let lastErr: unknown;
  for (const model of models) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cfg.apiKey },
        signal: AbortSignal.timeout(typeof user === 'string' ? 20_000 : 30_000),
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: typeof user === 'string' ? [{ text: user }] : user }],
          generationConfig: { temperature: 0.2, responseMimeType: 'application/json', responseSchema: schema },
        }),
      });
      if (!res.ok) {
        if (res.status === 429 || res.status === 404) markExhausted(model);
        lastErr = new Error(`${model}: ${res.status}`);
        console.warn(`[gemini] ${model} returned ${res.status}${res.status === 429 ? ' (quota used up, trying the next model)' : ''}`);
        continue; // overloaded / unavailable model → try the next one
      }
      const json = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
      return JSON.parse(text);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

/* ---------------- 1. combined understanding for the voice assistant ---------------- */
const UNDERSTAND_SCHEMA = {
  type: 'OBJECT',
  properties: {
    transcript: { type: 'STRING' },
    lang: { type: 'STRING', enum: LANGS },
    intent: { type: 'STRING', enum: INTENTS },
    changeLanguageTo: { type: 'STRING', enum: LANGS },
    category: { type: 'STRING', enum: CATEGORIES },
    state: { type: 'STRING' },
    livesInState: { type: 'STRING' },
    district: { type: 'STRING' },
    age: { type: 'NUMBER' },
    landAcres: { type: 'NUMBER' },
    study: { type: 'STRING', enum: ['school', 'college'] },
    benefits: { type: 'ARRAY', items: { type: 'STRING', enum: BENEFITS } },
    requirement: { type: 'STRING' },
    page: { type: 'STRING', enum: PAGES },
    answer: { type: 'STRING' },
    clarification: { type: 'STRING' },
  },
  required: ['lang', 'intent', 'benefits'],
};

const UNDERSTAND_SYSTEM = `You are the speech-understanding step of SchemeSaathi, an Indian government-scheme discovery assistant used by farmers, students, senior citizens, women, small business owners, persons with disabilities and job seekers, many with limited schooling.
You receive ONE user turn: either a voice recording or a typed/recognised text. People speak naturally, with regional accents, at different speeds, mixing languages (e.g. Tamil or Hindi sentences with English words like "scholarship", "loan", "college", "website", "subsidy"), and browser speech recognition may have mis-heard words (e.g. "scholar ship", "pm kissan", "crop insurens", "karnatak"). Interpret the most likely meaning.
IMPORTANT: a browser recogniser set to the wrong language writes speech phonetically in the wrong script — e.g. Hindi "मेरा नाम सुशांत है" can arrive as Tamil letters "மேரா நாம் சுஷாந்த் ஹே", or Hindi "वेबसाइट को कन्नड़ में बदलो" as "வெப்சைட் கோ கன்னட் மே பதலோ". Read such text by its SOUND, and report the language actually SPOKEN (here Hindi), not the script it is written in.
More examples of this — always judge by the WORDS, not the letters:
- "ನಾನ್ ವಿವಸಾಯಿ, ಎನಕ್ಕು ಮಾನಿಯಮ್ ವೇಣುಮ್" is Tamil (நான் விவசாயி, எனக்கு மானியம் வேண்டும்) written in Kannada letters → lang ta. Tamil word endings like -kku, -il, -um, vendum, enakku, naan are Tamil even in Kannada script.
- "நானு ರೈತ ನನಗೆ ಸಾಲ ಬೇಕು" style text with Kannada words (naanu, nanage, beku, raita) is Kannada → lang kn, even if written in Tamil letters.
- "मैं किसान हूँ" written as "மைன் கிசான் ஹூம்" is Hindi → lang hi.
Words that clearly belong to one language decide; the script never does. Reply language must match the language the user SPOKE.

Extract everything stated, all at once:
- transcript: for audio, write exactly what was said in the original script(s) (keep English words in Latin script). For text input repeat the text.
- lang: the main language the user spoke (${LANG_NAMES}). A mostly-Tamil sentence with English words is Tamil. Romanised Hindi ("mujhe scholarship chahiye") is Hindi.
- intent: find (wants schemes/benefits, or describes themself), change_lang (ONLY wants the website language changed), yes / no (answers a confirmation question), greet, navigate (open saved / checklist / compare / account / login page), question (general question about schemes, documents, procedures), unknown.
- changeLanguageTo: set whenever the user asks for the WEBSITE / app / page to be shown in a language, even when the same sentence also asks for schemes ("show scholarships in Karnataka and change the website to Kannada" → intent find + changeLanguageTo kn). Merely speaking a language is NOT a request to change it. When two languages are named ("from Hindi to English", "हिंदी से इंग्लिश में", "இந்தியிலிருந்து ஆங்கிலத்திற்கு"), changeLanguageTo is the TARGET language. Short requests like "इंग्लिश में करो", "English please" or "चेंज टू इंग्लिश" are language-change requests.
- category: student, farmer, senior (60+ or asks old-age pension), business (shop / small business / MSME / startup), women, pwd (disability), jobseeker (unemployed / job), general. Only if stated or clearly implied.
- state: the Indian state / UT for which the user wants schemes, exactly one of: ${STATES.join(', ')}. Infer it from a city (Bengaluru → Karnataka, Kochi → Kerala, Pune → Maharashtra). "Tamil" alone is a language; "Tamil Nadu" is a state.
- livesInState: only if the user says they live somewhere different from the state they want schemes for.
- district: city or district in English if mentioned.
- age, landAcres: numbers if stated. study: school or college if a student says so.
- benefits: requested benefit types (scholarship = any education financial help; insurance incl. crop insurance; subsidy; loan; pension; housing; health; training; food; cash).
- requirement: the user's need in a few English words (e.g. "crop insurance", "college scholarship", "low-interest business loan").
- page: for navigate.
- answer: ONLY for intent question / greet / unknown: a short, friendly reply (max 2 sentences) in the user's language. Never invent amounts or promise eligibility; suggest checking the official portal.
- clarification: if the request is genuinely unclear (you cannot tell the category or what they need, or the audio was unintelligible), a short simple question in the user's language asking for exactly the missing piece. Do not guess in that case.
Do not invent fields that were not stated. The conversation context tells you what the assistant just asked, so short answers ("college", "yes", "ஆம்", "हाँ") can be read correctly.

Examples:
"நான் தமிழ்நாட்டில் கல்லூரியில் படிக்கிறேன். எனக்கு scholarship வேண்டும்." → lang ta, intent find, category student, state Tamil Nadu, study college, benefits [scholarship]
"ನಾನು ಕರ್ನಾಟಕದ ರೈತ, ನನಗೆ ಬೆಳೆ ವಿಮೆ ಯೋಜನೆಗಳು ಬೇಕು." → lang kn, intent find, category farmer, state Karnataka, benefits [insurance], requirement "crop insurance"
"I am 65 years old and living in Kerala. Show me pension schemes." → lang en, intent find, category senior, age 65, state Kerala, benefits [pension]
"मुझे महाराष्ट्र में पढ़ाई के लिए छात्रवृत्ति चाहिए।" → lang hi, intent find, category student, state Maharashtra, benefits [scholarship]
"Change the entire website to Kannada." → lang en, intent change_lang, changeLanguageTo kn
"Show me scholarships available for students in Karnataka and change the website language to Kannada." → lang en, intent find, category student, state Karnataka, benefits [scholarship], changeLanguageTo kn
"I live in Tamil Nadu but I want farmer schemes of Karnataka" → intent find, category farmer, state Karnataka, livesInState Tamil Nadu`;

const AUDIO_TYPES = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/aac', 'audio/flac'];

export async function understand(cfg: AIConfig, input: { text?: string; audio?: string; mime?: string }, context: unknown) {
  const ctx = `Conversation context: ${JSON.stringify(context ?? {})}`;
  let user: string | object[];
  if (input.audio) {
    const mime = (input.mime ?? '').split(';')[0];
    if (!AUDIO_TYPES.includes(mime) || input.audio.length > 4_000_000) throw new Error('bad audio');
    // the recording is only forwarded for this request; it is never written to disk or the database
    user = [{ inlineData: { mimeType: mime, data: input.audio } }, { text: `${ctx}\nThe user's turn is the attached voice recording. Identify the spoken language from the SOUND alone — never from the user's location, the website language or earlier turns (Tamil and Kannada, Hindi and Marathi, Bengali and Assamese can sound alike: listen carefully). Transcribe it exactly in that language's own script, then extract.` }];
  } else user = `${ctx}\nUtterance: ${input.text ?? ''}`;
  const out = (await gemini(cfg, UNDERSTAND_SYSTEM, user, UNDERSTAND_SCHEMA)) as Record<string, unknown>;
  // validate everything coming back from the model before the client sees it
  const pick = <T extends string>(v: unknown, allowed: readonly T[]) => (typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : undefined);
  const num = (v: unknown, max: number) => (typeof v === 'number' && v > 0 && v <= max ? v : undefined);
  const txt = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined);
  return {
    transcript: txt(out.transcript, 600) ?? input.text,
    lang: pick(out.lang, LANGS) ?? 'en',
    intent: pick(out.intent, INTENTS) ?? 'unknown',
    changeLanguageTo: pick(out.changeLanguageTo, LANGS),
    category: pick(out.category, CATEGORIES),
    state: pick(out.state, STATES),
    livesInState: pick(out.livesInState, STATES),
    district: txt(out.district, 60),
    age: num(out.age, 120),
    landAcres: num(out.landAcres, 1000),
    study: pick(out.study, ['school', 'college'] as const),
    benefits: Array.isArray(out.benefits) ? [...new Set(out.benefits.filter((b) => BENEFITS.includes(b as string)))] : [],
    requirement: txt(out.requirement, 80),
    page: pick(out.page, PAGES),
    answer: txt(out.answer, 600),
    clarification: txt(out.clarification, 300),
  };
}

/* ---------------- 2. grounded scheme Q&A ---------------- */
const CHAT_SCHEMA = {
  type: 'OBJECT',
  properties: {
    statements: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { text: { type: 'STRING' }, certainty: { type: 'STRING', enum: ['confirmed', 'estimated', 'verify'] } },
        required: ['text', 'certainty'],
      },
    },
  },
  required: ['statements'],
};

const compact = (s: (typeof SCHEMES)[number]) => ({
  id: s.id,
  name: s.name.en,
  level: s.level,
  state: s.state,
  for: s.categories,
  benefitTypes: s.benefitTypes,
  financial: s.financial.en,
  description: s.description.en,
  benefits: s.benefits.map((x) => x.en),
  eligibility: s.eligibility.map((x) => x.en),
  manualChecks: s.manualChecks?.map((x) => x.en),
  documents: s.documents.map((x) => x.en),
  process: s.process.map((x) => x.en),
  applyMode: s.applyMode,
  deadline: s.deadline,
});

export async function chat(cfg: AIConfig, body: { question?: unknown; schemeId?: unknown; profile?: unknown; lang?: unknown }) {
  const lang = LANGS.includes(String(body.lang)) ? String(body.lang) : 'en';
  const scheme = SCHEMES.find((s) => s.id === body.schemeId);
  const profile = (body.profile ?? {}) as { state?: string; category?: string };
  // focused scheme + other schemes for the user's category/state (keeps the prompt small)
  const related = SCHEMES.filter((s) => s.id !== scheme?.id && (!profile.category || s.categories.includes(profile.category as never)) && (s.level === 'central' || !profile.state || s.state === profile.state)).slice(0, 8);
  const system = `You are SchemeSaathi's AI Scheme Assistant for Indian citizens with limited digital literacy.
Answer ONLY from the scheme data provided (a demonstration dataset that has not been verified). Never invent amounts, deadlines, links or guarantee eligibility.
Reply in language code "${lang}" (${LANG_NAMES}) using simple words. Give 2–5 short statements. Tag each:
- confirmed: directly stated in the scheme data,
- estimated: your reasoning applying the data to the user's profile,
- verify: anything the user must check with the department/official portal.
Always end with one "verify" statement.`;
  const user = JSON.stringify({ question: String(body.question ?? '').slice(0, 500), userProfile: body.profile ?? {}, focusedScheme: scheme ? compact(scheme) : null, otherRelevantSchemes: related.map(compact) });
  const out = (await gemini(cfg, system, user, CHAT_SCHEMA)) as { statements?: { text?: unknown; certainty?: unknown }[] };
  const statements = (out.statements ?? [])
    .filter((s) => typeof s.text === 'string' && s.text.trim())
    .slice(0, 6)
    .map((s) => ({ text: String(s.text).slice(0, 500), certainty: ['confirmed', 'estimated', 'verify'].includes(String(s.certainty)) ? String(s.certainty) : 'estimated' }));
  if (!statements.length) throw new Error('empty');
  return { statements };
}

/* ---------------- 3. speech for languages the browser has no voice for ---------------- */
const speechCache = new Map<string, Buffer>();

/** Wraps raw 16-bit mono PCM from Gemini in a WAV header so any browser can play it. */
function wav(pcm: Buffer, rate: number) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + pcm.length, 4);
  h.write('WAVEfmt ', 8);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); // PCM
  h.writeUInt16LE(1, 22); // mono
  h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

export async function speak(cfg: AIConfig & { ttsModel?: string }, text: string): Promise<Buffer> {
  if (!cfg.apiKey) throw new Error('no key');
  const clean = text.trim().slice(0, 600);
  const hit = speechCache.get(clean);
  if (hit) return hit;
  const all = [cfg.ttsModel, 'gemini-3.1-flash-tts-preview', 'gemini-2.5-flash-preview-tts'].filter((m, i, a): m is string => !!m && a.indexOf(m) === i);
  const models = all.filter(available);
  if (!models.length) throw new Error('speech quota used up');
  for (const model of models) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cfg.apiKey },
        signal: AbortSignal.timeout(25_000),
        body: JSON.stringify({
          contents: [{ parts: [{ text: clean }] }],
          generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } } },
        }),
      });
      if (!res.ok) {
        if (res.status === 429 || res.status === 404) markExhausted(model);
        continue;
      }
      const json = (await res.json()) as { candidates?: { content?: { parts?: { inlineData?: { mimeType?: string; data?: string } }[] } }[] };
      const data = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData;
      if (!data?.data) continue;
      const rate = Number(/rate=(\d+)/.exec(data.mimeType ?? '')?.[1] ?? 24000);
      const out = wav(Buffer.from(data.data, 'base64'), rate);
      if (speechCache.size > 60) speechCache.delete(speechCache.keys().next().value!);
      speechCache.set(clean, out);
      return out;
    } catch {
      /* try the next model */
    }
  }
  throw new Error('tts failed');
}

/* ---------------- 4. translation of interface and scheme text ---------------- */
const LANGUAGE_NAMES: Record<string, string> = {
  ta: 'Tamil', hi: 'Hindi', te: 'Telugu', kn: 'Kannada', ml: 'Malayalam', bn: 'Bengali', mr: 'Marathi',
  gu: 'Gujarati', pa: 'Punjabi (Gurmukhi script)', or: 'Odia', as: 'Assamese', ur: 'Urdu',
};
export const TRANSLATABLE = Object.keys(LANGUAGE_NAMES);

/** A translation is rejected (and English kept) if it drops a placeholder or changes any number. */
function faithful(src: string, out: string) {
  const holes = src.match(/\{[a-zA-Z]+\}/g) ?? [];
  if (holes.some((h) => !out.includes(h))) return false;
  const nums = (s: string) => (s.match(/\d+(?:[.,]\d+)*/g) ?? []).map((n) => n.replace(/,/g, '')).sort().join('|');
  return nums(src) === nums(out);
}

export async function translateBatch(cfg: AIConfig, lang: string, texts: string[]): Promise<(string | null)[]> {
  const name = LANGUAGE_NAMES[lang];
  if (!name) throw new Error('unsupported language');
  const system = `You translate the user interface and government-scheme information of SchemeSaathi, an Indian government benefits website, from English into ${name}.
Rules:
- Translate every item faithfully, in simple everyday ${name} that people with limited schooling understand. Do not add, remove or explain anything.
- Keep every number, amount (₹, lakh, crore), percentage, age and date exactly as written, using the same Western digits.
- Keep placeholders like {name}, {n}, {s} exactly unchanged.
- Keep acronyms and official short names as they are (PM-KISAN, PMFBY, MUDRA, UDID, NSP, Aadhaar, CSC, GST, UMIS, MSME, KCC).
- Scheme names: write them in ${name} script — translate the descriptive words and transliterate proper names (e.g. a scheme called "Kudumbashree" is written in ${name} script); only acronyms stay in Latin letters. Never return a scheme name unchanged in English.
- Department and ministry names: use the official ${name} form when well known, otherwise translate literally.
- Eligibility conditions must keep exactly the same meaning and limits.
Return the translations in the same order, one per input item.`;
  const out = (await gemini(cfg, system, JSON.stringify(texts), {
    type: 'OBJECT',
    properties: { translations: { type: 'ARRAY', items: { type: 'STRING' } } },
    required: ['translations'],
  }, 'bulk')) as { translations?: unknown[] };
  const list = Array.isArray(out.translations) ? out.translations : [];
  return texts.map((src, i) => {
    const t = typeof list[i] === 'string' ? (list[i] as string).trim() : '';
    // an unchanged English answer (other than acronyms / short labels) is not a translation
    const unchanged = t === src && /[A-Za-z]{3,}\s+[A-Za-z]{3,}/.test(src);
    return t && !unchanged && faithful(src, t) ? t : null;
  });
}

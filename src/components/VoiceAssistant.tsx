import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, Info, Loader2, Mic, MicOff, Send, Volume2, VolumeX, X } from 'lucide-react';
import { SCHEMES } from '../data/schemes';
import { categoryById } from '../data/categories';
import { LANGUAGES, type StringKey } from '../i18n/strings';
import { SPEECH_CODE, reply, replyFn, type Facts, type Spoken } from '../i18n/assistant';
import { detectLang, requestedLanguage, stateLanguage, understand, type Understanding } from '../lib/nlu';
import { remoteAI } from '../lib/remoteAI';
import { translateNow, translateSync } from '../lib/translator';
import { availableIn, rankSchemes } from '../lib/matching';
import { levelLabel } from './ui';
import { useStore } from '../state/store';
import type { BenefitType, Lang, Profile } from '../types';

/* Minimal typing for the Web Speech API (not in the default DOM lib). */
interface SpeechRec {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
}
const SR = (window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec }).SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: new () => SpeechRec }).webkitSpeechRecognition;

interface Msg {
  id: number;
  role: 'user' | 'ai';
  parts: Spoken[];
  facts?: Facts & { lang: Lang; requirement?: string };
  /** which engine understood the sentence */
  source?: 'ai' | 'rules';
  schemes?: string[];
  confirm?: boolean;
  /** two states to choose between (scheme state vs. current location) */
  stateChoices?: string[];
  /** indexes of the parts that are spoken aloud (all when absent) — long replies speak only the key sentences */
  speakIdx?: number[];
  /** for the user's messages: the language that was detected */
  detected?: Lang;
  noVoice?: boolean;
}
interface Ctx extends Facts {
  district?: string;
  livesIn?: string;
  requirement?: string;
  stateConfirmed?: boolean;
  stateChoices?: string[];
  awaiting?: 'category' | 'study' | 'state';
  pending?: { patch: Partial<Profile>; benefits: BenefitType[] };
}

const voiceFor = (lang: Lang) => {
  const code = SPEECH_CODE[lang].toLowerCase();
  const voices = window.speechSynthesis?.getVoices() ?? [];
  return voices.find((v) => v.lang.replace('_', '-').toLowerCase() === code) ?? voices.find((v) => v.lang.toLowerCase().startsWith(code.slice(0, 2)));
};

/** After the server's speech service fails (e.g. its daily quota is used up) it is not asked again for a few minutes. */
let serverSpeechPausedUntil = 0;

function speakLocal(p: Spoken, v: SpeechSynthesisVoice) {
  return new Promise<void>((done) => {
    const u = new SpeechSynthesisUtterance(p.text);
    u.lang = SPEECH_CODE[p.lang];
    u.voice = v;
    u.rate = 0.95;
    u.onend = u.onerror = () => done();
    window.speechSynthesis.speak(u);
  });
}

/** Gemini text-to-speech from the server, cached per sentence as an object URL. */
const speechCache = new Map<string, Promise<string | null>>();
function speechUrl(text: string) {
  let hit = speechCache.get(text);
  if (!hit) {
    hit = fetch('/api/ai/speak', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }), signal: AbortSignal.timeout(30000) })
      .then((r) => (r.ok ? r.blob() : null))
      .then((b) => (b ? URL.createObjectURL(b) : null))
      .catch(() => null);
    hit.then((u) => !u && speechCache.delete(text));
    speechCache.set(text, hit);
  }
  return hit;
}

export default function VoiceAssistant() {
  const { t, tx, tr, lang, setLang, langChosen, location, profile, updateProfile, navigate, route, compare, user } = useStore();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [muted, setMuted] = useState(false);
  const [micError, setMicError] = useState(false);
  const [recLang, setRecLang] = useState<Lang>('en');
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const ctx = useRef<Ctx>({ benefits: [] });
  const recRef = useRef<SpeechRec | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(1);

  // voices load asynchronously in some browsers
  useEffect(() => {
    const s = window.speechSynthesis;
    if (!s) return;
    s.getVoices();
    const on = () => s.getVoices();
    s.addEventListener?.('voiceschanged', on);
    return () => s.removeEventListener?.('voiceschanged', on);
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, interim]);

  const playToken = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [speaking, setSpeaking] = useState(false);

  /** Stops any speech that is playing or queued. */
  const stopSpeech = useCallback(() => {
    playToken.current++;
    window.speechSynthesis?.cancel();
    audioRef.current?.pause();
    setSpeaking(false);
  }, []);

  /**
   * Speaks each part in its own language: the device's voice when one is installed, otherwise
   * Gemini speech generated on the server. Resolves false only if a part could not be spoken at all.
   */
  const speak = useCallback(
    async (parts: Spoken[]) => {
      if (muted) return true;
      stopSpeech();
      const token = playToken.current;
      // device voice when installed; otherwise Gemini speech from the server (paused for a while after it fails)
      const plan = parts.map((p) => {
        const v = voiceFor(p.lang);
        if (v) return { p, v };
        return { p, audio: Date.now() > serverSpeechPausedUntil ? speechUrl(p.text) : Promise.resolve(null) };
      });
      let ok = true;
      setSpeaking(true);
      for (const step of plan) {
        if (token !== playToken.current) return ok;
        if ('v' in step && step.v) await speakLocal(step.p, step.v);
        else {
          const url = await step.audio;
          if (!url) {
            serverSpeechPausedUntil = Date.now() + 5 * 60_000;
            ok = false;
            continue;
          }
          if (token !== playToken.current) return ok;
          await new Promise<void>((done) => {
            const a = new Audio(url);
            audioRef.current = a;
            a.onended = a.onerror = a.onpause = () => done();
            a.play().catch(() => {
              ok = false;
              done();
            });
          });
        }
      }
      if (token === playToken.current) setSpeaking(false);
      return ok;
    },
    [muted, stopSpeech],
  );

  const say = useCallback(
    (m: Omit<Msg, 'id' | 'role'>) => {
      const id = nextId.current++;
      setMsgs((list) => [...list, { ...m, id, role: 'ai' }]);
      const spoken = m.speakIdx ? m.parts.filter((_, i) => m.speakIdx!.includes(i)) : m.parts;
      void speak(spoken).then((ok) => !ok && setMsgs((list) => list.map((x) => (x.id === id ? { ...x, noVoice: true } : x))));
    },
    [speak],
  );

  /* ---------- open: greet immediately ---------- */
  const openPanel = () => {
    // greet in the language of the user's location AND in their chosen/website language (English by default).
    // A chosen language comes first; otherwise the local language leads. The website language is never changed here.
    const local = stateLanguage(location?.state ?? profile.state);
    const order: Lang[] = langChosen && lang !== 'en' ? [lang, local] : [local, lang];
    const langs = order.filter((l, i) => order.indexOf(l) === i);
    ctx.current = { ...ctx.current, benefits: ctx.current.benefits ?? [] };
    setRecLang(langs[0]);
    setOpen(true);
    setMicError(false);
    say({ parts: langs.map((l) => reply(l, 'greet')) });
    setTimeout(() => inputRef.current?.focus(), 250);
  };

  const close = () => {
    recRef.current?.stop();
    stopSpeech();
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /* ---------- understanding + dialogue ---------- */

  /** Says a reply in `lang`: parts that only exist in English are machine-translated first (shown in English if that fails). */
  const sayIn = async (m: Omit<Msg, 'id' | 'role'>, lang: Lang) => {
    const parts = await Promise.all(
      m.parts.map(async (p) => {
        if (p.lang === lang || lang === 'en') return p;
        const [text] = await translateNow(lang, [p.text]);
        return text !== p.text ? { text, lang } : p;
      }),
    );
    say({ ...m, parts });
  };

  /**
   * One user turn, typed or spoken. Spoken turns go to the server as audio so Gemini can transcribe and understand
   * them in one step (language detected automatically, accents and mixed languages handled); typed or
   * browser-recognised text goes as text. The local rule-based extractor fills gaps and is the offline fallback.
   */
  const handle = async (input: { text?: string; audio?: Blob }) => {
    if ((!input.text?.trim() && !input.audio) || thinking) return;
    const userMsgId = nextId.current++;
    setMsgs((list) => [...list, { id: userMsgId, role: 'user', parts: [{ text: input.text ?? '🎤 …', lang: 'en' }] }]);
    const c = ctx.current;
    const context = {
      assistantAskedFor: c.awaiting,
      awaitingYesNo: !!c.pending,
      alreadyKnown: { category: c.category, state: c.state, study: c.study, age: c.age, benefits: c.benefits },
    };
    setThinking(true);
    let remote = input.audio ? await remoteAI.understandAudio(input.audio, context) : await remoteAI.understand(input.text!, context);
    if (input.audio && !remote?.transcript) remote = await remoteAI.understandAudio(input.audio, context); // one automatic retry
    setThinking(false);

    let text = input.text ?? '';
    if (input.audio) {
      if (!remote?.transcript) {
        setMsgs((list) => list.filter((m) => m.id !== userMsgId));
        audioFailures.current++;
        if (audioFailures.current < 2) return sayIn({ parts: [reply('en', 'noSpeech')] }, recLang);
        // repeated failures (e.g. the AI quota is used up): use the browser's recogniser for now and retry AI voice later
        audioFailures.current = 0;
        setAiOn(false);
        setTimeout(() => setAiOn(true), 3 * 60_000);
        return sayIn({ parts: [reply('en', 'audioFailed')] }, recLang);
      }
      audioFailures.current = 0;
      text = remote.transcript;
    }

    const local = understand(text);
    const u: Understanding = remote
      ? {
          ...remote,
          intent: remote.intent === 'question' ? 'unknown' : remote.intent,
          targetLang: remote.changeLanguageTo,
          // the model sometimes omits numbers or the city; the local extractor fills those gaps
          age: remote.age ?? local.age,
          landAcres: remote.landAcres ?? local.landAcres,
          study: remote.study ?? local.study,
          category: remote.category ?? local.category,
          state: remote.state ?? local.state,
          district: local.state && local.state === (remote.state ?? local.state) ? local.district ?? remote.district : remote.district,
          benefits: [...new Set([...(remote.benefits ?? []), ...(remote.intent === 'find' ? local.benefits : [])])],
        }
      : local;
    // the model's language is used when available: it hears the audio / reads wrong-script text by sound;
    // offline, the script-based detection in `local` is used
    // For a recording the transcript is written in the script that was actually spoken, so its script decides
    // the reply language (e.g. Tamil speech → Tamil reply, whatever the location). Otherwise the model's judgement.
    if (input.audio) {
      const spoken = detectLang(text);
      if (spoken !== 'en') u.lang = spoken;
    }
    const source: Msg['source'] = remote ? 'ai' : 'rules';
    let rl: Lang = u.lang;
    setRecLang(rl);
    const shown = text;
    setMsgs((list) => list.map((m) => (m.id === userMsgId ? { ...m, parts: [{ text: shown, lang: rl }], detected: rl } : m)));

    // "…and change the website to Kannada" can come with any other request in the same sentence;
    // the local check backs up the model so an explicit language request is never missed
    const prefix: Spoken[] = [];
    if (!u.targetLang) u.targetLang = requestedLanguage(text);
    if (u.targetLang && (u.intent === 'change_lang' || remote?.changeLanguageTo || requestedLanguage(text))) {
      setLang(u.targetLang);
      rl = u.targetLang;
      setRecLang(rl);
      if (u.intent === 'change_lang') return sayIn({ parts: [reply(rl, 'langChanged')] }, rl);
      prefix.push(reply(rl, 'langChanged'));
    }

    if (c.awaiting === 'state' && u.state && c.stateChoices?.includes(u.state)) {
      c.state = u.state;
      c.stateConfirmed = true;
      c.awaiting = undefined;
      return proceed(rl, source, prefix);
    }
    if ((u.intent === 'yes' || u.intent === 'no') && c.pending) {
      if (u.intent === 'yes') return confirmPending(rl, false);
      c.pending = undefined;
      return sayIn({ parts: [reply(rl, 'cancelled')] }, rl);
    }
    if (u.intent === 'navigate' && u.page) {
      void sayIn({ parts: [reply(rl, 'opening')] }, rl);
      navigate(u.page === 'auth' ? `/auth/${user ? '' : profile.category ?? ''}/login` : `/${u.page}`);
      return;
    }
    if (u.intent === 'greet' && !c.awaiting) return sayIn({ parts: [reply(rl, 'greet')] }, rl);
    // an unclear request gets one simple question instead of a guess
    if (remote?.clarification && (u.intent !== 'find' || !u.category)) return sayIn({ parts: [{ text: remote.clarification, lang: rl }], source }, rl);
    if (u.intent === 'unknown' && remote?.answer && !c.awaiting) return sayIn({ parts: [{ text: remote.answer, lang: rl }], source }, rl);
    if (u.intent !== 'find' && !c.awaiting) return sayIn({ parts: [reply(rl, 'notUnderstood')] }, rl);

    // a new request about a different category starts fresh: earlier needs and details do not carry over
    if (u.category && c.category && u.category !== c.category && !c.awaiting) {
      Object.assign(c, { benefits: [], requirement: undefined, study: undefined, age: undefined, landAcres: undefined, pending: undefined });
    }
    // a newly stated need replaces the previous one instead of piling up
    if (u.benefits.length && !c.awaiting) {
      c.benefits = [];
      c.requirement = undefined;
    }
    // merge what was said with what we already know (never ask again for known facts)
    if (u.category) c.category = u.category;
    if (u.state && u.state !== c.state) {
      c.state = u.state;
      c.district = u.district;
      c.stateConfirmed = false;
    }
    if (u.age !== undefined) c.age = u.age;
    if (u.landAcres !== undefined) c.landAcres = u.landAcres;
    if (u.study) c.study = u.study;
    if (remote?.requirement) c.requirement = remote.requirement;
    c.benefits = [...new Set([...(c.benefits ?? []), ...u.benefits])];
    c.livesIn = remote?.livesInState ?? c.livesIn;
    return proceed(rl, source, prefix);
  };

  /** Asks only for what is still missing, then shows matching central + state schemes and asks to open them. */
  const proceed = async (rl: Lang, source: Msg['source'], prefix: Spoken[] = []) => {
    const c = ctx.current;
    if (!c.category) {
      c.awaiting = 'category';
      return sayIn({ parts: [...prefix, reply(rl, 'askCategory')] }, rl);
    }
    if (c.category === 'student' && !c.study && !profile.education) {
      c.awaiting = 'study';
      return sayIn({ parts: [...prefix, reply(rl, 'askStudy')] }, rl);
    }
    // the state they want schemes for vs. where they are now: ask when they differ
    const here = c.livesIn ?? profile.state ?? location?.state;
    if (c.state && here && c.state !== here && !c.stateConfirmed) {
      c.awaiting = 'state';
      c.stateChoices = [c.state, here];
      const [a, b] = await translateNow(rl, [c.state, here]);
      return sayIn({ parts: [...prefix, replyFn(rl, 'clarifyState', a, b)], stateChoices: c.stateChoices }, rl);
    }
    c.awaiting = undefined;

    const state = c.state ?? profile.state ?? location?.state;
    const place = c.district?.replace(' Urban', '') ?? c.state;
    const patch: Partial<Profile> = { category: c.category, completed: profile.category === c.category ? profile.completed : false };
    if (c.state) Object.assign(patch, { state: c.state, district: c.district });
    if (c.age !== undefined) patch.age = c.age;
    if (c.landAcres !== undefined) patch.landAcres = c.landAcres;
    if (c.study && !(c.study === 'college' && ['ug', 'pg', 'diploma'].includes(profile.education ?? ''))) patch.education = c.study === 'college' ? 'ug' : 'school';

    // central schemes + schemes of that state only, filtered by the requested benefit, ranked by eligibility
    const pool = SCHEMES.filter((s) => s.categories.includes(c.category!) && availableIn(s, state, c.district));
    const focused = c.benefits.length ? pool.filter((s) => s.benefitTypes.some((b) => c.benefits.includes(b))) : pool;
    const ranked = rankSchemes(focused.length ? focused : pool, { ...profile, ...patch })
      .filter((r) => r.match.verdict !== 'unlikely')
      .slice(0, 4);
    const facts: Facts = { category: c.category, study: c.study, place, state: c.state, age: c.age, landAcres: c.landAcres, benefits: c.benefits };

    const missing: ('age' | 'income' | 'land')[] = [];
    if (c.age === undefined && profile.age === undefined && ['senior', 'general', 'pwd', 'women'].includes(c.category)) missing.push('age');
    if (!profile.income) missing.push('income');
    if (c.category === 'farmer' && c.landAcres === undefined && profile.landAcres === undefined) missing.push('land');

    c.pending = { patch, benefits: c.benefits };
    const parts = [...prefix, replyFn(rl, 'understood', facts), replyFn(rl, 'offer', facts), reply(rl, 'verify'), ...(missing.length ? [replyFn(rl, 'refine', missing)] : []), reply(rl, 'confirm')];
    return sayIn(
      {
        parts,
        // spoken: the language confirmation, what was understood, and the question — the rest is on screen
        speakIdx: [...prefix.map((_, i) => i), prefix.length, parts.length - 1],
        facts: { ...facts, lang: rl, requirement: c.requirement },
        source,
        schemes: ranked.map((r) => r.scheme.id),
        confirm: true,
      },
      rl,
    );
  };

  const chooseState = (rl: Lang, s: string) => {
    const c = ctx.current;
    c.state = s;
    c.stateConfirmed = true;
    if (c.livesIn && c.livesIn !== s) c.livesIn = s;
    void proceed(rl, 'ai');
  };

  const confirmPending = (rl: Lang, switchSite: boolean) => {
    const p = ctx.current.pending;
    if (!p) return;
    ctx.current.pending = undefined;
    if (switchSite) setLang(rl);
    updateProfile(p.patch);
    void sayIn({ parts: [reply(rl, 'navigating')] }, rl);
    navigate(`/schemes${p.benefits.length ? `?benefit=${p.benefits.join(',')}` : ''}`);
    setTimeout(() => setOpen(false), 2200);
  };
  const decline = (rl: Lang) => {
    ctx.current.pending = undefined;
    void sayIn({ parts: [reply(rl, 'cancelled')] }, rl);
  };

  /* ---------- microphone ---------- */
  const [aiOn, setAiOn] = useState(false);
  const audioFailures = useRef(0);
  const [micLevel, setMicLevel] = useState(0);
  const recording = useRef<{ rec: MediaRecorder; timer: number } | null>(null);
  useEffect(() => {
    fetch('/api/ai/status')
      .then((r) => r.json())
      .then((d: { enabled?: boolean }) => setAiOn(!!d.enabled))
      .catch(() => setAiOn(false));
  }, []);
  const canRecord = aiOn && typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

  /** Records until the speaker pauses (or 20 s), then sends the clip for understanding. Nothing is stored. */
  const startRecording = async () => {
    stopSpeech();
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    } catch {
      setMicError(true);
      return;
    }
    const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'].find((m) => MediaRecorder.isTypeSupported(m)) ?? '';
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const ac = new AudioContext();
    const analyser = ac.createAnalyser();
    analyser.fftSize = 1024;
    ac.createMediaStreamSource(stream).connect(analyser);
    const buf = new Uint8Array(analyser.fftSize);
    const started = performance.now();
    let lastVoice = started;
    let spoke = false;
    const tick = () => {
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (const v of buf) sum += (v - 128) ** 2;
      const rms = Math.sqrt(sum / buf.length) / 128;
      setMicLevel(Math.min(1, rms * 6));
      const now = performance.now();
      if (rms > 0.035) {
        lastVoice = now;
        spoke = true;
      }
      // stop after a pause of ~1.6 s, after 20 s, or if nothing is said for 8 s
      if ((spoke && now - lastVoice > 1600) || now - started > 20000 || (!spoke && now - started > 8000)) {
        if (rec.state === 'recording') rec.stop();
        return;
      }
    };
    rec.onstop = () => {
      if (recording.current) clearInterval(recording.current.timer);
      recording.current = null;
      stream.getTracks().forEach((tr) => tr.stop());
      void ac.close();
      setListening(false);
      setMicLevel(0);
      const blob = new Blob(chunks, { type: rec.mimeType || mime || 'audio/webm' });
      if (!spoke || blob.size < 1500) return void sayIn({ parts: [reply('en', 'noSpeech')] }, recLang);
      void handle({ audio: blob });
    };
    recording.current = { rec, timer: 0 };
    rec.start();
    setMicError(false);
    setListening(true);
    // a timer, not requestAnimationFrame: it keeps running if the user switches tabs while speaking
    recording.current.timer = window.setInterval(tick, 50);
  };

  const toggleMic = () => {
    if (listening) {
      if (recording.current?.rec.state === 'recording') recording.current.rec.stop();
      recRef.current?.stop();
      return;
    }
    if (canRecord) return void startRecording();
    if (!SR) return;
    // fallback: the browser's own recogniser in the selected language
    stopSpeech();
    const rec = new SR();
    rec.lang = SPEECH_CODE[recLang];
    rec.interimResults = true;
    rec.continuous = false;
    let finalText = '';
    rec.onresult = (e) => {
      let live = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else live += r[0].transcript;
      }
      setInterim(live || finalText);
    };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') setMicError(true);
    };
    rec.onend = () => {
      setListening(false);
      setInterim('');
      if (finalText.trim()) void handle({ text: finalText.trim() });
    };
    recRef.current = rec;
    setMicError(false);
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
    }
  };

  const lift = compare.length > 0 && ['schemes', 'scheme', 'saved'].includes(route.name);
  const langLabel = (l: Lang) => LANGUAGES.find((x) => x.code === l)?.label ?? l;
  // the most likely languages first: the one being listened to, the website's, the location's, English, Hindi
  const quickLangs = [recLang, lang, stateLanguage(location?.state ?? profile.state), 'en', 'hi', 'ta'].filter((l, i, a): l is Lang => a.indexOf(l) === i).slice(0, 5) as Lang[];
  const lastAi = [...msgs].reverse().find((m) => m.role === 'ai');
  const lastConfirm = lastAi?.confirm && ctx.current.pending;
  const lastStates = ctx.current.awaiting === 'state' ? lastAi?.stateChoices : undefined;

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            key="fab"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            onClick={openPanel}
            aria-label={t('vaOpen')}
            className={`fixed left-1/2 -translate-x-1/2 z-40 flex items-center gap-2.5 rounded-full bg-navy-700 text-white pl-2 pr-4 py-2 shadow-lift hover:bg-navy-800 focus-visible:ring-4 focus-visible:ring-saffron-500/50 transition-[bottom] ${lift ? 'bottom-24' : 'bottom-4'}`}
          >
            <span className="relative grid place-items-center w-10 h-10 rounded-full bg-gradient-to-br from-saffron-500 to-leaf-500">
              <span className="absolute inset-0 rounded-full bg-saffron-500/60 animate-ping-slow" />
              <Mic size={20} className="relative" />
            </span>
            <span className="voice-wave" aria-hidden="true">
              <i /><i /><i /><i /><i />
            </span>
            <span className="hidden sm:inline text-sm font-semibold">{t('vaTitle').replace('SchemeSaathi ', '')}</span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.section
            key="panel"
            role="dialog"
            aria-label={t('vaTitle')}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            className="fixed z-50 bottom-3 left-1/2 -translate-x-1/2 w-[min(580px,calc(100vw-20px))] max-h-[min(640px,80vh)] flex flex-col bg-white rounded-3xl shadow-lift border border-slate-200 overflow-hidden"
          >
            <header className="flex items-center gap-3 px-4 py-3 bg-navy-700 text-white">
              <span className="grid place-items-center w-9 h-9 rounded-full bg-gradient-to-br from-saffron-500 to-leaf-500"><Bot size={19} /></span>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold leading-tight truncate text-white">{t('vaTitle')}</h2>
                <p className="text-xs text-navy-100 flex items-center gap-1.5" aria-live="polite">
                  {listening ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" /> {t('vaListening')} · {langLabel(recLang)}
                    </>
                  ) : speaking ? (
                    <>
                      <Volume2 size={13} className="animate-pulse" /> {t('vaSpeaking')}
                    </>
                  ) : (
                    t('vaIdle')
                  )}
                </p>
              </div>
              <button onClick={() => { setMuted((m) => !m); stopSpeech(); }} className="p-2 rounded-lg hover:bg-white/10" aria-label={muted ? t('vaUnmute') : t('vaMute')} aria-pressed={muted} title={muted ? t('vaUnmute') : t('vaMute')}>
                {muted ? <VolumeX size={19} /> : <Volume2 size={19} />}
              </button>
              <button onClick={close} className="p-2 rounded-lg hover:bg-white/10" aria-label={t('vaClose')}>
                <X size={20} />
              </button>
            </header>

            <div ref={listRef} className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 space-y-3 bg-slate-50/60" aria-live="polite">
              {msgs.map((m) => (
                <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'flex'}>
                  <div className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${m.role === 'user' ? 'bg-navy-600 text-white rounded-br-md' : 'bg-white border border-slate-200 rounded-bl-md'}`}>
                    {m.parts.map((p, i) => (
                      <p key={i} lang={p.lang} className={i ? 'mt-1.5' : ''}>{p.text}</p>
                    ))}
                    {m.role === 'user' && m.detected && (
                      <p className="mt-1 text-[11px] text-navy-100 flex items-center gap-1">
                        <Mic size={11} /> {t('vaDetectedLang', { l: langLabel(m.detected) })}
                      </p>
                    )}
                    {m.facts && m.facts.category && (
                      <div className="mt-3 rounded-xl bg-violet-50 border border-violet-100 p-2.5">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-[11px] font-bold uppercase tracking-wide text-violet-700">{t('vaUnderstood')}</span>
                          <span className="text-[10px] font-semibold rounded-full bg-white border border-violet-200 px-2 py-0.5 text-violet-700">{m.source === 'ai' ? t('vaByAI') : t('vaByRules')}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <Chip k={t('vaLang')} v={langLabel(m.facts.lang)} />
                          {m.facts.place && <Chip k={t('vaPlace')} v={m.facts.state && m.facts.place !== m.facts.state ? `${tr(m.facts.place)}, ${tr(m.facts.state)}` : tr(m.facts.place)} />}
                          <Chip k={t('category')} v={tx(categoryById(m.facts.category)!.name)} />
                          {m.facts.study && <Chip k={t('vaStudy')} v={m.facts.study === 'college' ? t('eduUg') : t('eduSchool')} />}
                          {m.facts.age !== undefined && <Chip k={t('vaAge')} v={String(m.facts.age)} />}
                          {m.facts.landAcres !== undefined && <Chip k={t('vaLand')} v={`${m.facts.landAcres} ac`} />}
                          {m.facts.requirement ? <Chip k={t('vaBenefit')} v={tr(m.facts.requirement)} /> : m.facts.benefits.map((b) => <Chip key={b} k={t('vaBenefit')} v={t(`bt_${b}` as StringKey)} />)}
                          <Chip k={t('vaIntent')} v={t('intent_find')} />
                        </div>
                      </div>
                    )}
                    {m.schemes && m.schemes.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {m.schemes.map((id) => {
                          const s = SCHEMES.find((x) => x.id === id)!;
                          const cl = m.facts?.lang ?? lang;
                          // shown in the language of the conversation, which may differ from the website language
                          const inConv = (v: { en: string; ta: string }) => (cl === 'en' ? v.en : cl === 'ta' && v.ta ? v.ta : translateSync(cl, v.en) ?? v.en);
                          return (
                            <li key={id}>
                              <a href={`#/scheme/${id}`} onClick={() => setOpen(false)} className="block rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-navy-50">
                                <span className="flex items-start justify-between gap-2">
                                  <span className="font-semibold text-navy-800">{inConv(s.name)}</span>
                                  <span className="shrink-0 text-[10px] font-semibold rounded-full bg-slate-100 text-slate-600 px-1.5 py-0.5">{levelLabel(s, t, tr)}</span>
                                </span>
                                <span className="block text-xs text-slate-500 line-clamp-1">{inConv(s.financial)}</span>
                              </a>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    {m.noVoice && <p className="mt-2 text-[11px] text-amber-700 flex gap-1"><VolumeX size={12} className="mt-0.5 shrink-0" /> {t('vaNoVoice')}</p>}
                  </div>
                </div>
              ))}
              {thinking && (
                <div className="flex items-center gap-2 text-sm text-violet-700 pl-1" role="status">
                  <Loader2 size={15} className="animate-spin" /> {t('aiThinking')}
                </div>
              )}
              {interim && (
                <div className="flex justify-end">
                  <div className="max-w-[88%] rounded-2xl px-4 py-2.5 bg-navy-100 text-navy-900 italic">{interim}…</div>
                </div>
              )}
              {lastConfirm && (
                <div className="flex flex-wrap gap-2 pl-1">
                  <button className="btn-green btn-sm" onClick={() => confirmPending(recLang, false)}>{t('vaYes')}</button>
                  {recLang !== lang && (
                    <button className="btn-primary btn-sm" onClick={() => confirmPending(recLang, true)}>{t('vaYesInLang', { l: langLabel(recLang) })}</button>
                  )}
                  <button className="btn-ghost btn-sm" onClick={() => decline(recLang)}>{t('vaNo')}</button>
                </div>
              )}
              {lastStates && (
                <div className="flex flex-wrap gap-2 pl-1">
                  {lastStates.map((st) => (
                    <button key={st} className="btn-ghost btn-sm" onClick={() => chooseState(recLang, st)}>{tr(st)}</button>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 p-3 space-y-2">
              {((!SR && !canRecord) || micError) && <p className="text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-2">{micError ? t('vaMicDenied') : t('vaUnsupported')}</p>}
              <form
                className="flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void handle({ text: input });
                  setInput('');
                }}
              >
                <button
                  type="button"
                  onClick={toggleMic}
                  disabled={!SR && !canRecord}
                  aria-label={listening ? t('vaStop') : t('vaStart')}
                  aria-pressed={listening}
                  title={listening ? t('vaStop') : t('vaStart')}
                  className={`relative shrink-0 grid place-items-center w-12 h-12 rounded-full text-white transition disabled:opacity-40 ${listening ? 'bg-red-500' : 'bg-gradient-to-br from-saffron-500 to-leaf-500 hover:brightness-105'}`}
                >
                  {listening && <span className="absolute inset-0 rounded-full bg-red-400/50 transition-transform duration-75" style={{ transform: `scale(${1 + micLevel * 0.6})` }} />}
                  {listening ? <MicOff size={21} className="relative" /> : <Mic size={21} />}
                </button>
                <input ref={inputRef} className="field py-2.5" value={input} onChange={(e) => setInput(e.target.value)} placeholder={t('vaPlaceholder')} aria-label={t('vaPlaceholder')} />
                <button className="btn-primary px-3.5 py-2.5" aria-label={t('send')} disabled={!input.trim()}>
                  <Send size={18} />
                </button>
              </form>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                {canRecord ? (
                  <span className="flex items-center gap-1.5 font-medium text-leaf-700">
                    <Mic size={12} /> {t('vaAutoDetect')}
                  </span>
                ) : (
                  <div className="w-full space-y-1">
                    <span className="block text-amber-800">{t('vaSpeechNote')}</span>
                    {/* the browser's own recogniser cannot detect the language: one tap tells it */}
                    <div className="flex flex-wrap items-center gap-1" role="radiogroup" aria-label={t('vaListenIn')}>
                      <span className="font-semibold text-slate-600">{t('vaListenIn')}:</span>
                      {quickLangs.map((l) => (
                        <button
                          key={l}
                          type="button"
                          role="radio"
                          aria-checked={recLang === l}
                          onClick={() => setRecLang(l)}
                          className={`rounded-full border px-2 py-0.5 text-[12px] ${recLang === l ? 'border-navy-600 bg-navy-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-navy-600/40'}`}
                        >
                          {langLabel(l)}
                        </button>
                      ))}
                      <select aria-label={t('vaListenIn')} className="rounded-md border border-slate-200 px-1.5 py-0.5 text-[12px] text-slate-700" value={quickLangs.includes(recLang) ? '' : recLang} onChange={(e) => e.target.value && setRecLang(e.target.value as Lang)}>
                        <option value="">…</option>
                        {LANGUAGES.filter((l) => !quickLangs.includes(l.code)).map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
                      </select>
                    </div>
                  </div>
                )}
                <span className="flex items-center gap-1"><Info size={12} /> {t('vaDemo')}</span>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}

function Chip({ k, v }: { k: string; v: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white border border-violet-200 px-2 py-0.5 text-xs">
      <span className="text-violet-600">{k}:</span> <span className="font-semibold text-slate-800">{v}</span>
    </span>
  );
}

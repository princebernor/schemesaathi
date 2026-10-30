/**
 * Mock AI provider.
 *
 * All answers are generated locally from the structured scheme data and the user's profile, and every
 * statement is tagged with a certainty level. To connect a real model later, implement `AIProvider`
 * (e.g. calling your backend which calls an LLM with the scheme JSON as grounding) and swap `ai` below.
 */
import { SCHEMES } from '../data/schemes';
import { categoryById } from '../data/categories';
import type { AIStatement, Lang, Profile, Scheme } from '../types';
import { DICTS, EN, type StringKey } from '../i18n/strings';
import { availableIn, eduList, lakh, lakhTa, matchScheme, rankSchemes } from './matching';

export interface ComparisonResult {
  differences: AIStatement[];
  benefits: AIStatement[];
  eligibility: AIStatement[];
  overlap: AIStatement[];
  verify: AIStatement[];
  fit: AIStatement[];
}

export interface AIProvider {
  recommend(s: Scheme, p: Profile, lang: Lang): Promise<AIStatement[]>;
  eligibility(s: Scheme, p: Profile, lang: Lang): Promise<AIStatement[]>;
  suggest(p: Profile, exclude: string[], lang: Lang): Promise<{ scheme: Scheme; reason: string }[]>;
  chat(question: string, s: Scheme | null, p: Profile, lang: Lang): Promise<AIStatement[]>;
  compare(a: Scheme, b: Scheme, p: Profile, lang: Lang): Promise<ComparisonResult>;
  howHelps(s: Scheme, p: Profile, lang: Lang): Promise<AIStatement[]>;
}

const wait = (ms = 450) => new Promise((r) => setTimeout(r, ms));
const T = (lang: Lang) => (en: string, ta: string) => (lang === 'ta' ? ta : en);
const tx = (lang: Lang, v: { en: string; ta: string }) => (lang === 'ta' ? v.ta : v.en);
/** UI label for a dictionary key in the given language (falls back to English). */
const label = (lang: Lang, key: StringKey) => DICTS[lang][key] ?? EN[key];

const c = (text: string): AIStatement => ({ text, certainty: 'confirmed' });
const e = (text: string): AIStatement => ({ text, certainty: 'estimated' });
const v = (text: string): AIStatement => ({ text, certainty: 'verify' });

function catName(p: Profile, lang: Lang) {
  const cat = categoryById(p.category);
  return cat ? tx(lang, cat.name) : T(lang)('citizen', 'குடிமகன்');
}

function recommendSync(s: Scheme, p: Profile, lang: Lang): AIStatement[] {
  const t = T(lang);
  const m = matchScheme(s, p);
  const out: AIStatement[] = [];
  out.push(c(t(`${tx(lang, s.name)} offers: ${tx(lang, s.financial)}.`, `${tx(lang, s.name)} வழங்குவது: ${tx(lang, s.financial)}.`)));
  if (p.category && s.categories.includes(p.category)) {
    out.push(e(t(`It is designed for people in the “${catName(p, lang)}” category, which you selected.`, `நீங்கள் தேர்வு செய்த “${catName(p, lang)}” பிரிவினருக்காக இது வடிவமைக்கப்பட்டுள்ளது.`)));
  }
  if (s.level === 'state' && p.state === s.state) {
    out.push(e(t(`It is a ${s.state} Government scheme and you live in ${p.district ? p.district + ', ' : ''}${s.state}.`, `இது ${s.state} அரசுத் திட்டம்; நீங்கள் ${p.district ? p.district + ', ' : ''}${s.state}-இல் வசிக்கிறீர்கள்.`)));
  } else if (s.level === 'central') {
    out.push(c(t('As a Central Government scheme it is available in every state.', 'மத்திய அரசுத் திட்டம் என்பதால் அனைத்து மாநிலங்களிலும் கிடைக்கும்.')));
  }
  const met = m.checks.filter((x) => x.status === 'met').length;
  const total = m.checks.length;
  if (m.verdict === 'likely') out.push(e(t(`Your answers meet ${met} of ${total} listed conditions, so you appear likely to be eligible.`, `பட்டியலிடப்பட்ட ${total} நிபந்தனைகளில் ${met} உங்கள் பதில்களுடன் பொருந்துகின்றன; தகுதி இருக்க வாய்ப்பு உள்ளது.`)));
  else if (m.verdict === 'check') out.push(e(t(`Your answers meet ${met} of ${total} conditions; a few could not be checked from your profile.`, `${total} நிபந்தனைகளில் ${met} பொருந்துகின்றன; சில நிபந்தனைகளை உங்கள் சுயவிவரத்திலிருந்து சரிபார்க்க முடியவில்லை.`)));
  else out.push(e(t('At least one condition does not seem to match your profile — see the eligibility insights below.', 'குறைந்தது ஒரு நிபந்தனை உங்கள் சுயவிவரத்துடன் பொருந்தவில்லை — கீழே உள்ள தகுதி விவரங்களைப் பார்க்கவும்.')));
  out.push(v(t('Amounts and conditions in this prototype are demonstration data. Confirm on the official portal.', 'இந்த முன்மாதிரியில் உள்ள தொகைகள், நிபந்தனைகள் மாதிரித் தரவு. அதிகாரப்பூர்வ இணையதளத்தில் உறுதிப்படுத்தவும்.')));
  return out;
}

function eligibilitySync(s: Scheme, p: Profile, lang: Lang): AIStatement[] {
  const t = T(lang);
  const m = matchScheme(s, p);
  return m.checks.map((ch) => {
    const label = tx(lang, ch.label);
    if (ch.status === 'met') return e(t(`✓ Matches: ${label}`, `✓ பொருந்துகிறது: ${label}`));
    if (ch.status === 'unmet') return e(t(`✗ May not match: ${label}`, `✗ பொருந்தாமல் இருக்கலாம்: ${label}`));
    return v(t(`? Needs verification: ${label}`, `? சரிபார்க்க வேண்டும்: ${label}`));
  });
}

function suggestSync(p: Profile, exclude: string[], lang: Lang) {
  const t = T(lang);
  return rankSchemes(
    SCHEMES.filter((s) => !exclude.includes(s.id) && availableIn(s, p.state)),
    p,
  )
    .filter((r) => r.match.verdict !== 'unlikely')
    .slice(0, 3)
    .map(({ scheme }) => {
      const shared = p.category && scheme.categories.includes(p.category);
      const reason = shared
        ? t(`Also for ${catName(p, lang)}s — ${tx(lang, scheme.financial)}`, `${catName(p, lang)} பிரிவுக்கும் — ${tx(lang, scheme.financial)}`)
        : t(`Open to many citizens — ${tx(lang, scheme.financial)}`, `பலருக்கும் பொருந்தும் — ${tx(lang, scheme.financial)}`);
      return { scheme, reason };
    });
}

function requirementsText(s: Scheme, lang: Lang) {
  const t = T(lang);
  const r = s.rules;
  return {
    age:
      r.minAge !== undefined || r.maxAge !== undefined
        ? t(`${r.minAge ?? 0}${r.maxAge !== undefined ? '–' + r.maxAge : '+'} years`, `${r.minAge ?? 0}${r.maxAge !== undefined ? '–' + r.maxAge : '+'} வயது`)
        : null,
    income: r.maxIncome !== undefined ? t(`Up to ${lakh(r.maxIncome)} per year`, `ஆண்டுக்கு ${lakhTa(r.maxIncome)} வரை`) : null,
    residency: r.states ? t(`Resident of ${r.states.join(', ')}`, `${r.states.join(', ')} வசிப்பவர்`) : t('Any state in India', 'இந்தியாவின் எந்த மாநிலமும்'),
    education: r.educationLevels ? eduList(r.educationLevels, lang === 'ta') : null,
  };
}

/* ---------- chat intent detection ---------- */
type Intent = 'eligible' | 'documents' | 'amount' | 'online' | 'similar' | 'deadline' | 'unknown';
function detectIntent(q: string): Intent {
  const s = q.toLowerCase();
  if (/(eligib|qualif|can i get|தகுதி)/.test(s)) return 'eligible';
  if (/(document|papers|certificate|proof|ஆவண|சான்று)/.test(s)) return 'documents';
  if (/(how much|amount|money|financial|rupees|₹|எவ்வளவு|தொகை|நிதி)/.test(s)) return 'amount';
  if (/(online|apply|website|portal|where|how to|இணைய|விண்ணப்ப)/.test(s)) return 'online';
  if (/(similar|other scheme|alternative|more scheme|இதுபோன்ற|வேறு|மாநில)/.test(s)) return 'similar';
  if (/(deadline|last date|when|கடைசி|தேதி)/.test(s)) return 'deadline';
  return 'unknown';
}

function chatSync(question: string, s: Scheme | null, p: Profile, lang: Lang): AIStatement[] {
  const t = T(lang);
  const intent = detectIntent(question);

  if (!s) {
    const top = rankSchemes(SCHEMES.filter((x) => availableIn(x, p.state)), p).slice(0, 3);
    if (intent === 'similar' || intent === 'unknown' || intent === 'eligible') {
      return [
        e(t(`Based on your profile, these look most relevant: ${top.map((x) => tx(lang, x.scheme.name)).join('; ')}.`, `உங்கள் சுயவிவரத்தின்படி இவை மிகப் பொருத்தமாகத் தெரிகின்றன: ${top.map((x) => tx(lang, x.scheme.name)).join('; ')}.`)),
        v(t('Select a scheme card so I can answer about that specific scheme.', 'குறிப்பிட்ட திட்டம் பற்றிப் பதிலளிக்க ஒரு திட்ட அட்டையைத் தேர்வு செய்யவும்.')),
      ];
    }
    return [v(t('Please select a scheme first — documents, amounts and application steps differ for each scheme.', 'முதலில் ஒரு திட்டத்தைத் தேர்வு செய்யவும் — ஒவ்வொரு திட்டத்திற்கும் ஆவணங்கள், தொகை, விண்ணப்ப முறை வேறுபடும்.'))];
  }

  const name = tx(lang, s.name);
  switch (intent) {
    case 'eligible': {
      const m = matchScheme(s, p);
      const head =
        m.verdict === 'likely'
          ? e(t(`From your profile, you appear likely to be eligible for ${name}.`, `உங்கள் சுயவிவரத்தின்படி ${name} திட்டத்திற்குத் தகுதி இருக்க வாய்ப்பு உள்ளது.`))
          : m.verdict === 'check'
            ? e(t(`You may be eligible for ${name}, but some conditions need checking.`, `${name} திட்டத்திற்குத் தகுதி இருக்கலாம்; சில நிபந்தனைகளைச் சரிபார்க்க வேண்டும்.`))
            : e(t(`From your profile, you may not meet all conditions of ${name}.`, `உங்கள் சுயவிவரத்தின்படி ${name} திட்டத்தின் அனைத்து நிபந்தனைகளும் பொருந்தாமல் இருக்கலாம்.`));
      return [head, ...eligibilitySync(s, p, lang), v(t('Only the department can confirm eligibility after verifying your documents.', 'ஆவணங்களைச் சரிபார்த்த பின் துறை மட்டுமே தகுதியை உறுதி செய்யும்.'))];
    }
    case 'documents':
      return [
        c(t(`For ${name}, the dataset lists these documents:`, `${name} திட்டத்திற்குத் தரவில் உள்ள ஆவணங்கள்:`)),
        ...s.documents.map((d) => c('• ' + tx(lang, d))),
        v(t('Offices may ask for additional documents. Carry originals and photocopies.', 'அலுவலகங்கள் கூடுதல் ஆவணங்கள் கேட்கலாம். அசல் மற்றும் நகல்களை எடுத்துச் செல்லவும்.')),
      ];
    case 'amount':
      return [
        c(t(`${name}: ${tx(lang, s.financial)}.`, `${name}: ${tx(lang, s.financial)}.`)),
        ...s.benefits.map((b) => c('• ' + tx(lang, b))),
        v(t('Benefit amounts are revised from time to time — check the latest government order.', 'பயன் தொகைகள் அவ்வப்போது மாற்றப்படும் — சமீபத்திய அரசாணையைச் சரிபார்க்கவும்.')),
      ];
    case 'online': {
      const mode = { online: t('online', 'இணையவழியாக'), offline: t('in person (offline)', 'நேரில்'), both: t('both online and in person', 'இணையவழி மற்றும் நேரில்') }[s.applyMode];
      return [
        c(t(`You can apply for ${name} ${mode}.`, `${name} திட்டத்திற்கு ${mode} விண்ணப்பிக்கலாம்.`)),
        ...s.process.map((x, i) => c(`${i + 1}. ${tx(lang, x)}`)),
        v(t(`Official source in dataset: ${s.sourceRef}. Confirm the link before entering any details.`, `தரவில் உள்ள அதிகாரப்பூர்வ ஆதாரம்: ${s.sourceRef}. விவரங்களை உள்ளிடும் முன் இணைப்பை உறுதிப்படுத்தவும்.`)),
      ];
    }
    case 'similar': {
      const sims = rankSchemes(
        SCHEMES.filter((x) => x.id !== s.id && availableIn(x, p.state) && x.categories.some((cat) => s.categories.includes(cat))),
        p,
      ).slice(0, 3);
      if (!sims.length) return [e(t('I could not find a similar scheme in the demo dataset.', 'மாதிரித் தரவில் இதுபோன்ற திட்டம் கிடைக்கவில்லை.'))];
      return [
        e(t(`Similar schemes available${p.state ? ' in ' + p.state : ''}:`, `${p.state ? p.state + '-இல் ' : ''}கிடைக்கும் இதுபோன்ற திட்டங்கள்:`)),
        ...sims.map((x) => e(`• ${tx(lang, x.scheme.name)} — ${tx(lang, x.scheme.financial)}`)),
      ];
    }
    case 'deadline':
      return [
        s.deadline ? c(t(`Application window: ${s.deadline}.`, `விண்ணப்பக் காலம்: ${s.deadline}.`)) : c(t('No fixed deadline is listed in the dataset.', 'தரவில் நிலையான கடைசி தேதி குறிப்பிடப்படவில்லை.')),
        v(t('Deadlines change every year — check the official notification.', 'கடைசி தேதிகள் ஆண்டுதோறும் மாறும் — அதிகாரப்பூர்வ அறிவிப்பைச் சரிபார்க்கவும்.')),
      ];
    default:
      return [
        c(t(`${name}: ${tx(lang, s.description)}`, `${name}: ${tx(lang, s.description)}`)),
        e(t('You can ask me about eligibility, documents, amount, how to apply, deadlines or similar schemes.', 'தகுதி, ஆவணங்கள், தொகை, விண்ணப்ப முறை, கடைசி தேதி அல்லது இதுபோன்ற திட்டங்கள் பற்றிக் கேட்கலாம்.')),
      ];
  }
}

function compareSync(a: Scheme, b: Scheme, p: Profile, lang: Lang): ComparisonResult {
  const t = T(lang);
  const A = tx(lang, a.name);
  const B = tx(lang, b.name);
  const ma = matchScheme(a, p);
  const mb = matchScheme(b, p);
  const ra = requirementsText(a, lang);
  const rb = requirementsText(b, lang);

  const differences: AIStatement[] = [];
  if (a.level !== b.level) differences.push(c(t(`${A} is a ${a.level === 'central' ? 'Central' : a.state} scheme, while ${B} is a ${b.level === 'central' ? 'Central' : b.state} scheme.`, `${A} ${a.level === 'central' ? 'மத்திய' : a.state} அரசுத் திட்டம்; ${B} ${b.level === 'central' ? 'மத்திய' : b.state} அரசுத் திட்டம்.`)));
  const bt = (s: Scheme) => s.benefitTypes.map((b) => label(lang, `bt_${b}`)).join(', ');
  if (bt(a) !== bt(b)) differences.push(c(t(`Benefit type differs: ${A} → ${bt(a)}; ${B} → ${bt(b)}.`, `பயன் வகை வேறுபடுகிறது: ${A} → ${bt(a)}; ${B} → ${bt(b)}.`)));
  const mode = (s: Scheme) => label(lang, `applyMode_${s.applyMode}`).toLowerCase();
  if (a.applyMode !== b.applyMode) differences.push(c(t(`Application mode: ${A} is ${mode(a)}, ${B} is ${mode(b)}.`, `விண்ணப்ப முறை: ${A} – ${mode(a)}, ${B} – ${mode(b)}.`)));
  if (!differences.length) differences.push(c(t('Both schemes are similar in type and level; the differences are mainly in conditions and amounts.', 'இரண்டும் வகை மற்றும் நிலையில் ஒத்தவை; வேறுபாடு நிபந்தனைகள் மற்றும் தொகையில் உள்ளது.')));

  const benefits = [c(`${A}: ${tx(lang, a.financial)}`), c(`${B}: ${tx(lang, b.financial)}`)];

  const eligibility: AIStatement[] = [];
  const pairs: [string, string | null, string | null][] = [
    [t('Age', 'வயது'), ra.age, rb.age],
    [t('Income', 'வருமானம்'), ra.income, rb.income],
    [t('Residency', 'இருப்பிடம்'), ra.residency, rb.residency],
    [t('Education', 'கல்வி'), ra.education, rb.education],
  ];
  for (const [label, x, y] of pairs) {
    if (x !== y) eligibility.push(c(`${label}: ${A} → ${x ?? t('no limit listed', 'வரம்பு இல்லை')}; ${B} → ${y ?? t('no limit listed', 'வரம்பு இல்லை')}`));
  }
  if (a.rules.gender !== b.rules.gender) eligibility.push(c(t(`Gender: ${A} → ${a.rules.gender ?? 'any'}; ${B} → ${b.rules.gender ?? 'any'}`, `பாலினம்: ${A} → ${a.rules.gender ?? 'எதுவும்'}; ${B} → ${b.rules.gender ?? 'எதுவும்'}`)));
  if (!eligibility.length) eligibility.push(c(t('The structured eligibility rules are the same for both in the dataset.', 'தரவில் இரண்டிற்கும் தகுதி விதிகள் ஒன்றே.')));

  const sharedTypes = a.benefitTypes.filter((x) => b.benefitTypes.includes(x));
  const overlap: AIStatement[] = sharedTypes.length
    ? [
        e(t(`Both provide: ${sharedTypes.map((x) => label(lang, `bt_${x}`)).join(', ')}. Some schemes do not allow receiving two similar benefits — check if they can be combined.`, `இரண்டும் வழங்குவது: ${sharedTypes.map((x) => label(lang, `bt_${x}`)).join(', ')}. சில திட்டங்களில் ஒரே மாதிரியான இரண்டு பயன்களைப் பெற முடியாது — இணைத்துப் பெறலாமா எனச் சரிபார்க்கவும்.`)),
      ]
    : [e(t('The benefits do not overlap, so they may complement each other if you are eligible for both.', 'பயன்கள் ஒன்றோடொன்று பொருந்தவில்லை; இரண்டிற்கும் தகுதி இருந்தால் ஒன்றுக்கொன்று துணையாக இருக்கலாம்.'))];

  const verify: AIStatement[] = [];
  for (const [s, m] of [[a, ma], [b, mb]] as const) {
    const unk = m.checks.filter((x) => x.status !== 'met').map((x) => tx(lang, x.label));
    if (unk.length) verify.push(v(`${tx(lang, s.name)}: ${unk.join('; ')}`));
  }
  verify.push(v(t('Current benefit amounts, deadlines and the official application link for both.', 'இரண்டிற்கும் தற்போதைய தொகை, கடைசி தேதி, அதிகாரப்பூர்வ விண்ணப்ப இணைப்பு.')));

  const fit: AIStatement[] = [];
  if (Math.abs(ma.score - mb.score) < 8) {
    fit.push(e(t(`Both fit your profile to a similar degree (${ma.score}% vs ${mb.score}%). Choose based on what you need more: ${tx(lang, a.financial)} or ${tx(lang, b.financial)}.`, `இரண்டும் உங்கள் சுயவிவரத்துடன் ஏறக்குறைய சமமாகப் பொருந்துகின்றன (${ma.score}% / ${mb.score}%). உங்களுக்கு அதிகம் தேவையானதைப் பொறுத்துத் தேர்வு செய்யவும்.`)));
  } else {
    const [w, wm, l, lm] = ma.score > mb.score ? [a, ma, b, mb] : [b, mb, a, ma];
    const reasons = wm.checks.filter((x) => x.status === 'met').slice(0, 3).map((x) => tx(lang, x.label));
    fit.push(e(t(`${tx(lang, w.name)} appears closer to your stated profile (${wm.score}% vs ${lm.score}%), because: ${reasons.join('; ')}.`, `${tx(lang, w.name)} உங்கள் சுயவிவரத்துக்கு நெருக்கமாகத் தெரிகிறது (${wm.score}% / ${lm.score}%), காரணம்: ${reasons.join('; ')}.`)));
    const lUnmet = lm.checks.filter((x) => x.status === 'unmet').map((x) => tx(lang, x.label));
    if (lUnmet.length) fit.push(e(t(`For ${tx(lang, l.name)}, this condition may not match: ${lUnmet.join('; ')}.`, `${tx(lang, l.name)}-க்கு இந்த நிபந்தனை பொருந்தாமல் இருக்கலாம்: ${lUnmet.join('; ')}.`)));
  }
  fit.push(v(t('This is not a universal ranking — you may be able to apply for both.', 'இது பொதுவான தரவரிசை அல்ல — இரண்டிற்கும் விண்ணப்பிக்க முடியலாம்.')));

  return { differences, benefits, eligibility, overlap, verify, fit };
}

function howHelpsSync(s: Scheme, p: Profile, lang: Lang): AIStatement[] {
  const t = T(lang);
  const who = p.category ? catName(p, lang) : t('citizen', 'குடிமகன்');
  const out = [
    e(t(`In simple words: as a ${who.toLowerCase()}${p.district ? ' in ' + p.district : ''}, this scheme can give you ${tx(lang, s.financial).toLowerCase()}.`, `எளிமையாகச் சொன்னால்: ${p.district ? p.district + '-இல் உள்ள ' : ''}${who} ஆகிய உங்களுக்கு இந்தத் திட்டம் ${tx(lang, s.financial)} வழங்கலாம்.`)),
    c(t(`What it does: ${tx(lang, s.description)}`, `இது என்ன செய்கிறது: ${tx(lang, s.description)}`)),
  ];
  const m = matchScheme(s, p);
  const missing = m.checks.filter((x) => x.status === 'unknown').map((x) => tx(lang, x.label));
  if (missing.length) out.push(v(t(`Before applying, check: ${missing.join('; ')}.`, `விண்ணப்பிக்கும் முன் சரிபார்க்கவும்: ${missing.join('; ')}.`)));
  out.push(e(t(`Next step: keep ${s.documents.length} documents ready and ${s.applyMode === 'offline' ? 'visit the office listed below' : 'use the official portal'}.`, `அடுத்த படி: ${s.documents.length} ஆவணங்களைத் தயார் செய்து ${s.applyMode === 'offline' ? 'கீழே குறிப்பிட்ட அலுவலகத்திற்குச் செல்லவும்' : 'அதிகாரப்பூர்வ இணையதளத்தைப் பயன்படுத்தவும்'}.`)));
  return out;
}

export const mockAI: AIProvider = {
  recommend: async (s, p, l) => (await wait(), recommendSync(s, p, l)),
  eligibility: async (s, p, l) => (await wait(250), eligibilitySync(s, p, l)),
  suggest: async (p, ex, l) => (await wait(300), suggestSync(p, ex, l)),
  chat: async (q, s, p, l) => (await wait(700), chatSync(q, s, p, l)),
  compare: async (a, b, p, l) => (await wait(800), compareSync(a, b, p, l)),
  howHelps: async (s, p, l) => (await wait(500), howHelpsSync(s, p, l)),
};

export const ai: AIProvider = mockAI;
export { requirementsText };

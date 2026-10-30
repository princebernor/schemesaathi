import type { IncomeRange, MatchResult, Profile, RuleCheck, Scheme } from '../types';

export const INCOME_BOUNDS: Record<IncomeRange, [number, number]> = {
  lt1: [0, 100000],
  '1to2.5': [100000, 250000],
  '2.5to4.5': [250000, 450000],
  '4.5to8': [450000, 800000],
  gt8: [800000, Infinity],
};

export const lakh = (n: number) => {
  const v = n / 100000;
  return `₹${Number.isInteger(v) ? v : v.toFixed(2).replace(/0$/, '')} lakh`;
};
export const lakhTa = (n: number) => lakh(n).replace('lakh', 'லட்சம்');

const EDU_NAMES: Record<string, [string, string]> = {
  school: ['School', 'பள்ளி'],
  hsc: ['Higher secondary', 'மேல்நிலை'],
  iti: ['ITI', 'ஐ.டி.ஐ'],
  diploma: ['Diploma', 'பட்டயம்'],
  ug: ['UG degree', 'இளநிலை'],
  pg: ['PG', 'முதுநிலை'],
};
export const eduList = (levels: string[], ta: boolean) => levels.map((l) => EDU_NAMES[l]?.[ta ? 1 : 0] ?? l).join(', ');

/** Compare a profile against a scheme's structured rules. Unknown = profile didn't answer. */
export function matchScheme(s: Scheme, p: Profile): MatchResult {
  const r = s.rules;
  const checks: RuleCheck[] = [];
  const add = (en: string, ta: string, status: RuleCheck['status']) => checks.push({ label: { en, ta }, status });


  if (r.states) {
    const status = !p.state ? 'unknown' : r.states.includes(p.state) ? 'met' : 'unmet';
    add(`Resident of ${r.states.join(', ')}`, `${r.states.join(', ')} வசிப்பவர்`, status);
  } else {
    add('Available across India', 'இந்தியா முழுவதும் கிடைக்கும்', 'met');
  }

  if (r.minAge !== undefined || r.maxAge !== undefined) {
    const lo = r.minAge ?? 0;
    const hi = r.maxAge ?? 120;
    const status = p.age === undefined ? 'unknown' : p.age >= lo && p.age <= hi ? 'met' : 'unmet';
    const range = r.maxAge === undefined ? `${lo}+` : r.minAge === undefined ? `up to ${hi}` : `${lo}–${hi}`;
    const rangeTa = r.maxAge === undefined ? `${lo}+` : r.minAge === undefined ? `${hi} வரை` : `${lo}–${hi}`;
    add(`Age ${range} years`, `வயது ${rangeTa}`, status);
  }

  if (r.gender) {
    const status = !p.gender ? 'unknown' : p.gender === r.gender ? 'met' : 'unmet';
    add(r.gender === 'female' ? 'For women / girls' : 'For men / boys', r.gender === 'female' ? 'பெண்களுக்கானது' : 'ஆண்களுக்கானது', status);
  }

  if (r.maxIncome !== undefined) {
    let status: RuleCheck['status'] = 'unknown';
    if (p.income) {
      const [lo, hi] = INCOME_BOUNDS[p.income];
      status = hi <= r.maxIncome ? 'met' : lo >= r.maxIncome ? 'unmet' : 'unknown';
    }
    add(`Family income up to ${lakh(r.maxIncome)}/yr`, `குடும்ப வருமானம் ஆண்டுக்கு ${lakhTa(r.maxIncome)} வரை`, status);
  }

  if (r.minDisability !== undefined) {
    const status = p.disabilityPercent === undefined ? 'unknown' : p.disabilityPercent >= r.minDisability ? 'met' : 'unmet';
    add(`Disability ${r.minDisability}% or more`, `இயலாமை ${r.minDisability}% அல்லது அதற்கு மேல்`, status);
  }

  if (r.requiresLand) {
    const status = !p.landOwnership
      ? 'unknown'
      : p.landOwnership === 'labourer'
        ? 'unmet'
        : p.landOwnership === 'owner'
          ? 'met'
          : 'unknown';
    add('Owns cultivable land in own name', 'சொந்தப் பெயரில் பயிரிடக்கூடிய நிலம்', status);
  }

  if (r.educationLevels) {
    const status = !p.education ? 'unknown' : r.educationLevels.includes(p.education) ? 'met' : 'unmet';
    add(`Studying: ${eduList(r.educationLevels, false)}`, `படிப்பு: ${eduList(r.educationLevels, true)}`, status);
  }

  if (r.govtSchool) {
    const status = !p.govtSchool ? 'unknown' : p.govtSchool === 'yes' ? 'met' : 'unmet';
    add('Studied Classes 6–12 in a government school', '6–12 அரசுப் பள்ளியில் படித்தவர்', status);
  }

  if (r.businessTypes) {
    const status = !p.businessType ? 'unknown' : r.businessTypes.includes(p.businessType) ? 'met' : 'unmet';
    add(`Business type: ${r.businessTypes.join(' / ')}`, `தொழில் வகை: ${r.businessTypes.join(' / ')}`, status);
  }

  if (r.socialCategories) {
    const status = !p.socialCategory || p.socialCategory === 'na' ? 'unknown' : r.socialCategories.includes(p.socialCategory) ? 'met' : 'unmet';
    const names = r.socialCategories.map((c) => c.toUpperCase()).join(' / ');
    add(`Social category: ${names}`, `சமூகப் பிரிவு: ${names}`, status);
  }

  s.manualChecks?.forEach((m) => checks.push({ label: m, status: 'unknown' }));

  const ruleChecks = [...checks];
  if (p.category) {
    const ok = s.categories.includes(p.category);
    checks.unshift({
      label: ok
        ? { en: 'Designed for your category', ta: 'உங்கள் பிரிவுக்காக வடிவமைக்கப்பட்டது' }
        : { en: 'Mainly meant for a different category', ta: 'முக்கியமாக வேறு பிரிவுக்கானது' },
      status: ok ? 'met' : 'unknown',
    });
  }
  const unmet = ruleChecks.filter((c) => c.status === 'unmet').length;
  const unknown = ruleChecks.filter((c) => c.status === 'unknown').length;
  const met = ruleChecks.filter((c) => c.status === 'met').length;
  const ruleScore = ruleChecks.length ? (met + unknown * 0.5) / ruleChecks.length : 0.6;
  const catScore = p.category && s.categories.includes(p.category) ? 1 : 0.3;
  let score = Math.round(30 * catScore + 70 * ruleScore);
  if (unmet) score = Math.min(score, 30);

  const verdict: MatchResult['verdict'] = unmet ? 'unlikely' : unknown <= 1 ? 'likely' : 'check';
  return { score, verdict, checks };
}

export function rankSchemes(schemes: Scheme[], p: Profile) {
  return schemes
    .map((s) => ({ scheme: s, match: matchScheme(s, p) }))
    .sort((a, b) => b.match.score - a.match.score || (b.scheme.level === 'state' ? 1 : 0) - (a.scheme.level === 'state' ? 1 : 0));
}

/** True when the scheme is offered in the user's state (central schemes always are). */
export const availableIn = (s: Scheme, state?: string) => s.level === 'central' || !state || s.state === state;

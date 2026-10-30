import { useEffect, useState } from 'react';
import { GitCompareArrows, Scale, Sparkles, TriangleAlert } from 'lucide-react';
import { SCHEMES, schemeById } from '../data/schemes';
import { ai, requirementsText, type ComparisonResult } from '../lib/ai';
import { matchScheme } from '../lib/matching';
import { useStore } from '../state/store';
import { AIThinking, CertaintyLegend, LevelBadge, MatchBadge, Statements } from '../components/ui';
import type { StringKey } from '../i18n/strings';
import type { Scheme } from '../types';

export default function Compare() {
  const { t, tx, lang, profile, compare, setCompare } = useStore();
  const a = schemeById(compare[0] ?? '');
  const b = schemeById(compare[1] ?? '');
  const [result, setResult] = useState<ComparisonResult | null>(null);

  useEffect(() => {
    let live = true;
    setResult(null);
    if (a && b) ai.compare(a, b, profile, lang).then((r) => live && setResult(r));
    return () => {
      live = false;
    };
  }, [a, b, profile, lang]);

  const pick = (slot: 0 | 1, id: string) => {
    const next = [...compare];
    next[slot] = id;
    setCompare(next.filter(Boolean).slice(0, 2));
  };

  const Picker = ({ slot, s }: { slot: 0 | 1; s?: Scheme }) => (
    <div className="card p-4">
      <label className="label">{slot === 0 ? t('schemeA') : t('schemeB')}</label>
      <select className="field" value={s?.id ?? ''} onChange={(e) => pick(slot, e.target.value)}>
        <option value="">{t('chooseScheme')}</option>
        {SCHEMES.filter((x) => x.id !== compare[slot === 0 ? 1 : 0]).map((x) => (
          <option key={x.id} value={x.id}>
            {tx(x.name)}
          </option>
        ))}
      </select>
      {s && (
        <div className="flex flex-wrap gap-2 mt-3">
          <LevelBadge s={s} />
          <MatchBadge m={matchScheme(s, profile)} />
        </div>
      )}
    </div>
  );

  const rows: { key: StringKey; get: (s: Scheme) => string }[] = [
    { key: 'c_benefits', get: (s) => s.benefits.map((x) => tx(x)).join(' • ') },
    { key: 'c_financial', get: (s) => tx(s.financial) },
    { key: 'c_eligibility', get: (s) => s.eligibility.map((x) => tx(x)).join(' • ') },
    { key: 'c_age', get: (s) => requirementsText(s, lang).age ?? t('noLimit') },
    { key: 'c_income', get: (s) => requirementsText(s, lang).income ?? t('noLimit') },
    { key: 'c_docs', get: (s) => s.documents.map((x) => tx(x)).join(', ') },
    { key: 'c_process', get: (s) => `${t(`applyMode_${s.applyMode}` as StringKey)} — ${s.process.map((x) => tx(x)).join(' → ')}` },
    { key: 'c_dept', get: (s) => tx(s.department) },
    { key: 'c_avail', get: (s) => (s.level === 'central' ? t('allIndia') : s.state) },
  ];

  const qa: { key: StringKey; field: keyof ComparisonResult }[] = [
    { key: 'cmpDiff', field: 'differences' },
    { key: 'cmpBenefits', field: 'benefits' },
    { key: 'cmpElig', field: 'eligibility' },
    { key: 'cmpOverlap', field: 'overlap' },
    { key: 'cmpVerify', field: 'verify' },
    { key: 'cmpFit', field: 'fit' },
  ];

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-8 pb-28">
      <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
        <GitCompareArrows className="text-navy-600" /> {t('compareTitle')}
      </h1>
      <p className="text-slate-600 mt-1 mb-6">{t('compareSub')}</p>

      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <Picker slot={0} s={a} />
        <Picker slot={1} s={b} />
      </div>

      {!(a && b) ? (
        <div className="card p-10 text-center text-slate-500">
          {t('compareEmpty')}
          <div className="mt-4">
            <a href="#/schemes" className="btn-primary">{t('navSchemes')}</a>
          </div>
        </div>
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="bg-navy-900 text-white text-left">
                  <th className="p-4 w-[20%] font-semibold">{t('criteria')}</th>
                  <th className="p-4 w-[40%] font-semibold">{tx(a.name)}</th>
                  <th className="p-4 w-[40%] font-semibold">{tx(b.name)}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const va = r.get(a);
                  const vb = r.get(b);
                  return (
                    <tr key={r.key} className={i % 2 ? 'bg-slate-50/60' : 'bg-white'}>
                      <th scope="row" className="p-4 text-left align-top font-semibold text-navy-900">{t(r.key)}</th>
                      <td className={`p-4 align-top leading-relaxed ${va !== vb ? '' : 'text-slate-500'}`}>{va}</td>
                      <td className={`p-4 align-top leading-relaxed ${va !== vb ? '' : 'text-slate-500'}`}>{vb}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <section className="mt-6 rounded-3xl border border-violet-200 bg-gradient-to-b from-violet-50 to-white p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="flex items-center gap-2 text-xl font-semibold text-violet-950">
                <Sparkles className="text-violet-600" size={20} /> {t('aiCompare')}
              </h2>
              <CertaintyLegend />
            </div>
            {result ? (
              <div className="grid md:grid-cols-2 gap-4">
                {qa.map(({ key, field }) => (
                  <div key={key} className={`rounded-2xl bg-white border p-4 ${field === 'fit' ? 'border-leaf-200 md:col-span-2' : 'border-violet-100'}`}>
                    <h3 className="flex items-center gap-2 text-sm font-bold text-violet-900 mb-2">
                      {field === 'fit' && <Scale size={16} className="text-leaf-600" />}
                      {t(key)}
                    </h3>
                    <Statements items={result[field]} compact />
                  </div>
                ))}
              </div>
            ) : (
              <AIThinking />
            )}
            <p className="mt-5 flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 text-sm">
              <TriangleAlert size={18} className="shrink-0 mt-0.5" /> {t('compareDisclaimer')}
            </p>
          </section>
        </>
      )}
    </div>
  );
}

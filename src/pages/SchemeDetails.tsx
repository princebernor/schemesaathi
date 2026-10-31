import { useEffect, useState } from 'react';
import { ArrowLeft, Bookmark, BookmarkCheck, Building2, CalendarClock, CheckCircle2, ClipboardCheck, ExternalLink, FileText, Gift, GitCompareArrows, Info, ListOrdered, MapPin, Sparkles, Target, TriangleAlert } from 'lucide-react';
import { schemeById } from '../data/schemes';
import { categoryById } from '../data/categories';
import { ai } from '../lib/ai';
import { matchScheme } from '../lib/matching';
import { useStore } from '../state/store';
import { AIThinking, CertaintyLegend, LevelBadge, MatchBadge, Modal, Section, StatusBadge, Statements } from '../components/ui';
import AIPanel from '../components/AIPanel';
import { ApplyDialog, StatusPill } from '../components/Applications';
import type { AIStatement } from '../types';
import type { StringKey } from '../i18n/strings';

export default function SchemeDetails({ id }: { id: string }) {
  const { t, tx, lang, profile, saved, toggleSaved, compare, toggleCompare, checklist, addToChecklist, pushRecent, applications } = useStore();
  const [applying, setApplying] = useState(false);
  const s = schemeById(id);
  const [helps, setHelps] = useState<AIStatement[] | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [warn, setWarn] = useState(false);

  useEffect(() => {
    if (s) pushRecent(s.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    let live = true;
    setHelps(null);
    if (s) ai.howHelps(s, profile, lang).then((r) => live && setHelps(r));
    return () => {
      live = false;
    };
  }, [s, profile, lang]);

  if (!s) return <div className="max-w-3xl mx-auto p-10 text-center text-slate-500">{t('notFound')}</div>;

  const m = matchScheme(s, profile);
  const isSaved = saved.includes(s.id);
  const inCompare = compare.includes(s.id);
  const inChecklist = !!checklist[s.id];

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6 pb-28">
      <button onClick={() => history.back()} className="inline-flex items-center gap-1.5 text-navy-600 font-medium hover:underline mb-4">
        <ArrowLeft size={18} /> {t('back')}
      </button>

      <div className="grid xl:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start">
        <div className="space-y-5 min-w-0">
          <header className="card p-6">
            <div className="flex flex-wrap gap-2 mb-3">
              <LevelBadge s={s} />
              <StatusBadge s={s} />
              <MatchBadge m={m} />
              {s.categories.map((c) => {
                const cat = categoryById(c)!;
                return (
                  <span key={c} className="chip" style={{ background: cat.soft, color: cat.color }}>
                    {tx(cat.name)}
                  </span>
                );
              })}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold leading-tight">{tx(s.name)}</h1>
            {lang !== 'en' && <p className="text-sm text-slate-500 mt-1" lang="en">{t('officialName')}: {s.name.en}</p>}
            <p className="flex items-center gap-2 text-slate-600 mt-2">
              <Building2 size={17} /> {tx(s.department)}
            </p>
            <p className="flex items-center gap-2 text-slate-600 mt-1">
              <MapPin size={17} /> {t('availability')}: {s.level === 'central' ? t('allIndia') : s.state}
            </p>

            <div className="mt-5 rounded-2xl bg-leaf-50 border border-leaf-100 px-4 py-3">
              <div className="text-xs font-bold uppercase tracking-wide text-leaf-700">{t('c_financial')}</div>
              <div className="text-lg font-semibold text-slate-900">{tx(s.financial)}</div>
            </div>

            <div className="flex flex-wrap gap-2 mt-5">
              <button className="btn-green px-5 py-3 text-base" onClick={() => setLeaving(true)}>
                <ExternalLink size={18} /> {t('applyOfficial')}
              </button>
              <button className={`btn ${isSaved ? 'bg-leaf-50 text-leaf-700 border border-leaf-200' : 'btn-ghost'}`} onClick={() => toggleSaved(s.id)} aria-pressed={isSaved}>
                {isSaved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />} {isSaved ? t('saved') : t('save')}
              </button>
              <button
                className={`btn ${inCompare ? 'bg-navy-50 text-navy-700 border border-navy-600/40' : 'btn-ghost'}`}
                aria-pressed={inCompare}
                onClick={() => {
                  const ok = toggleCompare(s.id);
                  setWarn(!ok);
                }}
              >
                <GitCompareArrows size={18} /> {inCompare ? t('inCompare') : t('addCompare')}
              </button>
              {inChecklist ? (
                <a href="#/checklist" className="btn bg-navy-50 text-navy-700 border border-navy-100">
                  <ClipboardCheck size={18} /> {t('inChecklist')}
                </a>
              ) : (
                <button className="btn-ghost" onClick={() => addToChecklist(s.id)}>
                  <ClipboardCheck size={18} /> {t('addChecklist')}
                </button>
              )}
            </div>
            {/* applying is tracked separately from saving */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {applications[s.id] ? (
                <a href={`#/checklist/${s.id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-navy-700 hover:underline">
                  <StatusPill status={applications[s.id].status} /> {t('applications')} →
                </a>
              ) : (
                <button className="btn-sm btn border border-leaf-200 text-leaf-700 bg-white hover:bg-leaf-50" onClick={() => setApplying(true)}>
                  <ClipboardCheck size={16} /> {t('markApplied')}
                </button>
              )}
            </div>
            {warn && <p className="text-sm text-amber-700 mt-2">{t('compareMax')}</p>}
          </header>

          <section className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-violet-950 mb-3">
              <Sparkles size={18} className="text-violet-600" /> {t('howHelps')}
            </h2>
            {helps ? <Statements items={helps} /> : <AIThinking />}
            <div className="mt-3">
              <CertaintyLegend />
            </div>
          </section>

          <div className="grid md:grid-cols-2 gap-5">
            <Section title={t('overview')} icon={<Info size={18} className="text-navy-600" />}>
              <p className="text-slate-700 leading-relaxed">{tx(s.description)}</p>
            </Section>
            <Section title={t('objectives')} icon={<Target size={18} className="text-navy-600" />}>
              <ul className="space-y-1.5 text-slate-700">
                {s.benefitTypes.map((b) => (
                  <li key={b} className="flex gap-2">
                    <CheckCircle2 size={17} className="text-leaf-600 mt-0.5 shrink-0" /> {t(`bt_${b}` as StringKey)}
                  </li>
                ))}
              </ul>
            </Section>
            <Section title={t('benefits')} icon={<Gift size={18} className="text-leaf-600" />}>
              <ul className="space-y-1.5 text-slate-700">
                {s.benefits.map((b, i) => (
                  <li key={i} className="flex gap-2">
                    <CheckCircle2 size={17} className="text-leaf-600 mt-0.5 shrink-0" /> {tx(b)}
                  </li>
                ))}
              </ul>
            </Section>
            <Section title={t('eligibilityCriteria')} icon={<CheckCircle2 size={18} className="text-navy-600" />}>
              <ul className="space-y-1.5 text-slate-700 list-disc pl-5">
                {s.eligibility.map((e, i) => (
                  <li key={i}>{tx(e)}</li>
                ))}
              </ul>
            </Section>
            <Section title={t('requiredDocs')} icon={<FileText size={18} className="text-navy-600" />}>
              <ul className="space-y-1.5 text-slate-700 list-disc pl-5">
                {s.documents.map((d, i) => (
                  <li key={i}>{tx(d)}</li>
                ))}
              </ul>
            </Section>
            <Section title={t('howToApply')} icon={<ListOrdered size={18} className="text-navy-600" />}>
              <p className="chip bg-slate-100 text-slate-700 mb-2">{t(`applyMode_${s.applyMode}` as StringKey)}</p>
              <ol className="space-y-1.5 text-slate-700 list-decimal pl-5">
                {s.process.map((p, i) => (
                  <li key={i}>{tx(p)}</li>
                ))}
              </ol>
            </Section>
          </div>

          <section className="card p-5 grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-slate-500 flex items-center gap-1.5"><CalendarClock size={15} /> {t('deadline')}</div>
              <div className="font-semibold mt-0.5">{s.deadline ?? t('noDeadline')}</div>
            </div>
            <div>
              <div className="text-slate-500">{t('officialWebsite')}</div>
              <div className="font-semibold mt-0.5 break-all">
                {s.officialUrl.replace(/^https?:\/\//, '')} <span className="chip bg-amber-100 text-amber-800 ml-1">{t('demoLink')}</span>
              </div>
            </div>
            <div>
              <div className="text-slate-500">{t('officialSource')}</div>
              <div className="font-semibold mt-0.5">{s.sourceRef}</div>
            </div>
            <div>
              <div className="text-slate-500">{t('lastVerified')}</div>
              <div className="font-semibold mt-0.5 text-amber-700 flex items-center gap-1"><TriangleAlert size={15} /> {s.lastVerified}</div>
              <div className="text-xs text-slate-500 mt-0.5">{t('updated')}: {s.updatedAt} (demo)</div>
            </div>
          </section>
        </div>

        <aside className="xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto scrollbar-thin rounded-3xl">
          <AIPanel scheme={s} visibleIds={[s.id]} />
        </aside>
      </div>

      <ApplyDialog s={s} open={applying} onClose={() => setApplying(false)} />
      <Modal open={leaving} onClose={() => setLeaving(false)} title={t('leavingTitle')}>
        <p className="text-slate-600 leading-relaxed">{t('leavingBody')}</p>
        <p className="mt-3 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 font-mono text-sm break-all">{s.officialUrl}</p>
        <div className="flex justify-end gap-2 mt-5">
          <button className="btn-ghost" onClick={() => setLeaving(false)}>{t('cancel')}</button>
          <a className="btn-green" href={s.officialUrl} target="_blank" rel="noopener noreferrer" onClick={() => setLeaving(false)}>
            <ExternalLink size={17} /> {t('openPortal')}
          </a>
        </div>
      </Modal>
    </div>
  );
}

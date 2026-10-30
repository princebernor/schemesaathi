import { motion } from 'framer-motion';
import { Bookmark, BookmarkCheck, Building2, GitCompareArrows, MapPin, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useStore } from '../state/store';
import type { MatchResult, Scheme } from '../types';
import { LevelBadge, MatchBadge, StatusBadge } from './ui';

export default function SchemeCard({ s, m, focused, onFocus }: { s: Scheme; m: MatchResult; focused?: boolean; onFocus?: () => void }) {
  const { t, tx, saved, toggleSaved, compare, toggleCompare } = useStore();
  const [warn, setWarn] = useState(false);
  const isSaved = saved.includes(s.id);
  const inCompare = compare.includes(s.id);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`card p-5 transition ${focused ? 'ring-2 ring-violet-400/70 border-violet-200' : 'hover:border-navy-600/30'}`}
      onClick={onFocus}
    >
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <LevelBadge s={s} />
        <StatusBadge s={s} />
        <span className="ml-auto">
          <MatchBadge m={m} />
        </span>
      </div>
      <a href={`#/scheme/${s.id}`} onClick={(e) => e.stopPropagation()} className="block text-lg font-semibold text-navy-700 hover:underline leading-snug">
        {tx(s.name)}
      </a>
      <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-1">
        <Building2 size={14} className="shrink-0" /> <span className="line-clamp-1">{tx(s.department)}</span>
      </div>
      <p className="text-slate-700 mt-3 leading-relaxed">{tx(s.description)}</p>

      <div className="grid sm:grid-cols-2 gap-3 mt-4 text-sm">
        <div className="rounded-xl bg-leaf-50/70 px-3 py-2.5">
          <div className="text-[11px] font-bold uppercase tracking-wide text-leaf-700 mb-0.5">{t('mainBenefits')}</div>
          <div className="text-slate-800 font-medium">{tx(s.financial)}</div>
        </div>
        <div className="rounded-xl bg-navy-50/70 px-3 py-2.5">
          <div className="text-[11px] font-bold uppercase tracking-wide text-navy-700 mb-0.5">{t('eligibility')}</div>
          <div className="text-slate-800 line-clamp-2">{tx(s.eligibility[0])}</div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-3">
        <MapPin size={14} /> {t('availability')}: {s.level === 'central' ? t('allIndia') : s.state}
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
        <a href={`#/scheme/${s.id}`} className="btn-primary btn-sm">
          {t('viewDetails')}
        </a>
        <button
          className={`btn-sm btn ${inCompare ? 'bg-navy-50 text-navy-700 border border-navy-600/40' : 'btn-ghost'}`}
          aria-pressed={inCompare}
          onClick={() => {
            const ok = toggleCompare(s.id);
            setWarn(!ok);
            if (!ok) setTimeout(() => setWarn(false), 2500);
          }}
        >
          <GitCompareArrows size={16} /> {inCompare ? t('inCompare') : t('addCompare')}
        </button>
        <button className={`btn-sm btn ${isSaved ? 'text-leaf-700 bg-leaf-50' : 'text-slate-600 hover:bg-slate-100'}`} aria-pressed={isSaved} onClick={() => toggleSaved(s.id)}>
          {isSaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />} {isSaved ? t('saved') : t('save')}
        </button>
        {onFocus && (
          <button className="btn-sm btn text-violet-700 hover:bg-violet-50 ml-auto" onClick={onFocus}>
            <Sparkles size={16} /> {t('askAiAbout')}
          </button>
        )}
        {warn && <p className="w-full text-sm text-amber-700">{t('compareMax')}</p>}
      </div>
    </motion.article>
  );
}

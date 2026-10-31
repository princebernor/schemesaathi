import { AnimatePresence, motion } from 'framer-motion';
import { BadgeCheck, CircleHelp, Landmark, Sparkles, X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { useStore } from '../state/store';
import type { AIStatement, Certainty, MatchResult, Scheme } from '../types';

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={`relative w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'} max-h-[92vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-lift p-6`}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <h2 className="text-xl font-semibold">{title}</h2>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100" aria-label="Close">
                <X size={20} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Central Government / <State> Government / <UT> Administration (UT) / District-level label. */
export function levelLabel(s: Scheme, t: ReturnType<typeof useStore>['t'], tr: ReturnType<typeof useStore>['tr']) {
  const place = tr(s.state);
  if (s.level === 'central') return t('central');
  if (s.level === 'ut') return t('levelUT', { s: place });
  if (s.level === 'district') return t('levelDistrict', { d: (s.districts ?? []).map(tr).join(', '), s: place });
  return t('levelState', { s: place });
}

export function LevelBadge({ s }: { s: Scheme }) {
  const { t, tr } = useStore();
  const cls = { central: 'bg-navy-50 text-navy-700 border-navy-100', state: 'bg-leaf-50 text-leaf-700 border-leaf-100', ut: 'bg-sky-50 text-sky-700 border-sky-100', district: 'bg-amber-50 text-amber-800 border-amber-200' }[s.level];
  return (
    <span className={`chip border ${cls}`}>
      <Landmark size={12} /> {levelLabel(s, t, tr)}
    </span>
  );
}

export function StatusBadge({ s }: { s: Scheme }) {
  const { t } = useStore();
  const cls = { open: 'bg-emerald-50 text-emerald-700', seasonal: 'bg-amber-50 text-amber-700', check: 'bg-slate-100 text-slate-600' }[s.status];
  return (
    <span className={`chip ${cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" /> {t(`st_${s.status}` as const)}
    </span>
  );
}

export function MatchBadge({ m }: { m: MatchResult }) {
  const { t } = useStore();
  const cls = { likely: 'bg-leaf-600 text-white', check: 'bg-amber-100 text-amber-800', unlikely: 'bg-slate-100 text-slate-600' }[m.verdict];
  return (
    <span className={`chip ${cls}`} title={`${m.score}% ${t('match')}`}>
      {m.verdict === 'likely' ? <BadgeCheck size={13} /> : <CircleHelp size={13} />}
      {t(m.verdict)} · {m.score}%
    </span>
  );
}

const CERT_STYLE: Record<Certainty, { dot: string; key: 'legendConfirmed' | 'legendEstimated' | 'legendVerify' }> = {
  confirmed: { dot: 'bg-navy-600', key: 'legendConfirmed' },
  estimated: { dot: 'bg-violet-500', key: 'legendEstimated' },
  verify: { dot: 'bg-amber-500', key: 'legendVerify' },
};

export function CertaintyLegend() {
  const { t } = useStore();
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
      {(Object.keys(CERT_STYLE) as Certainty[]).map((k) => (
        <span key={k} className="inline-flex items-center gap-1">
          <span className={`w-2 h-2 rounded-full ${CERT_STYLE[k].dot}`} /> {t(CERT_STYLE[k].key)}
        </span>
      ))}
    </div>
  );
}

export function Statements({ items, compact }: { items: AIStatement[]; compact?: boolean }) {
  const { t, tr } = useStore();
  return (
    <ul className={compact ? 'space-y-1.5' : 'space-y-2'}>
      {items.map((s, i) => (
        <li key={i} className="flex gap-2 text-sm leading-relaxed">
          <span className={`mt-1.5 w-2 h-2 shrink-0 rounded-full ${CERT_STYLE[s.certainty].dot}`} title={t(CERT_STYLE[s.certainty].key)} />
          <span className={s.certainty === 'verify' ? 'text-amber-900' : ''}>{tr(s.text)}</span>
        </li>
      ))}
    </ul>
  );
}

export function AIThinking() {
  const { t } = useStore();
  return (
    <div className="flex items-center gap-2 text-sm text-violet-600">
      <Sparkles size={15} className="animate-pulse" /> {t('aiThinking')}
    </div>
  );
}

export function Section({ title, icon, children, className = '' }: { title: string; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card p-5 ${className}`}>
      <h3 className="flex items-center gap-2 text-base font-semibold mb-3">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

export function OptionGrid<T extends string>({ value, onChange, options, cols = 2 }: { value?: T; onChange: (v: T) => void; options: { v: T; label: string }[]; cols?: number }) {
  return (
    <div className={`grid gap-2 ${cols === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`} role="radiogroup">
      {options.map((o) => (
        <button
          type="button"
          key={o.v}
          role="radio"
          aria-checked={value === o.v}
          onClick={() => onChange(o.v)}
          className={`text-left rounded-xl border px-4 py-3 font-medium transition ${value === o.v ? 'border-navy-600 bg-navy-50 text-navy-800 ring-2 ring-navy-600/20' : 'border-slate-200 bg-white hover:border-navy-600/40'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

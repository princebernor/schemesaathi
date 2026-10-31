import { useState } from 'react';
import { BadgeCheck, CircleDashed, ClipboardCheck, ExternalLink, FileText, FlaskConical, Hourglass, Send, ShieldQuestion, Trash2, Wallet, XCircle, type LucideIcon } from 'lucide-react';
import { schemeById } from '../data/schemes';
import { categoryById } from '../data/categories';
import { useStore } from '../state/store';
import { Modal } from './ui';
import type { StringKey } from '../i18n/strings';
import type { Application, ApplicationStatus, Notice, Scheme } from '../types';

type ShownStatus = ApplicationStatus | 'saved' | 'not_applied';

export const STATUS_META: Record<ShownStatus, { cls: string; icon: LucideIcon }> = {
  saved: { cls: 'bg-navy-50 text-navy-700 border-navy-100', icon: ClipboardCheck },
  not_applied: { cls: 'bg-slate-100 text-slate-600 border-slate-200', icon: CircleDashed },
  in_progress: { cls: 'bg-sky-50 text-sky-700 border-sky-100', icon: Hourglass },
  submitted: { cls: 'bg-indigo-50 text-indigo-700 border-indigo-100', icon: Send },
  under_verification: { cls: 'bg-amber-50 text-amber-800 border-amber-200', icon: ShieldQuestion },
  docs_required: { cls: 'bg-orange-50 text-orange-800 border-orange-200', icon: FileText },
  approved: { cls: 'bg-leaf-50 text-leaf-700 border-leaf-100', icon: BadgeCheck },
  rejected: { cls: 'bg-red-50 text-red-700 border-red-100', icon: XCircle },
  disbursed: { cls: 'bg-emerald-600 text-white border-emerald-600', icon: Wallet },
};

export function StatusPill({ status }: { status: ShownStatus }) {
  const { t } = useStore();
  const m = STATUS_META[status];
  return (
    <span className={`chip border ${m.cls}`}>
      <m.icon size={13} /> {t(`as_${status}` as StringKey)}
    </span>
  );
}

const approvalOf = (s: ApplicationStatus) => (s === 'approved' || s === 'disbursed' ? 'approved' : s === 'rejected' ? 'rejected' : 'pending');
const paysOut = (s?: Scheme) => !!s && s.benefitTypes.some((b) => ['cash', 'pension', 'scholarship', 'subsidy', 'loan'].includes(b));

/** Only the transitions that make sense from the current status (not every status for every scheme). */
function nextSimulated(app: Application, s?: Scheme): ApplicationStatus[] {
  switch (app.status) {
    case 'submitted':
      return ['under_verification'];
    case 'under_verification':
      return ['approved', 'docs_required', 'rejected'];
    case 'approved':
      return paysOut(s) ? ['disbursed'] : [];
    default:
      return [];
  }
}

export function noticeText(n: Notice, t: ReturnType<typeof useStore>['t'], tx: ReturnType<typeof useStore>['tx']) {
  const s = schemeById(n.schemeId);
  return t(`n_${n.status}` as StringKey, { s: s ? tx(s.name) : n.schemeId });
}

// local calendar date (toISOString would give the UTC date, a day behind in India after midnight)
export const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const fmtDate = (iso: string, lang: string) => new Date(iso).toLocaleDateString(lang === 'en' ? 'en-IN' : `${lang}-IN`, { day: 'numeric', month: 'short', year: 'numeric' });

/** "I have applied" dialog: opens the official portal and records the application in the tracker. */
export function ApplyDialog({ s, open, onClose }: { s: Scheme; open: boolean; onClose: () => void }) {
  const { t, recordApplication, navigate } = useStore();
  const [appliedOn, setAppliedOn] = useState(today());
  const [reference, setReference] = useState('');
  const [status, setStatus] = useState<'submitted' | 'in_progress'>('submitted');
  const [err, setErr] = useState(false);
  return (
    <Modal open={open} onClose={onClose} title={t('appDialogTitle')}>
      <p className="text-slate-600 text-sm leading-relaxed">{t('appDialogSub')}</p>
      <a href={s.officialUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost w-full mt-4">
        <ExternalLink size={17} /> {t('openPortal')} <span className="text-xs text-amber-700">({t('demoLink')})</span>
      </a>
      <form
        className="mt-5 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!appliedOn || appliedOn > today()) return setErr(true);
          recordApplication(s.id, { appliedOn, reference: reference.trim() || undefined, status });
          onClose();
          navigate(`/checklist/${s.id}`);
        }}
      >
        <div>
          <label className="label" htmlFor="app-date">{t('appliedOn')} <span className="text-red-600 text-xs">*</span></label>
          <input id="app-date" type="date" className="field" max={today()} value={appliedOn} onChange={(e) => { setAppliedOn(e.target.value); setErr(false); }} aria-invalid={err || undefined} />
          {err && <p className="text-sm text-red-600 mt-1" role="alert">{t('errDate')}</p>}
        </div>
        <div>
          <label className="label" htmlFor="app-ref">{t('refNo')} <span className="text-slate-400 text-xs font-medium">({t('optional')})</span></label>
          <input id="app-ref" className="field" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. NSP2026XXXX" />
        </div>
        <fieldset>
          <legend className="label">{t('currentStatus')}</legend>
          <div className="grid grid-cols-2 gap-2">
            {(['in_progress', 'submitted'] as const).map((v) => (
              <button type="button" key={v} onClick={() => setStatus(v)} aria-pressed={status === v} className={`rounded-xl border px-3 py-2.5 text-sm font-medium ${status === v ? 'border-navy-600 bg-navy-50 text-navy-800' : 'border-slate-200'}`}>
                {t(`as_${v}`)}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-ghost" onClick={onClose}>{t('cancel')}</button>
          <button className="btn-green">
            <ClipboardCheck size={17} /> {t('addToTracker')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/** One tracked application with status, approval, documents, history and the demo status simulator. */
export function ApplicationCard({ app, highlight }: { app: Application; highlight?: boolean }) {
  const { t, tx, lang, setApplicationStatus, removeApplication } = useStore();
  const s = schemeById(app.schemeId);
  if (!s) return null;
  const cat = categoryById(s.categories[0]);
  const approval = approvalOf(app.status);
  const sims = nextSimulated(app, s);
  const userNext: [ApplicationStatus, StringKey] | null = app.status === 'in_progress' ? ['submitted', 'act_submit'] : app.status === 'docs_required' ? ['under_verification', 'act_docsSent'] : null;

  return (
    <article id={`app-${s.id}`} className={`card p-5 scroll-mt-28 ${highlight ? 'ring-2 ring-leaf-500/60' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <a href={`#/scheme/${s.id}`} className="text-lg font-semibold text-navy-700 hover:underline">{tx(s.name)}</a>
          {cat && <div className="mt-1"><span className="chip" style={{ background: cat.soft, color: cat.color }}>{tx(cat.name)}</span></div>}
        </div>
        <StatusPill status={app.status} />
      </div>

      <dl className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4 text-sm">
        <div><dt className="text-slate-500">{t('appliedOn')}</dt><dd className="font-semibold">{fmtDate(app.appliedOn, lang)}</dd></div>
        <div><dt className="text-slate-500">{t('refNo')}</dt><dd className="font-semibold break-all">{app.reference ?? '—'}</dd></div>
        <div>
          <dt className="text-slate-500">{t('approvalStatus')}</dt>
          <dd className={`font-semibold ${approval === 'approved' ? 'text-leaf-700' : approval === 'rejected' ? 'text-red-700' : 'text-amber-700'}`}>{t(`ap_${approval}`)}</dd>
        </div>
        <div><dt className="text-slate-500">{t('lastUpdated')}</dt><dd className="font-semibold">{fmtDate(app.updatedAt, lang)}</dd></div>
      </dl>

      <div className="grid md:grid-cols-2 gap-5 mt-4">
        <div>
          <h3 className="text-sm font-bold text-slate-600 mb-2">{t('relevantDocs')}</h3>
          <ul className="space-y-1 text-sm">
            {s.documents.map((d, i) => (
              <li key={i} className="flex gap-2"><FileText size={15} className="text-slate-400 shrink-0 mt-0.5" /> {tx(d)}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-600 mb-2">{t('statusHistory')}</h3>
          <ol className="relative border-l-2 border-slate-100 ml-1.5 space-y-2.5">
            {[...app.history].reverse().map((h, i) => (
              <li key={i} className="pl-4 relative text-sm">
                <span className={`absolute -left-[7px] top-1.5 w-3 h-3 rounded-full ${i === 0 ? 'bg-navy-600' : 'bg-slate-300'}`} />
                <span className="font-medium">{t(`as_${h.status}` as StringKey)}</span>
                <span className="text-slate-500"> · {fmtDate(h.at, lang)} · {h.source === 'demo' ? <span className="text-violet-700">{t('simulated')}</span> : t('byYou')}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-5">
        {userNext && (
          <button className="btn-primary btn-sm" onClick={() => setApplicationStatus(s.id, userNext[0], 'user')}>
            <Send size={15} /> {t(userNext[1])}
          </button>
        )}
        <button className="btn-sm btn text-slate-500 hover:bg-slate-100 ml-auto" onClick={() => removeApplication(s.id)}>
          <Trash2 size={15} /> {t('stopTracking')}
        </button>
      </div>

      {sims.length > 0 && (
        <div className="mt-4 rounded-xl border border-dashed border-violet-300 bg-violet-50/50 p-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-violet-900">
            <FlaskConical size={16} /> {t('simulateTitle')}
          </div>
          <p className="text-xs text-violet-800/80 mt-0.5">{t('simulateNote')}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {sims.map((st) => (
              <button key={st} className="btn-sm btn bg-white border border-violet-200 text-violet-800 hover:bg-violet-100" onClick={() => setApplicationStatus(s.id, st, 'demo')}>
                → {t(`as_${st}` as StringKey)}
              </button>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

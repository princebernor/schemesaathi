import { useState } from 'react';
import { Bookmark, CheckCircle2, ClipboardCheck, Clock, Languages, MapPin, Pencil, RotateCcw, Trash2, UserRound } from 'lucide-react';
import { schemeById, SCHEMES } from '../data/schemes';
import { categoryById } from '../data/categories';
import { LANGUAGES, type StringKey } from '../i18n/strings';
import { matchScheme } from '../lib/matching';
import { useStore } from '../state/store';
import SchemeCard from '../components/SchemeCard';
import { LocationStep } from '../components/LocationPicker';
import { Modal, Section } from '../components/ui';
import type { Lang, Profile } from '../types';

/* ---------------- My Profile ---------------- */
export function MyProfile() {
  const { t, tx, profile, lang, setLang, location, setLocation, resetAll } = useStore();
  const [editLoc, setEditLoc] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const cat = categoryById(profile.category);

  const yn = (v?: string) => (v === 'yes' ? t('yes') : v === 'no' ? t('no') : undefined);
  const opt = (map: Record<string, StringKey>, v?: string) => (v && map[v] ? t(map[v]) : undefined);
  const rows: [StringKey, string | number | undefined][] = [
    ['category', cat ? tx(cat.name) : undefined],
    ['age', profile.age],
    ['gender', opt({ male: 'male', female: 'female', other: 'other' }, profile.gender)],
    ['annualIncome', profile.income ? t(`inc_${profile.income}` as StringKey) : undefined],
    ['socialCategory', opt({ general: 'scGeneral', obc: 'scObc', sc: 'scSc', st: 'scSt', na: 'scNa' }, profile.socialCategory)],
    ['educationLevel', opt({ school: 'eduSchool', hsc: 'eduHsc', iti: 'eduIti', diploma: 'eduDiploma', ug: 'eduUg', pg: 'eduPg' }, profile.education)],
    ['govtSchool', yn(profile.govtSchool)],
    ['landOwnership', opt({ owner: 'owner', tenant: 'tenant', labourer: 'labourer' }, profile.landOwnership)],
    ['landAcres', profile.landAcres],
    ['businessType', opt({ manufacturing: 'manufacturing', services: 'services', trading: 'trading', artisan: 'artisan', vendor: 'streetVendor' }, profile.businessType)],
    ['disabilityPercent', profile.disabilityPercent !== undefined ? `${profile.disabilityPercent}%` : undefined],
    ['headOfFamily', yn(profile.headOfFamily)],
    ['bplCard', yn(profile.bplCard)],
  ];
  const shown = rows.filter(([k, v]) => v !== undefined || ['category', 'age', 'gender', 'annualIncome'].includes(k));

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-5">
      <div className="flex items-center gap-4">
        <span className="grid place-items-center w-16 h-16 rounded-2xl bg-navy-600 text-white">
          <UserRound size={32} />
        </span>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{t('myProfile')}</h1>
          <p className="text-slate-500">{location ? `${location.district}, ${location.state}` : ''}</p>
        </div>
      </div>

      <Section title={t('personalInfo')} icon={<UserRound size={18} className="text-navy-600" />}>
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
          {shown.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 border-b border-slate-100 pb-2">
              <dt className="text-slate-500 text-sm">{t(k)}</dt>
              <dd className={`font-medium text-right ${v === undefined ? 'text-slate-400' : ''}`}>{v ?? t('notProvided')}</dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-wrap gap-2 mt-5">
          <a href="#/profile-setup" className="btn-primary">
            <Pencil size={17} /> {t('updateDetails')}
          </a>
          <a href="#/" className="btn-ghost">{t('category')}</a>
        </div>
      </Section>

      <div className="grid md:grid-cols-2 gap-5">
        <Section title={t('stepLocation')} icon={<MapPin size={18} className="text-leaf-600" />}>
          <p className="text-lg font-semibold">{location ? `${location.district}, ${location.state}` : t('notProvided')}</p>
          <p className="text-xs text-slate-500 mt-1">{location?.source === 'gps' ? 'GPS (approximate)' : 'Manual'}</p>
          <button className="btn-ghost mt-4" onClick={() => setEditLoc(true)}>
            <MapPin size={17} /> {t('changeLocation')}
          </button>
        </Section>
        <Section title={t('language')} icon={<Languages size={18} className="text-navy-600" />}>
          <div className="grid grid-cols-2 gap-2">
            {LANGUAGES.map((l) => (
              <button key={l.code} onClick={() => setLang(l.code as Lang)} className={`rounded-xl border px-3 py-2 text-left ${lang === l.code ? 'border-navy-600 bg-navy-50' : 'border-slate-200 hover:border-navy-600/40'}`}>
                <span className="font-semibold">{l.label}</span>
                {!l.full && <span className="text-xs text-amber-700 ml-1">({t('demoLang')})</span>}
              </button>
            ))}
          </div>
        </Section>
      </div>

      <div className="text-right">
        <button className="btn text-red-600 hover:bg-red-50" onClick={() => setConfirmReset(true)}>
          <RotateCcw size={17} /> {t('resetAll')}
        </button>
      </div>

      <Modal open={editLoc} onClose={() => setEditLoc(false)} title={t('changeLocation')}>
        <LocationStep
          initial={location}
          submitLabel={t('confirmContinue')}
          onDone={(l) => {
            setLocation(l);
            setEditLoc(false);
          }}
        />
      </Modal>
      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title={t('resetAll')}>
        <p className="text-slate-600">{t('resetConfirm')}</p>
        <div className="flex justify-end gap-2 mt-5">
          <button className="btn-ghost" onClick={() => setConfirmReset(false)}>{t('cancel')}</button>
          <button className="btn bg-red-600 text-white hover:bg-red-700" onClick={resetAll}>
            <Trash2 size={17} /> {t('resetAll')}
          </button>
        </div>
      </Modal>
    </div>
  );
}

/* ---------------- Saved + recently viewed ---------------- */
export function Saved() {
  const { t, saved, recent, profile } = useStore();
  const [tab, setTab] = useState<'saved' | 'recent'>('saved');
  const ids = tab === 'saved' ? saved : recent;
  const list = ids.map(schemeById).filter(Boolean) as typeof SCHEMES;
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-28">
      <h1 className="text-2xl sm:text-3xl font-bold mb-5">{t('savedSchemes')}</h1>
      <div className="inline-flex rounded-xl bg-slate-100 p-1 mb-5" role="tablist">
        {(['saved', 'recent'] as const).map((k) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm ${tab === k ? 'bg-white shadow-sm text-navy-700' : 'text-slate-600'}`}>
            {k === 'saved' ? <Bookmark size={16} /> : <Clock size={16} />}
            {k === 'saved' ? `${t('navSaved')} (${saved.length})` : `${t('recentlyViewed')} (${recent.length})`}
          </button>
        ))}
      </div>
      <div className="space-y-4">
        {list.map((s) => (
          <SchemeCard key={s.id} s={s} m={matchScheme(s, profile)} />
        ))}
        {!list.length && <div className="card p-10 text-center text-slate-500">{tab === 'saved' ? t('savedEmpty') : t('recentEmpty')}</div>}
      </div>
    </div>
  );
}

/* ---------------- Application checklist ---------------- */
export function Checklist() {
  const { t, tx, checklist, toggleChecklistItem, removeFromChecklist } = useStore();
  const ids = Object.keys(checklist);
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
        <ClipboardCheck className="text-navy-600" /> {t('checklistTitle')}
      </h1>
      <p className="text-slate-600 mt-1 mb-6">{t('checklistSub')}</p>
      <div className="space-y-5">
        {ids.map((id) => {
          const s = schemeById(id);
          if (!s) return null;
          const done = checklist[id];
          const items = [...s.documents.map((d, i) => ({ key: `doc-${i}`, label: tx(d) })), ...s.process.map((p, i) => ({ key: `step-${i}`, label: tx(p) }))];
          const pct = Math.round((done.length / items.length) * 100);
          const Item = ({ k, label }: { k: string; label: string }) => (
            <label className={`flex items-start gap-3 rounded-xl px-3 py-2.5 cursor-pointer border ${done.includes(k) ? 'bg-leaf-50 border-leaf-100' : 'border-slate-100 hover:bg-slate-50'}`}>
              <input type="checkbox" className="w-5 h-5 mt-0.5 accent-leaf-600" checked={done.includes(k)} onChange={() => toggleChecklistItem(id, k)} />
              <span className={done.includes(k) ? 'line-through text-slate-500' : ''}>{label}</span>
            </label>
          );
          return (
            <section key={id} className="card p-5">
              <div className="flex flex-wrap items-start gap-3 justify-between">
                <a href={`#/scheme/${id}`} className="text-lg font-semibold text-navy-700 hover:underline">{tx(s.name)}</a>
                <button className="btn-sm btn text-slate-500 hover:bg-slate-100" onClick={() => removeFromChecklist(id)}>
                  <Trash2 size={15} /> {t('remove')}
                </button>
              </div>
              <div className="flex items-center gap-3 mt-3">
                <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-leaf-500 transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-sm font-semibold text-leaf-700 flex items-center gap-1">
                  {pct === 100 && <CheckCircle2 size={16} />} {pct}% {t('ready')}
                </span>
              </div>
              <div className="grid md:grid-cols-2 gap-5 mt-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-600 mb-2">{t('docsToCollect')}</h3>
                  <div className="space-y-2">{items.filter((i) => i.key.startsWith('doc')).map((i) => <Item key={i.key} k={i.key} label={i.label} />)}</div>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-600 mb-2">{t('stepsToFollow')}</h3>
                  <div className="space-y-2">{items.filter((i) => i.key.startsWith('step')).map((i) => <Item key={i.key} k={i.key} label={i.label} />)}</div>
                </div>
              </div>
            </section>
          );
        })}
        {!ids.length && (
          <div className="card p-10 text-center text-slate-500">
            {t('checklistEmpty')}
            <div className="mt-4"><a href="#/schemes" className="btn-primary">{t('navSchemes')}</a></div>
          </div>
        )}
      </div>
    </div>
  );
}

export type { Profile };

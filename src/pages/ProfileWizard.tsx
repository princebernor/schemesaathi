import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Pencil } from 'lucide-react';
import { useStore } from '../state/store';
import { CATEGORIES, categoryById } from '../data/categories';
import { LocationFields } from '../components/LocationPicker';
import { OptionGrid } from '../components/ui';
import type { StringKey } from '../i18n/strings';
import type { CategoryId, Profile } from '../types';

type Q =
  | { key: keyof Profile; label: StringKey; type: 'options'; options: [string, StringKey][]; cols?: number }
  | { key: keyof Profile; label: StringKey; type: 'number'; min: number; max: number };

const YN: [string, StringKey][] = [['yes', 'yes'], ['no', 'no']];

/** Category-specific questions: only what changes eligibility for that group. */
const CATEGORY_QS: Record<CategoryId, { title: StringKey; qs: Q[] }> = {
  farmer: {
    title: 'farmDetails',
    qs: [
      { key: 'landOwnership', label: 'landOwnership', type: 'options', options: [['owner', 'owner'], ['tenant', 'tenant'], ['labourer', 'labourer']], cols: 3 },
      { key: 'landAcres', label: 'landAcres', type: 'number', min: 0, max: 500 },
      { key: 'farmingType', label: 'farmingType', type: 'options', options: [['crops', 'crops'], ['dairy', 'dairy'], ['fisheries', 'fisheries'], ['horticulture', 'horticulture']] },
    ],
  },
  student: {
    title: 'studyDetails',
    qs: [
      { key: 'education', label: 'educationLevel', type: 'options', options: [['school', 'eduSchool'], ['hsc', 'eduHsc'], ['iti', 'eduIti'], ['diploma', 'eduDiploma'], ['ug', 'eduUg'], ['pg', 'eduPg']] },
      { key: 'institutionType', label: 'institutionType', type: 'options', options: [['govt', 'govt'], ['aided', 'aided'], ['private', 'private']], cols: 3 },
      { key: 'govtSchool', label: 'govtSchool', type: 'options', options: YN },
    ],
  },
  senior: {
    title: 'seniorDetails',
    qs: [
      { key: 'receivesPension', label: 'receivesPension', type: 'options', options: YN },
      { key: 'bplCard', label: 'bplCard', type: 'options', options: YN },
    ],
  },
  business: {
    title: 'businessDetails',
    qs: [
      { key: 'businessType', label: 'businessType', type: 'options', options: [['manufacturing', 'manufacturing'], ['services', 'services'], ['trading', 'trading'], ['artisan', 'artisan'], ['vendor', 'streetVendor']] },
      { key: 'businessStage', label: 'businessStage', type: 'options', options: [['idea', 'stageIdea'], ['new', 'stageNew'], ['existing', 'stageExisting']], cols: 3 },
    ],
  },
  women: {
    title: 'womenDetails',
    qs: [
      { key: 'headOfFamily', label: 'headOfFamily', type: 'options', options: YN },
      { key: 'shgMember', label: 'shgMember', type: 'options', options: YN },
    ],
  },
  pwd: {
    title: 'pwdDetails',
    qs: [{ key: 'disabilityPercent', label: 'disabilityPercent', type: 'number', min: 0, max: 100 }],
  },
  jobseeker: {
    title: 'jobDetails',
    qs: [
      { key: 'jobInterest', label: 'jobInterest', type: 'options', options: [['job', 'wantJob'], ['training', 'wantTraining'], ['self', 'wantSelf']], cols: 3 },
      { key: 'education', label: 'educationLevel', type: 'options', options: [['school', 'eduSchool'], ['hsc', 'eduHsc'], ['iti', 'eduIti'], ['diploma', 'eduDiploma'], ['ug', 'eduUg'], ['pg', 'eduPg']] },
      { key: 'employmentRegistered', label: 'employmentRegistered', type: 'options', options: YN },
    ],
  },
  general: {
    title: 'generalDetails',
    qs: [
      { key: 'rationCard', label: 'rationCard', type: 'options', options: [['phh', 'rcPhh'], ['aay', 'rcAay'], ['nphh', 'rcNphh'], ['none', 'rcNone']] },
      { key: 'ownsHouse', label: 'ownsHouse', type: 'options', options: YN },
    ],
  },
};

function Question({ q, draft, set }: { q: Q; draft: Profile; set: (p: Partial<Profile>) => void }) {
  const { t } = useStore();
  const value = draft[q.key];
  return (
    <div>
      <label className="label text-base">{t(q.label)}</label>
      {q.type === 'number' ? (
        <input
          type="number"
          inputMode="numeric"
          min={q.min}
          max={q.max}
          className="field max-w-[200px] text-lg"
          value={value === undefined ? '' : String(value)}
          onChange={(e) => set({ [q.key]: e.target.value === '' ? undefined : Math.max(q.min, Math.min(q.max, Number(e.target.value))) })}
        />
      ) : (
        <OptionGrid value={value as string | undefined} cols={q.cols} onChange={(v) => set({ [q.key]: v })} options={q.options.map(([v, k]) => ({ v, label: t(k) }))} />
      )}
    </div>
  );
}

export default function ProfileWizard() {
  const { t, tx, profile, updateProfile, setLocation, location, navigate } = useStore();
  const [draft, setDraft] = useState<Profile>({ ...profile, state: profile.state ?? location?.state, district: profile.district ?? location?.district });
  const [step, setStep] = useState(0);
  const set = (p: Partial<Profile>) => setDraft((d) => ({ ...d, ...p }));
  const cat = categoryById(draft.category);

  const steps = useMemo(() => {
    const list: { title: StringKey; optional: boolean; body: () => JSX.Element; valid?: () => boolean }[] = [
      {
        title: 'aboutYou',
        optional: false,
        valid: () => draft.age !== undefined && draft.age > 0,
        body: () => (
          <div className="space-y-6">
            <Question q={{ key: 'age', label: 'age', type: 'number', min: 1, max: 120 }} draft={draft} set={set} />
            <Question q={{ key: 'gender', label: 'gender', type: 'options', options: [['male', 'male'], ['female', 'female'], ['other', 'other']], cols: 3 }} draft={draft} set={set} />
          </div>
        ),
      },
    ];
    if (draft.category) {
      const cq = CATEGORY_QS[draft.category];
      list.push({ title: cq.title, optional: true, body: () => <div className="space-y-6">{cq.qs.map((q) => <Question key={q.key} q={q} draft={draft} set={set} />)}</div> });
    }
    list.push(
      {
        title: 'yourLocation',
        optional: false,
        valid: () => !!draft.state && !!draft.district,
        body: () => <LocationFields state={draft.state ?? ''} district={draft.district ?? ''} onChange={(s, d) => set({ state: s, district: d })} />,
      },
      {
        title: 'yourIncome',
        optional: true,
        body: () => (
          <div className="space-y-6">
            <Question q={{ key: 'income', label: 'annualIncome', type: 'options', options: [['lt1', 'inc_lt1'], ['1to2.5', 'inc_1to2.5'], ['2.5to4.5', 'inc_2.5to4.5'], ['4.5to8', 'inc_4.5to8'], ['gt8', 'inc_gt8']] }} draft={draft} set={set} />
            <Question q={{ key: 'socialCategory', label: 'socialCategory', type: 'options', options: [['general', 'scGeneral'], ['obc', 'scObc'], ['sc', 'scSc'], ['st', 'scSt'], ['na', 'scNa']] }} draft={draft} set={set} />
            {draft.category !== 'pwd' && (
              <Question q={{ key: 'disabilityPercent', label: 'disabilityPercent', type: 'number', min: 0, max: 100 }} draft={draft} set={set} />
            )}
          </div>
        ),
      },
    );
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  const cur = steps[step];
  const last = step === steps.length - 1;
  const canNext = !cur.valid || cur.valid();

  const finish = () => {
    updateProfile({ ...draft, completed: true });
    if (draft.state && draft.district && (draft.state !== location?.state || draft.district !== location?.district)) {
      setLocation({ state: draft.state, district: draft.district, source: 'manual' });
    }
    navigate('/schemes');
  };
  const next = () => (last ? finish() : setStep((s) => s + 1));

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{t('profileTitle')}</h1>
          <p className="text-slate-600 mt-1">{t('profileSub')}</p>
        </div>
        {cat && (
          <a href="#/" className="chip py-1.5 px-3 text-sm border" style={{ background: cat.soft, color: cat.color, borderColor: cat.ring }}>
            <cat.icon size={16} /> {tx(cat.name)} <Pencil size={13} className="opacity-60" />
          </a>
        )}
      </div>

      {!draft.category && (
        <div className="card p-5 mb-6">
          <div className="label">{t('category')}</div>
          <OptionGrid value={draft.category} onChange={(v) => set({ category: v })} options={CATEGORIES.map((c) => ({ v: c.id, label: tx(c.name) }))} />
        </div>
      )}

      <div className="card p-6 sm:p-8">
        <div className="flex items-center justify-between text-sm font-semibold text-slate-500 mb-2">
          <span>{t('stepOf', { a: step + 1, b: steps.length })}</span>
          {cur.optional && <span className="chip bg-slate-100 text-slate-600">{t('optional')}</span>}
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden mb-6" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={steps.length}>
          <motion.div className="h-full bg-gradient-to-r from-navy-600 to-leaf-500" animate={{ width: `${((step + 1) / steps.length) * 100}%` }} />
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }}>
            <h2 className="text-xl font-semibold mb-5">{t(cur.title)}</h2>
            {cur.body()}
          </motion.div>
        </AnimatePresence>

        <div className="flex flex-wrap items-center gap-3 mt-8 pt-6 border-t border-slate-100">
          <button className="btn-ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
            <ArrowLeft size={18} /> {t('previous')}
          </button>
          <div className="ml-auto flex gap-3">
            {cur.optional && !last && (
              <button className="btn text-slate-600 hover:bg-slate-100" onClick={next}>
                {t('skip')}
              </button>
            )}
            <button className={last ? 'btn-green px-6' : 'btn-primary px-6'} disabled={!canNext || !draft.category} onClick={next}>
              {last ? (
                <>
                  <Check size={18} /> {t('finish')}
                </>
              ) : (
                <>
                  {t('next')} <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Pencil, Search, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { SCHEMES } from '../data/schemes';
import { CATEGORIES, categoryById } from '../data/categories';
import { INCOME_BOUNDS, availableIn, rankSchemes } from '../lib/matching';
import { useStore } from '../state/store';
import SchemeCard from '../components/SchemeCard';
import AIPanel from '../components/AIPanel';
import type { StringKey } from '../i18n/strings';
import type { AppStatus, BenefitType, CategoryId, IncomeRange } from '../types';

const BENEFITS: BenefitType[] = ['cash', 'pension', 'loan', 'subsidy', 'insurance', 'scholarship', 'training', 'housing', 'food', 'health'];
const STATUSES: AppStatus[] = ['open', 'seasonal', 'check'];
const INCOMES: IncomeRange[] = ['lt1', '1to2.5', '2.5to4.5', '4.5to8', 'gt8'];
type Sort = 'relevant' | 'recent' | 'central' | 'state';

interface Filters {
  cats: CategoryId[];
  level: 'all' | 'central' | 'state';
  myState: boolean;
  gender: 'any' | 'female' | 'male';
  ageFit: boolean;
  income: IncomeRange | '';
  benefits: BenefitType[];
  statuses: AppStatus[];
}

const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

function FilterGroup({ title, children, defaultOpen = true }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-100 last:border-0 py-3">
      <button className="w-full flex items-center justify-between font-semibold text-[15px] text-navy-900" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {title}
        <ChevronDown size={18} className={`transition ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="pt-2.5 space-y-1.5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Check({ checked, onChange, label, count }: { checked: boolean; onChange: () => void; label: string; count?: number }) {
  return (
    <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer py-0.5 hover:text-navy-700">
      <input type="checkbox" checked={checked} onChange={onChange} className="w-4 h-4 rounded accent-navy-600" />
      <span className="flex-1">{label}</span>
      {count !== undefined && <span className="text-xs text-slate-400">{count}</span>}
    </label>
  );
}

function Radio({ checked, onChange, label, name }: { checked: boolean; onChange: () => void; label: string; name: string }) {
  return (
    <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer py-0.5">
      <input type="radio" name={name} checked={checked} onChange={onChange} className="w-4 h-4 accent-navy-600" />
      {label}
    </label>
  );
}

function Drawer({ open, onClose, side, title, children }: { open: boolean; onClose: () => void; side: 'left' | 'right'; title: string; children: ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
          <motion.aside
            role="dialog"
            aria-label={title}
            initial={{ x: side === 'left' ? '-100%' : '100%' }}
            animate={{ x: 0 }}
            exit={{ x: side === 'left' ? '-100%' : '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={`absolute top-0 bottom-0 ${side === 'left' ? 'left-0' : 'right-0'} w-[min(420px,92vw)] bg-white overflow-y-auto p-4`}
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold">{title}</h2>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100" aria-label="Close">
                <X size={20} />
              </button>
            </div>
            {children}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function Discover() {
  const { t, tx, profile, location } = useStore();
  const userState = profile.state ?? location?.state;
  const defaults = (): Filters => ({
    cats: profile.category ? [profile.category] : [],
    level: 'all',
    myState: true,
    gender: 'any',
    ageFit: false,
    income: '',
    benefits: [],
    statuses: [],
  });
  const [f, setF] = useState<Filters>(defaults);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('relevant');
  const [filterSearch, setFilterSearch] = useState('');
  const [focusId, setFocusId] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<'filters' | 'ai' | null>(null);

  const set = (p: Partial<Filters>) => setF((prev) => ({ ...prev, ...p }));

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = SCHEMES.filter((s) => {
      if (f.cats.length && !s.categories.some((c) => f.cats.includes(c))) return false;
      if (f.level !== 'all' && s.level !== f.level) return false;
      if (f.myState && !availableIn(s, userState)) return false;
      if (f.gender !== 'any' && s.rules.gender && s.rules.gender !== f.gender) return false;
      if (f.ageFit && profile.age !== undefined && ((s.rules.minAge ?? 0) > profile.age || (s.rules.maxAge ?? 200) < profile.age)) return false;
      if (f.income && s.rules.maxIncome !== undefined && INCOME_BOUNDS[f.income][0] >= s.rules.maxIncome) return false;
      if (f.benefits.length && !s.benefitTypes.some((b) => f.benefits.includes(b))) return false;
      if (f.statuses.length && !f.statuses.includes(s.status)) return false;
      if (needle) {
        const hay = [
          s.name.en, s.name.ta, s.description.en, s.description.ta, s.department.en, s.department.ta, s.state,
          ...s.categories.flatMap((c) => { const cat = categoryById(c)!; return [cat.name.en, cat.name.ta]; }),
          ...s.benefitTypes.map((b) => t(`bt_${b}` as StringKey)), ...s.benefitTypes,
        ].join(' ').toLowerCase();
        if (!needle.split(/\s+/).every((w) => hay.includes(w))) return false;
      }
      return true;
    });
    const ranked = rankSchemes(filtered, profile);
    if (sort === 'recent') ranked.sort((a, b) => b.scheme.updatedAt.localeCompare(a.scheme.updatedAt));
    if (sort === 'central') ranked.sort((a, b) => Number(b.scheme.level === 'central') - Number(a.scheme.level === 'central'));
    if (sort === 'state') ranked.sort((a, b) => Number(b.scheme.level === 'state') - Number(a.scheme.level === 'state'));
    return ranked;
  }, [f, q, sort, profile, userState, t]);

  useEffect(() => {
    if (!focusId || !results.some((r) => r.scheme.id === focusId)) setFocusId(results[0]?.scheme.id ?? null);
  }, [results, focusId]);

  const focusScheme = results.find((r) => r.scheme.id === focusId)?.scheme ?? null;
  const fs = filterSearch.trim().toLowerCase();
  const show = (label: string) => !fs || label.toLowerCase().includes(fs);
  const activeCount = f.cats.length + f.benefits.length + f.statuses.length + (f.level !== 'all' ? 1 : 0) + (f.gender !== 'any' ? 1 : 0) + (f.ageFit ? 1 : 0) + (f.income ? 1 : 0) + (f.myState ? 0 : 1);
  const cat = categoryById(profile.category);

  const filterPanel = (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <SlidersHorizontal size={18} /> {t('filters')}
        </h2>
        <button className="text-sm text-navy-600 hover:underline" onClick={() => setF({ ...defaults(), cats: [], myState: false })}>
          {t('clearAll')}
        </button>
      </div>
      <div className="relative my-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input className="field pl-9 py-2 text-sm" placeholder={t('searchFilters')} value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)} />
      </div>
      <FilterGroup title={t('categories')}>
        {CATEGORIES.filter((c) => show(tx(c.name))).map((c) => (
          <Check key={c.id} checked={f.cats.includes(c.id)} onChange={() => set({ cats: toggle(f.cats, c.id) })} label={tx(c.name)} count={SCHEMES.filter((s) => s.categories.includes(c.id)).length} />
        ))}
      </FilterGroup>
      <FilterGroup title={t('state')}>
        <Check checked={f.myState} onChange={() => set({ myState: !f.myState })} label={`${t('myStateOnly')}${userState ? ` (${userState})` : ''}`} />
      </FilterGroup>
      <FilterGroup title={t('govLevel')}>
        {(['all', 'central', 'state'] as const).filter((l) => show(l === 'all' ? t('any') : t(l === 'central' ? 'central' : 'stateGov'))).map((l) => (
          <Radio key={l} name="level" checked={f.level === l} onChange={() => set({ level: l })} label={l === 'all' ? t('any') : t(l === 'central' ? 'central' : 'stateGov')} />
        ))}
      </FilterGroup>
      <FilterGroup title={t('genderElig')} defaultOpen={false}>
        {(['any', 'female', 'male'] as const).map((g) => (
          <Radio key={g} name="gender" checked={f.gender === g} onChange={() => set({ gender: g })} label={t(g)} />
        ))}
      </FilterGroup>
      <FilterGroup title={t('ageElig')} defaultOpen={false}>
        <Check checked={f.ageFit} onChange={() => set({ ageFit: !f.ageFit })} label={profile.age !== undefined ? `${t('ageElig')} (${profile.age})` : t('ageElig')} />
      </FilterGroup>
      <FilterGroup title={t('incomeElig')} defaultOpen={false}>
        <Radio name="income" checked={f.income === ''} onChange={() => set({ income: '' })} label={t('any')} />
        {INCOMES.filter((i) => show(t(`inc_${i}` as StringKey))).map((i) => (
          <Radio key={i} name="income" checked={f.income === i} onChange={() => set({ income: i })} label={t(`inc_${i}` as StringKey)} />
        ))}
      </FilterGroup>
      <FilterGroup title={t('benefitType')}>
        {BENEFITS.filter((b) => show(t(`bt_${b}` as StringKey))).map((b) => (
          <Check key={b} checked={f.benefits.includes(b)} onChange={() => set({ benefits: toggle(f.benefits, b) })} label={t(`bt_${b}` as StringKey)} count={SCHEMES.filter((s) => s.benefitTypes.includes(b)).length} />
        ))}
      </FilterGroup>
      <FilterGroup title={t('appStatus')} defaultOpen={false}>
        {STATUSES.map((st) => (
          <Check key={st} checked={f.statuses.includes(st)} onChange={() => set({ statuses: toggle(f.statuses, st) })} label={t(`st_${st}` as StringKey)} />
        ))}
      </FilterGroup>
    </div>
  );

  const aiPanel = <AIPanel scheme={focusScheme} visibleIds={results.map((r) => r.scheme.id)} />;

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6 pb-28">
      <div className="grid lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)_380px] gap-6 items-start">
        <aside className="hidden lg:block card p-4 sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto scrollbar-thin">{filterPanel}</aside>

        <main className="min-w-0">
          {cat && (
            <div className="flex flex-wrap items-center gap-2 mb-3 text-sm">
              <span className="text-slate-500">{t('showingFor')}:</span>
              <span className="chip py-1 px-3 border" style={{ background: cat.soft, color: cat.color, borderColor: cat.ring }}>
                <cat.icon size={14} /> {tx(cat.name)}
              </span>
              {userState && <span className="chip py-1 px-3 bg-white border border-slate-200 text-slate-600">{profile.district ? `${profile.district}, ` : ''}{userState}</span>}
              <a href="#/profile-setup" className="inline-flex items-center gap-1 text-navy-600 font-medium hover:underline ml-1">
                <Pencil size={13} /> {t('editProfile')}
              </a>
            </div>
          )}
          <div className="card p-3 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={20} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} className="field pl-11 py-3" placeholder={t('searchPlaceholder')} aria-label={t('searchPlaceholder')} />
              {q && (
                <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-slate-100" aria-label={t('clear')}>
                  <X size={16} />
                </button>
              )}
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600 shrink-0">
              <span className="whitespace-nowrap">{t('sortBy')}</span>
              <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="field py-2.5 text-sm">
                <option value="relevant">{t('sortRelevant')}</option>
                <option value="recent">{t('sortRecent')}</option>
                <option value="central">{t('sortCentral')}</option>
                <option value="state">{t('sortState')}</option>
              </select>
            </label>
          </div>

          <div className="flex items-center gap-2 mt-4 mb-3">
            <p className="text-sm font-semibold text-slate-600" aria-live="polite">
              {t('results', { n: results.length })}
            </p>
            <div className="ml-auto flex gap-2">
              <button className="btn-ghost btn-sm lg:hidden" onClick={() => setDrawer('filters')}>
                <SlidersHorizontal size={16} /> {t('filtersBtn')}
                {activeCount > 0 && <span className="chip bg-navy-600 text-white px-1.5 py-0">{activeCount}</span>}
              </button>
              <button className="btn-sm btn bg-violet-600 text-white hover:bg-violet-700 xl:hidden" onClick={() => setDrawer('ai')}>
                <Sparkles size={16} /> {t('aiBtn')}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {results.map(({ scheme, match }) => (
              <SchemeCard
                key={scheme.id}
                s={scheme}
                m={match}
                focused={scheme.id === focusId}
                onFocus={() => {
                  setFocusId(scheme.id);
                  if (window.innerWidth < 1280) setDrawer('ai');
                }}
              />
            ))}
            {!results.length && <div className="card p-10 text-center text-slate-500">{t('noResults')}</div>}
          </div>
        </main>

        <aside className="hidden xl:block sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto scrollbar-thin rounded-3xl">{aiPanel}</aside>
      </div>

      <Drawer open={drawer === 'filters'} onClose={() => setDrawer(null)} side="left" title={t('filters')}>
        {filterPanel}
      </Drawer>
      <Drawer open={drawer === 'ai'} onClose={() => setDrawer(null)} side="right" title={t('aiTitle')}>
        {aiPanel}
      </Drawer>
    </div>
  );
}

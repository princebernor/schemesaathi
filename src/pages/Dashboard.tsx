import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, Clock, LayoutList, MapPin } from 'lucide-react';
import Character from '../components/Character';
import { CATEGORIES, type Category } from '../data/categories';
import { SCHEMES, schemeById } from '../data/schemes';
import { availableIn } from '../lib/matching';
import { useStore } from '../state/store';
import type { CategoryId } from '../types';

const useNoHover = () => {
  const [v, setV] = useState(() => window.matchMedia('(hover: none)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(hover: none)');
    const on = () => setV(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return v;
};

function CategoryCard({ c, active, count, onEnter, onLeave, onSelect, offset = 0 }: { c: Category; active: boolean; count: number; onEnter: (el: HTMLElement) => void; onLeave: () => void; onSelect: (el: HTMLElement) => void; offset?: number }) {
  const { tx, t } = useStore();
  const Icon = c.icon;
  return (
    <motion.button
      type="button"
      onMouseEnter={(e) => onEnter(e.currentTarget)}
      onMouseLeave={onLeave}
      onFocus={(e) => onEnter(e.currentTarget)}
      onBlur={onLeave}
      onClick={(e) => onSelect(e.currentTarget)}
      animate={{ scale: active ? 1.04 : 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      style={{ ['--off' as string]: `${offset}px`, borderColor: active ? c.ring : undefined, boxShadow: active ? `0 10px 30px -8px ${c.ring}` : undefined }}
      className="group relative w-full text-left rounded-2xl border border-slate-200 bg-white p-4 shadow-card transition-colors lg:left-[var(--off)]"
      aria-label={tx(c.name)}
    >
      <div className="flex items-center gap-3">
        <span className="grid place-items-center w-12 h-12 rounded-xl shrink-0 transition" style={{ background: c.soft, color: c.color }}>
          <Icon size={26} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-[17px] text-navy-900 leading-snug">{tx(c.name)}</div>
          <div className="text-xs text-slate-500">
            {count} {t('schemesAvailable')}
          </div>
        </div>
        <ArrowRight size={18} className={`shrink-0 transition ${active ? 'translate-x-0.5' : 'opacity-30'}`} style={{ color: c.color }} />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {c.items.map((it) => (
          <span key={it.en} className="chip" style={{ background: c.soft, color: c.color }}>
            {tx(it)}
          </span>
        ))}
      </div>
      {active && <span className="absolute inset-y-3 -left-px w-1 rounded-full" style={{ background: c.color }} />}
    </motion.button>
  );
}

export default function Dashboard() {
  const { t, tx, location, profile, updateProfile, navigate, recent, setLocationModal } = useStore();
  const [hover, setHover] = useState<{ id: CategoryId; rect: DOMRect } | null>(null);
  const [tapped, setTapped] = useState<CategoryId | null>(null);
  const noHover = useNoHover();

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of CATEGORIES) m[c.id] = SCHEMES.filter((s) => s.categories.includes(c.id) && availableIn(s, location?.state)).length;
    return m;
  }, [location]);

  const select = (id: CategoryId) => {
    if (profile.category !== id) updateProfile({ category: id, completed: false });
    navigate('/profile-setup');
  };

  const onEnter = (id: CategoryId) => (el: HTMLElement) => setHover({ id, rect: el.getBoundingClientRect() });
  const onCard = (id: CategoryId) => (el: HTMLElement) => {
    if (noHover) {
      setTapped(id);
      setHover({ id, rect: el.getBoundingClientRect() });
    } else select(id);
  };

  const activeId = hover?.id ?? tapped;
  const active = CATEGORIES.find((c) => c.id === activeId);
  const left = CATEGORIES.filter((c) => c.side === 'left');
  const right = CATEGORIES.filter((c) => c.side === 'right');
  // arc layout: middle cards sit closer to the character
  const arc = [0, 28, 28, 0];

  const renderCard = (c: Category, i: number, side: 'left' | 'right') => (
    <CategoryCard
      key={c.id}
      c={c}
      count={counts[c.id]}
      active={activeId === c.id}
      offset={(side === 'left' ? 1 : -1) * arc[i]}
      onEnter={(el) => !noHover && onEnter(c.id)(el)}
      onLeave={() => !noHover && setHover(null)}
      onSelect={(el) => onCard(c.id)(el)}
    />
  );

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6 lg:py-10">
      <div className="text-center max-w-2xl mx-auto mb-6 lg:mb-10">
        <button onClick={() => setLocationModal(true)} className="chip bg-leaf-50 text-leaf-700 border border-leaf-100 mb-3 py-1 px-3 text-sm">
          <MapPin size={14} /> {location ? `${location.district}, ${location.state}` : t('changeLocation')}
        </button>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">{t('dashHello')}</h1>
        <p className="mt-2 text-slate-600 text-lg">{noHover ? t('dashTapSub') : t('dashSub')}</p>
      </div>

      {/* Desktop: cards arranged around the character */}
      <div className="hidden lg:grid grid-cols-[1fr_minmax(320px,400px)_1fr] gap-6 xl:gap-10 items-center">
        <div className="grid gap-4 max-w-[360px] justify-self-end w-full">{left.map((c, i) => renderCard(c, i, 'left'))}</div>
        <div className="relative flex flex-col items-center">
          <div className="idle w-full">
            <Character target={hover?.rect ?? null} className="w-full h-auto" />
          </div>
          <Bubble active={active} tx={tx} t={t} />
        </div>
        <div className="grid gap-4 max-w-[360px] w-full">{right.map((c, i) => renderCard(c, i, 'right'))}</div>
      </div>

      {/* Tablet / mobile: character on top, tap to select */}
      <div className="lg:hidden">
        <div className="max-w-[190px] sm:max-w-[240px] mx-auto">
          <Character target={hover?.rect ?? null} className="w-full h-auto" />
        </div>
        <Bubble active={active} tx={tx} t={t} />
        {tapped && (
          <div className="sticky bottom-3 z-30 mt-3 flex justify-center">
            <button className="btn-green shadow-lift px-6 py-3 text-base" onClick={() => select(tapped)}>
              {t('continue')}: {tx(CATEGORIES.find((c) => c.id === tapped)!.name)} <ArrowRight size={18} />
            </button>
          </div>
        )}
        <div className="grid sm:grid-cols-2 gap-3 mt-5">{CATEGORIES.map((c, i) => renderCard(c, i % 4, c.side))}</div>
      </div>

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <a href="#/schemes" className="btn-ghost">
          <LayoutList size={18} /> {t('exploreAll')}
        </a>
        {profile.completed && profile.category && (
          <a href="#/schemes" className="btn-primary">
            <Check size={18} /> {t('showingFor')}: {tx(CATEGORIES.find((c) => c.id === profile.category)!.name)}
          </a>
        )}
      </div>

      {recent.length > 0 && (
        <section className="mt-10 max-w-5xl mx-auto">
          <h2 className="flex items-center gap-2 text-lg font-semibold mb-3">
            <Clock size={18} /> {t('recentlyViewed')}
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
            {recent.map((id) => {
              const s = schemeById(id);
              return s ? (
                <a key={id} href={`#/scheme/${id}`} className="card px-4 py-3 min-w-[240px] max-w-[260px] hover:border-navy-600/40">
                  <div className="font-semibold text-sm text-navy-900 line-clamp-2">{tx(s.name)}</div>
                  <div className="text-xs text-slate-500 mt-1 line-clamp-1">{tx(s.financial)}</div>
                </a>
              ) : null;
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function Bubble({ active, tx, t }: { active?: Category; tx: ReturnType<typeof useStore>['tx']; t: ReturnType<typeof useStore>['t'] }) {
  return (
    <div className="relative mt-2 w-full max-w-[380px] mx-auto min-h-[96px]" aria-live="polite">
      <AnimatePresence mode="wait">
        <motion.div
          key={active?.id ?? 'none'}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="relative rounded-2xl bg-white border border-slate-200 shadow-card px-5 py-4 text-center"
          style={active ? { borderColor: active.ring } : undefined}
        >
          <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 bg-white border-l border-t" style={{ borderColor: active?.ring ?? '#e2e8f0' }} />
          {active ? (
            <>
              <div className="font-semibold" style={{ color: active.color }}>{tx(active.name)}</div>
              <p className="text-sm text-slate-600 mt-1">{tx(active.tagline)}</p>
            </>
          ) : (
            <p className="text-sm text-slate-600">{t('dashSub')}</p>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

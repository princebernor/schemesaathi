import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DICTS, EN, type StringKey } from '../i18n/strings';
import type { Lang, LText, Location, Profile } from '../types';

/* ---------- localStorage helpers (wrapped: storage can be unavailable) ---------- */
const PREFIX = 'schemesaathi:';
function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function persist(key: string, value: unknown) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}
function usePersisted<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => load(key, fallback));
  useEffect(() => persist(key, value), [key, value]);
  return [value, setValue] as const;
}

/* ---------- hash router ---------- */
export type Route =
  | { name: 'dashboard' }
  | { name: 'profile-setup' }
  | { name: 'schemes' }
  | { name: 'scheme'; id: string }
  | { name: 'compare' }
  | { name: 'me' }
  | { name: 'saved' }
  | { name: 'checklist' };

function parseHash(): Route {
  const [, page, id] = window.location.hash.replace(/^#/, '').split('/');
  switch (page) {
    case 'profile-setup':
    case 'schemes':
    case 'compare':
    case 'me':
    case 'saved':
    case 'checklist':
      return { name: page };
    case 'scheme':
      return id ? { name: 'scheme', id } : { name: 'schemes' };
    default:
      return { name: 'dashboard' };
  }
}

/* ---------- context ---------- */
interface Store {
  route: Route;
  navigate: (path: string) => void;

  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: StringKey, vars?: Record<string, string | number>) => string;
  tx: (text: LText) => string;

  onboarded: boolean;
  setOnboarded: (v: boolean) => void;
  location: Location | null;
  setLocation: (l: Location) => void;

  profile: Profile;
  updateProfile: (p: Partial<Profile>) => void;

  saved: string[];
  toggleSaved: (id: string) => void;
  recent: string[];
  pushRecent: (id: string) => void;

  compare: string[];
  toggleCompare: (id: string) => boolean;
  setCompare: (ids: string[]) => void;

  checklist: Record<string, string[]>;
  addToChecklist: (id: string) => void;
  removeFromChecklist: (id: string) => void;
  toggleChecklistItem: (id: string, item: string) => void;

  notifRead: string[];
  setNotifRead: (ids: string[]) => void;

  locationModal: boolean;
  setLocationModal: (v: boolean) => void;

  resetAll: () => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<Route>(parseHash);
  const [lang, setLang] = usePersisted<Lang>('lang', 'en');
  const [onboarded, setOnboarded] = usePersisted('onboarded', false);
  const [location, setLocationRaw] = usePersisted<Location | null>('location', null);
  const [profile, setProfile] = usePersisted<Profile>('profile', {});
  const [saved, setSaved] = usePersisted<string[]>('saved', []);
  const [recent, setRecent] = usePersisted<string[]>('recent', []);
  const [compare, setCompare] = usePersisted<string[]>('compare', []);
  const [checklist, setChecklist] = usePersisted<Record<string, string[]>>('checklist', {});
  const [notifRead, setNotifRead] = usePersisted<string[]>('notifRead', []);
  const [locationModal, setLocationModal] = useState(false);

  useEffect(() => {
    const onHash = () => {
      setRoute(parseHash());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const navigate = useCallback((path: string) => {
    window.location.hash = path;
  }, []);

  const t = useCallback(
    (key: StringKey, vars?: Record<string, string | number>) => {
      let s = DICTS[lang][key] ?? EN[key] ?? key;
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
      return s;
    },
    [lang],
  );
  const tx = useCallback((text: LText) => (lang === 'ta' ? text.ta : text.en), [lang]);

  const setLocation = useCallback(
    (l: Location) => {
      setLocationRaw(l);
      setProfile((p) => ({ ...p, state: l.state, district: l.district }));
    },
    [setLocationRaw, setProfile],
  );

  const store: Store = useMemo(
    () => ({
      route,
      navigate,
      lang,
      setLang,
      t,
      tx,
      onboarded,
      setOnboarded,
      location,
      setLocation,
      profile,
      updateProfile: (p) => setProfile((prev) => ({ ...prev, ...p })),
      saved,
      toggleSaved: (id) => setSaved((s) => (s.includes(id) ? s.filter((x) => x !== id) : [id, ...s])),
      recent,
      pushRecent: (id) => setRecent((r) => [id, ...r.filter((x) => x !== id)].slice(0, 8)),
      compare,
      toggleCompare: (id) => {
        if (compare.includes(id)) {
          setCompare(compare.filter((x) => x !== id));
          return true;
        }
        if (compare.length >= 2) return false;
        setCompare([...compare, id]);
        return true;
      },
      setCompare,
      checklist,
      addToChecklist: (id) => setChecklist((c) => (c[id] ? c : { ...c, [id]: [] })),
      removeFromChecklist: (id) =>
        setChecklist((c) => {
          const next = { ...c };
          delete next[id];
          return next;
        }),
      toggleChecklistItem: (id, item) =>
        setChecklist((c) => {
          const items = c[id] ?? [];
          return { ...c, [id]: items.includes(item) ? items.filter((x) => x !== item) : [...items, item] };
        }),
      notifRead,
      setNotifRead,
      locationModal,
      setLocationModal,
      resetAll: () => {
        try {
          Object.keys(localStorage)
            .filter((k) => k.startsWith(PREFIX))
            .forEach((k) => localStorage.removeItem(k));
        } catch {
          /* ignore */
        }
        window.location.hash = '';
        window.location.reload();
      },
    }),
    [route, navigate, lang, setLang, t, tx, onboarded, setOnboarded, location, setLocation, profile, setProfile, saved, setSaved, recent, setRecent, compare, setCompare, checklist, setChecklist, notifRead, setNotifRead, locationModal],
  );

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore outside provider');
  return s;
}

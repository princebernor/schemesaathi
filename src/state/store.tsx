import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DICTS, EN, type StringKey } from '../i18n/strings';
import { AccountError, accounts, session, type AccountPatch, type RegisterInput } from '../lib/accounts';
import { profileFromAccount } from '../data/registration';
import { status as translationStatus, subscribe as onTranslations, translateSync } from '../lib/translator';
import type { Account, Application, ApplicationStatus, CategoryId, Lang, LText, Location, Notice, Profile } from '../types';

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
  | { name: 'schemes'; query?: string }
  | { name: 'scheme'; id: string }
  | { name: 'compare' }
  | { name: 'me' }
  | { name: 'saved' }
  | { name: 'checklist'; id?: string }
  | { name: 'auth'; category?: CategoryId; mode?: 'login' | 'register' }
  | { name: 'account' }
  | { name: 'account-edit' };

function parseHash(): Route {
  const [path, query] = window.location.hash.replace(/^#/, '').split('?');
  const [, page, id, extra] = path.split('/');
  switch (page) {
    case 'profile-setup':
    case 'compare':
    case 'me':
    case 'saved':
      return { name: page };
    case 'schemes':
      return { name: 'schemes', query };
    case 'checklist':
      return { name: 'checklist', id };
    case 'auth':
      return { name: 'auth', category: (id || undefined) as CategoryId | undefined, mode: extra === 'register' ? 'register' : extra === 'login' ? 'login' : undefined };
    case 'account':
      return id === 'edit' ? { name: 'account-edit' } : { name: 'account' };
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
  /** Translates any English text into the current language (machine translation, cached). */
  tr: (text: string) => string;
  /** Strings still being machine-translated / that could not be translated, for the current language. */
  trStatus: { pending: number; failed: number };

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

  /** True once the user picked a language themselves (selector, onboarding, voice or account). */
  langChosen: boolean;

  /* accounts (prototype server, see server/demoApi.ts) */
  user: Account | null;
  authReady: boolean;
  login: (identifier: string, password: string, remember: boolean) => Promise<void>;
  register: (input: RegisterInput, remember: boolean) => Promise<void>;
  logout: () => void;
  updateAccount: (patch: AccountPatch) => Promise<void>;

  /* application tracking: separate from saved bookmarks */
  applications: Record<string, Application>;
  recordApplication: (schemeId: string, a: { appliedOn: string; reference?: string; status: ApplicationStatus }) => void;
  setApplicationStatus: (schemeId: string, status: ApplicationStatus, source: 'user' | 'demo') => void;
  removeApplication: (schemeId: string) => void;
  notices: Notice[];
  markNoticesRead: (ids?: string[]) => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<Route>(parseHash);
  // English is always the default; only an explicit choice changes it (never the detected location)
  const [lang, setLangRaw] = usePersisted<Lang>('lang', 'en');
  const [langChosen, setLangChosen] = usePersisted('langChosen', false);
  const [onboarded, setOnboarded] = usePersisted('onboarded', false);
  const [location, setLocationRaw] = usePersisted<Location | null>('location', null);
  const [profile, setProfile] = usePersisted<Profile>('profile', {});
  const [saved, setSaved] = usePersisted<string[]>('saved', []);
  const [recent, setRecent] = usePersisted<string[]>('recent', []);
  const [compare, setCompare] = usePersisted<string[]>('compare', []);
  const [checklist, setChecklist] = usePersisted<Record<string, string[]>>('checklist', {});
  const [notifRead, setNotifRead] = usePersisted<string[]>('notifRead', []);
  const [locationModal, setLocationModal] = useState(false);
  const [applications, setApplications] = usePersisted<Record<string, Application>>('applications', {});
  const [notices, setNotices] = usePersisted<Notice[]>('notices', []);
  const [user, setUser] = useState<Account | null>(null);
  const [authReady, setAuthReady] = useState(() => !session.get());
  const token = useRef<string | null>(session.get());

  const setLang = useCallback(
    (l: Lang) => {
      setLangRaw(l);
      setLangChosen(true);
      // a signed-in user's choice is also their account preference, restored on every login
      if (token.current) void accounts.update(token.current, { preferredLang: l }).then(setUser).catch(() => undefined);
    },
    [setLangRaw, setLangChosen],
  );

  // re-render when machine translations arrive (batched; a timer, not requestAnimationFrame, so it also runs in background tabs)
  const [trTick, setTrTick] = useState(0);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const off = onTranslations(() => {
      clearTimeout(timer);
      timer = setTimeout(() => setTrTick((n) => n + 1), 30);
    });
    return () => {
      clearTimeout(timer);
      off();
    };
  }, []);

  /** Restores an account's profile, language, location and tracked schemes into the app state. */
  const applyAccount = useCallback(
    (a: Account) => {
      setUser(a);
      setLangRaw(a.preferredLang);
      setLangChosen(true);
      setLocationRaw({ state: a.state, district: a.district, source: 'manual' });
      setProfile(profileFromAccount(a));
      setSaved(a.data.saved ?? []);
      setChecklist(a.data.checklist ?? {});
      setApplications(a.data.applications ?? {});
      setNotices(a.data.notices ?? []);
      setOnboarded(true);
    },
    [setLangRaw, setLangChosen, setLocationRaw, setProfile, setSaved, setChecklist, setApplications, setNotices, setOnboarded],
  );

  // resume a remembered session
  useEffect(() => {
    if (!token.current) return;
    accounts
      .me(token.current)
      .then(applyAccount)
      .catch((e) => {
        if (e instanceof AccountError && e.code === 'session') {
          session.clear();
          token.current = null;
        }
      })
      .finally(() => setAuthReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep the signed-in account's saved schemes, checklist, applications and notifications on the server
  const userId = user?.id;
  useEffect(() => {
    if (!userId || !token.current) return;
    const tk = token.current;
    const timer = setTimeout(() => {
      accounts.update(tk, { data: { saved, checklist, applications, notices } }).catch(() => undefined);
    }, 600);
    return () => clearTimeout(timer);
  }, [userId, saved, checklist, applications, notices]);

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

  // hand-written dictionaries first, then cached machine translation of the English text, then English
  const tr = useCallback((text: string) => translateSync(lang, text) ?? text, [lang, trTick]); // eslint-disable-line react-hooks/exhaustive-deps
  const t = useCallback(
    (key: StringKey, vars?: Record<string, string | number>) => {
      let s = DICTS[lang][key] ?? tr(EN[key] ?? key);
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
      return s;
    },
    [lang, tr],
  );
  const tx = useCallback((text: LText) => (lang === 'en' ? text.en : lang === 'ta' && text.ta ? text.ta : tr(text.en)), [lang, tr]);
  const trStatus = useMemo(() => translationStatus(lang), [lang, trTick]); // eslint-disable-line react-hooks/exhaustive-deps

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
      tr,
      trStatus,
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
      langChosen,
      user,
      authReady,
      login: async (identifier, password, remember) => {
        const r = await accounts.login(identifier, password);
        token.current = r.token;
        session.set(r.token, remember);
        applyAccount(r.user);
      },
      register: async (input, remember) => {
        // anything saved while browsing as a guest moves into the new account
        const r = await accounts.register({ ...input, data: { saved, checklist, applications, notices } });
        token.current = r.token;
        session.set(r.token, remember);
        applyAccount(r.user);
      },
      logout: () => {
        if (token.current) void accounts.logout(token.current);
        session.clear();
        token.current = null;
        setUser(null);
        setProfile({});
        setSaved([]);
        setChecklist({});
        setApplications({});
        setNotices([]);
        window.location.hash = '/';
      },
      updateAccount: async (patch) => {
        if (!token.current) throw new AccountError('session');
        const a = await accounts.update(token.current, patch);
        setUser(a);
        setProfile(profileFromAccount(a));
        if (patch.preferredLang) setLang(patch.preferredLang);
        if (patch.state) setLocationRaw({ state: a.state, district: a.district, source: 'manual' });
      },
      applications,
      recordApplication: (schemeId, a) => {
        const now = new Date().toISOString();
        setApplications((prev) => ({ ...prev, [schemeId]: { schemeId, appliedOn: a.appliedOn, reference: a.reference, status: a.status, updatedAt: now, history: [{ status: a.status, at: now, source: 'user' }] } }));
        setNotices((n) => [{ id: schemeId + '-' + Date.now(), schemeId, status: a.status, at: now, read: false }, ...n]);
      },
      setApplicationStatus: (schemeId, status, source) => {
        const now = new Date().toISOString();
        setApplications((prev) => {
          const app = prev[schemeId];
          if (!app || app.status === status) return prev;
          return { ...prev, [schemeId]: { ...app, status, updatedAt: now, history: [...app.history, { status, at: now, source }] } };
        });
        setNotices((n) => [{ id: schemeId + '-' + Date.now(), schemeId, status, at: now, read: false }, ...n].slice(0, 50));
      },
      removeApplication: (schemeId) =>
        setApplications((prev) => {
          const next = { ...prev };
          delete next[schemeId];
          return next;
        }),
      notices,
      markNoticesRead: (ids) => setNotices((n) => n.map((x) => (!ids || ids.includes(x.id) ? { ...x, read: true } : x))),
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
    [route, navigate, lang, setLang, t, tx, tr, trStatus, onboarded, setOnboarded, location, setLocation, setLocationRaw, profile, setProfile, saved, setSaved, recent, setRecent, compare, setCompare, checklist, setChecklist, notifRead, setNotifRead, locationModal, langChosen, user, authReady, applyAccount, applications, setApplications, notices, setNotices],
  );

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore outside provider');
  return s;
}

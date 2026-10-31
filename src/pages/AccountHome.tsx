import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Bell, Bookmark, CalendarDays, CheckCircle2, ClipboardList, Languages, Loader2, LogOut, MapPin, Pencil, Save, Sparkles } from 'lucide-react';
import { CATEGORIES, categoryById } from '../data/categories';
import { SCHEMES, schemeById } from '../data/schemes';
import { fieldError, profileCompletion, visibleFields } from '../data/registration';
import { LANGUAGES } from '../i18n/strings';
import { AccountError } from '../lib/accounts';
import { availableIn, rankSchemes } from '../lib/matching';
import { useStore } from '../state/store';
import { LocationFields } from '../components/LocationPicker';
import { DynamicField, TextInput } from '../components/DynamicField';
import { StatusPill, noticeText } from '../components/Applications';
import { MatchBadge, Section } from '../components/ui';
import type { CategoryId, Details, Lang } from '../types';

function NeedsLogin() {
  const { t, authReady, navigate } = useStore();
  useEffect(() => {
    // only when still on an account page (logging out moves to Home first)
    if (authReady && window.location.hash.startsWith('#/account')) navigate('/auth//login');
  }, [authReady, navigate]);
  return (
    <div className="grid place-items-center py-24 text-slate-500">
      <Loader2 className="animate-spin" /> <span className="sr-only">{t('working')}</span>
    </div>
  );
}

/* ---------------- personalised dashboard ---------------- */
export function AccountHome() {
  const { t, tx, lang, user, profile, saved, applications, notices, logout, markNoticesRead } = useStore();
  const ranked = useMemo(() => {
    if (!user) return [];
    const pool = SCHEMES.filter((s) => s.categories.includes(user.category) && availableIn(s, user.state));
    return rankSchemes(pool, profile).slice(0, 4);
  }, [user, profile]);
  if (!user) return <NeedsLogin />;

  const cat = categoryById(user.category)!;
  const pct = profileCompletion(user.category, user.details, { state: user.state });
  const apps = Object.values(applications).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const langLabel = LANGUAGES.find((l) => l.code === user.preferredLang)?.label;
  const since = new Date(user.registeredAt).toLocaleDateString(lang === 'en' ? 'en-IN' : `${lang}-IN`, { month: 'long', year: 'numeric' });
  const initials = user.fullName.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 lg:py-10 space-y-5">
      <header className="card p-5 sm:p-7 relative overflow-hidden">
        <div className="absolute inset-y-0 right-0 w-1/3 opacity-60 pointer-events-none" style={{ background: `linear-gradient(90deg, transparent, ${cat.soft})` }} />
        <div className="relative flex flex-wrap items-center gap-4 sm:gap-5">
          <span className="grid place-items-center w-16 h-16 rounded-2xl text-white text-xl font-bold font-display shrink-0" style={{ background: cat.color }}>{initials}</span>
          <div className="flex-1 min-w-[220px]">
            <p className="text-sm font-semibold text-slate-500">{t('myDashboard')}</p>
            <h1 className="text-2xl sm:text-3xl font-bold">{t(Date.now() - Date.parse(user.registeredAt) < 600000 ? 'welcomeNew' : 'welcomeBack', { name: user.fullName.split(' ')[0] })}</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="chip py-1 px-3" style={{ background: cat.soft, color: cat.color }}><cat.icon size={14} /> {tx(cat.name)}</span>
              <span className="chip py-1 px-3 bg-leaf-50 text-leaf-700"><MapPin size={14} /> {user.district}, {user.state}</span>
              <span className="chip py-1 px-3 bg-navy-50 text-navy-700"><Languages size={14} /> {langLabel}</span>
              <span className="chip py-1 px-3 bg-slate-100 text-slate-600"><CalendarDays size={14} /> {t('memberSince', { d: since })}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <a href="#/account/edit" className="btn-primary"><Pencil size={17} /> {t('editProfile')}</a>
            <button className="btn-ghost" onClick={logout}><LogOut size={17} /> {t('logout')}</button>
          </div>
        </div>
        <div className="relative mt-5">
          <div className="flex items-center justify-between text-sm font-semibold mb-1.5">
            <span>{t('profileCompletion')}</span>
            <span className={pct === 100 ? 'text-leaf-700' : 'text-navy-700'}>{pct}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={t('profileCompletion')}>
            <div className="h-full bg-leaf-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
          {pct < 100 && <a href="#/account/edit" className="inline-block mt-1.5 text-sm text-navy-600 font-medium hover:underline">{t('completeProfile')} →</a>}
        </div>
      </header>

      <div className="grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-5 items-start">
        <Section title={t('relevantSchemes')} icon={<Sparkles size={18} className="text-violet-600" />}>
          <ul className="divide-y divide-slate-100 -my-2">
            {ranked.map(({ scheme: s, match }) => (
              <li key={s.id} className="py-3 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[200px]">
                  <a href={`#/scheme/${s.id}`} className="font-semibold text-navy-800 hover:underline">{tx(s.name)}</a>
                  <p className="text-sm text-slate-500 line-clamp-1">{tx(s.financial)}</p>
                </div>
                <MatchBadge m={match} />
                {applications[s.id] ? <StatusPill status={applications[s.id].status} /> : saved.includes(s.id) && <StatusPill status="saved" />}
              </li>
            ))}
          </ul>
          <a href="#/schemes" className="btn-ghost btn-sm mt-4">{t('seeAll')} <ArrowRight size={15} /></a>
        </Section>

        <div className="space-y-5">
          <Section title={t('applications')} icon={<ClipboardList size={18} className="text-navy-600" />}>
            {apps.length ? (
              <ul className="space-y-2">
                {apps.slice(0, 4).map((a) => {
                  const s = schemeById(a.schemeId);
                  return s ? (
                    <li key={a.schemeId}>
                      <a href={`#/checklist/${a.schemeId}`} className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 px-3 py-2 hover:bg-slate-50">
                        <span className="text-sm font-medium line-clamp-1">{tx(s.name)}</span>
                        <StatusPill status={a.status} />
                      </a>
                    </li>
                  ) : null;
                })}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">{t('noApplications')}</p>
            )}
            <a href="#/checklist" className="btn-ghost btn-sm mt-3">{t('navChecklist')} <ArrowRight size={15} /></a>
          </Section>

          <Section title={`${t('savedSchemes')} (${saved.length})`} icon={<Bookmark size={18} className="text-leaf-600" />}>
            {saved.length ? (
              <ul className="space-y-2">
                {saved.slice(0, 4).map((id) => {
                  const s = schemeById(id);
                  return s ? (
                    <li key={id} className="flex items-center justify-between gap-2 text-sm">
                      <a href={`#/scheme/${id}`} className="font-medium hover:underline line-clamp-1">{tx(s.name)}</a>
                      <StatusPill status={applications[id]?.status ?? 'not_applied'} />
                    </li>
                  ) : null;
                })}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">{t('savedEmpty')}</p>
            )}
            <a href="#/saved" className="btn-ghost btn-sm mt-3">{t('seeAll')} <ArrowRight size={15} /></a>
          </Section>

          <Section title={t('notifications')} icon={<Bell size={18} className="text-amber-600" />}>
            {notices.length ? (
              <ul className="space-y-2">
                {notices.slice(0, 3).map((n) => (
                  <li key={n.id}>
                    <a href={`#/checklist/${n.schemeId}`} onClick={() => markNoticesRead([n.id])} className={`block rounded-xl px-3 py-2 text-sm ${n.read ? 'text-slate-500' : 'bg-navy-50/60 text-slate-800'}`}>
                      {n.status === 'approved' && <CheckCircle2 size={15} className="inline text-leaf-600 mr-1 -mt-0.5" />}
                      {noticeText(n, t, tx)}
                      <span className="block text-[11px] text-slate-400 mt-0.5">{new Date(n.at).toLocaleString()} · {t('demoNotice')}</span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">{t('noNotifications')}</p>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}

/* ---------------- edit profile (no new account needed) ---------------- */
export function AccountEdit() {
  const { t, tx, user, updateAccount, navigate } = useStore();
  const [category, setCategory] = useState<CategoryId>(user?.category ?? 'general');
  const [c, setC] = useState({ fullName: user?.fullName ?? '', email: user?.email ?? '', mobile: user?.mobile ?? '', state: user?.state ?? '', district: user?.district ?? '', preferredLang: (user?.preferredLang ?? 'en') as Lang, gender: user?.gender ?? '' });
  const [details, setDetails] = useState<Details>(user?.details ?? {});
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  if (!user) return <NeedsLogin />;

  const fields = visibleFields(category, details, { state: c.state });
  const save = async () => {
    const e: Record<string, string | null> = {
      fullName: c.fullName.trim().length >= 2 ? null : t('errRequired'),
      email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c.email.trim()) ? null : t('errEmail'),
      mobile: /^[6-9]\d{9}$/.test(c.mobile) ? null : t('errMobile'),
      state: c.state && c.district.trim() ? null : t('errRequired'),
    };
    for (const f of fields) e[f.key] = fieldError(f, details) && t(fieldError(f, details)!);
    setErrors(e);
    if (Object.values(e).some(Boolean)) {
      setMsg({ ok: false, text: t('fixErrors') });
      return;
    }
    setBusy(true);
    try {
      const keep = Object.fromEntries(fields.filter((f) => details[f.key] !== undefined && details[f.key] !== '').map((f) => [f.key, details[f.key]]));
      await updateAccount({ ...c, fullName: c.fullName.trim(), email: c.email.trim().toLowerCase(), district: c.district.trim(), gender: (category === 'women' ? 'female' : c.gender || undefined) as never, category, details: keep });
      setMsg({ ok: true, text: t('savedOk') });
      setTimeout(() => navigate('/account'), 700);
    } catch (err) {
      setMsg({ ok: false, text: t(err instanceof AccountError && err.code === 'taken' ? 'errTaken' : err instanceof AccountError && err.code === 'session' ? 'errSession' : 'errServer') });
    } finally {
      setBusy(false);
    }
  };
  const setField = (k: keyof typeof c) => (v: string) => setC((p) => ({ ...p, [k]: v }));

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 lg:py-10 space-y-5">
      <h1 className="text-2xl sm:text-3xl font-bold">{t('editProfileTitle')}</h1>
      <Section title={t('accountDetails')}>
        <div className="grid sm:grid-cols-2 gap-4">
          <TextInput id="e-name" label={t('fullName')} value={c.fullName} onChange={setField('fullName')} error={errors.fullName} required autoComplete="name" />
          <div>
            <span className="label">{t('username')}</span>
            <p className="field bg-slate-50 text-slate-500">{user.username}</p>
          </div>
          <TextInput id="e-email" label={t('email')} value={c.email} onChange={setField('email')} error={errors.email} required type="email" autoComplete="email" />
          <TextInput id="e-mobile" label={t('mobile')} value={c.mobile} onChange={(v) => setField('mobile')(v.replace(/\D/g, '').slice(0, 10))} error={errors.mobile} required inputMode="tel" />
        </div>
        <div className="mt-4">
          <LocationFields state={c.state} district={c.district} onChange={(s, d) => setC((p) => ({ ...p, state: s, district: d }))} />
          {errors.state && <p className="text-sm text-red-600 mt-1">{errors.state}</p>}
        </div>
        <div className="grid sm:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="label" htmlFor="e-lang">{t('preferredLanguage')}</label>
            <select id="e-lang" className="field" value={c.preferredLang} onChange={(e) => setField('preferredLang')(e.target.value)}>
              {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label} — {l.english}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="e-cat">{t('registeredCategory')}</label>
            <select id="e-cat" className="field" value={category} onChange={(e) => setCategory(e.target.value as CategoryId)}>
              {CATEGORIES.map((x) => <option key={x.id} value={x.id}>{tx(x.name)}</option>)}
            </select>
          </div>
        </div>
      </Section>

      <Section title={`${tx(categoryById(category)!.name)}: ${t('regStepDetails')}`}>
        <div className="grid sm:grid-cols-2 gap-x-4 gap-y-5">
          {fields.map((f) => (
            <div key={f.key} className={f.type === 'textarea' || f.type === 'yesno' ? 'sm:col-span-2' : ''}>
              <DynamicField f={f} values={details} error={errors[f.key] ? fieldError(f, details) : null} onChange={(k, v) => { setDetails((d) => ({ ...d, [k]: v })); setErrors((e) => ({ ...e, [k]: null })); }} />
            </div>
          ))}
        </div>
      </Section>

      {msg && <p role="alert" className={`rounded-xl px-4 py-3 text-sm font-medium ${msg.ok ? 'bg-leaf-50 text-leaf-700' : 'bg-red-50 text-red-700'}`}>{msg.text}</p>}
      <div className="flex justify-end gap-2">
        <a href="#/account" className="btn-ghost">{t('cancel')}</a>
        <button className="btn-green px-6" onClick={save} disabled={busy}>
          {busy ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} {t('saveChanges')}
        </button>
      </div>
    </div>
  );
}

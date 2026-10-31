import { useMemo, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Loader2, LogIn, ShieldCheck, UserPlus, UserRound } from 'lucide-react';
import { CATEGORIES, categoryById } from '../data/categories';
import { CATEGORY_FIELDS, fieldError, visibleFields } from '../data/registration';
import { LANGUAGES, type StringKey } from '../i18n/strings';
import { AccountError, accounts } from '../lib/accounts';
import { useStore } from '../state/store';
import { LocationFields } from '../components/LocationPicker';
import { DynamicField, PasswordInput, TextInput, useLabel } from '../components/DynamicField';
import { Modal } from '../components/ui';
import type { CategoryId, Details, Lang } from '../types';

const RULES = {
  username: /^[A-Za-z0-9_]{3,20}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
  mobile: /^[6-9]\d{9}$/,
  password: /^(?=.*[A-Za-z])(?=.*\d).{8,64}$/,
};
const errKey = (e: unknown): StringKey => {
  const code = e instanceof AccountError ? e.code : 'server';
  return ({ server: 'errServer', credentials: 'errLogin', taken: 'errTaken', invalid: 'fixErrors', session: 'errSession', nomatch: 'errNoMatch' } as const)[code];
};

export default function Auth({ category, mode }: { category?: CategoryId; mode?: 'login' | 'register' }) {
  const { t, tx, navigate, user, logout, updateProfile, profile } = useStore();
  const tab = mode ?? 'login';
  const cat = categoryById(category);
  const go = (m: 'login' | 'register', c = category) => navigate(`/auth/${c ?? ''}/${m}`);

  if (user)
    return (
      <div className="max-w-xl mx-auto px-4 py-12">
        <div className="card p-8 text-center">
          <span className="grid place-items-center w-16 h-16 mx-auto rounded-2xl bg-navy-600 text-white mb-4"><UserRound size={30} /></span>
          <h1 className="text-2xl font-bold">{t('welcomeBack', { name: user.fullName })}</h1>
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <a href="#/account" className="btn-primary">{t('goDashboard')}</a>
            <button className="btn-ghost" onClick={logout}>{t('logout')}</button>
          </div>
        </div>
      </div>
    );

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 lg:py-10">
      <a href="#/" className="inline-flex items-center gap-1.5 text-navy-600 font-medium hover:underline mb-4">
        <ArrowLeft size={18} /> {t('navHome')}
      </a>

      <div className="card overflow-hidden">
        {/* selected category, carried over from the dashboard */}
        <div className="px-5 sm:px-8 py-5 border-b border-slate-100 flex flex-wrap items-center gap-4" style={cat ? { background: cat.soft } : undefined}>
          {cat ? (
            <>
              <span className="grid place-items-center w-14 h-14 rounded-2xl bg-white shadow-sm" style={{ color: cat.color }}>
                <cat.icon size={30} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{t('selectedCategory')}</div>
                <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: cat.color }}>{t('authFor', { cat: tx(cat.name) })}</h1>
              </div>
              <a href="#/" className="btn-ghost btn-sm">{t('changeCategory')}</a>
            </>
          ) : (
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">{t('login')} / {t('register')}</h1>
            </div>
          )}
          <p className="w-full text-slate-600">{t('authSub')}</p>
        </div>

        {/* the two prominent sections from the sketch */}
        <div className="p-5 sm:p-8">
          <div role="tablist" aria-label={`${t('login')} / ${t('register')}`} className="grid grid-cols-2 gap-3 sm:gap-5">
            {(['login', 'register'] as const).map((m) => {
              const Icon = m === 'login' ? LogIn : UserPlus;
              const on = tab === m;
              return (
                <button
                  key={m}
                  role="tab"
                  aria-selected={on}
                  onClick={() => go(m)}
                  className={`rounded-2xl border-2 px-4 py-5 sm:py-7 text-center transition ${on ? 'border-navy-600 bg-navy-600 text-white shadow-lift' : 'border-slate-200 bg-white text-navy-800 hover:border-navy-600/50'}`}
                >
                  <Icon size={28} className="mx-auto mb-2" />
                  <span className="block font-display text-xl sm:text-2xl font-bold tracking-wide uppercase">{t(m)}</span>
                  <span className={`hidden sm:block text-sm mt-1 ${on ? 'text-navy-100' : 'text-slate-500'}`}>{m === 'login' ? t('haveAccount') : t('noAccount')}</span>
                </button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={tab + (category ?? '')} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.18 }} className="mt-6 sm:mt-8">
              {tab === 'login' ? (
                <LoginForm onRegister={() => go('register')} />
              ) : category ? (
                <RegisterForm category={category} />
              ) : (
                <CategoryChooser onPick={(c) => go('register', c)} />
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 pt-5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-sm">
            <p className="flex items-start gap-2 text-slate-500 max-w-xl">
              <ShieldCheck size={17} className="text-leaf-600 shrink-0" /> {t('backendNote')}
            </p>
            <button
              className="text-navy-600 font-semibold hover:underline"
              onClick={() => {
                if (category && profile.category !== category) updateProfile({ category, completed: false });
                navigate(category ? '/profile-setup' : '/schemes');
              }}
            >
              {t('continueGuest')} →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CategoryChooser({ onPick }: { onPick: (c: CategoryId) => void }) {
  const { t, tx } = useStore();
  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">{t('chooseCategory')}</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {CATEGORIES.map((c) => (
          <button key={c.id} onClick={() => onPick(c.id)} className="rounded-2xl border border-slate-200 p-4 text-left hover:border-navy-600/40 hover:shadow-card transition">
            <span className="grid place-items-center w-10 h-10 rounded-xl mb-2" style={{ background: c.soft, color: c.color }}><c.icon size={22} /></span>
            <span className="font-semibold text-navy-900">{tx(c.name)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Login ---------------- */
function LoginForm({ onRegister }: { onRegister: () => void }) {
  const { t, login, navigate } = useStore();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<{ id?: string; pw?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = { id: identifier.trim() ? undefined : t('errRequired'), pw: password ? undefined : t('errRequired') };
    setErrors(errs);
    if (errs.id || errs.pw) return;
    setBusy(true);
    try {
      await login(identifier.trim(), password, remember);
      navigate('/account');
    } catch (err) {
      setErrors({ form: t(errKey(err)) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <form onSubmit={submit} noValidate className="space-y-4 max-w-lg">
        <p className="text-slate-600">{t('loginSub')}</p>
        <TextInput id="login-id" label={t('identifier')} value={identifier} onChange={setIdentifier} error={errors.id} required autoComplete="username" />
        <PasswordInput id="login-pw" label={t('password')} value={password} onChange={setPassword} error={errors.pw} autoComplete="current-password" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" className="w-5 h-5 accent-navy-600" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            {t('rememberMe')}
          </label>
          <button type="button" className="text-sm font-semibold text-navy-600 hover:underline" onClick={() => setForgot(true)}>{t('forgotPassword')}</button>
        </div>
        {errors.form && <p role="alert" className="rounded-xl bg-red-50 text-red-700 px-4 py-3 text-sm font-medium">{errors.form}</p>}
        <button className="btn-primary w-full py-3 text-base" disabled={busy}>
          {busy ? <Loader2 size={19} className="animate-spin" /> : <LogIn size={19} />} {busy ? t('working') : t('login')}
        </button>
        <p className="text-center text-sm text-slate-600">
          {t('noAccount')}{' '}
          <button type="button" className="font-semibold text-navy-600 hover:underline" onClick={onRegister}>{t('createAccount')}</button>
        </p>
      </form>

      <ForgotPassword open={forgot} onClose={() => setForgot(false)} />
    </div>
  );
}

function ForgotPassword({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useStore();
  const [identifier, setIdentifier] = useState('');
  const [mobile, setMobile] = useState('');
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Modal open={open} onClose={onClose} title={t('resetTitle')}>
      <form
        className="space-y-4"
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          if (!identifier.trim() || !RULES.mobile.test(mobile)) return setMsg({ ok: false, text: !identifier.trim() ? t('errRequired') : t('errMobile') });
          if (!RULES.password.test(pw)) return setMsg({ ok: false, text: t('errPassword') });
          setBusy(true);
          try {
            await accounts.resetPassword(identifier.trim(), mobile, pw);
            setMsg({ ok: true, text: t('resetDone') });
          } catch (err) {
            setMsg({ ok: false, text: t(errKey(err)) });
          } finally {
            setBusy(false);
          }
        }}
      >
        <p className="text-sm text-slate-600">{t('resetSub')}</p>
        <TextInput id="rs-id" label={t('identifier')} value={identifier} onChange={setIdentifier} required autoComplete="username" />
        <TextInput id="rs-mobile" label={t('mobile')} value={mobile} onChange={(v) => setMobile(v.replace(/\D/g, '').slice(0, 10))} required inputMode="tel" autoComplete="tel" />
        <PasswordInput id="rs-pw" label={t('newPassword')} value={pw} onChange={setPw} help={t('passwordHelp')} autoComplete="new-password" />
        {msg && <p role="alert" className={`rounded-xl px-4 py-3 text-sm font-medium ${msg.ok ? 'bg-leaf-50 text-leaf-700' : 'bg-red-50 text-red-700'}`}>{msg.text}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>{msg?.ok ? t('login') : t('cancel')}</button>
          {!msg?.ok && <button className="btn-primary" disabled={busy}>{busy && <Loader2 size={17} className="animate-spin" />} {t('resetBtn')}</button>}
        </div>
      </form>
    </Modal>
  );
}

/* ---------------- Register (stepped, category-specific) ---------------- */
interface Common {
  fullName: string;
  username: string;
  email: string;
  mobile: string;
  password: string;
  confirm: string;
  state: string;
  district: string;
  preferredLang: Lang;
  gender: string;
}

function RegisterForm({ category }: { category: CategoryId }) {
  const { t, tx, lang, location, register, navigate } = useStore();
  const lbl = useLabel();
  const cat = categoryById(category)!;
  const [step, setStep] = useState(0);
  const [c, setC] = useState<Common>({ fullName: '', username: '', email: '', mobile: '', password: '', confirm: '', state: location?.state ?? '', district: location?.district ?? '', preferredLang: lang, gender: '' });
  const [details, setDetails] = useState<Details>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [formErr, setFormErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [remember, setRemember] = useState(true);

  const steps = [t('regStepAccount'), t('regStepPlace'), `${tx(cat.name)}: ${t('regStepDetails')}`, t('regStepReview')];
  const fields = useMemo(() => visibleFields(category, details, { state: c.state }), [category, details, c.state]);
  const set = (k: keyof Common) => (v: string) => {
    setC((p) => ({ ...p, [k]: v }));
    setErrors((e) => ({ ...e, [k]: null }));
  };

  const validate = (s: number) => {
    const e: Record<string, string | null> = {};
    if (s === 0) {
      e.fullName = c.fullName.trim().length >= 2 ? null : t('errRequired');
      e.username = !c.username ? t('errRequired') : RULES.username.test(c.username) ? null : t('errUsername');
      e.email = !c.email ? t('errRequired') : RULES.email.test(c.email.trim()) ? null : t('errEmail');
      e.mobile = !c.mobile ? t('errRequired') : RULES.mobile.test(c.mobile) ? null : t('errMobile');
      e.password = !c.password ? t('errRequired') : RULES.password.test(c.password) ? null : t('errPassword');
      e.confirm = !c.confirm ? t('errRequired') : c.confirm === c.password ? null : t('errConfirm');
    }
    if (s === 1) {
      e.state = c.state ? null : t('errRequired');
      e.district = c.district.trim() ? null : t('errRequired');
    }
    if (s === 2) for (const f of fields) e[f.key] = fieldError(f, details) && t(fieldError(f, details)!);
    setErrors(e);
    const ok = Object.values(e).every((x) => !x);
    setFormErr(ok ? null : t('fixErrors'));
    if (!ok) setTimeout(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(), 0);
    return ok;
  };

  const next = () => validate(step) && setStep((s) => s + 1);
  const submit = async () => {
    for (let s = 0; s < 3; s++) if (!validate(s)) return setStep(s);
    setBusy(true);
    try {
      // drop answers to questions that are hidden by the current choices
      const keep = Object.fromEntries(fields.filter((f) => details[f.key] !== undefined && details[f.key] !== '').map((f) => [f.key, details[f.key]]));
      await register(
        {
          fullName: c.fullName.trim(),
          username: c.username.trim(),
          email: c.email.trim().toLowerCase(),
          mobile: c.mobile,
          password: c.password,
          category,
          state: c.state,
          district: c.district.trim(),
          preferredLang: c.preferredLang,
          gender: category === 'women' ? 'female' : c.gender || undefined,
          details: keep,
        },
        remember,
      );
      navigate('/account');
    } catch (err) {
      const k = errKey(err);
      setFormErr(t(k));
      if (k === 'errTaken') setStep(0);
    } finally {
      setBusy(false);
    }
  };

  const pct = Math.round(((step + 1) / steps.length) * 100);

  return (
    <div>
      <p className="text-slate-600 mb-4">{t('registerSub')}</p>
      {/* progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm font-semibold mb-2">
          <span className="text-navy-800">{steps[step]}</span>
          <span className="text-slate-500">{t('stepOf', { a: step + 1, b: steps.length })}</span>
        </div>
        <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full bg-leaf-500 transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
        <ol className="hidden sm:flex gap-2 mt-3">
          {steps.map((s, i) => (
            <li key={i} className={`flex items-center gap-1.5 text-xs font-medium ${i <= step ? 'text-navy-700' : 'text-slate-400'}`}>
              <span className={`grid place-items-center w-5 h-5 rounded-full text-[11px] ${i < step ? 'bg-leaf-600 text-white' : i === step ? 'bg-navy-600 text-white' : 'bg-slate-200'}`}>{i < step ? <Check size={12} /> : i + 1}</span>
              {s}
              {i < steps.length - 1 && <span className="w-6 h-px bg-slate-200 ml-1" />}
            </li>
          ))}
        </ol>
      </div>

      <form noValidate onSubmit={(e) => { e.preventDefault(); if (step < 3) next(); else void submit(); }}>
        {step === 0 && (
          <div className="grid sm:grid-cols-2 gap-4">
            <TextInput id="r-name" label={t('fullName')} value={c.fullName} onChange={set('fullName')} error={errors.fullName} help={t('fullNameHelp')} required autoComplete="name" />
            <TextInput id="r-user" label={t('username')} value={c.username} onChange={set('username')} error={errors.username} help={t('usernameHelp')} required autoComplete="username" />
            <TextInput id="r-email" label={t('email')} value={c.email} onChange={set('email')} error={errors.email} required type="email" inputMode="email" autoComplete="email" />
            <TextInput id="r-mobile" label={t('mobile')} value={c.mobile} onChange={(v) => set('mobile')(v.replace(/\D/g, '').slice(0, 10))} error={errors.mobile} help={t('mobileHelp')} required inputMode="tel" autoComplete="tel" />
            <PasswordInput id="r-pw" label={t('password')} value={c.password} onChange={set('password')} error={errors.password} help={t('passwordHelp')} autoComplete="new-password" />
            <PasswordInput id="r-pw2" label={t('confirmPassword')} value={c.confirm} onChange={set('confirm')} error={errors.confirm} autoComplete="new-password" />
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div>
              <LocationFields state={c.state} district={c.district} onChange={(s, d) => { setC((p) => ({ ...p, state: s, district: d })); setErrors((e) => ({ ...e, state: null, district: null })); }} />
              {(errors.state || errors.district) && <p role="alert" className="mt-1 text-sm text-red-600 font-medium">{errors.state || errors.district}</p>}
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label" htmlFor="r-lang">{t('preferredLanguage')} <span className="text-red-600 text-xs font-bold">* {t('required')}</span></label>
                <select id="r-lang" className="field" value={c.preferredLang} onChange={(e) => set('preferredLang')(e.target.value)}>
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>{l.label} — {l.english}{l.full ? '' : ` (${t('demoLang')})`}</option>
                  ))}
                </select>
              </div>
              {category !== 'women' && (
                <div>
                  <label className="label" htmlFor="r-gender">{t('gender')} <span className="text-slate-400 text-xs font-medium">({t('optional')})</span></label>
                  <select id="r-gender" className="field" value={c.gender} onChange={(e) => set('gender')(e.target.value)}>
                    <option value="">—</option>
                    <option value="female">{t('female')}</option>
                    <option value="male">{t('male')}</option>
                    <option value="other">{t('other')}</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid sm:grid-cols-2 gap-x-4 gap-y-5">
            {fields.map((f) => (
              <div key={f.key} className={f.type === 'textarea' || f.type === 'yesno' ? 'sm:col-span-2' : ''}>
                <DynamicField
                  f={f}
                  values={details}
                  error={errors[f.key] ? fieldError(f, details) : null}
                  onChange={(k, v) => {
                    setDetails((d) => ({ ...d, [k]: v }));
                    setErrors((e) => ({ ...e, [k]: null }));
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <p className="text-slate-600">{t('reviewSub')}</p>
            <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 rounded-2xl bg-slate-50 border border-slate-200 p-4 text-sm">
              {[
                [t('fullName'), c.fullName],
                [t('username'), c.username],
                [t('email'), c.email],
                [t('mobile'), c.mobile],
                [t('category'), tx(cat.name)],
                [t('stepLocation'), `${c.district}, ${c.state}`],
                [t('preferredLanguage'), LANGUAGES.find((l) => l.code === c.preferredLang)?.label],
                ...CATEGORY_FIELDS[category]
                  .filter((f) => fields.includes(f) && details[f.key] !== undefined && details[f.key] !== '')
                  .map((f) => [lbl(f.label), f.options ? (() => { const o = f.options.find((x) => x.v === details[f.key]); return o ? lbl(o.label) : String(details[f.key]); })() : f.type === 'yesno' ? t(details[f.key] as 'yes' | 'no') : String(details[f.key])]),
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 border-b border-slate-200/70 pb-1.5">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="font-medium text-right break-all">{v}</dd>
                </div>
              ))}
            </dl>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" className="w-5 h-5 accent-navy-600" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              {t('rememberMe')}
            </label>
          </div>
        )}

        {formErr && <p role="alert" className="mt-5 rounded-xl bg-red-50 text-red-700 px-4 py-3 text-sm font-medium">{formErr}</p>}

        <div className="flex justify-between gap-3 mt-6">
          <button type="button" className="btn-ghost" onClick={() => { setStep((s) => s - 1); setFormErr(null); }} disabled={step === 0}>
            <ArrowLeft size={18} /> {t('previous')}
          </button>
          {step < 3 ? (
            <button className="btn-primary px-6">
              {t('next')} <ArrowRight size={18} />
            </button>
          ) : (
            <button className="btn-green px-6" disabled={busy}>
              {busy ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />} {busy ? t('working') : t('createBtn')}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

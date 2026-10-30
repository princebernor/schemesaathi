import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronLeft, Languages, MapPin, ShieldCheck } from 'lucide-react';
import { useStore } from '../state/store';
import { LANGUAGES } from '../i18n/strings';
import { LocationStep } from '../components/LocationPicker';
import Character from '../components/Character';
import { Logo } from '../components/Navbar';

export default function Onboarding() {
  const { t, lang, setLang, location, setLocation, setOnboarded, navigate } = useStore();
  const [step, setStep] = useState<0 | 1>(0);

  const steps = [
    { icon: MapPin, label: t('stepLocation') },
    { icon: Languages, label: t('stepLanguage') },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-navy-50 via-white to-leaf-50/60 flex flex-col">
      <div className="h-1 flex">
        <span className="flex-1 bg-saffron-500" />
        <span className="flex-1 bg-white" />
        <span className="flex-1 bg-leaf-500" />
      </div>
      <header className="max-w-6xl w-full mx-auto px-4 py-5 flex items-center justify-between">
        <Logo />
        <select aria-label={t('language')} value={lang} onChange={(e) => setLang(e.target.value as typeof lang)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>{l.label}</option>
          ))}
        </select>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 pb-10 grid lg:grid-cols-[1fr_1.15fr] gap-8 items-center">
        <div className="hidden lg:block">
          <h1 className="text-4xl font-bold leading-tight">{t('welcome')}</h1>
          <p className="mt-4 text-lg text-slate-600 max-w-md">{t('welcomeSub')}</p>
          <div className="idle mt-4 max-w-[380px]">
            <Character target={null} className="w-full h-auto" />
          </div>
        </div>

        <div className="card p-6 sm:p-8">
          <div className="lg:hidden mb-6">
            <h1 className="text-2xl font-bold">{t('welcome')}</h1>
            <p className="mt-2 text-slate-600">{t('welcomeSub')}</p>
          </div>

          <ol className="flex items-center gap-3 mb-8" aria-label="Progress">
            {steps.map((s, i) => (
              <li key={i} className="flex items-center gap-3 flex-1">
                <span className={`grid place-items-center w-10 h-10 rounded-full font-semibold shrink-0 ${i < step ? 'bg-leaf-600 text-white' : i === step ? 'bg-navy-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {i < step ? <Check size={18} /> : <s.icon size={18} />}
                </span>
                <span className={`text-sm font-semibold ${i === step ? 'text-navy-800' : 'text-slate-500'}`}>{s.label}</span>
                {i === 0 && <span className="flex-1 h-0.5 bg-slate-200 rounded" />}
              </li>
            ))}
          </ol>

          <AnimatePresence mode="wait">
            {step === 0 ? (
              <motion.div key="loc" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="text-2xl font-semibold mb-2">{t('locationAsk')}</h2>
                <p className="flex items-start gap-2 text-sm text-slate-500 mb-6">
                  <ShieldCheck size={18} className="text-leaf-600 shrink-0" /> {t('locationPrivacy')}
                </p>
                <LocationStep
                  initial={location}
                  submitLabel={t('confirmContinue')}
                  onDone={(l) => {
                    setLocation(l);
                    setStep(1);
                  }}
                />
              </motion.div>
            ) : (
              <motion.div key="lang" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="text-2xl font-semibold mb-2">{t('languageAsk')}</h2>
                <p className="text-sm text-slate-500 mb-6">{t('languageNote')}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3" role="radiogroup">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      role="radio"
                      aria-checked={lang === l.code}
                      onClick={() => setLang(l.code)}
                      className={`relative rounded-2xl border p-4 text-left transition ${lang === l.code ? 'border-navy-600 bg-navy-50 ring-2 ring-navy-600/20' : 'border-slate-200 hover:border-navy-600/40'}`}
                    >
                      <span className="block text-xl font-semibold text-navy-900">{l.label}</span>
                      <span className="block text-sm text-slate-500">{l.english}</span>
                      {!l.full && <span className="absolute top-2 right-2 chip bg-amber-100 text-amber-800">{t('demoLang')}</span>}
                      {lang === l.code && <Check size={18} className="absolute bottom-3 right-3 text-navy-600" />}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between mt-8">
                  <button className="btn-ghost" onClick={() => setStep(0)}>
                    <ChevronLeft size={18} /> {t('back')}
                  </button>
                  <button
                    className="btn-green px-6"
                    onClick={() => {
                      setOnboarded(true);
                      navigate('/');
                    }}
                  >
                    {t('getStarted')}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

import { useMemo, useRef, useState, useEffect } from 'react';
import { Bell, BookmarkCheck, ClipboardCheck, GitCompareArrows, Home, Languages, LayoutList, MapPin, Menu, UserRound, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../state/store';
import { LANGUAGES } from '../i18n/strings';
import { schemeById } from '../data/schemes';
import type { Lang } from '../types';

export function Logo() {
  const { t } = useStore();
  return (
    <a href="#/" className="flex items-center gap-2.5 shrink-0">
      <span className="grid place-items-center w-9 h-9 rounded-xl bg-navy-600 text-white shadow-sm">
        <svg viewBox="0 0 32 32" width="22" height="22" aria-hidden="true">
          <path d="M8 17l5 5 11-12" stroke="currentColor" strokeWidth="3.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="leading-tight">
        <span className="block font-display font-bold text-navy-900 text-base sm:text-lg">{t('appName')}</span>
        <span className="hidden 2xl:block text-[11px] text-slate-500 -mt-0.5">{t('appTagline')}</span>
      </span>
    </a>
  );
}

/** Demonstration notifications derived from saved schemes and checklist. */
function useNotifications() {
  const { saved, checklist, lang } = useStore();
  return useMemo(() => {
    const ta = lang === 'ta';
    const list: { id: string; text: string; href: string; when: string }[] = [];
    saved.forEach((id) => {
      const s = schemeById(id);
      if (!s) return;
      if (s.deadline)
        list.push({ id: `dl-${id}`, href: `#/scheme/${id}`, when: ta ? 'மாதிரி' : 'Demo', text: ta ? `${s.name.ta}: விண்ணப்பக் காலம் — ${s.deadline}` : `${s.name.en}: application window — ${s.deadline}` });
      else if (s.status === 'check')
        list.push({ id: `st-${id}`, href: `#/scheme/${id}`, when: ta ? 'மாதிரி' : 'Demo', text: ta ? `${s.name.ta}: விண்ணப்ப நிலையைச் சரிபார்க்கவும்` : `${s.name.en}: application status may have changed — check the portal` });
      else list.push({ id: `up-${id}`, href: `#/scheme/${id}`, when: s.updatedAt, text: ta ? `${s.name.ta} தகவல் புதுப்பிக்கப்பட்டது` : `${s.name.en} information was updated` });
    });
    Object.entries(checklist).forEach(([id, done]) => {
      const s = schemeById(id);
      if (s && done.length < s.documents.length)
        list.push({ id: `ck-${id}-${done.length}`, href: '#/checklist', when: ta ? 'நினைவூட்டல்' : 'Reminder', text: ta ? `${s.name.ta}: ${s.documents.length - done.length} ஆவணங்கள் இன்னும் தயாராகவில்லை` : `${s.name.en}: ${s.documents.length - done.length} documents still to collect` });
    });
    list.push({ id: 'welcome', href: '#/schemes', when: ta ? 'மாதிரி' : 'Demo', text: ta ? 'திட்டசாத்திக்கு வரவேற்கிறோம்! திட்டங்களைச் சேமித்தால் கடைசி தேதி நினைவூட்டல்கள் இங்கே வரும்.' : 'Welcome! Save schemes to get deadline reminders here.' });
    return list;
  }, [saved, checklist, lang]);
}

export default function Navbar() {
  const { t, route, lang, setLang, location, setLocationModal, compare, saved, notifRead, setNotifRead } = useStore();
  const [menu, setMenu] = useState(false);
  const [bell, setBell] = useState(false);
  const notes = useNotifications();
  const unread = notes.filter((n) => !notifRead.includes(n.id)).length;
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => bellRef.current && !bellRef.current.contains(e.target as Node) && setBell(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const links = [
    { href: '#/', name: 'dashboard', label: t('navHome'), icon: Home },
    { href: '#/schemes', name: 'schemes', label: t('navSchemes'), icon: LayoutList },
    { href: '#/compare', name: 'compare', label: t('navCompare'), icon: GitCompareArrows, count: compare.length },
    { href: '#/saved', name: 'saved', label: t('navSaved'), icon: BookmarkCheck, count: saved.length },
    { href: '#/checklist', name: 'checklist', label: t('navChecklist'), icon: ClipboardCheck },
  ];
  const active = (n: string) => route.name === n || (n === 'schemes' && route.name === 'scheme');

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="h-1 flex">
        <span className="flex-1 bg-saffron-500" />
        <span className="flex-1 bg-white" />
        <span className="flex-1 bg-leaf-500" />
      </div>
      <div className="max-w-[1400px] mx-auto px-4 h-16 flex items-center gap-2 sm:gap-3">
        <Logo />
        <nav className="hidden xl:flex items-center gap-1 ml-6" aria-label="Main">
          {links.map((l) => (
            <a key={l.href} href={l.href} className={`relative px-3 py-2 rounded-lg text-[15px] font-medium transition ${active(l.name) ? 'text-navy-700 bg-navy-50' : 'text-slate-600 hover:text-navy-700 hover:bg-slate-50'}`}>
              {l.label}
              {!!l.count && <span className="ml-1.5 chip bg-navy-600 text-white px-1.5 py-0">{l.count}</span>}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1 sm:gap-1.5 min-w-0">
          <button onClick={() => setLocationModal(true)} className="hidden md:inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm text-slate-700 hover:bg-slate-100" title={t('changeLocation')}>
            <MapPin size={17} className="text-leaf-600" />
            <span className="max-w-[160px] truncate">{location ? `${location.district}, ${location.state}` : t('changeLocation')}</span>
          </button>
          <label className="relative inline-flex items-center" title={t('language')}>
            <Languages size={16} className="absolute left-2 text-navy-600 pointer-events-none" />
            <select aria-label={t('language')} value={lang} onChange={(e) => setLang(e.target.value as Lang)} className="appearance-none w-[80px] sm:w-auto truncate rounded-lg border border-slate-200 bg-white pl-7 pr-1.5 sm:pl-8 sm:pr-3 py-2 text-sm font-medium hover:border-navy-600/40 cursor-pointer">
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                  {l.full ? '' : ' (demo)'}
                </option>
              ))}
            </select>
          </label>
          <div className="relative" ref={bellRef}>
            <button onClick={() => setBell((b) => !b)} className="relative p-2 rounded-lg hover:bg-slate-100" aria-label={t('notifications')}>
              <Bell size={20} />
              {unread > 0 && <span className="absolute top-1 right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[11px] font-bold grid place-items-center px-1">{unread}</span>}
            </button>
            <AnimatePresence>
              {bell && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="absolute right-0 mt-2 w-[min(360px,calc(100vw-24px))] card p-0 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <span className="font-semibold">{t('notifications')}</span>
                    <button className="text-sm text-navy-600 hover:underline" onClick={() => setNotifRead(notes.map((n) => n.id))}>{t('markAllRead')}</button>
                  </div>
                  <ul className="max-h-[360px] overflow-y-auto scrollbar-thin">
                    {notes.map((n) => (
                      <li key={n.id}>
                        <a href={n.href} onClick={() => { setBell(false); setNotifRead([...new Set([...notifRead, n.id])]); }} className={`block px-4 py-3 text-sm border-b border-slate-50 hover:bg-slate-50 ${notifRead.includes(n.id) ? 'text-slate-500' : 'text-slate-800 bg-navy-50/40'}`}>
                          {n.text}
                          <span className="block text-[11px] text-slate-400 mt-0.5">{n.when}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <a href="#/me" className={`hidden sm:grid place-items-center w-10 h-10 rounded-full ${route.name === 'me' ? 'bg-navy-600 text-white' : 'bg-navy-50 text-navy-700 hover:bg-navy-100'}`} aria-label={t('navProfile')}>
            <UserRound size={20} />
          </a>
          <button className="xl:hidden p-2 rounded-lg hover:bg-slate-100" onClick={() => setMenu((m) => !m)} aria-label="Menu" aria-expanded={menu}>
            {menu ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {menu && (
          <motion.nav initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="xl:hidden overflow-hidden border-t border-slate-100 bg-white">
            <div className="px-4 py-3 grid gap-1">
              {[...links, { href: '#/me', name: 'me', label: t('navProfile'), icon: UserRound, count: 0 }].map((l) => (
                <a key={l.href} href={l.href} onClick={() => setMenu(false)} className={`flex items-center gap-3 px-3 py-3 rounded-xl font-medium ${active(l.name) ? 'bg-navy-50 text-navy-700' : 'text-slate-700'}`}>
                  <l.icon size={20} /> {l.label}
                  {!!l.count && <span className="chip bg-navy-600 text-white">{l.count}</span>}
                </a>
              ))}
              <button onClick={() => { setMenu(false); setLocationModal(true); }} className="flex items-center gap-3 px-3 py-3 rounded-xl font-medium text-slate-700 text-left">
                <MapPin size={20} /> {location ? `${location.district}, ${location.state}` : t('changeLocation')}
              </button>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

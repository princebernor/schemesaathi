import { Info, TriangleAlert } from 'lucide-react';
import { useStore } from './state/store';
import { LANGUAGES } from './i18n/strings';
import Navbar from './components/Navbar';
import CompareTray from './components/CompareTray';
import { LocationStep } from './components/LocationPicker';
import { Modal } from './components/ui';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import ProfileWizard from './pages/ProfileWizard';
import Discover from './pages/Discover';
import SchemeDetails from './pages/SchemeDetails';
import Compare from './pages/Compare';
import { Checklist, MyProfile, Saved } from './pages/Account';

export default function App() {
  const { onboarded, route, t, lang, location, setLocation, locationModal, setLocationModal } = useStore();

  if (!onboarded) return <Onboarding />;

  const page = (() => {
    switch (route.name) {
      case 'profile-setup':
        return <ProfileWizard />;
      case 'schemes':
        return <Discover />;
      case 'scheme':
        return <SchemeDetails key={route.id} id={route.id} />;
      case 'compare':
        return <Compare />;
      case 'me':
        return <MyProfile />;
      case 'saved':
        return <Saved />;
      case 'checklist':
        return <Checklist />;
      default:
        return <Dashboard />;
    }
  })();

  const partial = !LANGUAGES.find((l) => l.code === lang)?.full;

  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-amber-50 border-b border-amber-200 text-amber-900 text-[13px]">
        <p className="max-w-[1400px] mx-auto px-4 py-1.5 flex items-center gap-2">
          <TriangleAlert size={15} className="shrink-0" /> {t('demoBanner')}
        </p>
      </div>
      <Navbar />
      {partial && (
        <div className="bg-navy-50 border-b border-navy-100 text-navy-800 text-[13px]">
          <p className="max-w-[1400px] mx-auto px-4 py-1.5 flex items-center gap-2">
            <Info size={15} className="shrink-0" /> {t('partialTranslation')}
          </p>
        </div>
      )}
      <div className="flex-1">{page}</div>
      {['schemes', 'scheme', 'saved'].includes(route.name) && <CompareTray />}
      <footer className="border-t border-slate-200 bg-white mt-8">
        <div className="max-w-[1400px] mx-auto px-4 py-6 text-sm text-slate-500 flex flex-wrap gap-x-6 gap-y-2 justify-between">
          <span>© 2026 {t('appName')} — prototype. Not an official Government of India website.</span>
          <span>{t('aiDisclaimer')}</span>
        </div>
      </footer>
      <Modal open={locationModal} onClose={() => setLocationModal(false)} title={t('changeLocation')}>
        <LocationStep
          initial={location}
          submitLabel={t('confirmContinue')}
          onDone={(l) => {
            setLocation(l);
            setLocationModal(false);
          }}
        />
      </Modal>
    </div>
  );
}

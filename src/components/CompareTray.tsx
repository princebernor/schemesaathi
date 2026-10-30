import { AnimatePresence, motion } from 'framer-motion';
import { GitCompareArrows, X } from 'lucide-react';
import { schemeById } from '../data/schemes';
import { useStore } from '../state/store';

export default function CompareTray() {
  const { t, tx, compare, setCompare, toggleCompare, navigate } = useStore();
  return (
    <AnimatePresence>
      {compare.length > 0 && (
        <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} className="fixed bottom-4 inset-x-0 z-30 px-4 pointer-events-none">
          <div className="pointer-events-auto max-w-3xl mx-auto rounded-2xl bg-navy-900 text-white shadow-lift p-3 flex flex-wrap items-center gap-2">
            <GitCompareArrows size={20} className="ml-1 text-navy-100" />
            <span className="text-sm font-semibold mr-1">{t('compareTray', { n: compare.length })}</span>
            {compare.map((id) => {
              const s = schemeById(id);
              return s ? (
                <span key={id} className="inline-flex items-center gap-1 rounded-lg bg-white/10 pl-2.5 pr-1 py-1 text-sm max-w-[220px]">
                  <span className="truncate">{tx(s.name)}</span>
                  <button onClick={() => toggleCompare(id)} className="p-0.5 rounded hover:bg-white/20" aria-label={t('remove')}>
                    <X size={14} />
                  </button>
                </span>
              ) : null;
            })}
            <div className="ml-auto flex gap-2">
              <button className="btn-sm btn text-white/80 hover:bg-white/10" onClick={() => setCompare([])}>
                {t('clear')}
              </button>
              <button className="btn-sm btn bg-leaf-500 hover:bg-leaf-600 text-white" disabled={compare.length !== 2} onClick={() => navigate('/compare')}>
                {t('compareNow')}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

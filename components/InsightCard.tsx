import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface InsightCardProps {
  text: string | null;
  onDismiss: () => void;
}

export const InsightCard: React.FC<InsightCardProps> = ({ text, onDismiss }) => {
  useEffect(() => {
    if (!text) return;
    const timer = setTimeout(onDismiss, 8000);
    return () => clearTimeout(timer);
  }, [text, onDismiss]);

  return (
    <AnimatePresence>
      {text && (
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          onClick={onDismiss}
          className="fixed bottom-28 left-4 right-4 z-[110] flex justify-center pointer-events-auto"
        >
          <div className="max-w-sm w-full p-5 bg-black/80 backdrop-blur-2xl border border-rose-500/20 rounded-2xl shadow-2xl cursor-pointer">
            <span className="text-[8px] uppercase tracking-[0.4em] text-rose-500/60 font-black block mb-2">Private Intel</span>
            <p className="text-sm font-serif italic text-white/80 leading-relaxed">{text}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

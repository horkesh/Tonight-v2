import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PAGE_VARIANTS } from '../../constants';
import { useSession } from '../../context/SessionContext';

const LOADING_TIMEOUT_MS = 30000; // 30 seconds

export const LoadingView: React.FC = () => {
  const { actions } = useSession();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), LOADING_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div variants={PAGE_VARIANTS} initial="initial" animate="animate" exit="exit" className="flex flex-col items-center justify-center py-52 gap-6">
        <div className="w-24 h-[2px] bg-rose-600 animate-pulse mx-auto origin-left" />
        <span className="text-[10px] text-rose-500 tracking-[0.6em] uppercase mt-8 font-black">
          {timedOut ? 'Taking longer than expected...' : 'Drafting Files'}
        </span>
        {timedOut && (
          <button
            onClick={() => actions.setView('hub')}
            className="mt-4 px-8 py-4 rounded-full border border-rose-500/40 text-rose-500 hover:bg-rose-500 hover:text-white text-[11px] tracking-[0.3em] uppercase font-black transition-all"
          >
            Return to Hub
          </button>
        )}
    </motion.div>
  );
};

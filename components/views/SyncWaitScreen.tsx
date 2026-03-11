import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PAGE_VARIANTS } from '../../constants';

interface SyncWaitScreenProps {
  onRetry: () => void;
  onCancel: () => void;
  status?: string;
  isConnected?: boolean;
}

export const SyncWaitScreen: React.FC<SyncWaitScreenProps> = ({ onRetry, onCancel, status, isConnected }) => {
  const [showEscape, setShowEscape] = useState(false);
  
  useEffect(() => {
    const t = setTimeout(() => setShowEscape(true), 12000); // Show buttons after 12s
    return () => clearTimeout(t);
  }, []);

  const displayStatus = isConnected ? 'Syncing with Host...' : (status || 'Connecting...');

  return (
    <motion.div key="syncing" variants={PAGE_VARIANTS} initial="initial" animate="animate" exit="exit" className="flex flex-col items-center justify-center pt-32 gap-6">
      <div className="relative">
        <div className="w-16 h-16 border-2 border-white/10 rounded-full" />
        <div className="absolute inset-0 border-t-2 border-rose-500 rounded-full animate-spin" />
      </div>
      <div className="text-center">
        <h3 className="text-xl font-serif text-white">Connecting</h3>
        <p className="text-[10px] uppercase tracking-widest text-rose-500/80 font-black mt-2">{displayStatus}</p>

        <AnimatePresence>
          {showEscape && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-3 mt-8"
            >
              <button
                onClick={onRetry}
                className="text-[9px] uppercase tracking-widest text-white/30 border border-white/10 px-6 py-3 rounded-full hover:bg-white/10 transition-colors"
              >
                Retry Connection
              </button>
              <button
                onClick={onCancel}
                className="text-[9px] uppercase tracking-widest text-rose-500/80 px-6 py-2 hover:text-rose-400 transition-colors"
              >
                Cancel & Restart
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WHISPER_DARES } from '../constants';

interface WhisperOverlayProps {
  isActive: boolean;
  onDismiss: () => void;
}

export const WhisperOverlay: React.FC<WhisperOverlayProps> = ({ isActive, onDismiss }) => {
  const [dare, setDare] = useState('');
  const [showDare, setShowDare] = useState(false);
  const [usedIndices, setUsedIndices] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!isActive) {
      setShowDare(false);
      return;
    }
    let available = WHISPER_DARES.map((_, i) => i).filter(i => !usedIndices.has(i));
    if (available.length === 0) {
      available = WHISPER_DARES.map((_, i) => i);
      setUsedIndices(new Set());
    }
    const idx = available[Math.floor(Math.random() * available.length)];
    setDare(WHISPER_DARES[idx]);
    setUsedIndices(prev => new Set([...prev, idx]));
    const timer = setTimeout(() => setShowDare(true), 1500);
    return () => clearTimeout(timer);
  }, [isActive]);

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          onClick={onDismiss}
          className="fixed inset-0 z-[150] flex items-center justify-center p-8 cursor-pointer"
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <motion.div
            animate={{ scale: [1, 1.05, 1], opacity: [0.1, 0.25, 0.1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0 bg-rose-500/10"
          />
          <AnimatePresence>
            {showDare && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="relative max-w-xs text-center"
              >
                <p className="text-2xl font-serif italic text-white/90 leading-relaxed">{dare}</p>
                <span className="block mt-6 text-[8px] uppercase tracking-[0.5em] text-white/20 font-black">Tap to dismiss</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};


import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getDateHistory } from '../utils/dateHistory';
import { getDominantVibe } from '../utils/helpers';

const VIBE_ICON: Record<string, string> = {
  playful: '🎭', flirty: '🌹', deep: '🌊', comfortable: '☕'
};

const formatDate = (ts: number) =>
  new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export const PastDates: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const history = useMemo(() => getDateHistory(), []);

  if (history.length === 0) return null;

  return (
    <div className="w-full mt-8">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group"
      >
        <span className="text-[9px] uppercase tracking-[0.3em] font-black text-white/30 group-hover:text-white/50 transition-colors">
          Past Dates ({history.length})
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          className="text-white/20 text-xs"
        >
          ▼
        </motion.span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-2 pt-3 max-h-[300px] overflow-y-auto">
              {history.map((entry) => {
                const dominant = getDominantVibe(entry.vibe);
                return (
                  <div
                    key={entry.id}
                    className="p-4 rounded-2xl bg-white/5 border border-white/5"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{VIBE_ICON[dominant] || '✨'}</span>
                        <div>
                          <span className="text-white font-serif text-sm">{entry.partnerName}</span>
                          <span className="text-[9px] text-white/30 ml-2">{formatDate(entry.timestamp)}</span>
                        </div>
                      </div>
                      <span className="text-[9px] text-white/20 uppercase tracking-wider">{entry.location}</span>
                    </div>
                    <p className="text-[10px] text-white/50 font-serif italic leading-relaxed">{entry.headline}</p>
                    <div className="flex gap-3 mt-2">
                      {Object.entries(entry.vibe).map(([key, val]) => (
                        <div key={key} className="flex items-center gap-1">
                          <span className="text-[8px] text-white/20 uppercase">{key.slice(0, 3)}</span>
                          <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-rose-500/60 rounded-full"
                              style={{ width: `${val}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

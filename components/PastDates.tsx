
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getDateHistory } from '../utils/dateHistory';
import { getDominantVibe } from '../utils/helpers';
import { DEFAULT_AVATAR } from '../constants';

const VIBE_ICON: Record<string, string> = {
  playful: '🎭', flirty: '🌹', deep: '🌊', comfortable: '☕'
};

const formatDate = (ts: number) =>
  new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export const PastDates: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
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
            <div className="flex flex-col gap-3 pt-3 max-h-[400px] overflow-y-auto">
              {history.map((entry) => {
                const dominant = getDominantVibe(entry.vibe);
                const isExpanded = expandedId === entry.id;
                const hasHighlights = entry.highlights && entry.highlights.length > 0;

                return (
                  <motion.div
                    key={entry.id}
                    layout
                    className="rounded-2xl bg-white/5 border border-white/5 overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                      className="w-full p-4 text-left"
                    >
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border border-white/10">
                          <img
                            src={entry.partnerAvatar || DEFAULT_AVATAR}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{VIBE_ICON[dominant] || '✨'}</span>
                              <span className="text-white font-serif text-sm">{entry.partnerName}</span>
                              <span className="text-[9px] text-white/30">{formatDate(entry.timestamp)}</span>
                            </div>
                            <span className="text-[9px] text-white/20 uppercase tracking-wider">{entry.location}</span>
                          </div>

                          <p className="text-[10px] text-white/50 font-serif italic leading-relaxed truncate">{entry.headline}</p>

                          {/* Vibe bars */}
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

                          {/* Chemistry + expand hint */}
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-[9px] text-rose-400/60 font-black uppercase tracking-wider">
                              Chemistry {entry.chemistry}%
                            </span>
                            {hasHighlights && (
                              <span className="text-[8px] text-white/20 uppercase tracking-wider">
                                {isExpanded ? '▲ less' : '▼ highlights'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>

                    {/* Expanded highlights */}
                    <AnimatePresence>
                      {isExpanded && hasHighlights && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 pt-1 border-t border-white/5">
                            <p className="text-[9px] uppercase tracking-[0.3em] font-black text-white/20 mb-2">
                              Key Moments
                            </p>
                            <div className="flex flex-col gap-1.5">
                              {entry.highlights!.map((h, i) => (
                                <p key={i} className="text-[10px] text-white/40 font-serif italic leading-relaxed pl-3 border-l border-rose-500/20">
                                  {h}
                                </p>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

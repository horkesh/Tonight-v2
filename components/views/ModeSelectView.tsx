import React from 'react';
import { motion } from 'framer-motion';
import { PAGE_VARIANTS } from '../../constants';
import type { ModeId } from '../../types/personality';
import { PERSONALITY_CONFIGS } from '../../config/personalityConfigs';
import { MODE_THEMES } from '../../config/modeThemes';

interface ModeSelectViewProps {
  onSelectMode: (mode: ModeId) => void;
}

interface ModeCardData {
  id: ModeId;
  name: string;
  tagline: string;
  icon: string;
  durationLabel: string;
  available: boolean;
}

const MODE_CARDS: ModeCardData[] = [
  {
    id: 'date_night',
    name: 'Date Night',
    tagline: 'Your regular rendezvous. Deep, playful, intimate.',
    icon: '\u{1F3B7}', // sax emoji
    durationLabel: '30-45 min',
    available: true,
  },
  {
    id: 'vibe_check',
    name: 'Vibe Check',
    tagline: 'Quick-fire chemistry test. No signup needed.',
    icon: '\u26A1', // lightning
    durationLabel: '5-10 min',
    available: true,
  },
  {
    id: 'first_date',
    name: 'First Date',
    tagline: 'Warm, curious, gradual discovery.',
    icon: '\u{1F331}', // seedling
    durationLabel: '20-30 min',
    available: false,
  },
  {
    id: 'ldr',
    name: 'Long Distance',
    tagline: 'Bridge the miles. Sensory, tender, present.',
    icon: '\u{1F30D}', // globe
    durationLabel: '30-40 min',
    available: false,
  },
  {
    id: 'reignite',
    name: 'Reignite',
    tagline: 'Rediscover each other. Challenging, surprising.',
    icon: '\u{1F525}', // fire
    durationLabel: '20-40 min',
    available: false,
  },
];

export function ModeSelectView({ onSelectMode }: ModeSelectViewProps) {
  return (
    <motion.div
      key="modeSelect"
      variants={PAGE_VARIANTS}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex flex-col items-center gap-6 pb-12"
    >
      <div className="text-center mb-4">
        <h1 className="text-2xl font-serif text-white/90 tracking-wide">Tonight</h1>
        <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 mt-2">
          Choose your mode
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-sm">
        {MODE_CARDS.map((card, i) => {
          const theme = MODE_THEMES[card.id];
          return (
            <motion.button
              key={card.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              onClick={() => card.available && onSelectMode(card.id)}
              disabled={!card.available}
              className="relative overflow-hidden rounded-xl text-left transition-all duration-300 group"
              style={{
                background: `linear-gradient(135deg, ${theme['--tonight-bg-start']}, ${theme['--tonight-bg-end']})`,
                border: `1px solid ${card.available ? theme['--tonight-primary'] + '33' : 'rgba(255,255,255,0.06)'}`,
                opacity: card.available ? 1 : 0.5,
              }}
            >
              {/* Glow on hover */}
              {card.available && (
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{
                    background: `radial-gradient(ellipse at 30% 50%, ${theme['--tonight-primary-glow']}, transparent 70%)`,
                  }}
                />
              )}

              <div className="relative z-10 p-4 flex items-center gap-4">
                <span className="text-2xl">{card.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="font-semibold text-sm"
                      style={{ color: theme['--tonight-text'] }}
                    >
                      {card.name}
                    </span>
                    {!card.available && (
                      <span className="text-[8px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-white/5 text-white/30">
                        Soon
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-white/40 mt-0.5 truncate">
                    {card.tagline}
                  </p>
                </div>
                <span className="text-[10px] text-white/25 whitespace-nowrap">
                  {card.durationLabel}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

export default ModeSelectView;

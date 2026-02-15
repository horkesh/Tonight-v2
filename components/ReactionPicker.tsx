import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from './ui/GlassCard';
import { PersonaState } from '../types';
import { generateReactionImage } from '../services/geminiService';

interface ReactionPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  persona: PersonaState;
}

const REACTION_MODES = [
  { id: 'witty', label: 'Witty', icon: '🧠', description: 'Sharp, cynical intelligence' },
  { id: 'flirty', label: 'Flirty', icon: '🔥', description: 'Dangerous, sophisticated charm' },
  { id: 'shocked', label: 'Shocked', icon: '😲', description: 'Off-the-record disbelief' },
  { id: 'noir', label: 'Noir', icon: '🍷', description: 'Moody, observant silence' },
];

export const ReactionPicker: React.FC<ReactionPickerProps> = ({ isOpen, onClose, onSelect, persona }) => {
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [lastMode, setLastMode] = useState('');

  const handleTrigger = async (mode: string) => {
    setLastMode(mode);
    setIsSynthesizing(true);
    try {
      const url = await generateReactionImage(persona, mode);
      onSelect(url);
    } finally {
      setIsSynthesizing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative w-full max-w-md"
          >
            <GlassCard className="p-8 bg-slate-950 border-white/5 shadow-2xl rounded-t-[56px] rounded-b-none">
              <header className="flex justify-between items-center mb-10">
                <div className="flex flex-col">
                    <span className="text-[10px] tracking-[0.5em] text-rose-500 uppercase font-black">Reaction Studio</span>
                    <span className="text-[9px] text-white/20 uppercase mt-1 font-mono">Manifesting Digital Presence</span>
                </div>
                <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-colors">✕</button>
              </header>

              <div className="grid grid-cols-1 gap-4">
                {REACTION_MODES.map((mode) => (
                  <button
                    key={mode.id}
                    disabled={isSynthesizing}
                    onClick={() => handleTrigger(mode.id)}
                    className="relative group p-6 bg-white/[0.02] border border-white/5 rounded-[32px] hover:bg-rose-950/20 hover:border-rose-500/30 transition-all text-left overflow-hidden flex items-center gap-6 disabled:opacity-50"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                        {mode.icon}
                    </div>
                    <div>
                        <h4 className="text-white font-serif text-lg">{mode.label}</h4>
                        <p className="text-[10px] text-white/20 uppercase tracking-widest mt-0.5">{mode.description}</p>
                    </div>
                    
                    {isSynthesizing && lastMode === mode.id && (
                        <motion.div 
                            layoutId="synthesizer"
                            className="absolute inset-0 bg-rose-600/10 flex items-center justify-center backdrop-blur-sm"
                        >
                            <div className="flex gap-1.5">
                                {[1, 2, 3].map(i => (
                                    <motion.div 
                                        key={i}
                                        animate={{ height: [4, 12, 4], opacity: [0.3, 1, 0.3] }}
                                        transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }}
                                        className="w-1 bg-rose-500 rounded-full"
                                    />
                                ))}
                            </div>
                        </motion.div>
                    )}
                  </button>
                ))}
              </div>
              
              <div className="mt-8 text-center">
                 <p className="text-[8px] text-white/10 uppercase tracking-[0.4em] font-black">Powered by Gemini Visual Synthesis</p>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
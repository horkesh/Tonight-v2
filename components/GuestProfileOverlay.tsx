
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { PersonaState } from '../types';

interface GuestProfileOverlayProps {
  persona: PersonaState;
  currentName: string;
  onConfirm: (name: string, background: string) => void;
}

export const GuestProfileOverlay: React.FC<GuestProfileOverlayProps> = ({ persona, currentName, onConfirm }) => {
  const [name, setName] = useState(currentName === 'Guest' ? '' : currentName);
  const [background, setBackground] = useState(persona.background || '');

  const handleSubmit = () => {
    onConfirm(name || currentName, background);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/90 backdrop-blur-2xl"
    >
      <motion.div
        initial={{ y: 40, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', damping: 25 }}
        className="w-full max-w-sm flex flex-col gap-8"
      >
        <div className="text-center">
          <span className="text-[9px] text-rose-500 tracking-[0.5em] uppercase font-black block mb-3">Identity Confirmation</span>
          <h2 className="text-3xl font-serif text-white italic">Before we begin...</h2>
          <p className="text-[10px] text-white/30 uppercase tracking-widest mt-3">Tell your date a little about yourself</p>
        </div>

        {/* Avatar preview */}
        {persona.imageUrl && (
          <div className="flex justify-center">
            <div className="w-24 h-24 rounded-full border-2 border-white/10 overflow-hidden shadow-2xl">
              <img src={persona.imageUrl} className="w-full h-full object-cover" alt="You" />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-5">
          <div>
            <span className="text-[9px] text-white/40 uppercase tracking-widest font-black block mb-2">Your Name</span>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={currentName}
              autoFocus
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xl font-serif text-white text-center focus:outline-none focus:border-rose-500 transition-colors placeholder:text-white/15"
            />
          </div>

          <div>
            <span className="text-[9px] text-rose-500 uppercase tracking-widest font-black block mb-2">About You</span>
            <textarea
              value={background}
              onChange={e => setBackground(e.target.value)}
              placeholder="What do you do? What are you into? What should they know..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white/80 focus:outline-none focus:border-rose-500 transition-colors min-h-[120px] resize-none placeholder:text-white/15"
            />
            <p className="text-[8px] text-white/20 uppercase tracking-widest mt-2">This helps personalize questions to you</p>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          className="w-full py-4 bg-rose-600 rounded-full text-[10px] uppercase tracking-[0.3em] font-black text-white hover:bg-rose-500 shadow-[0_0_30px_rgba(225,29,72,0.3)] transition-all"
        >
          Enter the Room
        </button>

        <button
          onClick={() => onConfirm(currentName, '')}
          className="text-[9px] text-white/15 uppercase tracking-widest hover:text-white/40 transition-colors"
        >
          Skip for now
        </button>
      </motion.div>
    </motion.div>
  );
};

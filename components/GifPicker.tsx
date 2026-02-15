import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from './ui/GlassCard';

interface GifPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
}

const GIF_CATEGORIES = [
  { id: 'witty', label: 'Witty', icon: '🧠' },
  { id: 'flirty', label: 'Flirty', icon: '🔥' },
  { id: 'shocked', label: 'Shocked', icon: '😲' },
  { id: 'drinking', label: 'Drinking', icon: '🍷' },
];

const GIF_DATA: Record<string, string[]> = {
  witty: [
    'https://i.giphy.com/3o7TKVUn7iM8FMEU24.gif',
    'https://i.giphy.com/l0Exdm7I3f2nQfDq0.gif',
    'https://i.giphy.com/26gJyxYydzss61Y7C.gif',
  ],
  flirty: [
    'https://i.giphy.com/l2R0beWvYqI6s0wve.gif',
    'https://i.giphy.com/3o7TKp7mD7iU1W6Vq0.gif',
    'https://i.giphy.com/l0HlOf0HshIByy63u.gif',
  ],
  shocked: [
    'https://i.giphy.com/26gJyp63v0Lp8P5G8.gif',
    'https://i.giphy.com/3o72F8t9TDi2xTVO6I.gif',
    'https://i.giphy.com/26uf8PZTm8pIuWhlS.gif',
  ],
  drinking: [
    'https://i.giphy.com/l41lI4bAdzV3Yx3mU.gif',
    'https://i.giphy.com/3o85xAYQLpAzS9360.gif',
    'https://i.giphy.com/3o7TKMGpxS7K2tLzZC.gif',
  ]
};

export const GifPicker: React.FC<GifPickerProps> = ({ isOpen, onClose, onSelect }) => {
  const [activeTab, setActiveTab] = useState('witty');

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative w-full max-w-md"
          >
            <GlassCard className="p-6 bg-obsidian-900/90 border-white/5 shadow-2xl rounded-t-[48px] rounded-b-none">
              <header className="flex justify-between items-center mb-6">
                <span className="text-[10px] tracking-[0.4em] text-rose-500 uppercase font-black">Visual Reactions</span>
                <button onClick={onClose} className="text-white/20 hover:text-white transition-colors">✕</button>
              </header>

              <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
                {GIF_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveTab(cat.id)}
                    className={`px-4 py-2 rounded-full whitespace-nowrap text-[10px] uppercase tracking-widest font-black transition-all ${
                      activeTab === cat.id ? 'bg-rose-600 text-white' : 'bg-white/5 text-white/30'
                    }`}
                  >
                    {cat.icon} {cat.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3 h-64 overflow-y-auto pr-2 custom-scrollbar">
                {GIF_DATA[activeTab].map((url, i) => (
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    key={i}
                    onClick={() => onSelect(url)}
                    className="aspect-square rounded-2xl overflow-hidden border border-white/5 bg-white/5 cursor-pointer relative group"
                  >
                    <img 
                      src={url} 
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" 
                      alt="Reaction" 
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </motion.div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
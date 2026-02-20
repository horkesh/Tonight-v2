
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DateLocation } from '../types';

const LOCATION_ICONS: Record<string, string> = {
  sax: '🎷', city: '🌃', book: '📚', wave: '🌊', car: '🚘'
};

interface LocationWindowProps {
  location: DateLocation | null;
  generatedImage?: string;
}

export const LocationWindow: React.FC<LocationWindowProps> = ({ location, generatedImage }) => {
  if (!location) return null;

  const [imgFailed, setImgFailed] = useState(false);
  const displayImage = generatedImage || location.image;
  const icon = LOCATION_ICONS[location.icon] || '🌙';

  return (
    <div className="relative w-full h-48 rounded-3xl overflow-hidden border border-white/10 shadow-2xl group bg-black">
      {/* The View - Image or Fallback */}
      <AnimatePresence mode="popLayout">
        {displayImage && !imgFailed ? (
          <motion.img
            key={displayImage}
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            src={displayImage}
            alt={location.title}
            className="absolute inset-0 w-full h-full object-cover opacity-80"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <motion.div
            key="fallback-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 w-full h-full bg-gradient-to-br from-slate-900 via-rose-950/30 to-slate-900 flex items-center justify-center"
          >
            <span className="text-6xl opacity-20">{icon}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interior Reflection / Haze */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-30 mix-blend-overlay pointer-events-none" />

      {/* Subtle Live Pulse Overlay */}
      <motion.div
        animate={{ opacity: [0.1, 0.3, 0.1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-blue-500/10 mix-blend-overlay pointer-events-none"
      />

      {/* Info Label */}
      <div className="absolute bottom-4 left-6 z-10 pointer-events-none">
        <div className="flex items-center gap-2 mb-1">
            <span className="text-[9px] uppercase tracking-[0.3em] font-black text-rose-500 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded shadow-lg border border-white/5">Live Feed</span>
            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(225,29,72,0.8)]" />
        </div>
        <h3 className="text-xl font-serif text-white italic drop-shadow-lg">{location.title}</h3>
      </div>

      {/* Glass Glint */}
      <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-white/10 via-transparent to-transparent opacity-40 pointer-events-none" />
    </div>
  );
};

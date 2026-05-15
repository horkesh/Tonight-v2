
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DateLocation } from '../types';
import { NOISE_TEXTURE_URI, LOCATION_ICONS } from '../constants';

interface LocationWindowProps {
  location: DateLocation | null;
  generatedImage?: string;
  narrativeText?: string;
}

export const LocationWindow: React.FC<LocationWindowProps> = ({ location, generatedImage, narrativeText }) => {
  if (!location) return (
    <div className="relative w-full h-48 rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-black">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-rose-950/20 to-slate-900 flex items-center justify-center">
        <span className="text-5xl opacity-15">🌙</span>
      </div>
      <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay" style={{ backgroundImage: `url("${NOISE_TEXTURE_URI}")`, backgroundRepeat: "repeat", backgroundSize: "48px 48px" }} />
      <div className="absolute bottom-4 left-6 z-10 pointer-events-none">
        <h3 className="text-xl font-serif text-white/30 italic">Tonight</h3>
      </div>
    </div>
  );

  // Progressive fallback: try generatedImage first, then location.image, then icon.
  // If either of the first two fails to load (e.g. broken data URI, blocked CDN),
  // log it and step down to the next candidate instead of jumping straight to the icon.
  const [primaryFailed, setPrimaryFailed] = useState(false);
  const [secondaryFailed, setSecondaryFailed] = useState(false);

  // Reset when sources change so a new image gets a fresh try.
  useEffect(() => { setPrimaryFailed(false); setSecondaryFailed(false); }, [generatedImage, location.image]);

  const primarySrc = generatedImage;
  const secondarySrc = location.image;
  const activeSrc = !primaryFailed && primarySrc
    ? primarySrc
    : !secondaryFailed && secondarySrc
      ? secondarySrc
      : null;
  const icon = LOCATION_ICONS[location.icon] || '🌙';

  return (
    <div className="relative w-full h-48 rounded-3xl overflow-hidden border border-white/10 shadow-2xl group bg-black">
      {/* The View - Image or Fallback */}
      <AnimatePresence mode="popLayout">
        {activeSrc ? (
          <motion.img
            key={activeSrc}
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            src={activeSrc}
            alt={location.title}
            className="absolute inset-0 w-full h-full object-cover opacity-80"
            onError={() => {
              if (activeSrc === primarySrc) {
                console.warn('LocationWindow: primary image failed to load', primarySrc?.slice(0, 80));
                setPrimaryFailed(true);
              } else {
                console.warn('LocationWindow: fallback image failed to load', secondarySrc?.slice(0, 80));
                setSecondaryFailed(true);
              }
            }}
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
      <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay" style={{ backgroundImage: `url("${NOISE_TEXTURE_URI}")`, backgroundRepeat: "repeat", backgroundSize: "48px 48px" }} />

      {/* Subtle Live Pulse Overlay */}
      <motion.div
        animate={{ opacity: [0.1, 0.3, 0.1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-blue-500/10 mix-blend-overlay pointer-events-none"
      />

      {/* Narrative Overlay */}
      <AnimatePresence>
        {narrativeText && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/40"
          >
            <p className="text-sm font-serif italic text-white/70 text-center px-6">{narrativeText}</p>
          </motion.div>
        )}
      </AnimatePresence>

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

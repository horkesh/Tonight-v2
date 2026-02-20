
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DateContext } from '../types';

const ARRIVAL_LINES: Record<string, string> = {
  lounge: "A figure takes the seat across from you...",
  rooftop: "Footsteps on the stairs. Someone's here...",
  study: "The door creaks. A presence fills the room...",
  beach: "A silhouette appears against the moonlight...",
  car: "The passenger door opens...",
};

const WELCOME_LINES: Record<string, string> = {
  lounge: "You spot them waiting in the corner...",
  rooftop: "They are standing by the edge, looking out...",
  study: "You find them reading by the fire...",
  beach: "They are waiting by the water's edge...",
  car: "You slide into the passenger seat...",
};

interface ArrivalOverlayProps {
  event: { name: string; avatar: string; type?: 'arrival' | 'welcome' } | null;
  dateContext: DateContext | null;
  onDismiss: () => void;
}

export const ArrivalOverlay: React.FC<ArrivalOverlayProps> = ({ event, dateContext, onDismiss }) => {
  // Auto-dismiss after 5.5 seconds
  useEffect(() => {
    if (!event) return;
    const t = setTimeout(onDismiss, 5500);
    return () => clearTimeout(t);
  }, [event, onDismiss]);

  const locationId = dateContext?.location?.id || 'lounge';
  const isWelcome = event?.type === 'welcome';
  
  const lineMap = isWelcome ? WELCOME_LINES : ARRIVAL_LINES;
  const defaultLine = isWelcome ? "You see them waiting..." : "Someone arrives...";
  
  const arrivalLine = lineMap[locationId] || defaultLine;
  const bgImage = dateContext?.generatedImage || dateContext?.location?.image;

  return (
    <AnimatePresence>
      {event && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          onClick={onDismiss}
          className="fixed inset-0 z-[130] flex flex-col items-center justify-center cursor-pointer overflow-hidden"
        >
          {/* Background: location image */}
          {bgImage && (
            <motion.img
              src={bgImage}
              initial={{ scale: 1.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.4 }}
              transition={{ duration: 2 }}
              className="absolute inset-0 w-full h-full object-cover"
              alt=""
            />
          )}

          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Cinematic vignette */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.9)_100%)]" />

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center gap-10 px-8">
            {/* Arrival text */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 1.2 }}
              className="text-xl font-serif text-white/60 italic text-center max-w-xs"
            >
              {arrivalLine}
            </motion.p>

            {/* Avatar reveal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, filter: 'blur(20px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              transition={{ delay: 1.5, duration: 1.5, ease: 'easeOut' }}
              className="w-32 h-32 rounded-full border-2 border-rose-500/30 overflow-hidden shadow-[0_0_60px_rgba(225,29,72,0.3)]"
            >
              <img src={event.avatar} className="w-full h-full object-cover" alt={event.name} />
            </motion.div>

            {/* Name */}
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.5, duration: 1 }}
              className="text-4xl font-serif text-white italic"
            >
              {event.name}
            </motion.h2>

            {/* Subtle tap hint */}
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              transition={{ delay: 4, duration: 1 }}
              className="text-[8px] uppercase tracking-[0.5em] text-white/30 font-black mt-8"
            >
              Tap to continue
            </motion.span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};


import React, { useEffect, useRef, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DateContext } from '../types';
import { soundManager } from '../services/soundManager';

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

const WELCOME_SUBTITLES: Record<string, string> = {
  lounge: "The jazz hasn't started yet...",
  rooftop: "The city holds its breath...",
  study: "A page turns somewhere in the silence...",
  beach: "The tide pulls closer...",
  car: "Rain on the windshield. Just you two...",
};

interface ArrivalOverlayProps {
  event: { name: string; avatar: string; type?: 'arrival' | 'welcome' } | null;
  dateContext: DateContext | null;
  onDismiss: () => void;
}

export const ArrivalOverlay: React.FC<ArrivalOverlayProps> = ({ event, dateContext, onDismiss }) => {
  const onDismissRef = useRef(onDismiss);
  useEffect(() => { onDismissRef.current = onDismiss; }, [onDismiss]);
  const stableDismiss = useCallback(() => onDismissRef.current(), []);

  const [stage, setStage] = useState(0);
  const [canDismiss, setCanDismiss] = useState(false);

  // Play sound and advance through stages
  useEffect(() => {
    if (!event) {
      setStage(0);
      setCanDismiss(false);
      return;
    }

    soundManager.play('arrival_swell');

    // Stage progression timeline (9s total)
    const timers = [
      setTimeout(() => setStage(1), 1500),   // Particles converge
      setTimeout(() => setStage(2), 3000),    // Avatar materialize
      setTimeout(() => setStage(3), 5000),    // Name reveal
      setTimeout(() => setStage(4), 7000),    // Subtitle + tap hint
      setTimeout(() => setCanDismiss(true), 5000),
      setTimeout(stableDismiss, 12000),        // Auto-dismiss at 12s
    ];

    return () => timers.forEach(clearTimeout);
  }, [event, stableDismiss]);

  const locationId = dateContext?.location?.id || 'lounge';
  const isWelcome = event?.type === 'welcome';
  const lineMap = isWelcome ? WELCOME_LINES : ARRIVAL_LINES;
  const defaultLine = isWelcome ? "You see them waiting..." : "Someone arrives...";
  const arrivalLine = lineMap[locationId] || defaultLine;
  const subtitle = isWelcome
    ? (WELCOME_SUBTITLES[locationId] || "Your evening begins...")
    : "Your evening begins...";
  const bgImage = dateContext?.generatedImage || dateContext?.location?.image;

  const handleDismiss = () => {
    if (canDismiss) stableDismiss();
  };

  // Generate particle positions for the convergence effect
  const particles = Array.from({ length: 10 }, (_, i) => {
    const angle = (i / 10) * Math.PI * 2;
    const radius = 150 + Math.random() * 80;
    return {
      startX: Math.cos(angle) * radius,
      startY: Math.sin(angle) * radius,
      size: 8 + Math.random() * 16,
      delay: Math.random() * 0.5,
    };
  });

  return (
    <AnimatePresence>
      {event && (
        <motion.div
          key="arrival-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          onClick={handleDismiss}
          className="fixed inset-0 z-[130] flex flex-col items-center justify-center cursor-pointer overflow-hidden"
        >
          {/* Stage 0: Location art full-bleed with Ken Burns */}
          {bgImage && (
            <motion.img
              src={bgImage}
              initial={{ scale: 1.3, opacity: 0 }}
              animate={{ scale: 1.05, opacity: 0.5 }}
              transition={{ duration: 4, ease: 'easeOut' }}
              className="absolute inset-0 w-full h-full object-cover"
              alt=""
            />
          )}

          {/* Dark overlay that lifts gradually */}
          <motion.div
            initial={{ opacity: 0.9 }}
            animate={{ opacity: 0.55 }}
            transition={{ duration: 3, delay: 0.5 }}
            className="absolute inset-0 bg-black backdrop-blur-sm"
          />

          {/* Cinematic vignette */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(0,0,0,0.95)_100%)]" />

          <div className="relative z-10 flex flex-col items-center gap-6 px-8">
            {/* Arrival text — appears first */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: stage >= 0 ? 1 : 0, y: stage >= 0 ? 0 : 20 }}
              transition={{ delay: 0.3, duration: 1.2 }}
              className="text-xl font-serif text-white/50 italic text-center max-w-xs"
            >
              {arrivalLine}
            </motion.p>

            {/* Stage 1: Particle convergence */}
            <div className="relative w-40 h-40 flex items-center justify-center">
              {stage >= 1 && particles.map((p, i) => (
                <motion.div
                  key={i}
                  initial={{ x: p.startX, y: p.startY, opacity: 0, scale: 1 }}
                  animate={{ x: 0, y: 0, opacity: [0, 0.6, 0], scale: [1, 0.5, 0] }}
                  transition={{ duration: 1.8, delay: p.delay, ease: 'easeIn' }}
                  className="absolute rounded-full bg-rose-400/60 blur-sm"
                  style={{ width: p.size, height: p.size }}
                />
              ))}

              {/* Stage 2: Avatar materializes from blur cloud */}
              <motion.div
                initial={{ opacity: 0, scale: 1.3, filter: 'blur(30px)' }}
                animate={{
                  opacity: stage >= 2 ? 1 : 0,
                  scale: stage >= 2 ? 1 : 1.3,
                  filter: stage >= 2 ? 'blur(0px)' : 'blur(30px)',
                }}
                transition={{ duration: 2, ease: 'easeOut' }}
                className="w-36 h-36 rounded-full border-2 border-rose-500/40 overflow-hidden shadow-[0_0_80px_rgba(225,29,72,0.4)]"
              >
                <img src={event.avatar} className="w-full h-full object-cover" alt={event.name} />
              </motion.div>
            </div>

            {/* Stage 3: Name reveal with letter-spacing animation */}
            <motion.h2
              initial={{ opacity: 0, letterSpacing: '0.4em', y: 10 }}
              animate={{
                opacity: stage >= 3 ? 1 : 0,
                letterSpacing: stage >= 3 ? '0.08em' : '0.4em',
                y: stage >= 3 ? 0 : 10,
              }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
              className="text-5xl font-serif text-white italic text-center"
              style={{ textShadow: '0 0 40px rgba(225, 29, 72, 0.5)' }}
            >
              {event.name}
            </motion.h2>

            {/* Guest welcome subtitle */}
            {isWelcome && stage >= 3 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                transition={{ delay: 0.5, duration: 1 }}
                className="text-sm font-serif text-white/40 italic -mt-2"
              >
                {event.name} is waiting for you
              </motion.p>
            )}

            {/* Stage 4: Subtitle + tap hint */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{
                opacity: stage >= 4 ? 0.6 : 0,
                y: stage >= 4 ? 0 : 10,
              }}
              transition={{ duration: 1 }}
              className="text-sm font-serif text-white/50 italic text-center mt-2"
            >
              {subtitle}
            </motion.p>

            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: stage >= 4 ? 0.3 : 0 }}
              transition={{ duration: 1, delay: 0.5 }}
              className="text-[8px] uppercase tracking-[0.5em] text-white/25 font-black mt-6"
            >
              Tap to continue
            </motion.span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

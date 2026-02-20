
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PersonaState } from '../types';

interface PersonaRevealProps {
  persona: PersonaState;
  name: string;
  isSelf?: boolean;
}

export const PersonaReveal: React.FC<PersonaRevealProps> = ({ 
  persona, 
  name,
  isSelf = false
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [activeTraitIndex, setActiveTraitIndex] = useState<number | null>(null);
  const [isGlitching, setIsGlitching] = useState(false);
  const [isTakingTooLong, setIsTakingTooLong] = useState(false);
  const [forceShowPlaceholder, setForceShowPlaceholder] = useState(false);
  
  const { imageUrl, traits, memories, secrets, revealProgress, chemistry, isGenerating } = persona;
  
  const lastProgress = useRef(revealProgress);
  const lastSecretCount = useRef(secrets.length);
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pulse, setPulse] = useState(0);

  const DEFAULT_PLACEHOLDER = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop";

  // Watch for stalled image sync
  useEffect(() => {
    if (!imageUrl && !forceShowPlaceholder) {
        const t = setTimeout(() => {
            setForceShowPlaceholder(true);
        }, 8000); // 8 second timeout before forcing placeholder
        return () => clearTimeout(t);
    }
  }, [imageUrl, forceShowPlaceholder]);

  // Watch generating state for stalls
  useEffect(() => {
      if (isGenerating && !imageUrl) {
          setIsTakingTooLong(false);
          if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
          loadingTimerRef.current = setTimeout(() => {
              setIsTakingTooLong(true);
          }, 15000); // 15s UI timeout
      } else {
          setIsTakingTooLong(false);
          if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
      }
      return () => { if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current); };
  }, [isGenerating, imageUrl]);

  // Trigger Glitch Effect on updates
  useEffect(() => {
    let shouldGlitch = false;
    if (revealProgress > lastProgress.current) {
      setPulse(p => p + 1);
      if (revealProgress % 10 === 0) shouldGlitch = true;
    }
    if (secrets.length > lastSecretCount.current) {
        shouldGlitch = true;
    }

    if (shouldGlitch) {
        setIsGlitching(true);
        // Haptic buzz
        if (navigator.vibrate) navigator.vibrate([30, 30, 30]);
        setTimeout(() => setIsGlitching(false), 600);
    }

    lastProgress.current = revealProgress;
    lastSecretCount.current = secrets.length;
  }, [revealProgress, secrets.length]);

  // Derived styles for better performance
  const cardFilters = useMemo(() => {
    if (isSelf) {
      return `blur(0px) brightness(1) grayscale(0%)`;
    }
    const blur = Math.max(0, 16 - (revealProgress / 5));
    const bright = 0.4 + (revealProgress / 100); 
    const gray = Math.max(0, 80 - revealProgress);
    return `blur(${blur}px) brightness(${bright}) grayscale(${gray}%)`;
  }, [revealProgress, isSelf]);

  const getRelatedContent = (trait: string) => {
    const normalizedTrait = trait.toLowerCase();
    const pool = [...memories, ...secrets];
    const match = pool.find(item => item.toLowerCase().includes(normalizedTrait));
    return match || pool[0] || "No associated data found.";
  };

  const displayImage = imageUrl || (forceShowPlaceholder ? DEFAULT_PLACEHOLDER : null);

  return (
    <div className="relative w-full h-[460px] [perspective:1500px] z-10 select-none">
      <motion.div
        className="w-full h-full relative [transform-style:preserve-3d]"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 180, damping: 24 }}
      >
        {/* Front: Avatar Card */}
        <div 
          className="absolute inset-0 w-full h-full [backface-visibility:hidden] rounded-[48px] overflow-hidden bg-slate-900/40 border border-white/10 shadow-2xl cursor-pointer group"
          onClick={() => {
            setIsFlipped(true);
            setActiveTraitIndex(null);
          }}
          style={{ transform: 'rotateY(0deg)', WebkitBackfaceVisibility: 'hidden' }}
        >
          <AnimatePresence mode="wait">
            {displayImage && !isTakingTooLong ? (
              <motion.div
                key="image-content"
                className={`absolute inset-0 w-full h-full ${isGlitching ? 'glitch-active' : ''}`}
                animate={{ 
                  scale: [1, 1.02, 1],
                  filter: isGlitching ? 'contrast(2) brightness(1.5)' : cardFilters
                }}
                transition={{ 
                    scale: { duration: 15, repeat: Infinity, repeatType: "mirror" },
                    filter: { duration: 0.2 } // Fast snap for glitch
                }}
                data-text={name} // Used by CSS glitch pseudo-elements
              >
                <img src={displayImage} className="w-full h-full object-cover" alt={name} />
                
                {/* Reveal Spark Glow */}
                <motion.div 
                  key={`pulse-${pulse}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={pulse > 0 ? { opacity: [0, 0.6, 0], scale: [1, 1.4, 1.8] } : {}}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className="absolute inset-0 bg-rose-500 pointer-events-none mix-blend-screen"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-black/10" />
              </motion.div>
            ) : (
              <div key="placeholder-content" className="absolute inset-0 w-full h-full bg-slate-950 flex flex-col items-center justify-center gap-8">
                 <div className="relative">
                    {isTakingTooLong ? (
                        <div className="w-20 h-20 border-2 border-white/10 rounded-full flex items-center justify-center">
                            <span className="text-2xl">⚠️</span>
                        </div>
                    ) : (
                        <>
                            <div className="w-20 h-20 border-2 border-white/5 rounded-full" />
                            <motion.div 
                            animate={{ rotate: 360 }}
                            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-0 w-20 h-20 border-t-2 border-rose-500 rounded-full" 
                            />
                        </>
                    )}
                 </div>
                 <div className="text-center">
                    <span className="text-[10px] tracking-[0.6em] text-rose-500 uppercase font-black block mb-3">
                        {isTakingTooLong ? "Signal Lost" : "Syncing..."}
                    </span>
                    <p className="text-[9px] text-white/10 uppercase tracking-widest">
                        {isTakingTooLong ? "Visual Feed Interrupted" : "Compiling digital identity"}
                    </p>
                 </div>
              </div>
            )}
          </AnimatePresence>

          {/* Persona Header Info */}
          <div className="absolute top-10 left-10 right-10 flex justify-between items-start pointer-events-none z-20">
            <div className="flex flex-col gap-1.5">
              <span className="text-[9px] tracking-[0.5em] text-white/30 uppercase font-black">
                {isSelf ? "Your Projection" : "Digital Ghost"}
              </span>
              <h3 className={`text-4xl font-serif text-white italic drop-shadow-2xl ${isGlitching ? 'text-rose-400 translate-x-[2px]' : ''}`}>
                {isSelf ? "You" : name}
              </h3>
            </div>
            <div className={`bg-rose-500/10 backdrop-blur-3xl border border-rose-500/30 px-4 py-2 rounded-full shadow-2xl transition-transform ${isGlitching ? 'scale-110 bg-rose-500 text-white' : ''}`}>
              <span className="text-[11px] text-rose-400 font-bold uppercase tracking-widest">{chemistry}%</span>
            </div>
          </div>

          {/* Reveal Content Footer */}
          <div className="absolute bottom-0 left-0 right-0 p-10 bg-gradient-to-t from-black via-black/40 to-transparent z-20">
             <div className="flex flex-wrap gap-2.5 mb-8">
                {traits.length > 0 ? traits.slice(0, 4).map((t, i) => (
                  <div key={i} className="relative">
                    <motion.button
                      whileHover={{ scale: 1.05, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTraitIndex(activeTraitIndex === i ? null : i);
                      }}
                      className={`px-3.5 py-1.5 border rounded-full text-[10px] uppercase tracking-widest font-bold backdrop-blur-3xl transition-colors ${
                        activeTraitIndex === i 
                          ? 'bg-rose-600 border-rose-400 text-white shadow-[0_0_15px_rgba(225,29,72,0.4)]' 
                          : 'bg-white/5 border-white/10 text-white/80'
                      }`}
                    >
                      {t}
                    </motion.button>
                    
                    <AnimatePresence>
                      {activeTraitIndex === i && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 5, scale: 0.9 }}
                          className="absolute bottom-full left-0 mb-3 w-56 z-[60] pointer-events-none"
                        >
                          <div className="bg-black/95 backdrop-blur-2xl border border-rose-500/30 p-4 rounded-2xl shadow-2xl">
                            <p className="text-[11px] text-rose-100/80 italic leading-relaxed font-serif">
                              "{getRelatedContent(t)}"
                            </p>
                            <div className="absolute -bottom-1.5 left-6 w-3 h-3 bg-black border-r border-b border-rose-500/30 rotate-45" />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )) : (
                  <span className="px-3 py-1 bg-white/[0.02] border border-white/5 rounded-full text-[9px] uppercase tracking-widest text-white/15 font-bold">Unanalyzed</span>
                )}
             </div>
             <div className="flex items-center gap-5">
                <div className="flex-1 h-[3px] bg-white/10 rounded-full overflow-hidden">
                   <motion.div 
                    animate={{ width: `${revealProgress}%` }} 
                    transition={{ type: "spring", bounce: 0, duration: 1.5 }}
                    className="h-full bg-rose-500 shadow-[0_0_20px_rgba(225,29,72,0.8)]" 
                   />
                </div>
                <span className="text-[11px] text-white/40 font-mono tracking-tighter w-12 text-right">{revealProgress}%</span>
             </div>
          </div>

          {/* Generating Indicator (Non-Blocking if image exists) */}
          <AnimatePresence>
            {isGenerating && !displayImage && !isTakingTooLong && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-40">
                <div className="text-center">
                   <div className="w-12 h-12 border-t-2 border-rose-500 rounded-full animate-spin mb-4 mx-auto" />
                   <span className="text-[10px] tracking-[0.6em] text-rose-500 uppercase font-black">Decrypting...</span>
                </div>
              </motion.div>
            )}
            
            {/* Subtle refreshing indicator if image DOES exist */}
            {isGenerating && displayImage && (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="absolute top-10 right-10 z-50">
                   <div className="w-5 h-5 border-2 border-white/10 border-t-rose-500 rounded-full animate-spin" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Back: Dossier Card */}
        <div 
          className="absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-[48px] overflow-hidden bg-slate-950 border border-white/10 shadow-2xl p-12 flex flex-col cursor-pointer"
          onClick={() => setIsFlipped(false)}
          style={{ WebkitBackfaceVisibility: 'hidden' }}
        >
          <header className="flex justify-between items-center mb-12">
            <span className="text-[10px] tracking-[0.5em] text-rose-500 uppercase font-black">
                {isSelf ? "Your Digital Footprint" : "Classified Intel"}
            </span>
            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
               <span className="text-white/20 text-xs">✕</span>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto space-y-12 custom-scrollbar pr-2">
            <section>
              <h4 className="text-[10px] tracking-[0.4em] text-white/20 uppercase font-black mb-6 flex items-center gap-4">
                Observations
                <div className="h-[1px] flex-1 bg-white/5" />
              </h4>
              <div className="space-y-4">
                {memories.length > 0 ? memories.slice(-3).reverse().map((m, i) => (
                  <div key={i} className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl hover:bg-white/[0.04] transition-colors">
                    <p className="text-[13px] text-white/50 italic leading-relaxed">"{m}"</p>
                  </div>
                )) : (
                  <p className="text-[10px] text-white/10 uppercase tracking-[0.3em] text-center py-8 border border-dashed border-white/5 rounded-3xl">No data detected</p>
                )}
              </div>
            </section>

            <section>
              <h4 className="text-[10px] tracking-[0.4em] text-rose-500/40 uppercase font-black mb-6 flex items-center gap-4">
                Vulnerabilities
                <div className="h-[1px] flex-1 bg-rose-500/10" />
              </h4>
              <div className="space-y-4">
                {secrets.length > 0 ? secrets.map((s, i) => (
                  <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} key={i} className="p-6 bg-rose-950/20 border border-rose-500/20 rounded-3xl shadow-xl">
                    <p className="text-[13px] text-rose-100/70 leading-relaxed italic font-serif">"{s}"</p>
                  </motion.div>
                )) : (
                  <div className="text-center py-6 border border-dashed border-white/5 rounded-3xl">
                      <p className="text-[10px] text-white/20 uppercase tracking-[0.3em] mb-2">Undisclosed</p>
                      <p className="text-[9px] text-white/10">Ask Deep/Intimate Questions or Analyze Photos to uncover.</p>
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className="mt-10">
            <div className="p-6 bg-white/[0.02] border border-white/5 rounded-[36px] text-center shadow-inner">
              <span className="text-[9px] text-white/30 uppercase font-black block mb-1 tracking-[0.3em]">Unlocked</span>
              <span className="text-3xl font-serif text-white/80">{revealProgress}<span className="text-sm opacity-30 ml-1">%</span></span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

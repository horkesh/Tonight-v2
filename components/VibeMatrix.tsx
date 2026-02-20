
import React, { useMemo } from 'react';
import { VibeStats } from '../types';
import { motion } from 'framer-motion';

interface VibeMatrixProps {
  vibe: VibeStats;
  sipLevel: number;
  drunkFactor: number;
}

export const VibeMatrix: React.FC<VibeMatrixProps> = ({ vibe }) => {
  // Convert vibe stats into 4 cardinal points of a blob
  // Center is 50, 50. 
  // Old Radius: Base 20 + 25 (Max 45) -> Looked like 40% full at 0.
  // New Radius: Base 5 + 40 (Max 45) -> Looks empty at 0.
  const points = useMemo(() => {
    // Top (Playful)
    const pY = 50 - (5 + (vibe.playful / 100) * 40);
    // Right (Flirty)
    const fX = 50 + (5 + (vibe.flirty / 100) * 40);
    // Bottom (Deep)
    const dY = 50 + (5 + (vibe.deep / 100) * 40);
    // Left (Comfort)
    const cX = 50 - (5 + (vibe.comfortable / 100) * 40);

    // Create a smooth closed curve path (Blob)
    return `M 50 ${pY} Q ${fX} 50 ${fX} 50 T 50 ${dY} T ${cX} 50 T 50 ${pY}`;
  }, [vibe]);

  return (
    <motion.div 
      layoutId="vibe-matrix-container"
      className="h-48 mt-8 w-full relative group"
    >
      <div className="absolute inset-0 bg-white/[0.02] border border-white/5 rounded-[40px] overflow-hidden">
        
        {/* Labels */}
        <div className="absolute top-4 left-0 right-0 text-center pointer-events-none z-10">
             <span className="text-[8px] text-white/20 uppercase tracking-[0.2em] font-black">Playful</span>
        </div>
        <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none z-10">
             <span className="text-[8px] text-white/20 uppercase tracking-[0.2em] font-black">Deep</span>
        </div>
        <div className="absolute top-1/2 left-4 -translate-y-1/2 -rotate-90 pointer-events-none z-10">
             <span className="text-[8px] text-white/20 uppercase tracking-[0.2em] font-black">Comfort</span>
        </div>
        <div className="absolute top-1/2 right-4 -translate-y-1/2 rotate-90 pointer-events-none z-10">
             <span className="text-[8px] text-white/20 uppercase tracking-[0.2em] font-black">Flirty</span>
        </div>

        {/* The Blob */}
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_15px_rgba(225,29,72,0.5)]">
            <defs>
                <radialGradient id="auraGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                    <stop offset="0%" stopColor="rgba(225, 29, 72, 0.6)" />
                    <stop offset="100%" stopColor="rgba(225, 29, 72, 0.0)" />
                </radialGradient>
            </defs>
            
            {/* Core Shape */}
            <motion.path 
                d={points}
                fill="url(#auraGradient)"
                stroke="rgba(225, 29, 72, 0.5)"
                strokeWidth="0.5"
                transition={{ type: "spring", stiffness: 50, damping: 20 }}
            />
            
            {/* Grid Circles for reference */}
            <circle cx="50" cy="50" r="10" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.2" />
            <circle cx="50" cy="50" r="25" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.2" />
            <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.2" />
        </svg>

        {/* Subtle Noise Texture Overlay */}
        <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      </div>
    </motion.div>
  );
};


import React from 'react';
import { VibeStats } from '../types';
import { motion } from 'framer-motion';

interface DateHUDProps {
  vibe: VibeStats;
  sipLevel: number;
}

export const DateHUD: React.FC<DateHUDProps> = ({ vibe, sipLevel }) => {
  const items = [
    { label: 'PLAYFUL', icon: '⚡', val: vibe.playful },
    { label: 'FLIRTY', icon: '🔥', val: vibe.flirty },
    { label: 'DEEP', icon: '🌌', val: vibe.deep },
    { label: 'SAFETY', icon: '🧸', val: vibe.comfortable },
  ];

  return (
    <div className="flex justify-between items-end px-2 py-4 mt-20 mb-8 border-b border-white/5 select-none">
      <div className="flex gap-6">
        {items.map((item, i) => (
          <div key={i} className="flex flex-col items-center group relative">
            <div className="w-[3px] h-12 bg-white/5 rounded-full relative overflow-hidden">
                <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: `${item.val}%` }}
                    transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute bottom-0 left-0 right-0 bg-rose-500/40 shadow-[0_0_8px_rgba(225,29,72,0.4)]" 
                />
            </div>
            <span className="text-[9px] mt-2 opacity-30 group-hover:opacity-100 transition-opacity font-black tracking-tighter">{item.icon}</span>
            
            {/* Hover Tooltip */}
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all pointer-events-none bg-black/80 backdrop-blur-md px-2 py-0.5 rounded border border-white/10">
               <span className="text-[7px] text-white/50 uppercase tracking-widest font-black">{item.label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-6">
        <div className="relative w-8 h-10 border border-white/5 rounded-b-2xl rounded-t-lg overflow-hidden bg-white/[0.01] backdrop-blur-xl">
           <motion.div 
             animate={{ height: `${100 - sipLevel}%` }}
             className="absolute bottom-0 w-full bg-gradient-to-t from-rose-900/40 via-rose-500/20 to-transparent"
             transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
           />
           <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
              <span className="text-[8px]">🥃</span>
           </div>
        </div>
      </div>
    </div>
  );
};

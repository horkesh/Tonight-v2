
import React from 'react';
import { User } from '../types';
import { motion } from 'framer-motion';

interface PresenceBarProps {
  users: User[];
  round: number;
  onHome: () => void;
  onEditSelf?: () => void;
  isConnected?: boolean;
}

export const PresenceBar: React.FC<PresenceBarProps> = ({ users, round, onHome, onEditSelf, isConnected = false }) => {
  const self = users.find(u => u.isSelf);
  const partner = users.find(u => !u.isSelf);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 p-6 pointer-events-none">
      <div className="max-w-md mx-auto flex justify-between items-center bg-black/40 backdrop-blur-2xl border border-white/5 px-6 py-3 rounded-full shadow-2xl pointer-events-auto relative">
        
        {/* Self Avatar (How they see you) */}
        <div className="flex items-center gap-3">
          <div 
            className="relative group cursor-pointer"
            onClick={onEditSelf}
          >
            <div className={`w-10 h-10 rounded-full border overflow-hidden transition-colors ${isConnected ? 'border-emerald-500/20 bg-emerald-900/10' : 'border-white/10 bg-white/5 group-hover:border-rose-500/50'}`}>
              {self?.avatar ? (
                <img src={self.avatar} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="You" />
              ) : (
                <div className={`w-full h-full flex items-center justify-center text-[10px] uppercase font-black ${isConnected ? 'text-emerald-300/40' : 'text-white/40'}`}>
                  {self?.name?.[0] || '?'}
                </div>
              )}
            </div>
            {/* Status/Edit Indicator */}
            <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-obsidian-950 flex items-center justify-center transition-colors ${isConnected ? 'bg-emerald-500' : 'bg-white/20'}`}>
                {/* Tiny dot inside to hint at 'active' or 'editable' */}
                <div className="w-1.5 h-1.5 bg-white rounded-full opacity-50 group-hover:opacity-100 transition-opacity" />
            </div>
            
            {/* Tooltip hint */}
            <div className="absolute top-12 left-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                <span className="text-[8px] bg-black/80 px-2 py-1 rounded text-white/60 backdrop-blur-md">Adjust Pose</span>
            </div>
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="text-[9px] text-white/30 uppercase tracking-[0.2em] font-black">You</span>
            <span className="text-[11px] text-white/70 font-serif italic">{self?.name || 'Unknown'}</span>
          </div>
        </div>

        {/* Center Home Button */}
        <button 
          onClick={onHome}
          className="px-4 py-2"
        >
          <span className="font-serif italic text-xl text-white/90 hover:text-white transition-colors">Tonight</span>
        </button>

        {/* Partner Avatar (How you see them) */}
        <div className="flex items-center gap-3 text-right">
          <div className="hidden sm:flex flex-col">
            <span className="text-[9px] text-white/30 uppercase tracking-[0.2em] font-black">Partner</span>
            <span className="text-[11px] text-white/70 font-serif italic">{partner?.name || 'Waiting...'}</span>
          </div>
          <div className="relative group">
            <div className={`w-10 h-10 rounded-full border overflow-hidden transition-colors ${isConnected ? 'border-emerald-500/20 bg-emerald-900/10' : 'border-rose-500/20 bg-rose-900/10'}`}>
              {partner?.avatar ? (
                <img src={partner.avatar} className="w-full h-full object-cover" alt={partner.name} />
              ) : (
                <div className={`w-full h-full flex items-center justify-center text-[10px] uppercase font-black ${isConnected ? 'text-emerald-300/40' : 'text-rose-300/40'}`}>
                  {partner?.name?.[0] || '?'}
                </div>
              )}
            </div>
            
            {/* Partner Status Dot */}
            <motion.div 
              animate={{ 
                opacity: (!isConnected) ? [0.4, 1, 0.4] : (partner?.status === 'choosing' ? [0.5, 1, 0.5] : 1),
                scale: (!isConnected) ? [1, 1.2, 1] : 1
              }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className={`absolute -bottom-1 -left-1 w-3 h-3 rounded-full border-2 border-obsidian-950 ${
                !isConnected ? 'bg-rose-500' : 
                partner?.status === 'choosing' ? 'bg-amber-400' : 'bg-emerald-500'
              }`} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

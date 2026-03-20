
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from '../context/SessionContext';

interface PresenceBarProps {
  onHome: () => void;
  onEditSelf?: () => void;
}

export const PresenceBar: React.FC<PresenceBarProps> = ({ onHome, onEditSelf }) => {
  const { state } = useSession();
  const { users, round, isConnected } = state;
  const [showEditHint, setShowEditHint] = useState(true);
  const [tapFeedback, setTapFeedback] = useState(false);

  const self = users.find(u => u && u.isSelf);
  const partner = users.find(u => u && !u.isSelf);

  // Dismiss edit hint after first tap or after 6s
  useEffect(() => {
    if (showEditHint) {
      const t = setTimeout(() => setShowEditHint(false), 6000);
      return () => clearTimeout(t);
    }
  }, [showEditHint]);

  const handleEditSelf = () => {
    setTapFeedback(true);
    setShowEditHint(false);
    setTimeout(() => setTapFeedback(false), 300);
    if (navigator.vibrate) navigator.vibrate(10);
    onEditSelf?.();
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 p-6 pointer-events-none">
      <div className="max-w-md mx-auto flex justify-between items-center bg-black/40 backdrop-blur-2xl border border-white/5 px-6 py-3 rounded-full shadow-2xl pointer-events-auto relative">

        {/* Self Avatar (How they see you) */}
        <div className="flex items-center gap-3">
          <div
            className="relative group"
            onClick={handleEditSelf}
          >
            {/* Pulsing ring hint — draws attention to the editable avatar */}
            <AnimatePresence>
              {showEditHint && onEditSelf && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: [0, 0.6, 0], scale: [0.9, 1.3, 1.5] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                  exit={{ opacity: 0 }}
                  className="absolute -inset-1.5 rounded-full border border-rose-500/40 pointer-events-none"
                />
              )}
            </AnimatePresence>

            {/* Tap feedback ring */}
            <AnimatePresence>
              {tapFeedback && (
                <motion.div
                  initial={{ opacity: 0.8, scale: 1 }}
                  animate={{ opacity: 0, scale: 1.6 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="absolute -inset-1 rounded-full bg-rose-500/20 pointer-events-none"
                />
              )}
            </AnimatePresence>

            <motion.div
              whileTap={{ scale: 0.9 }}
              className={`w-10 h-10 rounded-full border overflow-hidden transition-colors cursor-pointer ${isConnected ? 'border-emerald-500/20 bg-emerald-900/10' : 'border-white/10 bg-white/5'} ${onEditSelf ? 'active:border-rose-500/50' : ''}`}
            >
              {self?.avatar ? (
                <img src={self.avatar} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="You" />
              ) : (
                <div className={`w-full h-full flex items-center justify-center text-[10px] uppercase font-black ${isConnected ? 'text-emerald-300/40' : 'text-white/40'}`}>
                  {self?.name?.[0] || '?'}
                </div>
              )}
            </motion.div>

            {/* Status/Edit Indicator — pencil icon instead of plain dot */}
            {onEditSelf && (
              <motion.div
                whileHover={{ scale: 1.2 }}
                className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-rose-600 border-2 border-black flex items-center justify-center cursor-pointer shadow-lg"
              >
                <svg width="7" height="7" viewBox="0 0 10 10" fill="none" className="text-white">
                  <path d="M7.5 1.5L8.5 2.5L3.5 7.5L1.5 8.5L2.5 6.5L7.5 1.5Z" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.3"/>
                </svg>
              </motion.div>
            )}

            {!onEditSelf && (
              <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-black ${isConnected ? 'bg-emerald-500' : 'bg-white/20'}`} />
            )}
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="text-[9px] text-white/30 uppercase tracking-[0.2em] font-black">You</span>
            <span className="text-[11px] text-white/70 font-serif italic">{self?.name || 'Unknown'}</span>
          </div>
        </div>

        {/* Center Home Button */}
        <div className="flex flex-col items-center">
          <button
            onClick={onHome}
            className="px-4 py-1"
          >
            <span className="font-serif italic text-xl text-white/90 hover:text-white transition-colors">Tonight</span>
          </button>
          <AnimatePresence>
            {partner?.status === 'choosing' && (
              <motion.span
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="text-[8px] uppercase tracking-widest text-amber-400/80 font-black absolute -bottom-4 whitespace-nowrap"
              >
                Partner is choosing...
              </motion.span>
            )}
          </AnimatePresence>
        </div>

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
              className={`absolute -bottom-1 -left-1 w-3 h-3 rounded-full border-2 border-black ${
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

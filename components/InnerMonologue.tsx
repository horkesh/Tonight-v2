import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface InnerMonologueProps {
  text: string | null;
}

export const InnerMonologue: React.FC<InnerMonologueProps> = ({ text }) => {
  return (
    <AnimatePresence mode="wait">
      {text && (
        <motion.div
          key={text}
          initial={{ opacity: 0, y: 15, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -15, filter: 'blur(12px)' }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="fixed top-24 right-6 z-40 max-w-[160px] pointer-events-none"
        >
          <div className="bg-black/20 backdrop-blur-xl border border-white/5 p-4 rounded-2xl rounded-tr-sm shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
             <p className="text-[11px] text-white/80 font-serif italic leading-relaxed tracking-wide mix-blend-screen">
               "{text}"
             </p>
          </div>
          <motion.div 
            animate={{ opacity: [0.2, 0.8, 0.2] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-rose-400 rounded-full shadow-[0_0_8px_rgba(251,113,133,0.8)]" 
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
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
          initial={{ opacity: 0, y: 10, x: 20 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, y: -10, filter: 'blur(10px)' }}
          transition={{ duration: 0.8 }}
          className="fixed top-24 right-6 z-40 max-w-[150px] pointer-events-none"
        >
          <div className="bg-black/40 backdrop-blur-md border border-white/5 p-3 rounded-xl rounded-tr-none shadow-xl">
             <p className="text-[10px] text-rose-200/90 font-serif italic leading-tight">
               "{text}"
             </p>
          </div>
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FlashMessageProps {
  message: string | null;
}

export const FlashMessage: React.FC<FlashMessageProps> = ({ message }) => {
  return (
    <AnimatePresence>
      {message && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }} 
          exit={{ opacity: 0 }} 
          className="fixed top-24 left-0 right-0 z-[100] flex justify-center px-6 pointer-events-none"
        >
          <div className="bg-rose-600 text-white px-8 py-3.5 rounded-full text-[10px] tracking-widest uppercase shadow-2xl font-black">
            {message}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

import React from 'react';
import { motion } from 'framer-motion';
import { LetterData } from '../types';
import { PAGE_VARIANTS } from '../constants';

interface LetterViewProps {
  letter: LetterData;
  onContinue: () => void;
}

export const LetterView: React.FC<LetterViewProps> = ({ letter, onContinue }) => {
  const copyToClipboard = () => {
    const text = `${letter.salutation}\n\n${letter.body}\n\n${letter.signoff}`;
    navigator.clipboard.writeText(text);
  };

  return (
    <motion.div
      key="letter"
      variants={PAGE_VARIANTS}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex flex-col items-center justify-center min-h-[80vh] px-6"
    >
      <div className="max-w-sm w-full">
        <motion.div
          initial={{ opacity: 0, y: 20, rotate: -1 }}
          animate={{ opacity: 1, y: 0, rotate: -1 }}
          transition={{ delay: 0.5, duration: 1.5 }}
          className="p-10 bg-white/[0.03] border border-white/10 rounded-3xl shadow-2xl"
        >
          <p className="text-[10px] uppercase tracking-[0.4em] text-rose-500/60 font-black mb-6">{letter.salutation}</p>
          <p className="text-lg font-serif italic text-white/80 leading-relaxed whitespace-pre-line">{letter.body}</p>
          <p className="text-sm font-serif italic text-white/40 mt-8 text-right">{letter.signoff}</p>
        </motion.div>

        <div className="flex flex-col gap-4 mt-10">
          <button
            onClick={copyToClipboard}
            className="w-full py-4 bg-white/5 border border-white/10 rounded-full text-[10px] uppercase tracking-[0.3em] font-black text-white/40 hover:text-white/80 hover:bg-white/10 transition-all"
          >
            Copy Letter
          </button>
          <button
            onClick={onContinue}
            className="w-full py-4 bg-rose-600 rounded-full text-[10px] uppercase tracking-[0.3em] font-black text-white hover:bg-rose-500 transition-all shadow-[0_0_30px_rgba(225,29,72,0.3)]"
          >
            Continue
          </button>
        </div>
      </div>
    </motion.div>
  );
};

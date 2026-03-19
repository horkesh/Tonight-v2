import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { PAGE_VARIANTS } from '../constants';

interface TextSuggestionViewProps {
  text: string;
  onEndSession: () => void;
}

export const TextSuggestionView: React.FC<TextSuggestionViewProps> = ({ text, onEndSession }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      key="text-suggestion"
      variants={PAGE_VARIANTS}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex flex-col items-center justify-center min-h-[80vh] px-6"
    >
      <div className="max-w-sm w-full flex flex-col items-center gap-10">
        <div className="text-center">
          <span className="text-[9px] text-rose-500 tracking-[0.5em] uppercase font-black block mb-3">Send This</span>
          <p className="text-[10px] text-white/30 uppercase tracking-widest">Tomorrow. Or tonight. You'll know.</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 1 }}
          className="w-full"
        >
          <div className="p-6 bg-rose-950/20 border border-rose-500/20 rounded-3xl rounded-bl-lg shadow-2xl">
            <p className="text-base text-white/90 leading-relaxed">{text}</p>
          </div>
        </motion.div>

        <div className="flex flex-col gap-4 w-full">
          <button
            onClick={handleCopy}
            className="w-full py-4 bg-white/5 border border-white/10 rounded-full text-[10px] uppercase tracking-[0.3em] font-black text-white/40 hover:text-white/80 hover:bg-white/10 transition-all"
          >
            {copied ? 'Copied' : 'Copy to Clipboard'}
          </button>
          <button
            onClick={onEndSession}
            className="w-full py-4 bg-rose-600 rounded-full text-[10px] uppercase tracking-[0.3em] font-black text-white hover:bg-rose-500 transition-all shadow-[0_0_30px_rgba(225,29,72,0.3)]"
          >
            End Session
          </button>
        </div>
      </div>
    </motion.div>
  );
};

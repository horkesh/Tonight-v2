
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { PAGE_VARIANTS } from '../../constants';

interface RatingViewProps {
  onFinalize: (rating: number) => void;
  onCancel: () => void;
  myRating: number | null;
  partnerRating: number | null;
  submitRating: (r: number) => void;
}

export const RatingView: React.FC<RatingViewProps> = ({ onFinalize, onCancel, myRating, partnerRating, submitRating }) => {
  const [localRating, setLocalRating] = useState<number | null>(myRating);
  const [isWaiting, setIsWaiting] = useState(false);

  // If I have rated, but partner hasn't, I am waiting.
  // If both have rated, trigger finalize.

  const handleRate = (r: number) => {
      setLocalRating(r);
      submitRating(r);
  };

  useEffect(() => {
    if (myRating !== null && partnerRating === null) {
        setIsWaiting(true);
    } else if (myRating !== null && partnerRating !== null) {
        // Both done.
        onFinalize(myRating);
    }
  }, [myRating, partnerRating, onFinalize]);

  return (
    <motion.div key="rating" variants={PAGE_VARIANTS} initial="initial" animate="animate" exit="exit" className="flex flex-col items-center justify-center pt-24 gap-12 text-center">
        
        {!isWaiting ? (
            <>
                <div className="flex flex-col gap-3">
                    <span className="text-[10px] text-rose-500 tracking-[0.6em] uppercase font-black">Appraisal Request</span>
                    <h2 className="text-4xl font-serif text-white italic">Rate the connection...</h2>
                </div>
                <div className="flex flex-wrap justify-center gap-4 max-w-xs">
                    {[1,2,3,4,5,6,7,8,9,10].map(n => (
                        <button 
                            key={n} onClick={() => handleRate(n)}
                            className={`w-14 h-14 rounded-full border flex items-center justify-center text-lg font-black transition-all ${
                                localRating === n 
                                ? 'bg-rose-600 border-rose-400 scale-110 shadow-[0_0_20px_rgba(225,29,72,0.5)]' 
                                : 'bg-white/5 border-white/10 hover:bg-rose-900 hover:border-rose-800'
                            }`}
                        >
                            {n}
                        </button>
                    ))}
                </div>
                <button onClick={onCancel} className="text-[10px] text-white/20 uppercase tracking-[0.5em] font-black hover:text-white transition-colors">Cancel Briefing</button>
            </>
        ) : (
            <div className="flex flex-col items-center gap-6">
                <div className="relative">
                    <div className="w-16 h-16 border-2 border-white/10 rounded-full" />
                    <div className="absolute inset-0 border-t-2 border-rose-500 rounded-full animate-spin" />
                </div>
                <div className="flex flex-col gap-2">
                    <h3 className="text-xl font-serif italic text-white/90">Synchronizing...</h3>
                    <p className="text-[10px] uppercase tracking-[0.3em] font-black text-rose-500 opacity-80">Waiting for Partner's Verdict</p>
                </div>
                <p className="text-[9px] text-white/30 max-w-xs leading-relaxed mt-4">
                    The intelligence report can only be compiled once both agents have submitted their final assessment.
                </p>
            </div>
        )}
        
    </motion.div>
  );
};

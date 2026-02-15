
import React from 'react';
import { useLongPress } from '../hooks/useLongPress';
import { Choice } from '../types';
import { motion } from 'framer-motion';

interface ChoiceButtonProps {
  choice: Choice;
  onSelect: (id: string) => void;
  onSilent: (id: string) => void;
  drunkFactor: number;
}

export const ChoiceButton: React.FC<ChoiceButtonProps> = ({ choice, onSelect, onSilent, drunkFactor }) => {
    const { handlers, isPressed } = useLongPress({
        onLongPress: () => onSilent(choice.id),
        onClick: () => onSelect(choice.id),
        ms: 1500 // Slower to make it feel deliberate
    });

    return (
        <div className="relative">
            <button 
                {...handlers} 
                className="relative w-full flex items-center justify-between p-7 rounded-[40px] bg-white/[0.02] border border-white/5 overflow-hidden transition-all active:scale-98 group select-none touch-none z-10"
            >
                <span className="text-4xl grayscale group-hover:grayscale-0 relative z-10">{choice.symbol || "✨"}</span>
                <span className={`relative z-10 text-[11px] text-white/60 uppercase tracking-[0.3em] font-black group-hover:text-white ml-6 ${drunkFactor > 3 ? 'blur-[1px]' : ''}`}>
                    {choice.text}
                </span>

                {/* Progress Fill for Long Press */}
                <motion.div 
                    initial={{ scaleX: 0, opacity: 0 }}
                    animate={{ 
                        scaleX: isPressed ? 1 : 0, 
                        opacity: isPressed ? 1 : 0 
                    }}
                    transition={{ duration: 1.5, ease: "linear" }}
                    className="absolute inset-0 bg-white/10 origin-left z-0"
                />
            </button>
            
            {/* Helper Text */}
            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: isPressed ? 1 : 0, y: isPressed ? -40 : 10 }}
                className="absolute left-0 right-0 -top-8 text-center pointer-events-none z-20"
            >
                <span className="text-[9px] uppercase tracking-[0.3em] font-black text-rose-500 bg-black/80 backdrop-blur px-3 py-1 rounded-full border border-rose-500/20">
                    Keep thinking...
                </span>
            </motion.div>
        </div>
    );
};

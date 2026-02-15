import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from './ui/GlassCard';

interface ToastOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onClink: () => void;
}

export const ToastOverlay: React.FC<ToastOverlayProps> = ({ isOpen, onClose, onClink }) => {
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
        setProgress(0);
        if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [isOpen]);

  const startFilling = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(intervalRef.current!);
          onClink();
          return 100;
        }
        return p + 2; // Speed of fill
      });
    }, 20);
  };

  const stopFilling = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (progress < 100) setProgress(0);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 backdrop-blur-xl">
           <motion.div 
             initial={{ opacity: 0, scale: 0.9 }} 
             animate={{ opacity: 1, scale: 1 }} 
             exit={{ opacity: 0 }}
             className="relative flex flex-col items-center gap-8"
           >
              <h3 className="text-2xl font-serif text-white/80 italic">Hold to Clink</h3>
              
              <div 
                className="relative w-32 h-32 rounded-full border-2 border-white/10 flex items-center justify-center cursor-pointer active:scale-95 transition-transform select-none touch-none"
                onMouseDown={startFilling}
                onMouseUp={stopFilling}
                onMouseLeave={stopFilling}
                onTouchStart={(e) => { e.preventDefault(); startFilling(); }}
                onTouchEnd={stopFilling}
              >
                 <div className="absolute inset-0 rounded-full overflow-hidden">
                    <motion.div 
                        className="absolute bottom-0 left-0 right-0 bg-amber-500"
                        style={{ height: `${progress}%` }}
                    />
                 </div>
                 <div className="relative z-10 text-4xl">🥃</div>
                 
                 {/* Fingerprint / Scan lines */}
                 {progress > 0 && (
                     <div className="absolute inset-0 z-20 opacity-30 mix-blend-overlay">
                        {[...Array(5)].map((_, i) => (
                             <motion.div 
                                key={i}
                                animate={{ top: ['0%', '100%'], opacity: [0, 1, 0] }}
                                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                                className="absolute left-0 right-0 h-[2px] bg-white"
                             />
                        ))}
                     </div>
                 )}
              </div>

              <button onClick={onClose} className="text-white/30 text-sm uppercase tracking-widest font-black hover:text-white transition-colors">
                Cancel
              </button>
           </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
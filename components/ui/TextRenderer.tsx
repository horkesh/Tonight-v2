import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';

interface TextRendererProps {
  text: string;
  drunkFactor: number;
  onComplete?: () => void;
  className?: string;
}

export const TextRenderer: React.FC<TextRendererProps> = ({ text, drunkFactor, onComplete, className = "" }) => {
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setDisplayedText("");
    setIsComplete(false);
    let currentIdx = 0;
    let timeoutId: ReturnType<typeof setTimeout>;

    const typeChar = () => {
      if (currentIdx >= text.length) {
        setIsComplete(true);
        if (onComplete) onComplete();
        return;
      }

      const char = text[currentIdx];
      setDisplayedText(prev => prev + char);
      currentIdx++;

      // Dynamic pacing based on punctuation
      let delay = 30; 
      if (char === ',') delay = 150;
      if (char === '.' || char === '?' || char === '!') delay = 400;
      
      // Haptic feedback for "physicality"
      if (navigator.vibrate && currentIdx % 3 === 0) {
        navigator.vibrate(5); 
      }

      timeoutId = setTimeout(typeChar, delay);
    };

    timeoutId = setTimeout(typeChar, 50);

    return () => clearTimeout(timeoutId);
  }, [text]);

  // Visual "Intoxication" styles
  const blurAmount = Math.max(0, (drunkFactor - 2) * 0.5); 
  const skewAmount = Math.max(0, (drunkFactor - 3) * 1); 
  
  return (
    <div 
      className={`relative font-serif italic text-white leading-relaxed tracking-wide drop-shadow-lg transition-all duration-1000 ${className}`}
      style={{
        filter: `blur(${blurAmount}px)`,
        transform: `skewX(${skewAmount}deg)`,
      }}
    >
      <span className="text-3xl md:text-4xl">{displayedText}</span>
      
      {!isComplete && (
        <motion.span 
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
          className="inline-block w-[2px] h-[1em] bg-rose-500 ml-1 align-middle"
        />
      )}
    </div>
  );
};

import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';

interface TextRendererProps {
  text: string;
  drunkFactor: number;
  onComplete?: () => void;
  className?: string;
}

export const TextRenderer: React.FC<TextRendererProps> = ({ text, drunkFactor, onComplete, className = "" }) => {
  const [displayedWords, setDisplayedWords] = useState<string[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  // Split text into words to animate them individually for "weight"
  const words = useMemo(() => text.split(" "), [text]);

  useEffect(() => {
    setDisplayedWords([]);
    setIsComplete(false);
    let currentWordIdx = 0;
    let timeoutId: ReturnType<typeof setTimeout>;

    const typeWord = () => {
      if (currentWordIdx >= words.length) {
        setIsComplete(true);
        if (onComplete) onComplete();
        return;
      }

      const word = words[currentWordIdx];
      setDisplayedWords(prev => [...prev, word]);
      currentWordIdx++;

      // Dynamic pacing: Long words take longer to "think" of.
      // Punctuation adds pauses.
      let delay = 50; 
      if (word.length > 6) delay += 100; // Heavy word
      if (word.includes(',') || word.includes(';')) delay += 150;
      if (word.includes('.') || word.includes('?') || word.includes('!')) delay += 400;

      // Drunk slurring delay
      if (drunkFactor > 3 && Math.random() > 0.7) delay += 200;

      // Haptic feedback for "physicality"
      if (navigator.vibrate) {
        // Light tap for normal words, heavy for keywords
        navigator.vibrate(word.length > 6 ? 10 : 2); 
      }

      timeoutId = setTimeout(typeWord, delay);
    };

    timeoutId = setTimeout(typeWord, 100);

    return () => clearTimeout(timeoutId);
  }, [text, words, drunkFactor]);

  // Visual "Intoxication" styles
  // We use CSS variables for individual char jitter in future, but block transform here
  const blurAmount = Math.max(0, (drunkFactor - 2) * 0.5); 
  const skewAmount = Math.max(0, (drunkFactor - 2) * 1); 
  
  return (
    <div 
      className={`relative font-serif italic text-white leading-relaxed tracking-wide drop-shadow-lg transition-all duration-1000 ${className}`}
      style={{
        filter: `blur(${blurAmount}px)`,
        transform: `skewX(${skewAmount}deg)`,
      }}
    >
      {displayedWords.map((word, i) => {
         // Keyword detection: length > 6 or capitalized (not start of sentence)
         const isKeyword = word.length > 6 || (word[0] === word[0].toUpperCase() && i > 0);
         const isHeavy = isKeyword ? "font-medium text-rose-100" : "font-light opacity-90";
         
         return (
             <motion.span
                key={i}
                initial={{ opacity: 0, y: 5, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: isKeyword ? 0.8 : 0.4 }}
                className={`inline-block mr-[0.3em] ${isHeavy}`}
             >
                {word}
             </motion.span>
         );
      })}
      
      {!isComplete && (
        <motion.span 
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
          className="inline-block w-[2px] h-[1em] bg-rose-500 ml-1 align-middle shadow-[0_0_10px_rgba(225,29,72,0.8)]"
        />
      )}
    </div>
  );
};

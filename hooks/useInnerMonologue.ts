import { useState, useEffect } from 'react';
import { VibeStats } from '../types';
import { generateInnerMonologue } from '../services/geminiService';

export function useInnerMonologue(round: number, view: string, vibe: VibeStats) {
  const [monologue, setMonologue] = useState<string | null>(null);

  useEffect(() => {
    if (round > 0 && view !== 'loading') {
      const interval = setInterval(async () => {
        if (Math.random() > 0.6) { // 40% chance
            const thought = await generateInnerMonologue(vibe, view);
            setMonologue(thought);
            setTimeout(() => setMonologue(null), 6000);
        }
      }, 45000); // Check every 45s
      return () => clearInterval(interval);
    }
  }, [round, view, vibe]);

  return monologue;
}
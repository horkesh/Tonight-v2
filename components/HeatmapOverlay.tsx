
import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { p2p } from '../services/p2p';
import { NetworkMessage } from '../types';

interface Ripple {
  x: number;
  y: number;
  id: number;
  isRemote: boolean;
}

export const TouchLayer: React.FC = () => {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const lastEmitRef = useRef<number>(0);

  useEffect(() => {
    // 1. Local Touch Handler
    const handleTouch = (e: MouseEvent | TouchEvent) => {
      // Don't trigger on buttons (simple heuristic: exclude if target is button)
      const target = e.target as HTMLElement;
      if (target.tagName === 'BUTTON' || target.closest('button')) return;

      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      
      // Normalized coords for P2P
      const normX = clientX / window.innerWidth;
      const normY = clientY / window.innerHeight;

      // Add Local Ripple
      const newRipple: Ripple = { x: clientX, y: clientY, id: Date.now() + Math.random(), isRemote: false };
      setRipples(prev => [...prev.slice(-15), newRipple]); // Keep max 15

      // Throttle P2P Emission (max 10 per sec)
      const now = Date.now();
      if (now - lastEmitRef.current > 100) {
          p2p.send({ 
              type: 'SYNC_TOUCH', 
              payload: { 
                  x: normX, 
                  y: normY, 
                  id: now, 
                  timestamp: now 
              } 
          });
          lastEmitRef.current = now;
      }
    };

    // 2. Remote P2P Handler
    const unsubscribe = p2p.onData((msg: NetworkMessage) => {
        if (msg.type === 'SYNC_TOUCH') {
            const { x, y } = msg.payload;
            const actualX = x * window.innerWidth;
            const actualY = y * window.innerHeight;
            
            const remoteRipple: Ripple = { 
                x: actualX, 
                y: actualY, 
                id: msg.payload.id || (Date.now() + Math.random()), 
                isRemote: true 
            };
            setRipples(prev => [...prev.slice(-15), remoteRipple]);
        }
    });

    window.addEventListener('mousedown', handleTouch);
    window.addEventListener('touchstart', handleTouch);
    
    return () => {
        window.removeEventListener('mousedown', handleTouch);
        window.removeEventListener('touchstart', handleTouch);
        unsubscribe();
    };
  }, []);

  // Cleanup old ripples
  useEffect(() => {
    const interval = setInterval(() => {
        const now = Date.now();
        // Remove ripples older than 2s
        setRipples(prev => prev.filter(p => now - p.id < 2000)); 
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[200] overflow-hidden">
        <AnimatePresence>
            {ripples.map(r => (
                <motion.div
                    key={r.id}
                    initial={{ 
                        opacity: r.isRemote ? 0.8 : 0.4, 
                        scale: 0,
                        borderWidth: r.isRemote ? "2px" : "1px"
                    }}
                    animate={{ 
                        opacity: 0, 
                        scale: r.isRemote ? 4 : 2, 
                        borderWidth: "0px"
                    }}
                    transition={{ duration: r.isRemote ? 2 : 1.5, ease: "easeOut" }}
                    className={`absolute rounded-full transform -translate-x-1/2 -translate-y-1/2 box-border ${
                        r.isRemote 
                        ? 'border-rose-400 bg-rose-500/10 shadow-[0_0_30px_rgba(225,29,72,0.4)]' 
                        : 'border-white/30 bg-white/5'
                    }`}
                    style={{ left: r.x, top: r.y, width: 50, height: 50 }}
                />
            ))}
        </AnimatePresence>
    </div>
  );
};

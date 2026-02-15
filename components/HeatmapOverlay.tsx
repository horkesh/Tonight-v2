import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TouchPoint } from '../types';

export const HeatmapOverlay: React.FC = () => {
  const [points, setPoints] = useState<TouchPoint[]>([]);

  useEffect(() => {
    const handleTouch = (e: MouseEvent | TouchEvent) => {
      const x = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const y = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      
      const newPoint: TouchPoint = {
        x, y, id: Date.now(), timestamp: Date.now()
      };

      setPoints(prev => [...prev.slice(-10), newPoint]); // Keep last 10
    };

    window.addEventListener('mousedown', handleTouch);
    window.addEventListener('touchstart', handleTouch);
    return () => {
        window.removeEventListener('mousedown', handleTouch);
        window.removeEventListener('touchstart', handleTouch);
    };
  }, []);

  // Cleanup old points
  useEffect(() => {
    const interval = setInterval(() => {
        setPoints(prev => prev.filter(p => Date.now() - p.timestamp < 2000));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[200] overflow-hidden">
        <AnimatePresence>
            {points.map(p => (
                <motion.div
                    key={p.id}
                    initial={{ opacity: 0.6, scale: 0.5 }}
                    animate={{ opacity: 0, scale: 2.5 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="absolute w-32 h-32 rounded-full bg-amber-500/20 blur-3xl mix-blend-screen"
                    style={{ left: p.x - 64, top: p.y - 64 }}
                />
            ))}
        </AnimatePresence>
    </div>
  );
};
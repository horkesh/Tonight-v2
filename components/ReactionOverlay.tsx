import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from './ui/GlassCard';

interface ReactionOverlayProps {
  url: string | null;
}

export const ReactionOverlay: React.FC<ReactionOverlayProps> = ({ url }) => {
  return (
    <AnimatePresence>
      {url && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.8, rotate: -2 }} 
          animate={{ opacity: 1, scale: 1, rotate: 0 }} 
          exit={{ opacity: 0, scale: 1.1, y: -50 }}
          className="fixed inset-0 z-[90] flex items-center justify-center pointer-events-none px-6"
        >
          <GlassCard className="p-2 border-white/20 bg-black/60 shadow-2xl overflow-hidden rounded-3xl max-w-sm">
            <img src={url} className="w-full h-auto rounded-2xl max-h-[50vh] object-cover" alt="AI Reaction" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
          </GlassCard>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
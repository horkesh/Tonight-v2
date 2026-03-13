import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CollapsibleSectionProps {
  title: string;
  icon?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  badge?: string;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  icon,
  defaultOpen = false,
  children,
  badge,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-white/10 rounded-2xl overflow-hidden bg-white/5">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon && <span className="text-lg">{icon}</span>}
          <span className="text-[10px] uppercase tracking-[0.3em] font-black text-white/70">
            {title}
          </span>
          {badge && (
            <span className="text-[8px] uppercase tracking-widest bg-rose-600/30 text-rose-400 px-2 py-0.5 rounded-full">
              {badge}
            </span>
          )}
        </div>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-white/30 text-sm"
        >
          ▼
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

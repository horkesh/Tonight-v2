import React from 'react';
import { motion } from 'framer-motion';
import { PAGE_VARIANTS } from '../../constants';

export const LoadingView: React.FC = () => {
  return (
    <motion.div variants={PAGE_VARIANTS} initial="initial" animate="animate" exit="exit" className="flex flex-col items-center justify-center py-52">
        <div className="w-24 h-[2px] bg-rose-600 animate-[width_2s_infinite] mx-auto" />
        <span className="text-[10px] text-rose-500 tracking-[0.6em] uppercase mt-8 font-black">Drafting Files</span>
    </motion.div>
  );
};
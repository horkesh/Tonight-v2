import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = "", onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={`
        backdrop-blur-xl 
        bg-white/10 
        border border-white/20 
        shadow-xl 
        rounded-3xl 
        overflow-hidden
        transition-all duration-300
        ${onClick ? 'cursor-pointer active:scale-95 hover:bg-white/15' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

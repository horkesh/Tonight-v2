import React from 'react';

interface ActionDockProps {
  onReact: (emoji: string) => void;
  onCamera: () => void;
  onPlotTwist: () => void;
  onDraft: () => void;
  onToast: () => void;
  onEndSession: () => void;
  disabled?: boolean;
}

export const ActionDock: React.FC<ActionDockProps> = ({ onReact, onCamera, onPlotTwist, onDraft, onToast, onEndSession, disabled }) => {
  return (
    <div className="fixed bottom-8 left-0 right-0 z-50 flex justify-center px-4">
      <div className="flex items-center gap-2 p-1 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-full shadow-[0_0_30px_rgba(0,0,0,0.5)]">
        <button 
          disabled={disabled}
          onClick={() => onReact('❤️')}
          className="w-12 h-12 flex items-center justify-center text-xl hover:bg-white/10 rounded-full transition-all disabled:opacity-20 active:scale-90"
        >
          ❤️
        </button>
        <button 
          disabled={disabled}
          onClick={() => onReact('🔥')}
          className="w-12 h-12 flex items-center justify-center text-xl hover:bg-white/10 rounded-full transition-all disabled:opacity-20 active:scale-90"
        >
          🔥
        </button>
        
        <div className="w-[1px] h-6 bg-white/10 mx-1"></div>

        <button 
          disabled={disabled}
          onClick={onToast}
          title="Make a Toast"
          className="w-12 h-12 flex items-center justify-center grayscale hover:grayscale-0 hover:bg-white/10 rounded-full transition-all disabled:opacity-20 active:scale-90"
        >
          🥂
        </button>
        <button 
          disabled={disabled}
          onClick={onCamera}
          title="Sync Avatar"
          className="w-12 h-12 flex items-center justify-center grayscale hover:grayscale-0 hover:bg-white/10 rounded-full transition-all disabled:opacity-20 active:scale-90"
        >
          📷
        </button>
        <button 
          disabled={disabled}
          onClick={onDraft}
          title="Shared Draft"
          className="w-12 h-12 flex items-center justify-center grayscale hover:grayscale-0 hover:bg-white/10 rounded-full transition-all disabled:opacity-20 active:scale-90"
        >
          🖋️
        </button>
        <button 
          disabled={disabled}
          onClick={onPlotTwist}
          title="Inject Chaos"
          className="w-12 h-12 flex items-center justify-center grayscale hover:grayscale-0 hover:bg-white/10 rounded-full transition-all disabled:opacity-20 active:scale-90"
        >
          🎲
        </button>

        <div className="w-[1px] h-6 bg-white/10 mx-1"></div>

        <button 
          disabled={disabled}
          onClick={onEndSession}
          title="End Date"
          className="w-12 h-12 flex items-center justify-center text-rose-500/60 hover:text-rose-500 hover:bg-rose-500/10 rounded-full transition-all disabled:opacity-20 active:scale-90"
        >
          ✕
        </button>
      </div>
    </div>
  );
};
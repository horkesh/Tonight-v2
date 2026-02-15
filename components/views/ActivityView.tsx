
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PAGE_VARIANTS } from '../../constants';
import { TextRenderer } from '../ui/TextRenderer';
import { ChoiceButton } from '../ChoiceButton';
import { Scene, User } from '../../types';

interface ActivityViewProps {
  scene: Scene;
  drunkFactor: number;
  onChoice: (id: string) => void;
  onSilentChoice: (id: string) => void;
  users?: User[];
  sceneChoices?: Record<string, string>;
  onTwistComplete?: () => void;
  isConnected: boolean;
  onSimulatePartner: (choiceId: string) => void;
}

export const ActivityView: React.FC<ActivityViewProps> = ({ 
    scene, 
    drunkFactor, 
    onChoice, 
    onSilentChoice, 
    users = [], 
    sceneChoices = {},
    onTwistComplete,
    isConnected,
    onSimulatePartner
}) => {
  const [reveal, setReveal] = useState(false);
  const [outcome, setOutcome] = useState<'match' | 'mismatch' | null>(null);
  const [rippleEffect, setRippleEffect] = useState<{x: number, y: number, id: number}[]>([]);

  const self = users.find(u => u.isSelf);
  const partner = users.find(u => !u.isSelf);

  const myChoiceId = self ? sceneChoices[self.id] : null;
  const partnerChoiceId = partner ? sceneChoices[partner.id] : null;
  
  const isSyncRequired = true; 
  const isBothChosen = isSyncRequired && myChoiceId && partnerChoiceId;

  // 1. Handle Reveal Trigger
  useEffect(() => {
    if (isBothChosen && !reveal) {
        setReveal(true);
        const isMatch = myChoiceId === partnerChoiceId;
        setOutcome(isMatch ? 'match' : 'mismatch');
    }
  }, [isBothChosen, reveal, myChoiceId, partnerChoiceId]);

  // 2. Handle Auto-Navigation Timer
  useEffect(() => {
    if (reveal) {
        const timer = setTimeout(() => {
            if (onTwistComplete) onTwistComplete();
        }, 6000); 
        return () => clearTimeout(timer);
    }
  }, [reveal, onTwistComplete]);

  // 3. Auto-Simulate Partner if Disconnected (Debug/Single Player)
  useEffect(() => {
    if (!isConnected && myChoiceId && !partnerChoiceId) {
        const timer = setTimeout(() => {
            const random = scene.choices[Math.floor(Math.random() * scene.choices.length)];
            onSimulatePartner(random.id);
        }, 2000);
        return () => clearTimeout(timer);
    }
  }, [isConnected, myChoiceId, partnerChoiceId, scene.choices, onSimulatePartner]);

  // If match, play a sound effect or vibrate
  useEffect(() => {
      if (outcome === 'match') {
          if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);
      }
  }, [outcome]);

  const isWaiting = isSyncRequired && myChoiceId && !partnerChoiceId;

  const handleWaitingClick = (e: React.MouseEvent) => {
      if (isWaiting) {
          setRippleEffect(prev => [...prev.slice(-4), { x: e.clientX, y: e.clientY, id: Date.now() }]);
          if (navigator.vibrate) navigator.vibrate(5);
      }
  };

  return (
    <motion.div 
        key={scene.id} 
        variants={PAGE_VARIANTS} 
        initial="initial" 
        animate="animate" 
        exit="exit" 
        className="flex flex-col gap-16 pt-16 relative min-h-[80vh]"
        onClick={handleWaitingClick}
    >
        {/* Narrative Section - Serif, Smaller, Book-like */}
        <div className="px-8 text-center">
            <TextRenderer 
                text={scene.narrative} 
                drunkFactor={drunkFactor} 
                className="text-2xl md:text-3xl font-serif text-white/90 italic"
            />
        </div>

        {/* Standard Flow or Selection Phase */}
        {!reveal && (
            <div className={`flex flex-col gap-4 pb-20 transition-all duration-500 ${isWaiting ? 'opacity-30 pointer-events-none blur-sm' : ''}`}>
                {scene.choices.map((c) => (
                    <ChoiceButton 
                        key={c.id} 
                        choice={c} 
                        onSelect={() => !myChoiceId && onChoice(c.id)} 
                        onSilent={onSilentChoice}
                        drunkFactor={drunkFactor}
                    />
                ))}
            </div>
        )}

        {/* Active Waiting Overlay (with ripples) */}
        <AnimatePresence>
            {isWaiting && (
                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 top-32 flex flex-col items-center justify-center z-10"
                >
                    <div className="w-16 h-16 border-4 border-white/10 border-t-rose-500 rounded-full animate-spin mb-6" />
                    <span className="text-[10px] uppercase tracking-[0.5em] font-black text-rose-500 animate-pulse">
                        {isConnected ? 'Waiting for Partner' : 'Simulating Response'}
                    </span>
                    <span className="text-[8px] uppercase tracking-widest text-white/20 mt-4">Tap to nudge</span>
                    
                    {/* Ripple Effects */}
                    {rippleEffect.map(r => (
                        <motion.div
                            key={r.id}
                            initial={{ width: 0, height: 0, opacity: 0.6 }}
                            animate={{ width: 300, height: 300, opacity: 0 }}
                            transition={{ duration: 1 }}
                            className="fixed rounded-full border border-rose-500/30 pointer-events-none"
                            style={{ left: r.x, top: r.y, transform: 'translate(-50%, -50%)' }}
                        />
                    ))}
                </motion.div>
            )}
        </AnimatePresence>

        {/* Reveal Overlay */}
        <AnimatePresence>
            {reveal && (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    exit={{ opacity: 0 }}
                    className="absolute inset-x-0 top-20 bottom-0 bg-black/80 backdrop-blur-xl z-20 flex flex-col items-center justify-center p-6 rounded-3xl"
                >
                    <h3 className="text-3xl font-serif text-white mb-10 italic">The Verdict</h3>
                    
                    <div className="grid grid-cols-2 gap-4 w-full mb-10">
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/10 text-center">
                            <span className="text-[9px] uppercase text-white/30 block mb-2">You</span>
                            <span className="text-4xl block mb-2">{scene.choices.find(c => c.id === myChoiceId)?.symbol}</span>
                            <span className="text-xs text-white/80 font-sans">{scene.choices.find(c => c.id === myChoiceId)?.text}</span>
                        </div>
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/10 text-center">
                            <span className="text-[9px] uppercase text-white/30 block mb-2">{partner?.name}</span>
                            <span className="text-4xl block mb-2">{scene.choices.find(c => c.id === partnerChoiceId)?.symbol}</span>
                            <span className="text-xs text-white/80 font-sans">{scene.choices.find(c => c.id === partnerChoiceId)?.text}</span>
                        </div>
                    </div>

                    {outcome === 'match' ? (
                        <div className="text-center animate-bounce mb-8">
                             <span className="text-6xl mb-4 block">🥃</span>
                             <span className="text-xl font-black text-rose-500 uppercase tracking-widest">JINX! DRINK!</span>
                        </div>
                    ) : (
                        <div className="text-center mb-8">
                             <span className="text-4xl mb-4 block">👀</span>
                             <span className="text-sm font-bold text-white/50 uppercase tracking-widest">Divergent Paths</span>
                        </div>
                    )}
                    
                    <button 
                        onClick={() => onTwistComplete && onTwistComplete()}
                        className="px-8 py-3 bg-white/10 rounded-full text-[10px] uppercase tracking-widest font-black hover:bg-white/20 transition-colors"
                    >
                        Continue
                    </button>
                </motion.div>
            )}
        </AnimatePresence>

        {!reveal && !isWaiting && (
            <div className="text-center text-[9px] text-white/20 uppercase tracking-widest font-black -mt-6 mb-10">
                Long Press to Think vs Say
            </div>
        )}
    </motion.div>
  );
};

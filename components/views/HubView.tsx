
import React from 'react';
import { motion } from 'framer-motion';
import { PAGE_VARIANTS, ACTIVITIES } from '../../constants';
import { PersonaReveal } from '../PersonaReveal';
import { VibeMatrix } from '../VibeMatrix';
import { LocationWindow } from '../LocationWindow';
import { useSessionState } from '../../hooks/useSessionState';
import { useQuestionFlow } from '../../hooks/useQuestionFlow';
import { useAiActions } from '../../hooks/useAiActions';

interface HubViewProps {
  state: ReturnType<typeof useSessionState>['state'];
  actions: ReturnType<typeof useSessionState>['actions'];
  qActions: ReturnType<typeof useQuestionFlow>['qActions'];
  aiActions: ReturnType<typeof useAiActions>['aiActions'];
  onOpenReactionPicker: () => void;
}

export const HubView: React.FC<HubViewProps> = ({ state, actions, qActions, aiActions, onOpenReactionPicker }) => {
  const handleAskQuestion = () => {
    // 1. Switch view locally only (do not pull partner to selection screen)
    actions.setView('question', false);
    // 2. Broadcast status so partner knows we are picking
    actions.setUsers(prev => prev.map(u => u.isSelf ? { ...u, status: 'choosing' } : u));
  };

  const handleMorningEdition = () => {
      // Check for minimum data threshold (e.g., Round 3)
      if (state.round < 3) {
          qActions.showFlash("Insufficient Data: Connection Too Early");
          return;
      }
      
      actions.setView('rating'); 
      qActions.showFlash("Requesting Partner Appraisal...");
  };

  return (
    <motion.div key="hub" variants={PAGE_VARIANTS} initial="initial" animate="animate" exit="exit" className="flex flex-col gap-10">
        
        {/* Date Location Visualizer */}
        <section>
             <LocationWindow
                location={state.dateContext?.location || null}
                generatedImage={state.dateContext?.generatedImage}
             />
        </section>

        <section className="flex flex-col gap-6">
            <motion.div layoutId="persona-card">
                <PersonaReveal persona={state.activePersonaTab === 'partner' ? state.partnerPersona : state.userPersona} name={state.activePersonaTab === 'partner' ? actions.getPartner()?.name || "Partner" : "You"} isSelf={state.activePersonaTab === 'self'} />
            </motion.div>
            <div className="flex justify-center gap-4 bg-white/[0.02] p-1.5 rounded-full border border-white/5 backdrop-blur-3xl">
                {['partner', 'self'].map(tab => (
                    <button key={tab} onClick={() => actions.setActivePersonaTab(tab as any)} className={`flex-1 py-3 rounded-full text-[10px] uppercase tracking-widest font-black transition-all ${state.activePersonaTab === tab ? 'bg-rose-600 text-white' : 'text-white/30'}`}>
                    {tab === 'partner' ? 'Their Mystery' : 'Your Projection'}
                    </button>
                ))}
            </div>
        </section>

        <VibeMatrix vibe={state.vibe} sipLevel={state.sipLevel} drunkFactor={state.partnerPersona.drunkFactor} />

        <section className="grid grid-cols-2 gap-4">
            <button onClick={handleAskQuestion} className="p-8 bg-rose-600 border border-rose-400/30 rounded-[48px] hover:bg-rose-500 transition-all text-center flex flex-col items-center gap-4 shadow-[0_15px_35px_rgba(225,29,72,0.3)] group">
                <span className="text-4xl group-hover:scale-110 transition-transform">✨</span>
                <h4 className="text-lg font-serif text-white">Ask Question</h4>
            </button>
            <button onClick={onOpenReactionPicker} className="p-8 bg-white/[0.03] border border-white/5 rounded-[48px] hover:bg-white/[0.06] transition-all text-center flex flex-col items-center gap-4 group">
                <span className="text-4xl group-hover:scale-110 transition-transform">🎭</span>
                <h4 className="text-lg font-serif text-white/80">Reaction</h4>
            </button>
        </section>

        <section className="flex flex-col gap-4">
            <button 
                onClick={handleMorningEdition} 
                className={`w-full p-8 bg-white/[0.03] border border-white/5 rounded-[48px] flex items-center justify-between group overflow-hidden relative ${state.round < 3 ? 'opacity-50 grayscale' : ''}`}
            >
                <div className="relative z-10 text-left">
                    <span className="text-[9px] text-rose-500 tracking-[0.4em] uppercase font-black">Narration PERSISTENCE</span>
                    <h4 className="text-2xl font-serif italic text-white/80">The Morning Edition</h4>
                </div>
                <span className="text-4xl relative z-10 group-hover:rotate-12 transition-transform">🗞️</span>
                <div className="absolute inset-0 bg-gradient-to-r from-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                {state.round < 3 && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[2px]">
                         <span className="text-[9px] uppercase tracking-widest font-black text-white/50">Locked</span>
                    </div>
                )}
            </button>
        </section>

        <section className="grid grid-cols-1 gap-4 pb-24">
            {ACTIVITIES.map((act) => (
            <button key={act.id} onClick={() => aiActions.handleActivitySelect(act.id)} className="p-6 bg-white/[0.02] border border-white/5 rounded-[48px] hover:bg-rose-950/20 transition-all text-left flex items-center gap-7 group">
                <div className="w-16 h-16 rounded-[28px] bg-white/5 flex items-center justify-center text-4xl group-hover:scale-110 transition-transform">{act.icon}</div>
                <div>
                    <h4 className="text-xl font-serif text-white/80 group-hover:text-white">{act.title}</h4>
                    <p className="text-[10px] text-white/20 uppercase tracking-widest mt-0.5">{act.description}</p>
                </div>
            </button>
            ))}
        </section>
    </motion.div>
  );
};

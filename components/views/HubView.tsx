
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PAGE_VARIANTS, ACTIVITIES } from '../../constants';
import { PersonaReveal } from '../PersonaReveal';
import { VibeMatrix } from '../VibeMatrix';
import { LocationWindow } from '../LocationWindow';
import { useSession } from '../../context/SessionContext';
import { Question } from '../../types';

interface HubViewProps {
  onOpenReactionPicker: () => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  Style: '✨', Escape: '🌙', Preferences: '💎',
  Deep: '🔮', Intimate: '🫀', Desire: '🔥',
};

const ACTIVITY_ICONS: Record<string, string> = {
  twoTruths: '🎭', finishSentence: '✍️', truth: '🥃',
};

export const HubView: React.FC<HubViewProps> = ({ onOpenReactionPicker }) => {
  const { state, actions, qActions, aiActions, narrativeState, narrativeActions } = useSession();

  const handleAskQuestion = () => {
    actions.setView('question', false);
    actions.setUsers(prev => prev.map(u => u.isSelf ? { ...u, status: 'choosing' } : u));
  };

  const handleMorningEdition = () => {
    if (state.round < 3) {
      qActions.showFlash("Insufficient Data: Connection Too Early");
      return;
    }
    actions.setView('rating');
    qActions.showFlash("Requesting Partner Appraisal...");
  };

  const handleAcceptSuggestion = () => {
    const suggestion = narrativeActions.acceptSuggestion();
    if (!suggestion) return;

    if (suggestion.suggestedAction === 'question' && suggestion.suggestedCategory) {
      // Go to question view and auto-select category
      qActions.handleCategorySelect(suggestion.suggestedCategory as Question['category']);
      actions.setView('question', false);
      actions.setUsers(prev => prev.map(u => u.isSelf ? { ...u, status: 'choosing' } : u));
    } else if (suggestion.suggestedAction === 'activity') {
      if (suggestion.suggestedActivity === 'morning_edition') {
        handleMorningEdition();
      } else if (suggestion.suggestedActivity) {
        aiActions.handleActivitySelect(suggestion.suggestedActivity);
      }
    }
  };

  const { narrativeSuggestion, isLoadingSuggestion, overrideActive } = narrativeState;
  const isHost = state.isHost;
  const showNarrative = isHost && !overrideActive;

  // Build suggestion button label
  const getSuggestionLabel = () => {
    if (!narrativeSuggestion) return '';
    if (narrativeSuggestion.suggestedAction === 'question' && narrativeSuggestion.suggestedCategory) {
      const cat = narrativeSuggestion.suggestedCategory;
      return `${CATEGORY_ICONS[cat] || '✨'} Ask ${cat} Question`;
    }
    if (narrativeSuggestion.suggestedActivity === 'morning_edition') {
      return '🗞️ The Morning Edition';
    }
    const act = ACTIVITIES.find(a => a.id === narrativeSuggestion.suggestedActivity);
    return `${act?.icon || '🎲'} ${act?.title || narrativeSuggestion.suggestedActivity}`;
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

        {/* Narrative Suggestion (Host only) */}
        {showNarrative && (
          <section className="flex flex-col gap-4">
            <AnimatePresence mode="wait">
              {isLoadingSuggestion && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-4 py-12"
                >
                  <motion.div
                    animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.8, 0.4] }}
                    transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                    className="w-16 h-16 rounded-full bg-rose-600/20 border border-rose-500/30 flex items-center justify-center"
                  >
                    <div className="w-8 h-8 rounded-full bg-rose-600/40 animate-pulse" />
                  </motion.div>
                  <p className="text-[10px] uppercase tracking-[0.4em] text-white/30 font-black">
                    Reading the room...
                  </p>
                </motion.div>
              )}

              {!isLoadingSuggestion && narrativeSuggestion && (
                <motion.div
                  key="suggestion"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col gap-5"
                >
                  {/* Transition narrative */}
                  <p className="text-center text-lg font-serif italic text-white/60 leading-relaxed px-4">
                    "{narrativeSuggestion.transitionNarrative}"
                  </p>

                  {/* Primary CTA */}
                  <button
                    onClick={handleAcceptSuggestion}
                    className="w-full p-6 bg-rose-600 border border-rose-400/30 rounded-[48px] hover:bg-rose-500 transition-all active:scale-95 text-center shadow-[0_15px_35px_rgba(225,29,72,0.3)] group"
                  >
                    <span className="text-xl font-serif text-white group-hover:tracking-wide transition-all">
                      {getSuggestionLabel()}
                    </span>
                  </button>

                  {/* Override link */}
                  <button
                    onClick={narrativeActions.overrideSuggestion}
                    className="text-[10px] uppercase tracking-[0.3em] text-white/25 font-black hover:text-white/50 transition-colors text-center py-2"
                  >
                    I'll choose myself
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        )}

        {/* Full Menu (guests always see this, hosts see when override active or no suggestion) */}
        {(!showNarrative || overrideActive || (!isHost)) && (
          <>
            <section className="grid grid-cols-2 gap-4">
                <button onClick={handleAskQuestion} className="p-8 bg-rose-600 border border-rose-400/30 rounded-[48px] hover:bg-rose-500 transition-all active:scale-95 text-center flex flex-col items-center gap-4 shadow-[0_15px_35px_rgba(225,29,72,0.3)] group">
                    <span className="text-4xl group-hover:scale-110 transition-transform">✨</span>
                    <h4 className="text-lg font-serif text-white">Ask Question</h4>
                </button>
                <button onClick={onOpenReactionPicker} className="p-8 bg-white/[0.03] border border-white/5 rounded-[48px] hover:bg-white/[0.06] transition-all active:scale-95 text-center flex flex-col items-center gap-4 group">
                    <span className="text-4xl group-hover:scale-110 transition-transform">🎭</span>
                    <h4 className="text-lg font-serif text-white/80">Reaction</h4>
                </button>
            </section>

            <section className="flex flex-col gap-4">
                <button
                    onClick={handleMorningEdition}
                    className={`w-full p-8 bg-white/[0.03] border border-white/5 rounded-[48px] flex items-center justify-between group overflow-hidden relative transition-all active:scale-95 ${state.round < 3 ? 'opacity-50 grayscale' : ''}`}
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
                <button key={act.id} onClick={() => aiActions.handleActivitySelect(act.id)} className="p-6 bg-white/[0.02] border border-white/5 rounded-[48px] hover:bg-rose-950/20 transition-all active:scale-95 text-left flex items-center gap-7 group">
                    <div className="w-16 h-16 rounded-[28px] bg-white/5 flex items-center justify-center text-4xl group-hover:scale-110 transition-transform">{act.icon}</div>
                    <div>
                        <h4 className="text-xl font-serif text-white/80 group-hover:text-white">{act.title}</h4>
                        <p className="text-[10px] text-white/20 uppercase tracking-widest mt-0.5">{act.description}</p>
                    </div>
                </button>
                ))}
            </section>
          </>
        )}
    </motion.div>
  );
};

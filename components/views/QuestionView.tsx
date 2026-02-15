
import React from 'react';
import { motion } from 'framer-motion';
import { PAGE_VARIANTS } from '../../constants';
import { useSessionState } from '../../hooks/useSessionState';
import { useQuestionFlow } from '../../hooks/useQuestionFlow';

interface QuestionViewProps {
  state: ReturnType<typeof useSessionState>['state'];
  actions: ReturnType<typeof useSessionState>['actions'];
  qState: ReturnType<typeof useQuestionFlow>['qState'];
  qActions: ReturnType<typeof useQuestionFlow>['qActions'];
  selfId?: string;
}

export const QuestionView: React.FC<QuestionViewProps> = ({ state, actions, qState, qActions, selfId }) => {
  const handleBackToHub = () => {
    actions.setView('hub');
    // Reset status to online since we stopped choosing
    actions.setUsers(prev => prev.map(u => u.isSelf ? { ...u, status: 'online' } : u));
  };

  return (
    <motion.div key="q-view" variants={PAGE_VARIANTS} initial="initial" animate="animate" exit="exit" className="flex flex-col pt-16 gap-10">
        
        {/* Category Selection: Show only if no category picked AND no active question */}
        {!qState.activeQuestion && !qState.selectedCategory && (
        <div className="grid grid-cols-1 gap-4">
            <span className="text-[10px] text-white/20 uppercase tracking-[0.5em] text-center font-black mb-4">Intel Sector</span>
            {['Style', 'Escape', 'Preferences', 'Deep', 'Intimate'].map(cat => (
                <button key={cat} onClick={() => qActions.handleCategorySelect(cat as any)} className="p-8 bg-white/[0.03] border border-white/5 rounded-[40px] hover:bg-rose-950/20 transition-all text-center">
                    <span className="text-2xl font-serif text-white/80">{cat}</span>
                </button>
            ))}
            <button onClick={handleBackToHub} className="mt-8 text-white/10 text-[11px] tracking-[0.6em] uppercase font-black">Back to Hub</button>
        </div>
        )}

        {/* Question Selection: Show only if category picked AND no active question */}
        {!qState.activeQuestion && qState.selectedCategory && (
        <div className="flex flex-col gap-6">
            <span className="text-[10px] text-rose-500 uppercase tracking-[0.5em] text-center font-black">Sector: {qState.selectedCategory}</span>
            
            {qState.isGeneratingQuestions ? (
                <div className="py-20 flex flex-col items-center justify-center gap-4">
                    <div className="w-8 h-8 border-2 border-white/10 border-t-rose-500 rounded-full animate-spin" />
                    <span className="text-[9px] text-white/30 uppercase tracking-widest">Compiling dossiers...</span>
                </div>
            ) : (
                <>
                {qState.availableQuestions.map(q => (
                    <button key={q.id} onClick={() => qActions.handleQuestionSelect(q)} className="p-9 rounded-[56px] bg-white/5 border border-white/5 hover:bg-rose-950/20 transition-all text-left">
                        <p className="text-white/90 text-xl font-serif italic leading-relaxed">"{q.text}"</p>
                    </button>
                ))}
                <button onClick={() => qActions.resetCategory()} className="mt-8 text-white/10 text-[11px] tracking-[0.6em] uppercase font-black">Back</button>
                </>
            )}
        </div>
        )}

        {/* Active Question: Show to BOTH users once selected */}
        {qState.activeQuestion && (
        <div className="flex flex-col gap-12">
            <div className="p-12 bg-rose-950/20 rounded-[72px] border border-rose-500/20 text-center">
                <span className="text-[11px] tracking-[0.8em] text-rose-500 uppercase font-black mb-8 block">{qState.activeQuestion.category}</span>
                <p className="text-4xl font-serif text-white italic leading-tight">"{qState.activeQuestion.text}"</p>
            </div>
            {qState.questionOwnerId !== selfId ? (
                <div className="grid grid-cols-1 gap-5">
                {qState.activeQuestion.options.map((opt, i) => (
                    <button key={i} onClick={() => qActions.handleAnswerSelect(opt, false)} className="p-9 rounded-full bg-white/[0.03] border border-white/5 hover:bg-white/10 text-[12px] tracking-[0.2em] uppercase font-black transition-all">
                    {opt}
                    </button>
                ))}
                <button onClick={() => qActions.handleRefuse(false)} className="mt-4 p-9 rounded-full border border-rose-500/40 text-rose-500 hover:bg-rose-500 hover:text-white text-[12px] tracking-[0.4em] uppercase font-black transition-all">Refuse & Sip 🥃</button>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-32 text-white/10 gap-8">
                    <div className="w-12 h-12 border-2 border-rose-500/20 border-t-rose-500 rounded-full animate-spin" />
                    <span className="text-[11px] uppercase tracking-[0.8em] font-black">Awaiting Disclosure</span>
                </div>
            )}
        </div>
        )}
    </motion.div>
  );
};

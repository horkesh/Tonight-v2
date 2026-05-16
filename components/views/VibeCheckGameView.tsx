import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PAGE_VARIANTS } from '../../constants';
import { useGameStore } from '../../store/gameState';
import { compoundChemistryScore } from '../../services/chemistryEngine';
import type { VibeCheckFlowState, VibeCheckFlowActions } from '../../hooks/useVibeCheckFlow';

interface VibeCheckGameViewProps {
  vcState: VibeCheckFlowState;
  vcActions: VibeCheckFlowActions;
}

function formatTime(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

/**
 * VibeCheckGameView: Fast-paced tap-only question display for Vibe Check mode.
 *
 * Displays:
 * - Timer countdown
 * - Chemistry bar
 * - Current question text
 * - 2-4 tap-able answer options
 * - "Waiting for partner" state when one has answered
 */
export function VibeCheckGameView({ vcState, vcActions }: VibeCheckGameViewProps) {
  const chemistry = useGameStore(s => s.chemistry);
  const score = compoundChemistryScore(chemistry);

  const {
    currentQuestion,
    questionIndex,
    timeRemainingMs,
    hasAnswered,
    myAnswerId,
    partnerAnswerId,
    bothAnswered,
    isTransitioning,
  } = vcState;

  const options = currentQuestion?.options ?? [];

  return (
    <motion.div
      key="vibeCheckGame"
      variants={PAGE_VARIANTS}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex flex-col items-center gap-6 pb-12 min-h-[70vh]"
    >
      {/* Top bar: Timer + Chemistry */}
      <div className="w-full flex items-center justify-between">
        {/* Timer */}
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ opacity: timeRemainingMs < 30000 ? [0.4, 1, 0.4] : 1 }}
            transition={timeRemainingMs < 30000 ? { duration: 1, repeat: Infinity } : {}}
            className={`text-sm font-mono tracking-wider ${
              timeRemainingMs < 30000 ? 'text-rose-400' : 'text-white/60'
            }`}
          >
            {formatTime(timeRemainingMs)}
          </motion.div>
        </div>

        {/* Question counter */}
        <div className="text-[9px] uppercase tracking-[0.3em] text-white/30">
          Q{questionIndex}
        </div>
      </div>

      {/* Chemistry bar */}
      <div className="w-full">
        <div className="relative h-1 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            animate={{ scaleX: score / 100 }}
            transition={{ type: 'spring', damping: 20 }}
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-rose-500 to-amber-400 rounded-full origin-left"
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[8px] text-white/20">Spark</span>
          <span className="text-[8px] text-white/20">{score}</span>
        </div>
      </div>

      {/* Question area */}
      <div className="flex-1 flex flex-col items-center justify-center w-full gap-8 py-8">
        <AnimatePresence mode="wait">
          {isTransitioning ? (
            <motion.div
              key="transition"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                className="w-8 h-8 rounded-full border border-rose-500/30"
              />
            </motion.div>
          ) : currentQuestion ? (
            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center gap-8 w-full"
            >
              {/* Question text */}
              <h2 className="text-xl font-serif text-white/90 text-center leading-relaxed px-2">
                {currentQuestion.text}
              </h2>

              {/* Options */}
              <div className="flex flex-col gap-3 w-full max-w-sm">
                {options.map((option) => {
                  const isMyChoice = myAnswerId === option.id;
                  const isPartnerChoice = partnerAnswerId === option.id;
                  const isRevealed = bothAnswered;

                  return (
                    <motion.button
                      key={option.id}
                      whileTap={{ scale: hasAnswered ? 1 : 0.97 }}
                      onClick={() => !hasAnswered && vcActions.submitAnswer(option.id)}
                      disabled={hasAnswered}
                      className={`
                        relative w-full py-4 px-6 rounded-xl text-sm text-left transition-all duration-300
                        ${hasAnswered
                          ? isMyChoice
                            ? 'bg-rose-600/30 border border-rose-500/50 text-white/90'
                            : 'bg-white/5 border border-white/5 text-white/30'
                          : 'bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20 active:bg-white/15'
                        }
                      `}
                    >
                      <span>{option.text}</span>

                      {/* Reveal markers */}
                      {isRevealed && isMyChoice && (
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] uppercase tracking-widest text-rose-400">
                          You
                        </span>
                      )}
                      {isRevealed && isPartnerChoice && !isMyChoice && (
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] uppercase tracking-widest text-white/40">
                          Them
                        </span>
                      )}
                      {isRevealed && isMyChoice && isPartnerChoice && (
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] uppercase tracking-widest text-amber-400">
                          Match
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Waiting for partner indicator */}
              {hasAnswered && !bothAnswered && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-[10px] uppercase tracking-[0.3em] text-white/30"
                >
                  Waiting for their answer...
                </motion.p>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
            >
              <p className="text-white/30 text-sm">Loading questions...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default VibeCheckGameView;


import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PAGE_VARIANTS } from '../../constants';
import { TwoTruthsData, User } from '../../types';

interface TwoTruthsViewProps {
  data: TwoTruthsData;
  users: User[];
  // P2P synced choices: userId -> index of their guess
  activityChoices: Record<string, number>;
  onGuess: (index: number) => void;
  onComplete: (correct: boolean) => void;
  isConnected: boolean;
  onSimulatePartner: () => void;
}

export const TwoTruthsView: React.FC<TwoTruthsViewProps> = ({
  data, users, activityChoices, onGuess, onComplete, isConnected, onSimulatePartner
}) => {
  const [reveal, setReveal] = useState(false);
  const [phase, setPhase] = useState<'guess' | 'waiting' | 'reveal'>('guess');
  const completedRef = useRef(false);

  const self = users.find(u => u.isSelf);
  const partner = users.find(u => !u.isSelf);

  const myGuess = self ? activityChoices[self.id] : undefined;
  const partnerGuess = partner ? activityChoices[partner.id] : undefined;

  const isBothChosen = myGuess !== undefined && partnerGuess !== undefined;
  const lieIndex = data.statements.findIndex(s => s.isLie);

  // Am I the subject or the guesser?
  const amSubject = self?.id === data.subjectId; // Statements are about ME
  const subjectName = data.subjectName;

  // Phase transitions
  useEffect(() => {
    if (myGuess !== undefined && partnerGuess === undefined) {
      setPhase('waiting');
    }
  }, [myGuess, partnerGuess]);

  useEffect(() => {
    if (isBothChosen && !reveal) {
      setReveal(true);
      setPhase('reveal');
    }
  }, [isBothChosen, reveal]);

  // Auto-simulate partner only if disconnected for an extended period
  useEffect(() => {
    if (!isConnected && myGuess !== undefined && partnerGuess === undefined) {
      const timer = setTimeout(() => onSimulatePartner(), 6000);
      return () => clearTimeout(timer);
    }
  }, [isConnected, myGuess, partnerGuess, onSimulatePartner]);

  // Auto-complete after reveal
  useEffect(() => {
    if (reveal && !completedRef.current) {
      const timer = setTimeout(() => {
        completedRef.current = true;
        // The guesser's perspective: did they correctly identify the lie?
        const guesserGuess = amSubject ? partnerGuess : myGuess;
        const correct = guesserGuess === lieIndex;
        onComplete(correct);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [reveal, amSubject, myGuess, partnerGuess, lieIndex, onComplete]);

  const handleGuess = (index: number) => {
    if (myGuess !== undefined) return;
    onGuess(index);
  };

  return (
    <motion.div
      key="twoTruths"
      variants={PAGE_VARIANTS}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex flex-col gap-8 pt-12 min-h-[80vh] relative"
    >
      {/* Header */}
      <div className="text-center px-4">
        <span className="text-[9px] text-rose-500 tracking-[0.5em] uppercase font-black block mb-3">
          Two Truths & A Lie
        </span>
        <h2 className="text-3xl font-serif text-white italic">
          About {subjectName}...
        </h2>
        {!amSubject && phase === 'guess' && (
          <p className="text-[10px] text-white/30 uppercase tracking-widest mt-3 font-bold">
            Which one is the lie?
          </p>
        )}
        {amSubject && phase === 'guess' && (
          <p className="text-[10px] text-white/30 uppercase tracking-widest mt-3 font-bold">
            Which do you think they'll spot?
          </p>
        )}
      </div>

      {/* Statement Cards */}
      <div className="flex flex-col gap-4 px-2">
        {data.statements.map((stmt, i) => {
          const isSelected = myGuess === i;
          const isLie = stmt.isLie;
          const showResult = reveal;

          return (
            <motion.button
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.15 }}
              onClick={() => !reveal && handleGuess(i)}
              disabled={myGuess !== undefined || reveal}
              className={`
                relative w-full p-6 rounded-3xl border text-left transition-all duration-500
                ${showResult && isLie
                  ? 'bg-red-950/40 border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.2)]'
                  : showResult && !isLie
                    ? 'bg-emerald-950/30 border-emerald-500/30'
                    : isSelected
                      ? 'bg-rose-950/40 border-rose-500/40 shadow-[0_0_20px_rgba(225,29,72,0.2)]'
                      : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20'
                }
              `}
            >
              {/* Statement number */}
              <div className="flex items-start gap-4">
                <span className={`
                  text-lg font-black shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                  ${showResult && isLie ? 'bg-red-500/20 text-red-400' : showResult ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/30'}
                `}>
                  {showResult ? (isLie ? '!' : '\u2713') : i + 1}
                </span>
                <p className={`text-base font-serif italic leading-relaxed ${showResult && isLie ? 'text-red-200' : 'text-white/80'}`}>
                  "{stmt.text}"
                </p>
              </div>

              {/* Result badge */}
              <AnimatePresence>
                {showResult && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 + i * 0.2 }}
                    className="mt-3 ml-12"
                  >
                    <span className={`text-[9px] uppercase tracking-widest font-black ${isLie ? 'text-red-400' : 'text-emerald-400/70'}`}>
                      {isLie ? 'The Lie' : 'Truth'}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Selection indicator */}
              {isSelected && !reveal && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute top-3 right-4 text-[8px] uppercase tracking-widest text-rose-500 font-black"
                >
                  Your Pick
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Waiting State */}
      <AnimatePresence>
        {phase === 'waiting' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4 py-8"
          >
            <div className="w-12 h-12 border-2 border-white/10 border-t-rose-500 rounded-full animate-spin" />
            <span className="text-[10px] uppercase tracking-[0.4em] font-black text-rose-500 animate-pulse">
              {isConnected ? 'Waiting for their guess' : 'Simulating...'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reveal Result */}
      <AnimatePresence>
        {reveal && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5 }}
            className="flex flex-col items-center gap-4 py-6"
          >
            {(() => {
              const guesserGuess = amSubject ? partnerGuess : myGuess;
              const correct = guesserGuess === lieIndex;
              const guesserName = amSubject ? (partner?.name || 'Partner') : 'You';

              return (
                <>
                  <span className="text-5xl">{correct ? '\uD83D\uDC41\uFE0F' : '\uD83C\uDF2B\uFE0F'}</span>
                  <h3 className="text-2xl font-serif italic text-white">
                    {correct
                      ? `${guesserName === 'You' ? 'You saw' : `${guesserName} saw`} right through it`
                      : `${guesserName === 'You' ? 'You' : guesserName} fell for it`
                    }
                  </h3>
                  <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">
                    {correct ? 'Paying attention' : 'Still an enigma'}
                  </p>
                  <button
                    onClick={() => {
                      if (!completedRef.current) {
                        completedRef.current = true;
                        onComplete(correct);
                      }
                    }}
                    className="mt-4 px-8 py-3 bg-white/10 rounded-full text-[10px] uppercase tracking-widest font-black hover:bg-white/20 transition-colors"
                  >
                    Continue
                  </button>
                </>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

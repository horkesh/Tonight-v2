
import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PAGE_VARIANTS } from '../../constants';
import { useSession } from '../../context/SessionContext';

export const TwoTruthsView: React.FC = () => {
  const { state, aiState, aiActions } = useSession();
  const { users, isConnected } = state;
  const { twoTruthsData: data, activityChoices } = aiState;
  const { submitActivityChoice: onGuess, handleTwoTruthsComplete: onComplete, simulateActivityPartner: onSimulatePartner } = aiActions;

  const [reveal, setReveal] = useState(false);
  const completedRef = useRef(false);

  if (!data) return null;

  const self = users.find(u => u.isSelf);
  const partner = users.find(u => !u.isSelf);

  const lieIndex = data.statements.findIndex(s => s.isLie);

  // Am I the subject (statements are about me) or the guesser?
  const amSubject = self?.id === data.subjectId;
  const subjectName = data.subjectName;
  const guesserName = amSubject ? (partner?.name || 'Partner') : (self?.name || 'You');

  // Only the guesser makes a choice. Subject just watches.
  const guesserId = amSubject ? partner?.id : self?.id;
  const guesserPick = guesserId ? activityChoices[guesserId] : undefined;
  const guesserHasPicked = guesserPick !== undefined;

  // For the guesser: track their own pick for UI highlight
  const myGuess = !amSubject && self ? activityChoices[self.id] : undefined;

  // Reveal triggers when the guesser has picked
  useEffect(() => {
    if (guesserHasPicked && !reveal) {
      // Small delay for dramatic effect
      const timer = setTimeout(() => {
        setReveal(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [guesserHasPicked, reveal]);

  // Auto-simulate guesser if disconnected
  useEffect(() => {
    if (!isConnected && !guesserHasPicked && amSubject) {
      const timer = setTimeout(() => onSimulatePartner(), 6000);
      return () => clearTimeout(timer);
    }
  }, [isConnected, guesserHasPicked, amSubject, onSimulatePartner]);

  // Auto-complete after reveal
  useEffect(() => {
    if (reveal && !completedRef.current) {
      const timer = setTimeout(() => {
        completedRef.current = true;
        const correct = guesserPick === lieIndex;
        onComplete(correct);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [reveal, guesserPick, lieIndex, onComplete]);

  const handleGuess = (index: number) => {
    if (amSubject) return; // Subject doesn't guess
    if (myGuess !== undefined) return;
    onGuess(index);
  };

  const correct = guesserPick === lieIndex;

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

        {/* Role-specific instructions */}
        {amSubject && !reveal && (
          <p className="text-[10px] text-white/30 uppercase tracking-widest mt-3 font-bold">
            These are about you — the lie is marked. Wait for {partner?.name || 'them'} to guess.
          </p>
        )}
        {!amSubject && !reveal && myGuess === undefined && (
          <p className="text-[10px] text-white/30 uppercase tracking-widest mt-3 font-bold">
            Which one is the lie?
          </p>
        )}
        {!amSubject && !reveal && myGuess !== undefined && (
          <p className="text-[10px] text-white/30 uppercase tracking-widest mt-3 font-bold">
            Locked in.
          </p>
        )}
      </div>

      {/* Statement Cards */}
      <div className="flex flex-col gap-4 px-2">
        {data.statements.map((stmt, i) => {
          const isSelected = myGuess === i;
          const isLie = stmt.isLie;
          const showResult = reveal;
          // Subject sees the lie marked from the start
          const subjectKnows = amSubject && isLie && !reveal;

          return (
            <motion.button
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.15 }}
              onClick={() => !reveal && !amSubject && handleGuess(i)}
              disabled={amSubject || myGuess !== undefined || reveal}
              className={`
                relative w-full p-6 rounded-3xl border text-left transition-all duration-500
                ${showResult && isLie
                  ? 'bg-red-950/40 border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.2)]'
                  : showResult && !isLie
                    ? 'bg-emerald-950/30 border-emerald-500/30'
                    : subjectKnows
                      ? 'bg-amber-950/20 border-amber-500/20'
                      : isSelected
                        ? 'bg-rose-950/40 border-rose-500/40 shadow-[0_0_20px_rgba(225,29,72,0.2)]'
                        : amSubject
                          ? 'bg-white/[0.03] border-white/10'
                          : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20'
                }
              `}
            >
              {/* Statement number */}
              <div className="flex items-start gap-4">
                <span className={`
                  text-lg font-black shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                  ${showResult && isLie ? 'bg-red-500/20 text-red-400' : showResult ? 'bg-emerald-500/20 text-emerald-400' : subjectKnows ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-white/30'}
                `}>
                  {showResult ? (isLie ? '!' : '\u2713') : subjectKnows ? '?' : i + 1}
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

              {/* Subject sees the lie hint */}
              {subjectKnows && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                  className="absolute top-3 right-4 text-[8px] uppercase tracking-widest text-amber-500/60 font-black"
                >
                  The Lie
                </motion.div>
              )}

              {/* Guesser selection indicator */}
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

      {/* Subject waiting state */}
      <AnimatePresence>
        {amSubject && !reveal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4 py-8"
          >
            <div className="w-12 h-12 border-2 border-white/10 border-t-rose-500 rounded-full animate-spin" />
            <span className="text-[10px] uppercase tracking-[0.4em] font-black text-rose-500 animate-pulse">
              {isConnected ? `Waiting for ${partner?.name || 'them'} to guess` : 'Simulating...'}
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
            <span className="text-5xl">{correct ? '\uD83D\uDC41\uFE0F' : '\uD83C\uDF2B\uFE0F'}</span>
            <h3 className="text-2xl font-serif italic text-white">
              {amSubject
                ? correct
                  ? `${guesserName} saw right through it`
                  : `${guesserName} fell for it`
                : correct
                  ? 'You saw right through it'
                  : 'You fell for it'
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
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

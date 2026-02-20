
import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PAGE_VARIANTS } from '../../constants';
import { FinishSentenceData, User } from '../../types';

interface FinishSentenceViewProps {
  data: FinishSentenceData;
  users: User[];
  // P2P synced choices: userId -> index of their pick (0-2 for options, 3 for "None of these")
  activityChoices: Record<string, number>;
  onPick: (index: number) => void;
  onComplete: (matched: boolean) => void;
  isConnected: boolean;
  onSimulatePartner: () => void;
}

export const FinishSentenceView: React.FC<FinishSentenceViewProps> = ({
  data, users, activityChoices, onPick, onComplete, isConnected, onSimulatePartner
}) => {
  const [reveal, setReveal] = useState(false);
  const completedRef = useRef(false);

  const self = users.find(u => u.isSelf);
  const partner = users.find(u => !u.isSelf);

  const myPick = self ? activityChoices[self.id] : undefined;
  const partnerPick = partner ? activityChoices[partner.id] : undefined;

  const isBothChosen = myPick !== undefined && partnerPick !== undefined;

  // Am I the subject (the one the sentence is ABOUT) or the guesser?
  const amSubject = self?.id === data.subjectId;
  const subjectName = data.subjectName;
  const guesserName = amSubject ? (partner?.name || 'Partner') : 'You';

  // Subject picks their "real answer", guesser picks their "guess"
  const subjectPick = amSubject ? myPick : partnerPick;
  const guesserPick = amSubject ? partnerPick : myPick;

  // All options including "None of these" for the subject
  const allOptions = [...data.options];
  const NONE_INDEX = 3;

  // Phase transitions
  useEffect(() => {
    if (isBothChosen && !reveal) {
      setReveal(true);
    }
  }, [isBothChosen, reveal]);

  // Auto-simulate partner if disconnected
  useEffect(() => {
    if (!isConnected && myPick !== undefined && partnerPick === undefined) {
      const timer = setTimeout(() => onSimulatePartner(), 2000);
      return () => clearTimeout(timer);
    }
  }, [isConnected, myPick, partnerPick, onSimulatePartner]);

  // Auto-complete after reveal
  useEffect(() => {
    if (reveal && !completedRef.current) {
      const timer = setTimeout(() => {
        completedRef.current = true;
        const matched = subjectPick !== undefined && guesserPick !== undefined && subjectPick === guesserPick;
        onComplete(matched);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [reveal, subjectPick, guesserPick, onComplete]);

  const handlePick = (index: number) => {
    if (myPick !== undefined) return;
    onPick(index);
  };

  const isWaiting = myPick !== undefined && !isBothChosen;

  return (
    <motion.div
      key="finishSentence"
      variants={PAGE_VARIANTS}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex flex-col gap-8 pt-12 min-h-[80vh] relative"
    >
      {/* Header */}
      <div className="text-center px-4">
        <span className="text-[9px] text-rose-500 tracking-[0.5em] uppercase font-black block mb-3">
          Finish My Sentence
        </span>
        <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold mb-2">
          {amSubject ? 'Pick your real answer' : `Guess ${subjectName}'s answer`}
        </p>
      </div>

      {/* The Sentence */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="px-4"
      >
        <div className="p-6 rounded-3xl bg-white/[0.04] border border-white/10 text-center">
          <p className="text-2xl font-serif italic text-white/90 leading-relaxed">
            {data.sentence}
          </p>
        </div>
      </motion.div>

      {/* Options */}
      {!reveal && (
        <div className="flex flex-col gap-3 px-2">
          {allOptions.map((option, i) => {
            const isSelected = myPick === i;
            return (
              <motion.button
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                onClick={() => handlePick(i)}
                disabled={myPick !== undefined}
                className={`
                  relative w-full p-5 rounded-2xl border text-left transition-all duration-300
                  ${isSelected
                    ? 'bg-rose-950/40 border-rose-500/40 shadow-[0_0_20px_rgba(225,29,72,0.2)]'
                    : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20'
                  }
                `}
              >
                <span className="text-sm text-white/80 font-sans tracking-wide">{option}</span>
                {isSelected && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute top-3 right-4 text-[8px] uppercase tracking-widest text-rose-500 font-black"
                  >
                    Your Pick
                  </motion.span>
                )}
              </motion.button>
            );
          })}

          {/* "None of these" — only for the subject */}
          {amSubject && (
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 }}
              onClick={() => handlePick(NONE_INDEX)}
              disabled={myPick !== undefined}
              className={`
                w-full p-4 rounded-2xl border text-center transition-all duration-300 mt-2
                ${myPick === NONE_INDEX
                  ? 'bg-amber-950/30 border-amber-500/30'
                  : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10'
                }
              `}
            >
              <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">None of these</span>
            </motion.button>
          )}
        </div>
      )}

      {/* Waiting State */}
      <AnimatePresence>
        {isWaiting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4 py-8"
          >
            <div className="w-12 h-12 border-2 border-white/10 border-t-rose-500 rounded-full animate-spin" />
            <span className="text-[10px] uppercase tracking-[0.4em] font-black text-rose-500 animate-pulse">
              {isConnected
                ? (amSubject ? 'Waiting for their guess' : `Waiting for ${subjectName}'s real answer`)
                : 'Simulating...'
              }
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reveal */}
      <AnimatePresence>
        {reveal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-6 py-4"
          >
            {/* Side-by-side comparison */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="grid grid-cols-2 gap-4 w-full px-2"
            >
              {/* Guesser's pick */}
              <div className="bg-white/5 p-5 rounded-2xl border border-white/10 text-center">
                <span className="text-[9px] uppercase text-white/30 block mb-3 tracking-widest font-bold">
                  {amSubject ? (partner?.name || 'Partner') : 'You'} guessed
                </span>
                <p className="text-sm text-white/80 font-serif italic">
                  {guesserPick !== undefined && guesserPick < data.options.length
                    ? `"${data.options[guesserPick]}"`
                    : '"None of these"'
                  }
                </p>
              </div>

              {/* Subject's real answer */}
              <div className="bg-white/5 p-5 rounded-2xl border border-white/10 text-center">
                <span className="text-[9px] uppercase text-white/30 block mb-3 tracking-widest font-bold">
                  {amSubject ? 'You' : subjectName} said
                </span>
                <p className="text-sm text-white/80 font-serif italic">
                  {subjectPick !== undefined && subjectPick < data.options.length
                    ? `"${data.options[subjectPick]}"`
                    : '"None of these"'
                  }
                </p>
              </div>
            </motion.div>

            {/* Match/Mismatch result */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.2 }}
              className="flex flex-col items-center gap-3 mt-2"
            >
              {(() => {
                const matched = subjectPick !== undefined && guesserPick !== undefined && subjectPick === guesserPick;
                return (
                  <>
                    <span className="text-5xl">{matched ? '\uD83D\uDCD6' : '\uD83C\uDF0A'}</span>
                    <h3 className="text-2xl font-serif italic text-white">
                      {matched
                        ? `${guesserName === 'You' ? 'You read' : `${amSubject ? (partner?.name || 'Partner') : 'You'} read`} ${amSubject ? 'you' : subjectName} like a book`
                        : 'Not even close...'
                      }
                    </h3>
                    <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">
                      {matched ? 'Frighteningly accurate' : 'Still full of surprises'}
                    </p>
                    <button
                      onClick={() => {
                        if (!completedRef.current) {
                          completedRef.current = true;
                          onComplete(matched);
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
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

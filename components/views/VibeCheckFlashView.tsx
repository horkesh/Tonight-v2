import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PAGE_VARIANTS } from '../../constants';
import { useGameStore } from '../../store/gameState';
import { compoundChemistryScore } from '../../services/chemistryEngine';
import type { ChemistryProfile } from '../../types/chemistry';

interface VibeCheckFlashViewProps {
  onComplete: () => void;
  highlightMoment: { question: string; answer: string; userName: string } | null;
  /** Number of questions answered during the session */
  questionsAnswered?: number;
  /** Number of times both players picked the same option */
  matchCount?: number;
  /** Total session time in milliseconds */
  elapsedMs?: number;
}

// Verdict phrases based on compound chemistry score ranges
function getVerdict(score: number): { phrase: string; vibe: string } {
  if (score >= 80) return { phrase: 'Dangerously Compatible', vibe: 'off-the-charts' };
  if (score >= 70) return { phrase: 'Electric Connection', vibe: 'sparks-flying' };
  if (score >= 60) return { phrase: 'Slow Burn Potential', vibe: 'warming-up' };
  if (score >= 50) return { phrase: 'Intriguing Energy', vibe: 'something-there' };
  if (score >= 40) return { phrase: 'Different Planets, Same Orbit', vibe: 'curious' };
  if (score >= 30) return { phrase: 'Mystery in Progress', vibe: 'developing' };
  return { phrase: 'The Night Is Young', vibe: 'early-days' };
}

// Visual compatibility metaphor (not a number)
function getCompatibilityVisual(chemistry: ChemistryProfile): string {
  const { spark, depth, play, sync, growth, trust } = chemistry;
  const max = Math.max(spark, depth, play, sync, growth, trust);

  if (max === spark) return 'Lightning in a bottle';
  if (max === depth) return 'Still waters, deep currents';
  if (max === play) return 'Partners in crime';
  if (max === sync) return 'Two frequencies, one wavelength';
  if (max === growth) return 'Unfinished story, turning page';
  if (max === trust) return 'Safe harbor in a storm';
  return 'Signal detected';
}

/**
 * VibeCheckFlash: The signature closing for Vibe Check mode.
 *
 * Sequence:
 * 1. Build-up animation (3 seconds)
 * 2. Verdict phrase reveal
 * 3. Chemistry snapshot
 * 4. Highlighted moment
 * 5. "Save contact?" prompt
 * 6. Shareable card hint
 */
export function VibeCheckFlashView({ onComplete, highlightMoment, questionsAnswered = 0, matchCount = 0, elapsedMs = 0 }: VibeCheckFlashViewProps) {
  const [phase, setPhase] = useState<'buildup' | 'reveal' | 'details'>('buildup');
  const chemistry = useGameStore(s => s.chemistry);
  const score = compoundChemistryScore(chemistry);
  const verdict = getVerdict(score);
  const visual = getCompatibilityVisual(chemistry);

  // Sequence timing
  useEffect(() => {
    const t1 = setTimeout(() => setPhase('reveal'), 3000);
    const t2 = setTimeout(() => setPhase('details'), 5500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const handleShare = useCallback(async () => {
    // Use Web Share API if available
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Tonight - Vibe Check',
          text: `${verdict.phrase}. "${visual}"`,
          url: window.location.origin,
        });
      } catch {
        // User cancelled or share failed
      }
    }
  }, [verdict.phrase, visual]);

  return (
    <motion.div
      key="vibeCheckFlash"
      variants={PAGE_VARIANTS}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex flex-col items-center justify-center min-h-[70vh] gap-8 text-center"
    >
      <AnimatePresence mode="wait">
        {/* Phase 1: Build-up */}
        {phase === 'buildup' && (
          <motion.div
            key="buildup"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            className="flex flex-col items-center gap-6"
          >
            {/* Pulsing ring */}
            <motion.div
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.3, 0.8, 0.3],
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-32 h-32 rounded-full border-2 border-rose-500/50"
            />
            <p className="text-[10px] uppercase tracking-[0.4em] text-white/40">
              Reading the signals...
            </p>
          </motion.div>
        )}

        {/* Phase 2: Verdict reveal */}
        {phase === 'reveal' && (
          <motion.div
            key="reveal"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', damping: 12 }}
            className="flex flex-col items-center gap-4"
          >
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-serif text-white tracking-wide"
            >
              {verdict.phrase}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-sm text-rose-400/80 italic"
            >
              "{visual}"
            </motion.p>
          </motion.div>
        )}

        {/* Phase 3: Details */}
        {phase === 'details' && (
          <motion.div
            key="details"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-8 w-full max-w-sm"
          >
            {/* Verdict */}
            <div>
              <h1 className="text-2xl font-serif text-white tracking-wide mb-1">
                {verdict.phrase}
              </h1>
              <p className="text-sm text-rose-400/80 italic">
                "{visual}"
              </p>
            </div>

            {/* Chemistry snapshot */}
            <div className="w-full bg-white/5 rounded-xl p-4 backdrop-blur-sm border border-white/10">
              <p className="text-[9px] uppercase tracking-[0.3em] text-white/30 mb-3">
                Chemistry Snapshot
              </p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Spark', value: chemistry.spark },
                  { label: 'Depth', value: chemistry.depth },
                  { label: 'Play', value: chemistry.play },
                  { label: 'Sync', value: chemistry.sync },
                  { label: 'Growth', value: chemistry.growth },
                  { label: 'Trust', value: chemistry.trust },
                ].map(dim => (
                  <div key={dim.label} className="text-center">
                    <div className="relative h-1 bg-white/10 rounded-full overflow-hidden mb-1">
                      <motion.div
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: dim.value / 100 }}
                        transition={{ delay: 0.5, duration: 0.8 }}
                        className="absolute inset-y-0 left-0 bg-rose-500 rounded-full origin-left"
                      />
                    </div>
                    <span className="text-[9px] text-white/40">{dim.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Session stats */}
            {questionsAnswered > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="w-full flex justify-between items-center px-2"
              >
                <div className="text-center">
                  <p className="text-lg text-white/80 font-mono">{questionsAnswered}</p>
                  <p className="text-[8px] uppercase tracking-[0.2em] text-white/30">Questions</p>
                </div>
                <div className="text-center">
                  <p className="text-lg text-white/80 font-mono">{matchCount}</p>
                  <p className="text-[8px] uppercase tracking-[0.2em] text-white/30">Sync Matches</p>
                </div>
                <div className="text-center">
                  <p className="text-lg text-white/80 font-mono">
                    {questionsAnswered > 0
                      ? `${Math.round((matchCount / questionsAnswered) * 100)}%`
                      : '--'}
                  </p>
                  <p className="text-[8px] uppercase tracking-[0.2em] text-white/30">Match Rate</p>
                </div>
                <div className="text-center">
                  <p className="text-lg text-white/80 font-mono capitalize">
                    {chemistry.trajectory === 'ascending' ? 'Rising'
                      : chemistry.trajectory === 'plateauing' ? 'Steady'
                      : chemistry.trajectory === 'oscillating' ? 'Dynamic'
                      : 'Cooling'}
                  </p>
                  <p className="text-[8px] uppercase tracking-[0.2em] text-white/30">Trajectory</p>
                </div>
              </motion.div>
            )}

            {/* Highlighted moment */}
            {highlightMoment && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="w-full bg-white/5 rounded-xl p-4 border border-white/10"
              >
                <p className="text-[9px] uppercase tracking-[0.3em] text-white/30 mb-2">
                  The Moment
                </p>
                <p className="text-xs text-white/60 italic mb-1">
                  "{highlightMoment.question}"
                </p>
                <p className="text-sm text-white/80">
                  {highlightMoment.userName}: "{highlightMoment.answer}"
                </p>
              </motion.div>
            )}

            {/* Blurred full profile tease */}
            <div className="w-full bg-white/5 rounded-xl p-4 border border-white/10 relative overflow-hidden">
              <div className="blur-sm pointer-events-none">
                <p className="text-xs text-white/50">Full Chemistry Profile</p>
                <p className="text-xs text-white/30 mt-1">Compatibility deep-dive, pattern analysis, prediction...</p>
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
                <span className="text-[10px] uppercase tracking-widest text-rose-400">
                  Unlock with Tonight
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-3 w-full">
              <button
                onClick={handleShare}
                className="w-full py-3 rounded-xl bg-white/10 text-white/70 text-xs uppercase tracking-widest hover:bg-white/15 transition-colors border border-white/10"
              >
                Share Result
              </button>
              <button
                onClick={onComplete}
                className="w-full py-3 rounded-xl bg-rose-600 text-white text-xs uppercase tracking-widest hover:bg-rose-500 transition-colors"
              >
                Done
              </button>
            </div>

            {/* Conversion tease */}
            <p className="text-[10px] text-white/25 max-w-xs">
              That was five minutes. Imagine what forty minutes reveals.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default VibeCheckFlashView;

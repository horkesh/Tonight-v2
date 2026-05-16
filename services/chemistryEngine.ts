import type { ChemistryProfile, ChemistryTrajectory } from '../types/chemistry';
import type { QuestionOption } from '../types/questions';
import type { VibeStats } from '../types';

const SIGNAL_WEIGHT = 3;
const SYNC_BONUS = 5;
const CLAMP = (v: number) => Math.max(0, Math.min(100, v));

/**
 * Heuristic chemistry deltas keyed by the existing 6-category question system.
 * Used until a real BankQuestion bank with per-option chemistry_signals exists.
 * Each category nudges the chemistry dimensions that the category's content
 * actually shapes (e.g., 'Desire' lights up spark, 'Deep' surfaces depth + trust).
 */
const CATEGORY_DELTAS: Record<string, Partial<Pick<ChemistryProfile, 'spark' | 'depth' | 'play' | 'sync' | 'growth' | 'trust'>>> = {
  Style:       { play: 5, spark: 3 },
  Escape:      { growth: 5, depth: 3, play: 2 },
  Preferences: { trust: 5, sync: 3 },
  Deep:        { depth: 8, trust: 5, growth: 3 },
  Intimate:    { spark: 5, trust: 5, depth: 3 },
  Desire:      { spark: 8, depth: 3, growth: 3 },
};

export function applyCategoryToChemistry(
  current: ChemistryProfile,
  category: string,
  optionsMatched: boolean = false,
): ChemistryProfile {
  const deltas = CATEGORY_DELTAS[category];
  if (!deltas) return current;
  const next = { ...current };
  if (deltas.spark)  next.spark  = CLAMP(next.spark  + deltas.spark);
  if (deltas.depth)  next.depth  = CLAMP(next.depth  + deltas.depth);
  if (deltas.play)   next.play   = CLAMP(next.play   + deltas.play);
  if (deltas.sync)   next.sync   = CLAMP(next.sync   + deltas.sync);
  if (deltas.growth) next.growth = CLAMP(next.growth + deltas.growth);
  if (deltas.trust)  next.trust  = CLAMP(next.trust  + deltas.trust);
  if (optionsMatched) next.sync = CLAMP(next.sync + SYNC_BONUS);
  return next;
}

export function applyAnswerToChemistry(
  current: ChemistryProfile,
  hostOption: QuestionOption,
  guestOption: QuestionOption,
): ChemistryProfile {
  const next = { ...current };

  for (const option of [hostOption, guestOption]) {
    const s = option.chemistry_signals;
    if (s.spark)  next.spark  = CLAMP(next.spark  + s.spark  * SIGNAL_WEIGHT);
    if (s.depth)  next.depth  = CLAMP(next.depth  + s.depth  * SIGNAL_WEIGHT);
    if (s.play)   next.play   = CLAMP(next.play   + s.play   * SIGNAL_WEIGHT);
    if (s.sync)   next.sync   = CLAMP(next.sync   + s.sync   * SIGNAL_WEIGHT);
    if (s.growth) next.growth = CLAMP(next.growth + s.growth * SIGNAL_WEIGHT);
    if (s.trust)  next.trust  = CLAMP(next.trust  + s.trust  * SIGNAL_WEIGHT);
  }

  // Sync bonus: both picked the same option
  if (hostOption.id === guestOption.id) {
    next.sync = CLAMP(next.sync + SYNC_BONUS);
  }

  return next;
}

export function compoundChemistryScore(c: ChemistryProfile): number {
  return Math.round((c.spark + c.depth + c.play + c.sync + c.growth + c.trust) / 6);
}

export function computeMetaMetrics(
  current: ChemistryProfile,
  history: number[],
): Pick<ChemistryProfile, 'trajectory' | 'surprise_factor' | 'balance' | 'unlock_rate'> {
  const trajectory = computeTrajectory(history);
  const surprise_factor = computeSurpriseFactor(history);
  const balance = computeBalance(current);
  const unlock_rate = computeUnlockRate(history);
  return { trajectory, surprise_factor, balance, unlock_rate };
}

function computeTrajectory(history: number[]): ChemistryTrajectory {
  if (history.length < 2) return 'ascending';
  const recent = history.slice(-3);
  const diffs = recent.slice(1).map((v, i) => v - recent[i]);
  const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  if (avgDiff > 2) return 'ascending';
  if (avgDiff < -2) return 'declining';
  const variance = diffs.reduce((a, d) => a + Math.abs(d), 0) / diffs.length;
  if (variance > 5) return 'oscillating';
  return 'plateauing';
}

function computeSurpriseFactor(history: number[]): number {
  if (history.length < 2) return 0.5;
  const diffs = history.slice(1).map((v, i) => Math.abs(v - history[i]));
  const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  return Math.min(1, avgDiff / 20);
}

function computeBalance(current: ChemistryProfile): number {
  const dims = [current.spark, current.depth, current.play, current.sync, current.growth, current.trust];
  const mean = dims.reduce((a, b) => a + b, 0) / dims.length;
  const variance = dims.reduce((a, d) => a + Math.pow(d - mean, 2), 0) / dims.length;
  // Lower variance = more balanced = closer to 0.5 from above
  return Math.max(0, Math.min(1, 1 - (Math.sqrt(variance) / 50)));
}

function computeUnlockRate(history: number[]): number {
  if (history.length < 2) return 0.5;
  // How quickly scores are climbing
  const totalGrowth = (history[history.length - 1] - history[0]);
  const rate = totalGrowth / (history.length * 10);
  return Math.max(0, Math.min(1, 0.5 + rate));
}

/**
 * Convert old 4-dimension VibeStats to new 6-dimension ChemistryProfile.
 * Used during migration from the old system.
 */
export function migrateVibeStatsToChemistry(vibes: VibeStats): ChemistryProfile {
  return {
    spark: vibes.flirty,
    depth: vibes.deep,
    play: vibes.playful,
    sync: 50,       // no prior data
    growth: 50,     // no prior data
    trust: vibes.comfortable,
    trajectory: 'ascending',
    surprise_factor: 0.5,
    balance: 0.5,
    unlock_rate: 0.5,
  };
}

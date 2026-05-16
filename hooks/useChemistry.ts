import { useCallback } from 'react';
import { useGameStore } from '../store/gameState';
import { applyAnswerToChemistry, compoundChemistryScore, computeMetaMetrics } from '../services/chemistryEngine';
import type { QuestionOption } from '../types/questions';
import type { ChemistryProfile } from '../types/chemistry';

export interface ChemistryState {
  chemistry: ChemistryProfile;
  compoundScore: number;
}

export interface ChemistryActions {
  /**
   * Process answer selections from both players and update chemistry.
   * Broadcasts the update to the peer.
   */
  processAnswers: (hostOption: QuestionOption, guestOption: QuestionOption) => ChemistryProfile;
  /**
   * Compute meta-metrics from chemistry history (trajectory, surprise, etc.)
   */
  updateMetaMetrics: (history: number[]) => void;
  /**
   * Get the current compound score (average of 6 dimensions).
   */
  getCompoundScore: () => number;
}

/**
 * useChemistry: Wires the chemistryEngine into the answer flow.
 *
 * When both players select an answer option with chemistry_signals,
 * this hook applies them to the chemistry profile, updates the store,
 * and broadcasts the change to the peer.
 */
export function useChemistry(
  broadcastChemistryUpdate: (chemistry: ChemistryProfile) => void
): { chemistryState: ChemistryState; chemistryActions: ChemistryActions } {
  const gameStore = useGameStore();

  const processAnswers = useCallback((hostOption: QuestionOption, guestOption: QuestionOption): ChemistryProfile => {
    const current = gameStore.chemistry;
    const updated = applyAnswerToChemistry(current, hostOption, guestOption);
    gameStore.setChemistry(updated);
    broadcastChemistryUpdate(updated);
    return updated;
  }, [gameStore, broadcastChemistryUpdate]);

  const updateMetaMetrics = useCallback((history: number[]) => {
    const current = gameStore.chemistry;
    const meta = computeMetaMetrics(current, history);
    const updated: ChemistryProfile = { ...current, ...meta };
    gameStore.setChemistry(updated);
    broadcastChemistryUpdate(updated);
  }, [gameStore, broadcastChemistryUpdate]);

  const getCompoundScore = useCallback((): number => {
    return compoundChemistryScore(gameStore.chemistry);
  }, [gameStore.chemistry]);

  return {
    chemistryState: {
      chemistry: gameStore.chemistry,
      compoundScore: compoundChemistryScore(gameStore.chemistry),
    },
    chemistryActions: {
      processAnswers,
      updateMetaMetrics,
      getCompoundScore,
    },
  };
}

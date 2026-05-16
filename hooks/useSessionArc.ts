import { useCallback, useRef } from 'react';
import { useGameStore } from '../store/gameState';
import type { SessionArc, ArcPhaseConfig } from '../types/sessionArc';
import type { ChemistryProfile } from '../types/chemistry';
import { compoundChemistryScore } from '../services/chemistryEngine';

export interface SessionArcState {
  currentPhase: ArcPhaseConfig | null;
  currentPhaseIndex: number;
  totalPhases: number;
  isLastPhase: boolean;
  phaseName: string;
}

export interface SessionArcActions {
  /** Check if the arc should advance based on current signals. Returns true if phase changed. */
  checkPhaseTransition: (questionCount: number, elapsedMs: number) => boolean;
  /** Force advance to the next phase. */
  advancePhase: () => void;
  /** Get the current arc state snapshot. */
  getArcState: () => SessionArcState;
}

/**
 * useSessionArc: Manages phase progression through the session arc.
 *
 * Phases advance based on three trigger types:
 * - time: elapsed seconds exceed threshold
 * - depth: max question depth this session exceeds threshold
 * - chemistry: compound chemistry score exceeds threshold
 *
 * The hook reads from gameStore.sessionArc and updates it via the store setter.
 * Phase changes should be broadcast to the peer via broadcastArcPhaseChange.
 */
export function useSessionArc(
  broadcastArcPhaseChange: (phase: number) => void
): { arcState: SessionArcState; arcActions: SessionArcActions } {
  const gameStore = useGameStore();
  const lastPhaseRef = useRef<number>(-1);

  const getArcState = useCallback((): SessionArcState => {
    const arc = gameStore.sessionArc;
    if (!arc || arc.phases.length === 0) {
      return {
        currentPhase: null,
        currentPhaseIndex: 0,
        totalPhases: 0,
        isLastPhase: true,
        phaseName: 'none',
      };
    }
    const idx = arc.current_phase;
    const phase = arc.phases[idx] ?? null;
    return {
      currentPhase: phase,
      currentPhaseIndex: idx,
      totalPhases: arc.phases.length,
      isLastPhase: idx >= arc.phases.length - 1,
      phaseName: phase?.name ?? 'none',
    };
  }, [gameStore.sessionArc]);

  const advancePhase = useCallback(() => {
    const arc = gameStore.sessionArc;
    if (!arc) return;
    const nextPhase = arc.current_phase + 1;
    if (nextPhase >= arc.phases.length) return; // Already at last phase

    const newArc: SessionArc = { ...arc, current_phase: nextPhase };
    gameStore.setSessionArc(newArc);
    broadcastArcPhaseChange(nextPhase);
    lastPhaseRef.current = nextPhase;
  }, [gameStore, broadcastArcPhaseChange]);

  const checkPhaseTransition = useCallback((questionCount: number, elapsedMs: number): boolean => {
    const arc = gameStore.sessionArc;
    const chemistry = gameStore.chemistry;
    if (!arc) return false;

    const currentIdx = arc.current_phase;
    const phase = arc.phases[currentIdx];
    if (!phase) return false;
    if (currentIdx >= arc.phases.length - 1) return false; // Last phase, no transition

    // Prevent double-advance in the same render cycle
    if (lastPhaseRef.current === currentIdx) return false;

    const trigger = phase.transition_trigger;
    let shouldTransition = false;

    switch (trigger.type) {
      case 'time':
        // threshold is in seconds
        shouldTransition = (elapsedMs / 1000) >= trigger.threshold;
        break;
      case 'depth':
        // Use questionCount as a proxy for depth reached this session
        // Each question roughly corresponds to depth progression
        shouldTransition = questionCount >= trigger.threshold;
        break;
      case 'chemistry':
        shouldTransition = compoundChemistryScore(chemistry) >= trigger.threshold;
        break;
    }

    if (shouldTransition) {
      lastPhaseRef.current = currentIdx;
      advancePhase();
      return true;
    }

    return false;
  }, [gameStore, advancePhase]);

  const arcState = getArcState();

  return {
    arcState,
    arcActions: {
      checkPhaseTransition,
      advancePhase,
      getArcState,
    },
  };
}

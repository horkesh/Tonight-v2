import { useState, useCallback, useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameState';
import { usePresenceStore } from '../store/presenceState';
import { p2p } from '../services/p2p';
import { getQuestionsForMode } from '../data/loadQuestionBank';
import { useChemistry } from './useChemistry';
import { useSessionArc } from './useSessionArc';
import { compoundChemistryScore } from '../services/chemistryEngine';
import { selectNextQuestion as scoredSelectNextQuestion } from '../services/questionSelector';
import type { BankQuestion } from '../types/questions';
import type { AppView } from '../types';

// --- Constants ---
const GAME_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const QUESTION_INTERVAL_MS = 17_000;      // ~17 seconds per question
const QUESTION_DISPLAY_DELAY_MS = 1_500;  // Brief pause between questions

export interface HighlightMoment {
  question: string;
  answer: string;
  userName: string;
}

export interface VibeCheckFlowState {
  /** The current question being displayed */
  currentQuestion: BankQuestion | null;
  /** Index of the current question in the session sequence */
  questionIndex: number;
  /** Total questions answered so far */
  questionsAnswered: number;
  /** Milliseconds remaining */
  timeRemainingMs: number;
  /** Whether the local player has answered the current question */
  hasAnswered: boolean;
  /** The option ID the local player selected */
  myAnswerId: string | null;
  /** The option ID the partner selected (null until they answer) */
  partnerAnswerId: string | null;
  /** Whether both players have answered the current question */
  bothAnswered: boolean;
  /** The game is actively running */
  isActive: boolean;
  /** Brief transition state between questions */
  isTransitioning: boolean;
  /** The best moment of the session (highest chemistry delta) */
  highlightMoment: HighlightMoment | null;
  /** Number of times both players picked the same answer */
  matchCount: number;
  /** Total elapsed time in milliseconds */
  elapsedMs: number;
}

export interface VibeCheckFlowActions {
  /** Start the vibe check game loop */
  startGame: () => void;
  /** Submit the local player's answer */
  submitAnswer: (optionId: string) => void;
}

/**
 * useVibeCheckFlow: Orchestrates the Vibe Check game loop.
 *
 * Sequences: question selection -> display -> both answer -> chemistry update -> next question
 * Timer-based: 5 minutes total, ~17 seconds per question
 * All questions come from the pre-loaded bank (zero API calls)
 */
export function useVibeCheckFlow(
  setView: (view: AppView, broadcast?: boolean) => void,
): { vcState: VibeCheckFlowState; vcActions: VibeCheckFlowActions } {
  const gameStore = useGameStore();
  const presence = usePresenceStore();

  // --- Hooks ---
  const broadcastChemistryUpdate = useCallback((chemistry: import('../types/chemistry').ChemistryProfile) => {
    gameStore.setChemistry(chemistry);
    p2p.send({ type: 'SYNC_CHEMISTRY_UPDATE', payload: chemistry });
  }, [gameStore]);

  const broadcastArcPhaseChange = useCallback((phase: number) => {
    const current = gameStore.sessionArc;
    if (current) {
      gameStore.setSessionArc({ ...current, current_phase: phase });
    }
    p2p.send({ type: 'SYNC_ARC_PHASE_CHANGE', payload: phase });
  }, [gameStore]);

  const { chemistryActions } = useChemistry(broadcastChemistryUpdate);
  const { arcActions } = useSessionArc(broadcastArcPhaseChange);

  // --- State ---
  const [isActive, setIsActive] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<BankQuestion | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [timeRemainingMs, setTimeRemainingMs] = useState(GAME_DURATION_MS);
  const [myAnswerId, setMyAnswerId] = useState<string | null>(null);
  const [partnerAnswerId, setPartnerAnswerId] = useState<string | null>(null);
  const [highlightMoment, setHighlightMoment] = useState<HighlightMoment | null>(null);
  const [matchCount, setMatchCount] = useState(0);

  // --- Refs ---
  const questionPoolRef = useRef<BankQuestion[]>([]);
  const usedQuestionIdsRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number>(0);
  const bestDeltaRef = useRef<number>(0);
  const chemistryHistoryRef = useRef<number[]>([]);
  const currentQuestionRef = useRef<BankQuestion | null>(null);

  // Keep ref in sync with state for use in P2P listener
  useEffect(() => {
    currentQuestionRef.current = currentQuestion;
  }, [currentQuestion]);

  // --- Question Selection (Sprint 2: scored selector) ---
  const selectNextQuestion = useCallback((): BankQuestion | null => {
    const pool = questionPoolRef.current;
    const used = usedQuestionIdsRef.current;

    // Filter: tap-only questions with options, not already used
    const tapPool = pool.filter(
      q => q.options !== null && q.response_type === 'tap' && !used.has(q.id)
    );

    if (tapPool.length === 0) return null;

    // Use scored selector when personality config and session arc are available
    const config = gameStore.personalityConfig;
    const arc = gameStore.sessionArc;

    if (config && arc) {
      const lastId = currentQuestionRef.current?.id ?? null;
      const selected = scoredSelectNextQuestion(tapPool, {
        config,
        arc,
        chemistry: gameStore.chemistry,
        askedThisSession: Array.from(used),
        askedWithPartner: [], // No cross-session memory in v1
        partnerSessionsCount: 0,
        maxDepthThisSession: Math.max(0, ...[...used].map(id => pool.find(q => q.id === id)?.depth ?? 0)),
        lastQuestionId: lastId,
      });

      if (selected) {
        used.add(selected.id);
        return selected;
      }
    }

    // Fallback: random selection
    const idx = Math.floor(Math.random() * tapPool.length);
    const selected = tapPool[idx];
    used.add(selected.id);
    return selected;
  }, [gameStore]);

  // --- Advance to next question ---
  const advanceQuestion = useCallback(() => {
    setIsTransitioning(true);
    setMyAnswerId(null);
    setPartnerAnswerId(null);

    setTimeout(() => {
      const next = selectNextQuestion();
      if (!next) {
        // No more questions, end game
        setIsActive(false);
        return;
      }

      setCurrentQuestion(next);
      gameStore.setCurrentBankQuestion(next);
      setQuestionIndex(prev => prev + 1);
      setIsTransitioning(false);

      // Broadcast the question to the peer so both see the same one
      // We reuse SYNC_QUESTION_STATE with a mapped Question object
      p2p.send({
        type: 'SYNC_QUESTION_STATE',
        payload: {
          question: {
            id: next.id,
            text: next.text,
            category: 'Style' as const,
            options: next.options?.map(o => o.text) ?? [],
            knowledgeTemplate: '',
            traitEffect: undefined,
          },
          ownerId: null,
        },
      });
    }, QUESTION_DISPLAY_DELAY_MS);
  }, [selectNextQuestion, gameStore]);

  // --- Process both answers ---
  const processBothAnswers = useCallback((myOptId: string, partnerOptId: string) => {
    const q = currentQuestionRef.current;
    if (!q || !q.options) return;

    const myOption = q.options.find(o => o.id === myOptId);
    const partnerOption = q.options.find(o => o.id === partnerOptId);
    if (!myOption || !partnerOption) return;

    // Capture chemistry before update
    const scoreBefore = compoundChemistryScore(gameStore.chemistry);

    // Update chemistry
    const isHost = p2p.isHost;
    const updated = isHost
      ? chemistryActions.processAnswers(myOption, partnerOption)
      : chemistryActions.processAnswers(partnerOption, myOption);

    const scoreAfter = compoundChemistryScore(updated);
    const delta = Math.abs(scoreAfter - scoreBefore);

    // Track sync matches (both picked same option)
    if (myOptId === partnerOptId) {
      setMatchCount(prev => prev + 1);
    }

    // Track chemistry history
    chemistryHistoryRef.current.push(scoreAfter);

    // Track highlight moment (biggest chemistry shift)
    if (delta > bestDeltaRef.current) {
      bestDeltaRef.current = delta;
      const selfUser = presence.users.find(u => u.isSelf);
      setHighlightMoment({
        question: q.text,
        answer: myOption.text,
        userName: selfUser?.name ?? 'You',
      });
    }

    setQuestionsAnswered(prev => prev + 1);

    // Check arc phase transition
    const elapsed = Date.now() - startTimeRef.current;
    arcActions.checkPhaseTransition(questionsAnswered + 1, elapsed);

    // Only the host schedules next question advancement
    if (p2p.isHost) {
      questionTimerRef.current = setTimeout(() => {
        advanceQuestion();
      }, QUESTION_INTERVAL_MS - QUESTION_DISPLAY_DELAY_MS);
    }
  }, [gameStore, chemistryActions, arcActions, advanceQuestion, presence.users, questionsAnswered]);

  // --- P2P Listener for partner answers and question sync (guest side) ---
  useEffect(() => {
    const cleanup = p2p.onData((data: import('../types').NetworkMessage) => {
      if (data.type === 'SYNC_VIBE_CHECK_ANSWER') {
        const { optionId, questionId } = data.payload;
        const q = currentQuestionRef.current;
        if (!q || q.id !== questionId) return;

        setPartnerAnswerId(optionId);
      }

      // Guest receives question from host — look up the full BankQuestion by ID
      if (data.type === 'SYNC_QUESTION_STATE' && !p2p.isHost && data.payload.question) {
        const qId = data.payload.question.id;
        const pool = questionPoolRef.current.length > 0
          ? questionPoolRef.current
          : getQuestionsForMode('vibe_check');

        if (questionPoolRef.current.length === 0) {
          questionPoolRef.current = pool;
        }

        const bankQ = pool.find(q => q.id === qId);
        if (bankQ) {
          setCurrentQuestion(bankQ);
          currentQuestionRef.current = bankQ;
          gameStore.setCurrentBankQuestion(bankQ);
          setQuestionIndex(prev => prev + 1);
          setMyAnswerId(null);
          setPartnerAnswerId(null);
          setIsTransitioning(false);
        }
      }
    });

    return cleanup;
  }, [gameStore]);

  // --- Effect: process when both have answered ---
  useEffect(() => {
    if (myAnswerId && partnerAnswerId && currentQuestion) {
      processBothAnswers(myAnswerId, partnerAnswerId);
    }
  }, [myAnswerId, partnerAnswerId, currentQuestion, processBothAnswers]);

  // --- Timer countdown ---
  useEffect(() => {
    if (!isActive) return;

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, GAME_DURATION_MS - elapsed);
      setTimeRemainingMs(remaining);

      if (remaining <= 0) {
        // Time's up — end the game
        setIsActive(false);
        if (timerRef.current) clearInterval(timerRef.current);
        if (questionTimerRef.current) clearTimeout(questionTimerRef.current);

        // Update meta metrics
        chemistryActions.updateMetaMetrics(chemistryHistoryRef.current);

        // Transition to wrap view
        setView('vibeCheckFlash');
      }
    }, 250);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, setView, chemistryActions]);

  // --- Start Game ---
  const startGame = useCallback(() => {
    // Load question pool (both host and guest need this for lookups)
    questionPoolRef.current = getQuestionsForMode('vibe_check');
    usedQuestionIdsRef.current = new Set();
    chemistryHistoryRef.current = [];
    bestDeltaRef.current = 0;

    // Reset state
    setQuestionsAnswered(0);
    setQuestionIndex(0);
    setMyAnswerId(null);
    setPartnerAnswerId(null);
    setHighlightMoment(null);
    setMatchCount(0);
    setTimeRemainingMs(GAME_DURATION_MS);

    // Record start time
    startTimeRef.current = Date.now();
    gameStore.setSessionStartedAt(startTimeRef.current);
    gameStore.setSessionStatus('active');

    // Only the host selects and broadcasts questions
    if (p2p.isHost) {
      const first = selectNextQuestion();
      if (first) {
        setCurrentQuestion(first);
        gameStore.setCurrentBankQuestion(first);
        setQuestionIndex(1);

        // Broadcast first question to guest
        p2p.send({
          type: 'SYNC_QUESTION_STATE',
          payload: {
            question: {
              id: first.id,
              text: first.text,
              category: 'Style' as const,
              options: first.options?.map(o => o.text) ?? [],
              knowledgeTemplate: '',
              traitEffect: undefined,
            },
            ownerId: null,
          },
        });
      }
    }
    // Guest will receive the first question via SYNC_QUESTION_STATE listener

    setIsActive(true);
  }, [selectNextQuestion, gameStore]);

  // --- Submit Answer ---
  const submitAnswer = useCallback((optionId: string) => {
    if (myAnswerId) return; // Already answered
    const q = currentQuestionRef.current;
    if (!q) return;

    setMyAnswerId(optionId);

    // Broadcast to peer
    const self = presence.users.find(u => u.isSelf);
    p2p.send({
      type: 'SYNC_VIBE_CHECK_ANSWER',
      payload: {
        userId: self?.id ?? '',
        optionId,
        questionId: q.id,
      },
    });
  }, [myAnswerId, presence.users]);

  // --- Cleanup on unmount ---
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (questionTimerRef.current) clearTimeout(questionTimerRef.current);
    };
  }, []);

  return {
    vcState: {
      currentQuestion,
      questionIndex,
      questionsAnswered,
      timeRemainingMs,
      hasAnswered: myAnswerId !== null,
      myAnswerId,
      partnerAnswerId,
      bothAnswered: myAnswerId !== null && partnerAnswerId !== null,
      isActive,
      isTransitioning,
      highlightMoment,
      matchCount,
      elapsedMs: GAME_DURATION_MS - timeRemainingMs,
    },
    vcActions: {
      startGame,
      submitAnswer,
    },
  };
}

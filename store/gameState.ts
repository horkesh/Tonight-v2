import { create } from 'zustand';
import { Scene, Question, VibeStats, DateContext, ConversationEntry } from '../types';
import { INITIAL_VIBE } from '../constants';

interface GameState {
  round: number;
  currentScene: Scene | null;
  sceneChoices: Record<string, string>;
  activeQuestion: Question | null;
  questionOwnerId: string | null;
  vibe: VibeStats;
  dateContext: DateContext | null;
  conversationLog: ConversationEntry[];
  sipLevel: number;
  myRating: number | null;
  partnerRating: number | null;

  setRound: (round: number | ((prev: number) => number)) => void;
  setCurrentScene: (scene: Scene | null) => void;
  setSceneChoices: (choices: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void;
  setActiveQuestion: (question: Question | null) => void;
  setQuestionOwnerId: (id: string | null) => void;
  setVibe: (vibe: VibeStats | ((prev: VibeStats) => VibeStats)) => void;
  setDateContext: (context: DateContext | null | ((prev: DateContext | null) => DateContext | null)) => void;
  setConversationLog: (log: ConversationEntry[] | ((prev: ConversationEntry[]) => ConversationEntry[])) => void;
  setSipLevel: (level: number | ((prev: number) => number)) => void;
  setMyRating: (rating: number | null) => void;
  setPartnerRating: (rating: number | null) => void;
}

export const useGameStore = create<GameState>((set) => ({
  round: 0,
  currentScene: null,
  sceneChoices: {},
  activeQuestion: null,
  questionOwnerId: null,
  vibe: INITIAL_VIBE,
  dateContext: null,
  conversationLog: [],
  sipLevel: 0,
  myRating: null,
  partnerRating: null,

  setRound: (round) => set((state) => ({ round: typeof round === 'function' ? round(state.round) : round })),
  setCurrentScene: (scene) => set({ currentScene: scene }),
  setSceneChoices: (choices) => set((state) => ({ sceneChoices: typeof choices === 'function' ? choices(state.sceneChoices) : choices })),
  setActiveQuestion: (question) => set({ activeQuestion: question }),
  setQuestionOwnerId: (id) => set({ questionOwnerId: id }),
  setVibe: (vibe) => set((state) => ({ vibe: typeof vibe === 'function' ? vibe(state.vibe) : vibe })),
  setDateContext: (context) => set((state) => ({ dateContext: typeof context === 'function' ? context(state.dateContext) : context })),
  setConversationLog: (log) => set((state) => ({ conversationLog: typeof log === 'function' ? log(state.conversationLog) : log })),
  setSipLevel: (level) => set((state) => ({ sipLevel: typeof level === 'function' ? level(state.sipLevel) : level })),
  setMyRating: (rating) => set({ myRating: rating }),
  setPartnerRating: (rating) => set({ partnerRating: rating }),
}));

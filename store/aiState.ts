import { create } from 'zustand';
import { Question, Scene, PlaylistData, LetterData } from '../types';

interface QuestionState {
  selectedCategory: Question['category'] | null;
  availableQuestions: Question[];
  askedQuestionIds: string[];
  isGeneratingQuestions: boolean;

  setSelectedCategory: (category: Question['category'] | null) => void;
  setAvailableQuestions: (questions: Question[]) => void;
  setAskedQuestionIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  setIsGeneratingQuestions: (isGenerating: boolean) => void;
}

export const useQuestionStore = create<QuestionState>((set) => ({
  selectedCategory: null,
  availableQuestions: [],
  askedQuestionIds: [],
  isGeneratingQuestions: false,

  setSelectedCategory: (category) => set({ selectedCategory: category }),
  setAvailableQuestions: (questions) => set({ availableQuestions: questions }),
  setAskedQuestionIds: (ids) => set((state) => ({ askedQuestionIds: typeof ids === 'function' ? ids(state.askedQuestionIds) : ids })),
  setIsGeneratingQuestions: (isGenerating) => set({ isGeneratingQuestions: isGenerating }),
}));

interface AiState {
  isGenerating: boolean;
  currentScene: Scene | null;
  twoTruthsData: any | null;
  finishSentenceData: any | null;
  activityChoices: Record<string, number>;
  intelligenceReport: any | null;
  playlistData: PlaylistData | null;
  playlistChoices: Record<string, number[]>;
  letterData: LetterData | null;
  followUpText: string | null;

  setIsGenerating: (isGenerating: boolean) => void;
  setCurrentScene: (scene: Scene | null) => void;
  setTwoTruthsData: (data: any | null) => void;
  setFinishSentenceData: (data: any | null) => void;
  setActivityChoices: (choices: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => void;
  setIntelligenceReport: (report: any | null) => void;
  setPlaylistData: (data: PlaylistData | null) => void;
  setPlaylistChoices: (updater: Record<string, number[]> | ((prev: Record<string, number[]>) => Record<string, number[]>)) => void;
  setLetterData: (data: LetterData | null) => void;
  setFollowUpText: (text: string | null) => void;
}

export const useAiStore = create<AiState>((set) => ({
  isGenerating: false,
  currentScene: null,
  twoTruthsData: null,
  finishSentenceData: null,
  activityChoices: {},
  intelligenceReport: null,

  setIsGenerating: (isGenerating) => set({ isGenerating }),
  setCurrentScene: (scene) => set({ currentScene: scene }),
  setTwoTruthsData: (data) => set({ twoTruthsData: data }),
  setFinishSentenceData: (data) => set({ finishSentenceData: data }),
  setActivityChoices: (choices) => set((state) => ({ activityChoices: typeof choices === 'function' ? choices(state.activityChoices) : choices })),
  setIntelligenceReport: (report) => set({ intelligenceReport: report }),
  playlistData: null,
  setPlaylistData: (data) => set({ playlistData: data }),
  playlistChoices: {},
  setPlaylistChoices: (updater) => set((state) => ({
    playlistChoices: typeof updater === 'function' ? updater(state.playlistChoices) : updater,
  })),
  letterData: null,
  setLetterData: (data) => set({ letterData: data }),
  followUpText: null,
  setFollowUpText: (text) => set({ followUpText: text }),
}));

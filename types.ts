
export type AppView = 'setup' | 'onboarding' | 'hub' | 'activity' | 'question' | 'loading' | 'rating';

export interface User {
  id: string;
  name: string;
  avatar?: string | null;
  isSelf: boolean;
  status: 'online' | 'choosing' | 'waiting' | 'reacting' | 'camera';
}

export interface DateVibe {
  id: string;
  title: string;
  description: string;
  icon: string;
  promptModifier: string;
}

export interface DateLocation {
  id: string;
  title: string;
  description: string;
  icon: string;
  environmentPrompt: string;
}

export interface DateContext {
  location: DateLocation;
  vibe: DateVibe;
}

export interface Choice {
  id: string;
  text: string;
  symbol?: string; 
  vibeEffect: {
    playful?: number;
    flirty?: number;
    deep?: number;
    comfortable?: number;
  };
}

export interface Question {
  id: string;
  text: string;
  category: 'Style' | 'Escape' | 'Preferences' | 'Deep' | 'Intimate';
  options: string[];
  knowledgeTemplate: string;
  traitEffect?: string;
}

export interface Scene {
  id: string;
  type: 'intro' | 'conversation' | 'activity' | 'climax' | 'resolution' | 'question_round' | 'twist';
  narrative: string;
  choices: Choice[];
  round: number;
}

export interface VibeStats {
  playful: number;
  flirty: number;
  deep: number;
  comfortable: number;
}

export interface PersonaState {
  traits: string[];
  memories: string[]; 
  secrets: string[]; 
  imageUrl: string | null;
  lastGeneratedRound: number;
  isGenerating: boolean;
  revealProgress: number; 
  chemistry: number; 
  drunkFactor: number;
  appearance?: string;
  // Profile Fields
  sex?: string;
  age?: string;
  height?: string;
  isProfileComplete: boolean;
}

export interface IntelligenceReport {
  publicationName: string; // New field
  headline: string;
  lede: string;
  summary: string;
  vibeAnalysis: string;
  closingThought: string;
  partnerRating?: number; // My rating of them
  date: string;
  barTab: string[];
}

export interface SessionState {
  users: User[];
  currentScene: Scene | null;
  history: Scene[];
  vibe: VibeStats;
  round: number;
  sipLevel: number;
  sharedDraft: string;
  activeQuestion: Question | null;
  questionOwnerId: string | null;
  latestReaction: { content: string; timestamp: number } | null;
  incomingToastRequest: boolean;
  sceneChoices: Record<string, string>; // userId -> choiceId
  isDraftOpen: boolean;
  dateContext: DateContext | null;
  isSynced: boolean;
  isConnected: boolean;
  // Rating System
  myRating: number | null;
  partnerRating: number | null;
}

export interface TouchPoint {
  x: number;
  y: number;
  id: number;
  timestamp: number;
}

export type NetworkMessageType = 
  | 'SYNC_VIBE' 
  | 'SYNC_SCENE' 
  | 'SYNC_USER' 
  | 'SYNC_PERSONA'
  | 'SYNC_ROUND'
  | 'SYNC_VIEW'
  | 'SYNC_QUESTION_STATE'
  | 'TRIGGER_FLASH'
  | 'TRIGGER_CLINK'
  | 'TRIGGER_REACTION'
  | 'SYNC_TOAST_INVITE'
  | 'SYNC_SCENE_CHOICE'
  | 'SYNC_DRAFT_STROKE'
  | 'SYNC_DRAFT_STATE'
  | 'SYNC_DATE_CONTEXT'
  | 'SYNC_RATING' // New
  | 'SYNC_FULL_STATE';

export interface NetworkMessage {
  type: NetworkMessageType;
  payload: any;
  timestamp: number;
}

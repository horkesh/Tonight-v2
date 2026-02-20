
export type AppView = 'setup' | 'onboarding' | 'hub' | 'activity' | 'question' | 'loading' | 'rating' | 'twoTruths' | 'finishSentence';

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
  image: string; // New field for background visual
}

export interface DateContext {
  location: DateLocation;
  vibe: DateVibe;
  generatedImage?: string;
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

export interface ConversationEntry {
  round: number;
  category: string;
  questionText: string;
  answer: string;
  answeredBy: 'user' | 'partner';
  askedBy: 'user' | 'partner';
}

export interface Question {
  id: string;
  text: string;
  category: 'Style' | 'Escape' | 'Preferences' | 'Deep' | 'Intimate' | 'Desire';
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
  appearance?: string;  // AI visual description from photo (used for avatar generation)
  background?: string;  // User-written career/interests (used for question personalization)
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
  flashMessage: string | null; // Centralized Flash Message
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

export type NetworkMessage = 
  | { type: 'SYNC_VIBE'; payload: VibeStats }
  | { type: 'SYNC_SCENE'; payload: Scene | null }
  | { type: 'SYNC_USER'; payload: User[] }
  | { type: 'SYNC_PERSONA'; payload: { type: 'user' | 'partner'; data: Partial<PersonaState> } }
  | { type: 'SYNC_ROUND'; payload: number }
  | { type: 'SYNC_VIEW'; payload: AppView }
  | { type: 'SYNC_QUESTION_STATE'; payload: { question: Question | null; ownerId: string | null } }
  | { type: 'TRIGGER_FLASH'; payload: string }
  | { type: 'TRIGGER_CLINK'; payload: null }
  | { type: 'TRIGGER_REACTION'; payload: string }
  | { type: 'SYNC_TOAST_INVITE'; payload: null }
  | { type: 'SYNC_SCENE_CHOICE'; payload: { userId: string; choiceId: string } }
  | { type: 'SYNC_DRAFT_STROKE'; payload: any } // Keep any for now if structure is complex
  | { type: 'SYNC_DRAFT_STATE'; payload: boolean }
  | { type: 'SYNC_DATE_CONTEXT'; payload: Partial<DateContext> | null }
  | { type: 'SYNC_RATING'; payload: number }
  | { type: 'SYNC_FULL_STATE'; payload: any } // Complex payload, maybe define later
  | { type: 'SYNC_FINISHED'; payload: boolean }
  | { type: 'SYNC_HELLO'; payload: { id: string; name: string; avatar: string } }
  | { type: 'SYNC_TOUCH'; payload: TouchPoint }
  | { type: 'SYNC_SIP'; payload: number }
  | { type: 'SYNC_CONVERSATION_LOG'; payload: ConversationEntry[] }
  | { type: 'SYNC_ACTIVITY_DATA'; payload: { type: string; data: any } }
  | { type: 'SYNC_ACTIVITY_CHOICE'; payload: { userId: string; choice: number } }
  | { type: 'PING'; payload?: never }
  | { type: 'PONG'; payload?: never };

export type NetworkMessageType = NetworkMessage['type'];

// --- Activity: Two Truths & A Lie ---
export interface TwoTruthsData {
  statements: { text: string; isLie: boolean }[];
  subjectId: string;  // Who the statements are about (userId)
  subjectName: string;
}

// --- Activity: Finish My Sentence ---
export interface FinishSentenceData {
  sentence: string;          // Incomplete sentence about the subject
  options: string[];          // 3 AI-generated completions
  subjectId: string; // Who the sentence is about (userId)
  subjectName: string;
}

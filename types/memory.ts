import type { ChemistryProfile } from './chemistry';

export interface MemorableAnswer {
  session_id: string;
  question_text: string;
  answer_text: string;
  user_name: string;
  chemistry_spike: number;
}

export interface SharedMoment {
  session_id: string;
  type: 'activity_completed' | 'sync_answer' | 'depth_breakthrough' | 'highlight';
  description: string;
  timestamp: string;
}

export interface Prediction {
  session_id: string;
  text: string;
  resolved: boolean;
  outcome: string | null;
}

export interface PartnerMemory {
  partner_id: string;
  sessions_count: number;
  first_session_date: string;

  // Evolving profile
  discovered_traits: string[];
  values_signals: string[];
  humor_style: string | null;
  vulnerability_comfort: number;

  // Highlights
  memorable_answers: MemorableAnswer[];
  shared_moments: SharedMoment[];
  predictions: Prediction[];

  // Patterns
  chemistry_trajectory: number[];
  depth_trajectory: number[];
  favorite_question_tags: string[];
  avoided_topics: string[];
}

export interface SessionMemory {
  session_id: string;
  mode: string;
  duration_seconds: number;
  questions_asked: { question_id: string; text: string }[];
  chemistry_at_end: ChemistryProfile;
  activities_completed: string[];
  highlight_moment: SharedMoment | null;
  wrap_type: string;
}

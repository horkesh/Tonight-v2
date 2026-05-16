import type { WrapType } from './personality';
import type { ChemistryProfile } from './chemistry';

export interface WrapDataBase {
  wrap_type: WrapType;
  generated_at: string;
  ai_quote: string;
  highlight_moment: {
    question: string;
    answer: string;
    user_name: string;
  } | null;
}

export interface VibeCheckFlashData extends WrapDataBase {
  wrap_type: 'flash';
  verdict_phrase: string;
  compatibility_visual: string;
}

export interface FirstImpressionsData extends WrapDataBase {
  wrap_type: 'first_impressions';
  ai_observations: string[];
  surprise_element: string;
  prediction: string;
  chemistry_radar: ChemistryProfile;
}

export interface IntelligenceBriefingData extends WrapDataBase {
  wrap_type: 'briefing';
  publication_name: string;
  headline: string;
  lede: string;
  summary: string;
  vibe_analysis: string;
  closing_thought: string;
  bar_tab: string[];
  chemistry_evolution: ChemistryProfile[];
  next_session_teaser: string;
}

export interface DistanceReportData extends WrapDataBase {
  wrap_type: 'distance';
  intimacy_score: number;
  distance_miles: number | null;
  closest_moment: { question: string; answers: [string, string] };
  carry_forward_prompt: string;
  connection_timeline: number[];
  next_session_countdown: string | null;
}

export interface RelationshipReconnaissanceData extends WrapDataBase {
  wrap_type: 'reconnaissance';
  forgotten_detail: string;
  evolution_note: string;
  still_burns: string;
  weekly_challenge: string;
  trend_line: number[];
  early_vs_now: { early_quote: string; now_quote: string } | null;
}

export type WrapData =
  | VibeCheckFlashData
  | FirstImpressionsData
  | IntelligenceBriefingData
  | DistanceReportData
  | RelationshipReconnaissanceData;

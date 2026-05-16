export type ModeId = 'vibe_check' | 'first_date' | 'date_night' | 'ldr' | 'reignite';
export type WrapType = 'flash' | 'first_impressions' | 'briefing' | 'distance' | 'reconnaissance';
export type ArchetypeId = 'spark_reader' | 'curious_stranger' | 'instigator' | 'bridge_builder' | 'provocateur';

export type SessionStatus =
  | 'mode_select'
  | 'setup'
  | 'connecting'
  | 'active'
  | 'wrapping'
  | 'complete'
  | 'abandoned';

export interface PersonalityConfig {
  mode: ModeId;
  archetype: ArchetypeId;
  tone_keywords: string[];
  max_question_words: number;
  max_option_words: number;
  follow_up_probability: number;
  vulnerability_ceiling: number;
  pacing_ms: number;
  activities_allowed: string[];
  question_pool_tags: string[];
  wrap_type: WrapType;
  memory_depth: number;
  session_duration_range: [number, number];
  text_input_ratio: number;
  voice_input_enabled: boolean;
}

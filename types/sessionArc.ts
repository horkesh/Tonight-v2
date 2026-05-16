export interface ArcPhaseConfig {
  name: string;
  target_depth: number;       // 0-5
  duration_pct: number;       // 0.0-1.0
  allowed_tags: string[];
  transition_trigger: {
    type: 'time' | 'depth' | 'chemistry';
    threshold: number;
  };
}

export interface SessionArc {
  phases: ArcPhaseConfig[];
  current_phase: number;      // index into phases[]
}

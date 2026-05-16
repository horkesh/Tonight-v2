export interface QuestionOption {
  id: string;
  text: string;
  symbol?: string;
  chemistry_signals: {
    spark?: number;   // -2 to +2
    depth?: number;
    play?: number;
    sync?: number;
    growth?: number;
    trust?: number;
  };
}

export interface BankQuestion {
  id: string;
  text: string;
  options: QuestionOption[] | null; // null = open-ended
  depth: number;                    // 0-5
  tags: string[];
  requires_sessions: number;
  requires_depth_reached: number;
  mode_eligible: string[];
  follow_up_of: string | null;
  never_after: string[];
  once_per_partner: boolean;
  response_type: 'tap' | 'text' | 'voice';
}

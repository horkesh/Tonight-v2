export type ChemistryTrajectory = 'ascending' | 'plateauing' | 'oscillating' | 'declining';

export interface ChemistryProfile {
  // Core dimensions (0-100)
  spark: number;
  depth: number;
  play: number;
  sync: number;
  growth: number;
  trust: number;

  // Meta-metrics (computed across sessions)
  trajectory: ChemistryTrajectory;
  surprise_factor: number;  // 0-1
  balance: number;          // 0-1, 0.5 = perfectly balanced
  unlock_rate: number;      // 0-1
}

export const INITIAL_CHEMISTRY: ChemistryProfile = {
  spark: 50,
  depth: 50,
  play: 50,
  sync: 50,
  growth: 50,
  trust: 50,
  trajectory: 'ascending',
  surprise_factor: 0.5,
  balance: 0.5,
  unlock_rate: 0.5,
};

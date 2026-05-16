import type { ModeId } from '../types/personality';

export interface ModeTheme {
  '--tonight-primary': string;
  '--tonight-primary-glow': string;
  '--tonight-bg-start': string;
  '--tonight-bg-end': string;
  '--tonight-surface': string;
  '--tonight-text': string;
  '--tonight-accent': string;
  '--tonight-card-bg': string;
}

export const MODE_THEMES: Record<ModeId, ModeTheme> = {
  vibe_check: {
    '--tonight-primary': '#00f5d4',
    '--tonight-primary-glow': 'rgba(0, 245, 212, 0.3)',
    '--tonight-bg-start': '#0a0a0a',
    '--tonight-bg-end': '#1a0a2e',
    '--tonight-surface': 'rgba(0, 245, 212, 0.08)',
    '--tonight-text': '#f0f0f0',
    '--tonight-accent': '#ff006e',
    '--tonight-card-bg': 'rgba(0, 245, 212, 0.05)',
  },

  first_date: {
    '--tonight-primary': '#f4a261',
    '--tonight-primary-glow': 'rgba(244, 162, 97, 0.3)',
    '--tonight-bg-start': '#1a0f0a',
    '--tonight-bg-end': '#0f0a1a',
    '--tonight-surface': 'rgba(244, 162, 97, 0.08)',
    '--tonight-text': '#fef3e2',
    '--tonight-accent': '#e76f51',
    '--tonight-card-bg': 'rgba(244, 162, 97, 0.05)',
  },

  date_night: {
    '--tonight-primary': '#e11d48',
    '--tonight-primary-glow': 'rgba(225, 29, 72, 0.3)',
    '--tonight-bg-start': '#020617',
    '--tonight-bg-end': '#1a0a1e',
    '--tonight-surface': 'rgba(225, 29, 72, 0.08)',
    '--tonight-text': '#f8fafc',
    '--tonight-accent': '#fbbf24',
    '--tonight-card-bg': 'rgba(225, 29, 72, 0.05)',
  },

  ldr: {
    '--tonight-primary': '#60a5fa',
    '--tonight-primary-glow': 'rgba(96, 165, 250, 0.3)',
    '--tonight-bg-start': '#0a0a1a',
    '--tonight-bg-end': '#1a0f0a',
    '--tonight-surface': 'rgba(96, 165, 250, 0.08)',
    '--tonight-text': '#e2e8f0',
    '--tonight-accent': '#f4a261',
    '--tonight-card-bg': 'rgba(96, 165, 250, 0.05)',
  },

  reignite: {
    '--tonight-primary': '#991b1b',
    '--tonight-primary-glow': 'rgba(153, 27, 27, 0.3)',
    '--tonight-bg-start': '#0a0505',
    '--tonight-bg-end': '#1a0f0a',
    '--tonight-surface': 'rgba(153, 27, 27, 0.08)',
    '--tonight-text': '#fef2f2',
    '--tonight-accent': '#fbbf24',
    '--tonight-card-bg': 'rgba(153, 27, 27, 0.05)',
  },
};

export function applyModeTheme(mode: ModeId): void {
  const theme = MODE_THEMES[mode];
  const root = document.documentElement;
  for (const [key, value] of Object.entries(theme)) {
    root.style.setProperty(key, value);
  }
}

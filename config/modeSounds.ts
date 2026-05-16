import type { ModeId } from '../types/personality';

export interface ModeSoundConfig {
  ambient: string;
  question_in: string;
  answer_tap: string;
  phase_shift: string;
  wrap_reveal: string;
}

export const MODE_SOUNDS: Record<ModeId, ModeSoundConfig> = {
  vibe_check: {
    ambient: '/sounds/vibe-check-ambient.mp3',
    question_in: '/sounds/vc-question-in.mp3',
    answer_tap: '/sounds/vc-tap.mp3',
    phase_shift: '/sounds/vc-shift.mp3',
    wrap_reveal: '/sounds/vc-reveal.mp3',
  },
  first_date: {
    ambient: '/sounds/first-date-ambient.mp3',
    question_in: '/sounds/fd-question-in.mp3',
    answer_tap: '/sounds/fd-tap.mp3',
    phase_shift: '/sounds/fd-shift.mp3',
    wrap_reveal: '/sounds/fd-reveal.mp3',
  },
  date_night: {
    ambient: '/sounds/date-night-ambient.mp3',
    question_in: '/sounds/dn-question-in.mp3',
    answer_tap: '/sounds/dn-tap.mp3',
    phase_shift: '/sounds/dn-shift.mp3',
    wrap_reveal: '/sounds/dn-reveal.mp3',
  },
  ldr: {
    ambient: '/sounds/ldr-ambient.mp3',
    question_in: '/sounds/ldr-question-in.mp3',
    answer_tap: '/sounds/ldr-tap.mp3',
    phase_shift: '/sounds/ldr-shift.mp3',
    wrap_reveal: '/sounds/ldr-reveal.mp3',
  },
  reignite: {
    ambient: '/sounds/reignite-ambient.mp3',
    question_in: '/sounds/ri-question-in.mp3',
    answer_tap: '/sounds/ri-tap.mp3',
    phase_shift: '/sounds/ri-shift.mp3',
    wrap_reveal: '/sounds/ri-reveal.mp3',
  },
};

import type { SessionArc } from '../types/sessionArc';
import type { ModeId } from '../types/personality';

export const SESSION_ARCS: Record<ModeId, SessionArc> = {
  vibe_check: {
    current_phase: 0,
    phases: [
      {
        name: 'flash',
        target_depth: 1,
        duration_pct: 1.0,
        allowed_tags: ['humor', 'attraction', 'preferences', 'energy'],
        transition_trigger: { type: 'time', threshold: 600 },
      },
    ],
  },

  first_date: {
    current_phase: 0,
    phases: [
      {
        name: 'opening',
        target_depth: 1,
        duration_pct: 0.25,
        allowed_tags: ['humor', 'preferences', 'personality'],
        transition_trigger: { type: 'time', threshold: 300 },
      },
      {
        name: 'rising',
        target_depth: 2,
        duration_pct: 0.4,
        allowed_tags: ['values', 'dreams', 'future'],
        transition_trigger: { type: 'depth', threshold: 2 },
      },
      {
        name: 'peak',
        target_depth: 3,
        duration_pct: 0.15,
        allowed_tags: ['values', 'vulnerability', 'dreams'],
        transition_trigger: { type: 'depth', threshold: 3 },
      },
      {
        name: 'cooldown',
        target_depth: 1,
        duration_pct: 0.2,
        allowed_tags: ['reflection', 'humor', 'future'],
        transition_trigger: { type: 'time', threshold: 1800 },
      },
    ],
  },

  date_night: {
    current_phase: 0,
    phases: [
      {
        name: 'opening',
        target_depth: 1,
        duration_pct: 0.12,
        allowed_tags: ['temperature', 'reconnect'],
        transition_trigger: { type: 'time', threshold: 150 },
      },
      {
        name: 'play',
        target_depth: 2,
        duration_pct: 0.25,
        allowed_tags: ['humor', 'attraction', 'activity'],
        transition_trigger: { type: 'time', threshold: 600 },
      },
      {
        name: 'deep',
        target_depth: 4,
        duration_pct: 0.35,
        allowed_tags: ['values', 'conflict', 'vulnerability', 'past', 'future'],
        transition_trigger: { type: 'depth', threshold: 4 },
      },
      {
        name: 'peak',
        target_depth: 5,
        duration_pct: 0.12,
        allowed_tags: ['vulnerability', 'intimacy'],
        transition_trigger: { type: 'chemistry', threshold: 75 },
      },
      {
        name: 'close',
        target_depth: 2,
        duration_pct: 0.16,
        allowed_tags: ['gratitude', 'reflection', 'future'],
        transition_trigger: { type: 'time', threshold: 2700 },
      },
    ],
  },

  ldr: {
    current_phase: 0,
    phases: [
      {
        name: 'arrival',
        target_depth: 1,
        duration_pct: 0.12,
        allowed_tags: ['presence', 'reconnect'],
        transition_trigger: { type: 'time', threshold: 150 },
      },
      {
        name: 'sharing',
        target_depth: 2,
        duration_pct: 0.25,
        allowed_tags: ['daily', 'humor', 'sensory'],
        transition_trigger: { type: 'time', threshold: 600 },
      },
      {
        name: 'deep',
        target_depth: 4,
        duration_pct: 0.38,
        allowed_tags: ['distance', 'longing', 'vulnerability', 'future'],
        transition_trigger: { type: 'depth', threshold: 4 },
      },
      {
        name: 'dream',
        target_depth: 3,
        duration_pct: 0.12,
        allowed_tags: ['imagination', 'future', 'sensory'],
        transition_trigger: { type: 'time', threshold: 1800 },
      },
      {
        name: 'close',
        target_depth: 2,
        duration_pct: 0.13,
        allowed_tags: ['commitment', 'carry_forward'],
        transition_trigger: { type: 'time', threshold: 2400 },
      },
    ],
  },

  reignite: {
    current_phase: 0,
    phases: [
      {
        name: 'disruption',
        target_depth: 2,
        duration_pct: 0.12,
        allowed_tags: ['surprise', 'challenge', 'spontaneity'],
        transition_trigger: { type: 'time', threshold: 150 },
      },
      {
        name: 'archaeology',
        target_depth: 3,
        duration_pct: 0.25,
        allowed_tags: ['past', 'memory', 'history', 'rediscovery'],
        transition_trigger: { type: 'depth', threshold: 3 },
      },
      {
        name: 'provocation',
        target_depth: 5,
        duration_pct: 0.25,
        allowed_tags: ['conflict', 'growth', 'vulnerability', 'challenge'],
        transition_trigger: { type: 'depth', threshold: 4 },
      },
      {
        name: 'discovery',
        target_depth: 4,
        duration_pct: 0.25,
        allowed_tags: ['growth', 'newness', 'surprise'],
        transition_trigger: { type: 'chemistry', threshold: 70 },
      },
      {
        name: 'renewal',
        target_depth: 2,
        duration_pct: 0.13,
        allowed_tags: ['commitment', 'future', 'action'],
        transition_trigger: { type: 'time', threshold: 2400 },
      },
    ],
  },
};

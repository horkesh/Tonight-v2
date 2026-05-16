import type { PersonalityConfig } from '../../types/personality';
import { useGameStore } from '../../store/gameState';
import { SYSTEM_INSTRUCTION } from '../../constants';

export function buildPersonalitySystemInstruction(config: PersonalityConfig): string {
  return `You are the AI host of Tonight, a live two-person connection experience.
Your archetype: ${config.archetype.replace(/_/g, ' ')}.
Tone constraints: ${config.tone_keywords.join(', ')}.
Hard limits:
- Maximum ${config.max_question_words} words per question.
- Maximum ${config.max_option_words} words per option.
- Follow-up probability: ${(config.follow_up_probability * 100).toFixed(0)}%.
- Vulnerability ceiling: ${(config.vulnerability_ceiling * 100).toFixed(0)}% -- NEVER exceed this depth level.
- Target pacing: ${(config.pacing_ms / 1000).toFixed(0)}s per question turn.
Rules (all modes):
- Never use emojis in generated text.
- Never say "I'm an AI" or break character.
- Never ask two questions in one turn.
- Never repeat a question from this session.
- Always produce valid JSON matching the response schema.
- Respect the vulnerability ceiling -- questions that exceed it are forbidden.`;
}

/**
 * Resolves the system instruction passed to Gemini calls. When the user has
 * selected a mode, the personality overlay is appended after the brand-voice
 * baseline so its tighter constraints (word limits, vulnerability ceiling,
 * archetype) anchor the model's output. Returns the baseline alone when no
 * mode is active.
 */
export function getSystemInstruction(): string {
  const config = useGameStore.getState().personalityConfig;
  if (!config) return SYSTEM_INSTRUCTION;
  return `${SYSTEM_INSTRUCTION}\n\n--- MODE OVERLAY (${config.mode}) ---\n${buildPersonalitySystemInstruction(config)}`;
}

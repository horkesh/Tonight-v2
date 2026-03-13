
import { VibeStats, ConversationEntry } from '../../types';
import type { PromptContext } from '../../types/profiles';
import { getDominantVibe } from '../../utils/helpers';
import { renderFullContextBlock } from './promptContext';

export function buildNarrativePrompt(
  round: number,
  vibe: VibeStats,
  chemistry: number,
  conversationLog: ConversationEntry[],
  promptContext: PromptContext | null
): string {
  const dominant = getDominantVibe(vibe);
  const dominantValue = vibe[dominant];

  let conversationBlock = '';
  if (conversationLog.length > 0) {
    const formatted = conversationLog.slice(-10).map(e =>
      `[R${e.round}, ${e.category}] "${e.questionText}" -> "${e.answer}"`
    ).join('\n');
    conversationBlock = `\nRECENT CONVERSATION:\n${formatted}`;
  }

  const arcPhase = round <= 2 ? 'Opening' : round <= 5 ? 'Building' : round <= 7 ? 'Deepening' : 'Climax';

  return `
You are the narrative director of "Tonight" — a premium two-person virtual date experience.

CURRENT STATE:
Round: ${round} | Phase: ${arcPhase}
Dominant Energy: ${dominant} (${dominantValue}%)
Chemistry: ${chemistry}%
Playful: ${vibe.playful}% | Flirty: ${vibe.flirty}% | Deep: ${vibe.deep}% | Comfortable: ${vibe.comfortable}%
${conversationBlock}

ARC RULES:
- Rounds 0–2 (Opening): Light categories (Style, Preferences), playful activities (Two Truths). Build rapport.
- Rounds 3–5 (Building): Escape, Deep categories. Two Truths, Finish My Sentence. ${chemistry > 40 ? 'Chemistry is building — lean into flirtier content.' : 'Still warming up — stay curious, not pushy.'}
- Rounds 6–7 (Deepening): Intimate, Desire categories. Finish My Sentence, Truth or Drink. The guard is down.
- Round 8+ (Climax): Time for the Morning Edition / rating wrap-up.

AVAILABLE ACTIONS:
- question: Ask a question (categories: Style, Escape, Preferences, Deep, Intimate, Desire)
- activity: Launch an activity (twoTruths, finishSentence, truth)

${round >= 8 ? 'IMPORTANT: Round 8+. Suggest wrapping up with the rating/report flow. Set suggestedAction to "activity" with suggestedActivity "morning_edition".' : ''}

${promptContext ? `\nDEEP PARTNER INTELLIGENCE:\n${renderFullContextBlock(promptContext)}\nUse this to personalize the suggestion and transition narrative.\n` : ''}

TASK: Suggest the single best next action for this moment in the date.

TRANSITION NARRATIVE: Write a 1-2 sentence cinematic transition that sets the mood for the next moment. Max 25 words. First person plural or atmospheric. Examples:
- "The ice has barely melted. Time to see what's underneath."
- "Something shifted in the last answer. Follow that thread."
- "The silence says more than the words did. Go deeper."

OUTPUT: JSON with suggestedAction ("question" or "activity"), suggestedCategory (if question — one of: Style, Escape, Preferences, Deep, Intimate, Desire), suggestedActivity (if activity — one of: twoTruths, finishSentence, truth), reasoning (1 sentence why), transitionNarrative (cinematic text).
`;
}

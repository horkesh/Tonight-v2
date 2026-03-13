import { DateContext, DateLocation, DateVibe, PersonaState, User, VibeStats, ConversationEntry } from '../../types';
import type { PromptContext } from '../../types/profiles';
import { renderFullContextBlock } from './promptContext';

export const buildScenePrompt = (
  vibe: VibeStats,
  round: number,
  partner: PersonaState,
  user: PersonaState,
  dateContext: DateContext | null,
  lastChoiceText: string,
  activityId?: string,
  promptContext?: PromptContext | null
): string => {
  const locationDesc = dateContext?.location
    ? `Location: ${dateContext.location.title} - ${dateContext.location.description}. Atmosphere: ${dateContext.location.environmentPrompt}`
    : "Location: A quiet, intimate, dimly lit space.";

  const vibeDesc = `Current Vibe: Playful: ${vibe.playful}%, Flirty: ${vibe.flirty}%, Deep: ${vibe.deep}%, Comfortable: ${vibe.comfortable}%.`;

  const partnerDesc = `Partner: ${partner.appearance || "A mysterious figure"}. Traits: ${partner.traits.join(", ")}.`;
  const userDesc = `User: ${user.appearance || "You"}. Traits: ${user.traits.join(", ")}.`;

  let basePrompt = `
    You are the narrator of an interactive, cinematic social game for two people on a date.
    Create a short, immersive scene (max 3 sentences) that advances their interaction.

    Context:
    ${locationDesc}
    ${vibeDesc}
    ${partnerDesc}
    ${userDesc}
    Round: ${round}
    Previous Action: ${lastChoiceText || "The date begins."}
  `;

  if (promptContext) {
    basePrompt += `\n\n${renderFullContextBlock(promptContext)}\n`;
  }

  if (activityId) {
    basePrompt += `
      The current activity is: ${activityId}.
      Integrate this activity naturally into the narrative.
    `;
  }

  basePrompt += `
    Provide 3 distinct choices for the User to react or respond.
    Each choice should have:
    - text: The action/dialogue (max 6 words).
    - vibeEffect: How it shifts the vibe stats (e.g., +10 flirty).

    Output JSON format:
    {
      "narrative": "string",
      "choices": [
        { "text": "string", "vibeEffect": { "playful": 0, "flirty": 0, "deep": 0, "comfortable": 0 } }
      ]
    }
  `;

  return basePrompt;
};

export const buildIntelligenceReportPrompt = (
  vibe: VibeStats,
  partner: PersonaState,
  rating: number,
  dateContext: DateContext | null,
  promptContext?: PromptContext | null
): string => {
  let contextBlock = '';
  if (promptContext) {
    const p = promptContext.profile;
    const extras: string[] = [];
    if (p.zodiac) extras.push(`Zodiac: ${p.zodiac.sign} (${p.zodiac.element})`);
    if (p.primaryLoveLanguage) extras.push(`Love Language: ${p.primaryLoveLanguage.replace(/_/g, ' ')}`);
    if (p.drink) extras.push(`Signature Drink: ${p.drink}`);
    if (p.job) extras.push(`Career: ${p.job}`);
    if (p.interests.length > 0) extras.push(`Interests: ${p.interests.slice(0, 5).join(', ')}`);
    if (extras.length > 0) {
      contextBlock = `\n    Deep Profile Intel: ${extras.join('. ')}.\n    Use these details to make the report personal and specific — reference zodiac compatibility, love language dynamics, and signature details.`;
    }
  }

  return `
    Generate a "Post-Date Intelligence Report" in the style of a high-end lifestyle magazine or a spy dossier.

    Subject: The Partner
    Date Context: ${dateContext?.location?.title || "Unknown Location"}
    Vibe Stats: Playful ${vibe.playful}, Flirty ${vibe.flirty}, Deep ${vibe.deep}, Comfortable ${vibe.comfortable}
    User Rating of Partner: ${rating}/5
    Partner Traits Observed: ${partner.traits.join(", ")}
    ${contextBlock}

    Output JSON:
    {
      "publicationName": "The nightly gazette" (or creative name),
      "headline": "Catchy headline about the date",
      "lede": "Opening sentence summarizing the chemistry",
      "summary": "3-4 sentence analysis of the connection",
      "vibeAnalysis": "Specific comment on the vibe stats",
      "closingThought": "Final verdict or advice",
      "barTab": ["List", "of", "3-4", "imaginary", "drinks/items", "ordered"]
    }
  `;
};

export const buildTwoTruthsPrompt = (
  subject: PersonaState,
  guesser: PersonaState,
  subjectName: string,
  vibe: VibeStats,
  history: ConversationEntry[],
  context: DateContext | null,
  promptContext?: PromptContext | null
): string => {
  let profileBlock = '';
  if (promptContext) {
    const p = promptContext.profile;
    const details: string[] = [];
    if (p.dreamDestination) details.push(`Dream destination: ${p.dreamDestination}`);
    if (p.definingMedia) details.push(`Defining book/movie/song: ${p.definingMedia}`);
    if (p.lovedPlace) details.push(`Loved place: ${p.lovedPlace}`);
    if (p.catchPhrase) details.push(`Catch phrase: "${p.catchPhrase}"`);
    if (p.drink) details.push(`Signature drink: ${p.drink}`);
    if (p.interests.length > 0) details.push(`Interests: ${p.interests.join(', ')}`);
    if (p.job) details.push(`Career: ${p.job}`);
    if (details.length > 0) {
      profileBlock = `\n    DEEP PROFILE (use these signature details to create more personal, specific truths and a cleverer lie):\n    ${details.join('. ')}.`;
    }
  }

  return `
    Generate a game of "Two Truths and a Lie" for ${subjectName}.

    Subject (${subjectName}): ${subject.appearance}, Traits: ${subject.traits.join(", ")}.
    Context: ${context?.location?.title || "A date"}.
    Vibe: ${JSON.stringify(vibe)}.
    Conversation History: ${history.map(h => h.questionText + " -> " + h.answer).join(" | ")}.
    ${profileBlock}

    Create 3 statements about ${subjectName} based on their persona/traits/history.
    Two must be plausible truths (consistent with persona).
    One must be a subtle lie (plausible but false).

    Output JSON:
    {
      "statements": [
        { "text": "Statement 1", "isLie": boolean },
        { "text": "Statement 2", "isLie": boolean },
        { "text": "Statement 3", "isLie": boolean }
      ]
    }
  `;
};

export const buildFinishSentencePrompt = (
  subject: PersonaState,
  guesser: PersonaState,
  subjectName: string,
  guesserName: string,
  vibe: VibeStats,
  history: ConversationEntry[],
  context: DateContext | null,
  promptContext?: PromptContext | null
): string => {
  let profileBlock = '';
  if (promptContext) {
    const p = promptContext.profile;
    const details: string[] = [];
    if (p.primaryLoveLanguage) details.push(`Love language: ${p.primaryLoveLanguage.replace(/_/g, ' ')}`);
    if (p.personalityTraits.length > 0) details.push(`Personality: ${p.personalityTraits.join(', ')}`);
    if (p.playStyle) details.push(`Play style: ${p.playStyle}`);
    if (p.interests.length > 0) details.push(`Interests: ${p.interests.slice(0, 5).join(', ')}`);
    if (details.length > 0) {
      profileBlock = `\n    DEEP PROFILE (shape the sentence style and options using these):\n    ${details.join('. ')}.`;
    }
  }

  return `
    Generate a "Finish My Sentence" game round.

    Subject: ${subjectName}. Guesser: ${guesserName}.
    Context: ${context?.location?.title}.
    Vibe: ${JSON.stringify(vibe)}.
    ${profileBlock}

    1. Create an incomplete sentence about ${subjectName}'s preferences, thoughts, or feelings in this moment.
    2. Provide 3 possible completions that ${subjectName} might say.
       - One should be very "in character" (High probability).
       - One should be plausible but slightly off.
       - One should be a wild card or funny option.

    Output JSON:
    {
      "sentence": "Incomplete sentence string...",
      "options": ["Option A", "Option B", "Option C"]
    }
  `;
};

export const buildAvatarPrompt = (traits: string[], context: string): string => {
  const traitList = traits.length > 0 ? traits.join(", ") : "mysterious, enigmatic";
  return `Abstract artistic portrait avatar. Subject: ${context}. Personality: ${traitList}. Style: Minimalist geometric forms, cinematic noir lighting, moody desaturated color palette, high-end digital art, dramatic shadows and highlights, sophisticated composition. No text or words.`;
};

export const buildLocationImagePrompt = (
  location: DateLocation,
  vibe: DateVibe,
  userAppearance: string,
  partnerAppearance: string
): string => {
  return `Cinematic scene at ${location.title} - ${location.description}. ${location.environmentPrompt}. Atmosphere: ${vibe.title} - ${vibe.description}. Two people: 1) ${userAppearance} 2) ${partnerAppearance}. Style: Cinematic, photorealistic, 8k, atmospheric lighting, first-person or over-the-shoulder perspective, intimate. No text or words.`;
};

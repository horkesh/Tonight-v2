import { DateContext, DateLocation, DateVibe, PersonaState, User, VibeStats, ConversationEntry } from '../../types';

export const buildScenePrompt = (
  vibe: VibeStats,
  round: number,
  partner: PersonaState,
  user: PersonaState,
  dateContext: DateContext | null,
  lastChoiceText: string,
  activityId?: string
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
  dateContext: DateContext | null
): string => {
  return `
    Generate a "Post-Date Intelligence Report" in the style of a high-end lifestyle magazine or a spy dossier.
    
    Subject: The Partner
    Date Context: ${dateContext?.location?.title || "Unknown Location"}
    Vibe Stats: Playful ${vibe.playful}, Flirty ${vibe.flirty}, Deep ${vibe.deep}, Comfortable ${vibe.comfortable}
    User Rating of Partner: ${rating}/5
    Partner Traits Observed: ${partner.traits.join(", ")}
    
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
  context: DateContext | null
): string => {
  return `
    Generate a game of "Two Truths and a Lie" for ${subjectName}.
    
    Subject (${subjectName}): ${subject.appearance}, Traits: ${subject.traits.join(", ")}.
    Context: ${context?.location?.title || "A date"}.
    Vibe: ${JSON.stringify(vibe)}.
    Conversation History: ${history.map(h => h.questionText + " -> " + h.answer).join(" | ")}.
    
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
  context: DateContext | null
): string => {
  return `
    Generate a "Finish My Sentence" game round.
    
    Subject: ${subjectName}. Guesser: ${guesserName}.
    Context: ${context?.location?.title}.
    Vibe: ${JSON.stringify(vibe)}.
    
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
  return `
    Create a prompt for an AI image generator to create an abstract, artistic avatar for a user.
    
    User Context: ${context}
    Traits: ${traits.join(", ")}
    Style: Minimalist, cinematic lighting, moody, high-end digital art.
    
    Output ONLY the raw prompt string.
  `;
};

export const buildLocationImagePrompt = (
  location: DateLocation,
  vibe: DateVibe,
  userAppearance: string,
  partnerAppearance: string
): string => {
  return `
    Create a prompt for an AI image generator.
    Scene: ${location.title} - ${location.description}.
    Atmosphere: ${location.environmentPrompt}.
    Vibe: ${vibe.title} - ${vibe.description}.
    Characters: Two people.
    1. ${userAppearance}
    2. ${partnerAppearance}
    
    Style: Cinematic, photorealistic, 8k, atmospheric lighting.
    View: First-person perspective or over-the-shoulder shot, intimate.
    
    Output ONLY the raw prompt string.
  `;
};

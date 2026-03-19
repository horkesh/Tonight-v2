
import { Scene, VibeStats, PersonaState, IntelligenceReport, Question, DateContext, DateLocation, DateVibe, ConversationEntry, TwoTruthsData, FinishSentenceData, NarrativeSuggestion, PlaylistData, LetterData } from "../types";
import type { PromptContext } from "../types/profiles";
import {
  SYSTEM_INSTRUCTION
} from "../constants";
import { buildNarrativePrompt } from "./prompts/narrativePrompts";
import { getDominantVibe } from "../utils/helpers";
import {
  buildScenePrompt,
  buildIntelligenceReportPrompt,
  buildAvatarPrompt,
  buildLocationImagePrompt
} from "./prompts/gamePrompts";
import { renderFullContextBlock } from "./prompts/promptContext";

// Schema type constants (replaces @google/genai Type enum — values are identical strings)
const T = {
  STRING: "STRING",
  NUMBER: "NUMBER",
  INTEGER: "INTEGER",
  BOOLEAN: "BOOLEAN",
  ARRAY: "ARRAY",
  OBJECT: "OBJECT",
} as const;

const MODEL_TEXT = "gemini-3.1-pro-preview";
const MODEL_COMPLEX = "gemini-3.1-pro-preview";
const MODEL_IMAGE_GEN = "gemini-2.5-flash-image";

// ── Proxy helpers ─────────────────────────────────────────────────────────────

const callProxy = async (endpoint: string, body: object): Promise<any> => {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const err: any = new Error(data.error || `API ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
};

const MAX_RETRY_DELAY = 30000;

const callWithRetry = async <T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    const isRateLimit =
        error?.status === 429 ||
        error?.response?.status === 429 ||
        error?.message?.includes('429') ||
        error?.message?.includes('RESOURCE_EXHAUSTED');

    if (retries > 0 && isRateLimit) {
      const cappedDelay = Math.min(delay, MAX_RETRY_DELAY);
      console.warn(`Gemini Rate Limit (429). Retrying in ${cappedDelay}ms... (Attempts left: ${retries})`);
      await new Promise(r => setTimeout(r, cappedDelay));
      return callWithRetry(fn, retries - 1, cappedDelay * 2);
    }
    throw error;
  }
};

export const cleanAndParseJSON = (text: string | undefined, fallback: any = {}) => {
  if (!text) return fallback;
  try {
    let cleaned = text.trim();
    // Handle code blocks
    cleaned = cleaned.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/, '');

    // Attempt to locate JSON structure if there is noise
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    const firstBracket = cleaned.indexOf('[');
    const lastBracket = cleaned.lastIndexOf(']');

    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
        if (lastBrace !== -1) cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    } else if (firstBracket !== -1) {
        if (lastBracket !== -1) cleaned = cleaned.substring(firstBracket, lastBracket + 1);
    }

    return JSON.parse(cleaned);
  } catch (e) {
    console.warn("JSON Parse Warning. Raw text:", text);
    return fallback;
  }
};

const getVibeInstruction = (vibe: VibeStats): string => {
  const dominantKey = getDominantVibe(vibe);
  const intensity = vibe[dominantKey];

  if (intensity < 30) return "The night is young. A cool, detached sophistication hangs in the air.";

  switch (dominantKey) {
    case 'flirty':
      return `High Sexual Tension (${intensity}%). Use teasing, double entendres. Focus on physical proximity, lips, eyes.`;
    case 'deep':
      return `Introspective and Raw (${intensity}%). Drop the facade. Discuss regrets, secrets, and fears.`;
    case 'playful':
      return `Witty Intellectual Sparring (${intensity}%). Fast-paced banter. Amused, challenging intellect.`;
    case 'comfortable':
      return `Warm and Intimate (${intensity}%). A shared quiet understanding. The guard is down.`;
    default:
      return "Modern Noir. Shadows and light. A game of cat and mouse.";
  }
};

const REPORT_SCHEMA = {
  type: T.OBJECT,
  properties: {
    publicationName: { type: T.STRING, description: "Creative newspaper name matching location/vibe." },
    headline: { type: T.STRING, description: "A punchy, noir newspaper headline. Max 5 words." },
    lede: { type: T.STRING, description: "A sharp, journalism-style opening sentence." },
    summary: { type: T.STRING, description: "A sophisticated overview of the night's events. Max 30 words." },
    vibeAnalysis: { type: T.STRING, description: "A marketing-style analysis of the connection's 'brand'." },
    closingThought: { type: T.STRING, description: "A final, cynical yet elegant thought." },
    date: { type: T.STRING },
    barTab: {
        type: T.ARRAY,
        items: { type: T.STRING },
        description: "A list of 3-5 'items' consumed."
    }
  },
  required: ["publicationName", "headline", "lede", "summary", "vibeAnalysis", "closingThought", "date", "barTab"],
};

// ── Image generation ──────────────────────────────────────────────────────────

const generateImageWithGemini = async (prompt: string, aspectRatio: "1:1" | "16:9" | "4:3"): Promise<string | null> => {
  try {
    const { imageData } = await callWithRetry(() => callProxy('/api/gemini/image', {
      model: MODEL_IMAGE_GEN,
      contents: prompt,
      config: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: { aspectRatio }
      }
    }));
    return imageData;
  } catch (error) {
    console.error("Gemini Image Gen Error:", error);
    return null;
  }
};

export const generateLocationImage = async (
  location: DateLocation,
  vibe: DateVibe,
  hostAppearance?: string,
  partnerAppearance?: string
): Promise<string> => {
  const userApp = hostAppearance || "A person";
  const partnerApp = partnerAppearance || "A person";

  const prompt = buildLocationImagePrompt(location, vibe, userApp, partnerApp);
  const img = await generateImageWithGemini(prompt, "16:9");
  return img || location.image;
};

export const generateDynamicQuestions = async (
    category: string,
    userPersona: PersonaState,
    partnerPersona: PersonaState,
    dateContext: DateContext | null = null,
    enrichedContext: {
      conversationLog: ConversationEntry[];
      round: number;
      vibe: VibeStats;
    } = { conversationLog: [], round: 0, vibe: { playful: 0, flirty: 0, deep: 0, comfortable: 0 } },
    promptContext?: PromptContext | null
): Promise<Question[]> => {

    const { conversationLog, round, vibe } = enrichedContext;

    // --- Partner's background (career, interests, hobbies) ---
    const partnerBackground = partnerPersona.background
      ? `Target's Background: ${partnerPersona.background}`
      : "Target's Background: Unknown — ask exploratory questions to learn about them.";

    // --- User's background (for asymmetric "I told you X" dynamics) ---
    const userBackground = userPersona.background
      ? `Asker's Background: ${userPersona.background}`
      : "";

    // --- Full conversation history (both sides, chronological) ---
    let conversationBlock = "";
    if (conversationLog.length > 0) {
      const formatted = conversationLog.slice(-15).map(e => {
        const asker = e.askedBy === 'user' ? 'Asker' : 'Target';
        const answerer = e.answeredBy === 'user' ? 'Asker' : 'Target';
        return `[Round ${e.round}, ${e.category}] ${asker} asked: "${e.questionText}" -> ${answerer}: "${e.answer}"`;
      }).join('\n');
      conversationBlock = `\nCONVERSATION SO FAR (chronological):\n${formatted}`;
    }

    // --- Secrets (vulnerability answers from Deep/Intimate/Desire) ---
    const partnerSecrets = partnerPersona.secrets.length > 0
      ? `\nTarget's Vulnerabilities (things they revealed in Deep/Intimate moments):\n${partnerPersona.secrets.map(s => `- ${s}`).join('\n')}`
      : "";
    const userSecrets = userPersona.secrets.length > 0
      ? `\nAsker's Vulnerabilities (things the Asker has revealed):\n${userPersona.secrets.map(s => `- ${s}`).join('\n')}`
      : "";

    // --- Discovered traits ---
    const partnerTraits = partnerPersona.traits.length > 0
      ? `Target's Discovered Traits: ${partnerPersona.traits.join(', ')}`
      : "";
    const userTraits = userPersona.traits.length > 0
      ? `Asker's Discovered Traits: ${userPersona.traits.join(', ')}`
      : "";

    // --- General memories ---
    const memoriesBlock = partnerPersona.memories.length > 0
      ? `Target's Known Facts: ${partnerPersona.memories.slice(-8).join('; ')}`
      : "";

    // --- Chemistry & escalation ---
    const chemistry = partnerPersona.chemistry;
    const dominantVibe = [getDominantVibe(vibe), vibe[getDominantVibe(vibe)]] as const;

    // --- Vibe-driven question style ---
    const vibeStyleMap: Record<string, string> = {
      'Electric Tension': 'Rapid, provocative, daring. Questions should crackle with urgency and sexual tension. Push boundaries.',
      'Midnight Noir': 'Mysterious, indirect, circling. Questions approach truth sideways — through metaphor, implication, and loaded silence.',
      'Deep & Intimate': 'Vulnerable, disarmingly honest. Questions strip away pretense and ask for raw emotional truth.',
      'Witty Sparring': 'Intellectual, challenging, playfully competitive. Questions should test cleverness and reward sharp answers.',
      'Velvet Elegance': 'Sophisticated, unhurried, tasteful. Questions about refinement, desires whispered not shouted, the art of restraint.',
    };
    const vibeTitle = dateContext?.vibe?.title || '';
    const vibeStyle = vibeStyleMap[vibeTitle] || 'Cinematic noir. Elegant but incisive.';

    // --- Location-aware subject shaping ---
    const locationSubjectMap: Record<string, string> = {
      'Velvet Jazz Lounge': 'Draw from: rhythm, taste, nightlife, who they become after midnight, what music reveals about a person, the performance of seduction.',
      'Private Rooftop': 'Draw from: ambition, perspective, feeling infinite vs. insignificant, what they see when they look down at the city, heights and vertigo as metaphor.',
      'The Library': 'Draw from: inner life, what they read, what keeps them up at night, knowledge as intimacy, the stories they tell themselves.',
      'Midnight Coast': 'Draw from: solitude, what they run from, what the ocean takes away, surrender, the edge between land and unknown.',
      'Parked Car': 'Draw from: proximity, confession, things only said in enclosed spaces, the intimacy of being trapped together, dashboard confessions.',
    };
    const locTitle = dateContext?.location?.title || '';
    const locationSubjects = locationSubjectMap[locTitle] || '';
    const locationAtmosphere = dateContext && dateContext.location
      ? `Setting: ${dateContext.location.title}. ${dateContext.location.environmentPrompt}`
      : "";

    const prompt = `
You generate questions for "Tonight" — a dating game where two people learn about each other through increasingly personal questions.

CATEGORY: ${category}

SETTING & ATMOSPHERE:
${locationAtmosphere}
${locationSubjects ? `Question subjects inspired by location: ${locationSubjects}` : ''}

VIBE (chosen by host — this MUST shape the tone of every question):
${vibeTitle}: ${vibeStyle}

PROFILES:
Asker: ${userPersona.appearance || 'Unknown'}, Age: ${userPersona.age || 'Unknown'}
${userBackground}
${userTraits}
Target: ${partnerPersona.appearance || 'Unknown'}, Age: ${partnerPersona.age || 'Unknown'}
${partnerBackground}
${partnerTraits}
${memoriesBlock}
${partnerSecrets}
${userSecrets}
${conversationBlock}

ESCALATION:
Chemistry: ${chemistry}% | Round: ${round} | Dominant Energy: ${dominantVibe[0]} (${dominantVibe[1]}%)
${chemistry < 25 ? 'Low chemistry — be indirect, build safety, earn trust through clever questions.' : ''}
${chemistry >= 25 && chemistry < 50 ? 'Building chemistry — test boundaries gently, show genuine curiosity about their specific life.' : ''}
${chemistry >= 50 && chemistry < 75 ? 'Strong chemistry — get personal. Reference specific things they said. Probe deeper into what they revealed.' : ''}
${chemistry >= 75 ? 'High chemistry — intimate, confrontational, vulnerable. The gloves are off. Ask what nobody else would dare.' : ''}

QUESTION DESIGN RULES:
Generate exactly 3 questions.

CRITICAL LENGTH RULE: Each question MUST be 6-14 words. Short. Punchy. Direct. No preamble, no "If you could..." or "Would you say that..." padding. Cut every unnecessary word. Think of how a confident person asks something across a candlelit table — not a therapist reading from a clipboard.
BAD: "Given what you shared earlier about your relationship with vulnerability, how would you describe the way you handle emotional conflict?" (25 words, clinical)
GOOD: "What scares you more — being known or being forgotten?" (10 words, sharp)
BAD: "If you had to choose between following your passion and maintaining financial stability, which would you pick?" (17 words, generic)
GOOD: "What did you give up that you still miss?" (9 words, lands hard)

Question 1 — FOLLOW-UP: ${conversationLog.length > 0 ? 'Build on something the Target revealed. Reference it in 2-3 words max, then ask the real question.' : 'Strong opener — probe values or self-image. Specific to their background if known.'}

Question 2 — RECIPROCITY: ${userSecrets ? 'The Asker revealed something. Use that asymmetry — "your turn" energy. Keep it tight.' : 'Frame as mutual exploration, not interrogation. Stay brief.'}

Question 3 — FRESH THREAD: Entirely new territory. ${partnerPersona.background ? `Specific to them (${partnerPersona.background.slice(0, 60)}), not generic.` : 'Unexpected. Reveals character.'}

ANSWER OPTIONS: Each question gets exactly 3 options.
- Each option: 2-6 words, emotionally DISTINCT, psychologically REVEALING
- BAD options: "Yes / No / Maybe" or "Always / Sometimes / Never"
- GOOD options: "Only when I'm afraid / Never again / Every single time" or "I'd lie about it / I'd run / I'd lean in closer"
- Options should force the answerer to CHOOSE who they are — each option reveals something different about their character.

KNOWLEDGE TEMPLATE: A sentence with {option} placeholder that captures psychological insight.
- BAD: "They chose {option}" or "Their answer was {option}"
- GOOD: "When cornered emotionally, they {option}" or "Their relationship with control: {option}" or "Faced with honesty about desire, they {option}"

${promptContext ? `\nDEEP PARTNER INTELLIGENCE:\n${renderFullContextBlock(promptContext)}\n\nUse the deep profile to:\n- Shape questions around her specific interests, career, and personality\n- Reference her zodiac traits in Intimate/Flirty questions\n- Frame questions to highlight what impresses her about the host\n- Use pre-date intel for callback questions ("Earlier you mentioned...")\n- Shape Preferences questions around her love language\n- Gate physical suggestion cues based on her physical comfort level\n` : ''}
CATEGORY FLAVOR for "${category}":
${{
  'Style': 'Surface-level but diagnostic. How they present themselves reveals what they want the world to see — and what they hide. Taste as a window into psychology.',
  'Escape': 'What they fantasize about leaving behind. Their exit routes — emotional, physical, imagined. What they dream about when reality gets heavy.',
  'Preferences': 'Relationship patterns and attachment styles disguised as preference questions. Daily rituals, deal-breakers, and non-negotiables that reveal how they love.',
  'Deep': 'Core identity. Regrets, values, the architecture of their inner life. Questions that make them pause before answering.',
  'Intimate': 'Physical and emotional intimacy intertwined. Trust, vulnerability, the body as confession. The space between wanting and allowing.',
  'Desire': 'What they want but cannot say. Power dynamics, fantasies, permission. The edge of what is spoken and unspoken.',
}[category] || ''}

OUTPUT: JSON array of 3 objects. Each has: id (string), category (string "${category}"), text (string — the question), options (array of exactly 3 strings), knowledgeTemplate (string with {option}).
`;

    try {
        const response = await callWithRetry(() => callProxy('/api/gemini/text', {
            model: MODEL_TEXT,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: T.ARRAY,
                    items: {
                        type: T.OBJECT,
                        properties: {
                            id: { type: T.STRING },
                            category: { type: T.STRING },
                            text: { type: T.STRING },
                            options: { type: T.ARRAY, items: { type: T.STRING } },
                            knowledgeTemplate: { type: T.STRING }
                        }
                    }
                }
            }
        }));
        const data = cleanAndParseJSON(response.text, []);
        return data.map((q: any, i: number) => ({ ...q, id: `${category.toLowerCase()}-${Date.now()}-${i}` }));
    } catch (e) {
        console.error("Question Gen Error", e);
        return [];
    }
};

export const generateInnerMonologue = async (vibe: VibeStats, activity: string): Promise<string> => {
  const vibeContext = getVibeInstruction(vibe);
  const prompt = `
    Context: A sophisticated adult on a virtual date.
    Current Vibe: ${vibeContext}.
    Task: Generate a fleeting, unsaid thought they have right now.
    Constraint: Max 6 words. First person. Lowercase. Noir style.
  `;
  try {
    const response = await callWithRetry(() => callProxy('/api/gemini/text', {
      model: MODEL_TEXT,
      contents: prompt,
      config: { responseMimeType: 'text/plain' }
    }));
    return response.text?.trim() || "reading the silence...";
  } catch (e) {
    return "reading the silence...";
  }
};

export const generateSilentReaction = async (
  choiceText: string,
  vibe: VibeStats
): Promise<{ narrative: string; vibeUpdate: Partial<VibeStats> }> => {
  const vibeContext = getVibeInstruction(vibe);
  const prompt = `
    User ALMOST said: "${choiceText}" but chose silence/thought instead.
    Tone: ${vibeContext}
    Partner observes this hesitation.
    Generate a 10-word observation of this silence.
    And estimated vibe impact.
  `;
  try {
    const response = await callWithRetry(() => callProxy('/api/gemini/text', {
        model: MODEL_TEXT,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: T.OBJECT,
                properties: {
                    narrative: { type: T.STRING },
                    vibeUpdate: {
                        type: T.OBJECT,
                        properties: { deep: { type: T.NUMBER }, flirty: { type: T.NUMBER } }
                    }
                }
            }
        }
    }));
    return cleanAndParseJSON(response.text, { narrative: "They notice what you didn't say.", vibeUpdate: { deep: 5 } });
  } catch {
      return { narrative: "They notice what you didn't say.", vibeUpdate: { deep: 5 } };
  }
};

export const generateIntelligenceReport = async (
  vibe: VibeStats,
  partner: PersonaState,
  rating: number,
  dateContext: DateContext | null,
  promptContext?: PromptContext | null
): Promise<IntelligenceReport> => {
  const prompt = buildIntelligenceReportPrompt(vibe, partner, rating, dateContext, promptContext);

  try {
    const response = await callWithRetry(() => callProxy('/api/gemini/text', {
      model: MODEL_TEXT,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: REPORT_SCHEMA,
      },
    }));

    const data = cleanAndParseJSON(response.text);
    return { ...data, partnerRating: rating };
  } catch (error) {
    return {
      publicationName: "The Midnight File",
      headline: "The Silent Campaign",
      lede: "Records remain incomplete as the connection fades into the digital ether.",
      summary: "An evening of unspoken truths and strategic silences.",
      vibeAnalysis: "The brand of this connection is high-stakes and elusive.",
      closingThought: "Some stories are better left in the draft folder.",
      partnerRating: rating,
      date: new Date().toLocaleDateString(),
      barTab: ["2x House Red", "1x Uncomfortable Silence"]
    };
  }
};

// ── Two Truths & A Lie ──────────────────────────────────────────────────────
export const generateTwoTruthsOneLie = async (
  targetPersona: PersonaState,
  guesserPersona: PersonaState,
  targetName: string,
  vibe: VibeStats,
  conversationLog: ConversationEntry[],
  dateContext: DateContext | null,
  promptContext?: PromptContext | null
): Promise<{ statements: { text: string; isLie: boolean }[] }> => {
  const vibeInstruction = getVibeInstruction(vibe);

  const targetBackground = targetPersona.background ? `Background: ${targetPersona.background}` : '';
  const targetTraits = targetPersona.traits.length > 0 ? `Discovered Traits: ${targetPersona.traits.join(', ')}` : '';
  const targetSecrets = targetPersona.secrets.length > 0 ? `Secrets revealed: ${targetPersona.secrets.join('; ')}` : '';
  const targetMemories = targetPersona.memories.length > 0 ? `Known Facts: ${targetPersona.memories.slice(-6).join('; ')}` : '';

  let conversationBlock = "";
  if (conversationLog.length > 0) {
    const formatted = conversationLog.slice(-12).map(e => {
      const asker = e.askedBy === 'user' ? 'Asker' : 'Target';
      const answerer = e.answeredBy === 'user' ? 'Asker' : 'Target';
      return `[${e.category}] ${asker} asked: "${e.questionText}" -> ${answerer}: "${e.answer}"`;
    }).join('\n');
    conversationBlock = `\nCONVERSATION HISTORY:\n${formatted}`;
  }

  const locationCtx = dateContext && dateContext.location ? `Setting: ${dateContext.location.title}. ${dateContext.location.environmentPrompt}` : '';

  const prompt = `
You are generating content for "Two Truths & A Lie" — a dating game activity.

ABOUT THE SUBJECT — ${targetName}:
${targetBackground}
${targetTraits}
${targetSecrets}
${targetMemories}
Appearance: ${targetPersona.appearance || 'Unknown'}
Age: ${targetPersona.age || 'Unknown'}
${conversationBlock}

ATMOSPHERE:
${locationCtx}
Vibe: ${vibeInstruction}
${promptContext ? `\nDEEP PROFILE INTELLIGENCE:\n${renderFullContextBlock(promptContext)}\nUse signature details (dream destination, defining media, drink, loved place) to create more personal truths. The lie should contradict known profile data subtly.\n` : ''}
TASK: Generate exactly 3 statements about ${targetName}.
- 2 statements should be PLAUSIBLE TRUTHS — extrapolated from their real data (background, traits, secrets, conversation answers, age, appearance). They should feel like things that COULD be true based on what we know. Make them specific and revealing, not generic.
- 1 statement should be a FABRICATED LIE — something that sounds plausible but contradicts or is inconsistent with what we know about them. It should be clever enough to fool someone but detectable if you've been paying attention.

QUALITY RULES:
- Each statement: 8-20 words. Written as a personal claim ("I once...", "I've never...", "My biggest...").
- The lie should NOT be obviously absurd — it should require knowledge of the person to detect.
- If we know little about them, use their appearance/age/traits to create more speculative but interesting statements.
- Statements should match the vibe: ${vibe.flirty > 50 ? 'flirtatious, teasing' : vibe.deep > 50 ? 'vulnerable, introspective' : 'intriguing, character-revealing'}.
- Shuffle the order — the lie should NOT always be in the same position.

OUTPUT: JSON with "statements" array of exactly 3 objects, each with "text" (string) and "isLie" (boolean). Exactly one must have isLie=true.
`;

  try {
    const response = await callWithRetry(() => callProxy('/api/gemini/text', {
      model: MODEL_TEXT,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: T.OBJECT,
          properties: {
            statements: {
              type: T.ARRAY,
              items: {
                type: T.OBJECT,
                properties: {
                  text: { type: T.STRING },
                  isLie: { type: T.BOOLEAN }
                },
                required: ["text", "isLie"]
              }
            }
          },
          required: ["statements"]
        }
      }
    }));
    const data = cleanAndParseJSON(response.text, { statements: [] });
    // Validate: ensure exactly 3 statements with exactly 1 lie
    if (data.statements.length >= 3) {
      data.statements = data.statements.slice(0, 3);
    }
    const lies = data.statements.filter((s: any) => s.isLie);
    if (lies.length !== 1 && data.statements.length === 3) {
      // Fix: randomize lie position so it's not predictable
      const lieIndex = Math.floor(Math.random() * 3);
      data.statements.forEach((s: any, i: number) => { s.isLie = i === lieIndex; });
    }
    return data;
  } catch (e) {
    console.error("Two Truths Gen Error", e);
    return {
      statements: [
        { text: "I've broken a heart I still think about.", isLie: false },
        { text: "I once danced alone in the rain at 3am.", isLie: false },
        { text: "I've never told a lie on a first date.", isLie: true }
      ]
    };
  }
};

// ── Finish My Sentence ──────────────────────────────────────────────────────
export const generateFinishSentence = async (
  targetPersona: PersonaState,
  guesserPersona: PersonaState,
  targetName: string,
  guesserName: string,
  vibe: VibeStats,
  conversationLog: ConversationEntry[],
  dateContext: DateContext | null,
  promptContext?: PromptContext | null
): Promise<{ sentence: string; options: string[] }> => {
  const vibeInstruction = getVibeInstruction(vibe);

  const targetBackground = targetPersona.background ? `Background: ${targetPersona.background}` : '';
  const targetTraits = targetPersona.traits.length > 0 ? `Traits: ${targetPersona.traits.join(', ')}` : '';
  const targetSecrets = targetPersona.secrets.length > 0 ? `Secrets: ${targetPersona.secrets.join('; ')}` : '';
  const guesserBackground = guesserPersona.background ? `Guesser Background: ${guesserPersona.background}` : '';

  let conversationBlock = "";
  if (conversationLog.length > 0) {
    const formatted = conversationLog.slice(-12).map(e => {
      return `[${e.category}] Q: "${e.questionText}" -> A: "${e.answer}"`;
    }).join('\n');
    conversationBlock = `\nCONVERSATION HISTORY:\n${formatted}`;
  }

  const locationCtx = dateContext && dateContext.location ? `Setting: ${dateContext.location.title}. ${dateContext.location.environmentPrompt}` : '';

  const prompt = `
You are generating content for "Finish My Sentence" — a dating game where one person's incomplete sentence is guessed by the other.

ABOUT THE SUBJECT — ${targetName}:
${targetBackground}
${targetTraits}
${targetSecrets}
Appearance: ${targetPersona.appearance || 'Unknown'}
Age: ${targetPersona.age || 'Unknown'}
${conversationBlock}

GUESSER: ${guesserName}
${guesserBackground}

ATMOSPHERE:
${locationCtx}
Vibe: ${vibeInstruction}
${promptContext ? `\nDEEP PROFILE INTELLIGENCE:\n${renderFullContextBlock(promptContext)}\nUse love language, personality traits, and play style to shape the sentence and completions.\n` : ''}
TASK: Generate 1 provocative incomplete sentence about ${targetName} and exactly 3 possible completions.

SENTENCE RULES:
- The sentence should be personal and revealing — about desires, fears, habits, secrets, or feelings.
- It must end with "..." at the point where the completion goes.
- Reference ${targetName} by name in the sentence.
- Match the vibe: ${vibe.flirty > 50 ? 'flirtatious, seductive, about desire or attraction' : vibe.deep > 50 ? 'vulnerable, existential, about fears or regrets' : vibe.playful > 50 ? 'witty, surprising, about hidden habits or guilty pleasures' : 'intriguing, revealing, about character or values'}.
- 10-18 words before the "..."

COMPLETION RULES:
- Exactly 3 options, each 3-8 words.
- Each option should reveal something DIFFERENT about the subject's character.
- One should feel like the "obvious" answer, one should be surprising, one should be deeply personal.
- Options should be psychologically distinct — choosing between them should feel meaningful.

EXAMPLES of good sentences:
- "The thing ${targetName} would never admit on a first date is..."
- "At 2am, when nobody's watching, ${targetName} secretly..."
- "The one compliment that would actually make ${targetName} blush is..."
- "If ${targetName} could unsend one text message, it would say..."

OUTPUT: JSON with "sentence" (string ending in "...") and "options" (array of exactly 3 strings).
`;

  try {
    const response = await callWithRetry(() => callProxy('/api/gemini/text', {
      model: MODEL_TEXT,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: T.OBJECT,
          properties: {
            sentence: { type: T.STRING },
            options: { type: T.ARRAY, items: { type: T.STRING } }
          },
          required: ["sentence", "options"]
        }
      }
    }));
    const data = cleanAndParseJSON(response.text, { sentence: "", options: [] });
    // Validate
    if (!data.sentence || data.options.length < 3) {
      throw new Error("Invalid response");
    }
    data.options = data.options.slice(0, 3);
    return data;
  } catch (e) {
    console.error("Finish Sentence Gen Error", e);
    return {
      sentence: `The thing ${targetName} is thinking right now but won't say is...`,
      options: ["That this feels real", "That they want to leave", "That they're terrified"]
    };
  }
};

export const generatePartnerInsight = async (
  partnerPersona: PersonaState,
  conversationLog: ConversationEntry[],
  vibe: VibeStats,
  promptContext?: PromptContext | null
): Promise<string> => {
  const traits = partnerPersona.traits.join(', ') || 'unknown';
  const secrets = partnerPersona.secrets.slice(-3).join('; ') || 'none revealed';
  const memories = partnerPersona.memories.slice(-5).join('; ') || 'none yet';
  const recentAnswers = conversationLog.slice(-5).map(e =>
    `[${e.category}] "${e.questionText}" → "${e.answer}"`
  ).join('\n');

  const prompt = `You are an expert psychologist observing a date. Based on the data below, write ONE observation about the partner — something the host might not notice themselves. Max 20 words. Be specific, not generic. Observational, not flattering. Focus on behavioral patterns, defense mechanisms, or hidden desires.

PARTNER TRAITS: ${traits}
REVEALED SECRETS: ${secrets}
KNOWN FACTS: ${memories}
RECENT ANSWERS:
${recentAnswers}

VIBE: playful=${vibe.playful}, flirty=${vibe.flirty}, deep=${vibe.deep}, comfortable=${vibe.comfortable}

${promptContext ? `PARTNER PROFILE: ${promptContext.profile?.name || 'Unknown'}, ${promptContext.profile?.job || ''}, interests: ${promptContext.profile?.interests?.join(', ') || 'unknown'}` : ''}

Respond with ONLY the observation sentence. No quotes, no preamble.`;

  try {
    const result = await callProxy('/api/gemini/text', { prompt });
    const text = typeof result === 'string' ? result : result?.text || result?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return text.trim().slice(0, 150);
  } catch {
    return '';
  }
};

export const generateLocationTransition = async (
  vibe: VibeStats,
  round: number,
  conversationLog: ConversationEntry[],
  currentEnvironmentPrompt: string
): Promise<{ narrative: string; imagePrompt: string }> => {
  const recentAnswers = conversationLog.slice(-3).map(e =>
    `[${e.category}] "${e.answer}"`
  ).join(', ');

  const dominant = getDominantVibe(vibe);

  const prompt = `You are a cinematographer directing a date scene. The current setting: "${currentEnvironmentPrompt}". The mood is ${dominant} (playful=${vibe.playful}, flirty=${vibe.flirty}, deep=${vibe.deep}, comfortable=${vibe.comfortable}). Round ${round}. Recent answers: ${recentAnswers}.

Write TWO things:
1. "narrative": A short atmospheric transition line (max 10 words). Something that could appear as a subtitle in a film. Examples: "The bartender dims the lights." "Rain starts against the window."
2. "imagePrompt": An updated environment description for image generation. Keep the same location but shift the atmosphere to match the current mood. Max 30 words.

Respond as JSON: {"narrative": "...", "imagePrompt": "..."}`;

  try {
    const result = await callProxy('/api/gemini/text', { prompt });
    const text = typeof result === 'string' ? result : result?.text || '';
    const parsed = cleanAndParseJSON(text, { narrative: '', imagePrompt: currentEnvironmentPrompt });
    return { narrative: parsed.narrative || '', imagePrompt: parsed.imagePrompt || currentEnvironmentPrompt };
  } catch {
    return { narrative: '', imagePrompt: currentEnvironmentPrompt };
  }
};

export const generateScene = async (
  currentVibe: VibeStats,
  round: number,
  partnerPersona: PersonaState,
  userPersona: PersonaState,
  dateContext: DateContext | null,
  previousChoiceText?: string,
  mode: string = 'Standard',
  promptContext?: PromptContext | null
): Promise<Scene> => {
  const prompt = buildScenePrompt(currentVibe, round, partnerPersona, userPersona, dateContext, previousChoiceText || "", mode, promptContext);

  try {
    const response = await callWithRetry(() => callProxy('/api/gemini/text', {
      model: MODEL_TEXT,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: T.OBJECT,
          properties: {
            id: { type: T.STRING },
            type: { type: T.STRING },
            narrative: { type: T.STRING },
            choices: {
              type: T.ARRAY,
              items: {
                type: T.OBJECT,
                properties: {
                  id: { type: T.STRING },
                  text: { type: T.STRING },
                  symbol: { type: T.STRING },
                  vibeEffect: {
                    type: T.OBJECT,
                    properties: {
                      playful: { type: T.NUMBER },
                      flirty: { type: T.NUMBER },
                      deep: { type: T.NUMBER },
                      comfortable: { type: T.NUMBER }
                    }
                  }
                }
              }
            }
          },
          required: ["id", "type", "narrative", "choices"]
        },
      },
    }));

    const sceneData = cleanAndParseJSON(response.text);
    return { ...sceneData, round };
  } catch (error) {
    console.error("Scene Gen Error", error);
    return {
        id: `err-${Date.now()}`,
        type: "conversation",
        narrative: "The signal flickers in the dark... waiting for clarity.",
        choices: [
            { id: 'retry', text: 'Wait...', vibeEffect: {} },
            { id: 'sip', text: 'Take a sip', symbol: '🥃', vibeEffect: { comfortable: 5 } },
            { id: 'look', text: 'Look away', vibeEffect: { deep: 5 } }
        ],
        round
    };
  }
};

export const extractTraitFromInteraction = async (question: string, answer: string, existingTraits: string[] = []): Promise<string> => {
  const avoidList = existingTraits.length > 0
    ? `\nALREADY DISCOVERED TRAITS (do NOT repeat or use synonyms): ${existingTraits.join(', ')}`
    : '';

  const prompt = `
    Analyze this dating interaction.
    Q: "${question}"
    A: "${answer}"
    ${avoidList}
    Task: Extract a single, insightful psychological trait revealed by this answer. One word — a noun or adjective. Noir tone. Must be genuinely different from any already-discovered traits listed above. If no meaningfully new trait is revealed, return an empty string.
  `;

  try {
    const response = await callWithRetry(() => callProxy('/api/gemini/text', {
        model: MODEL_TEXT,
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: T.OBJECT,
                properties: { trait: { type: T.STRING } }
            }
        }
    }));
    const data = cleanAndParseJSON(response.text);
    const t = data.trait || "";
    return t.charAt(0).toUpperCase() + t.slice(1);
  } catch (e) {
    return "";
  }
}

export const analyzeImageAction = async (
  base64Image: string,
  actionType: 'drink' | 'selfie' | 'general',
  vibe: VibeStats
): Promise<{ text: string; vibeUpdate: Partial<VibeStats>; secretUnlocked?: string }> => {
  const vibeInstruction = getVibeInstruction(vibe);
  let prompt = "";

  if (actionType === 'drink') {
      prompt = `Partner perspective: Roast their drink choice. 6 words max. Vibe: ${vibeInstruction}.`;
  } else if (actionType === 'selfie') {
      prompt = `Partner perspective: Analyze their selfie. 6 words max. Vibe: ${vibeInstruction}.`;
  } else {
      prompt = `Partner perspective: Analyze the photo they just sent. Be observant, possibly flirtatious or cynical depending on vibe. 6 words max. Vibe: ${vibeInstruction}.`;
  }

  try {
    const response = await callWithRetry(() => callProxy('/api/gemini/text', {
      model: MODEL_COMPLEX,
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: base64Image } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: T.OBJECT,
          properties: {
            text: { type: T.STRING },
            vibeUpdate: {
              type: T.OBJECT,
              properties: { flirty: { type: T.INTEGER }, playful: { type: T.INTEGER } }
            },
            secretUnlocked: { type: T.STRING }
          },
          required: ["text", "vibeUpdate"]
        }
      }
    }));
    return cleanAndParseJSON(response.text);
  } catch (error) {
    return { text: "Passable.", vibeUpdate: {} };
  }
};

export const generateAbstractAvatar = async (traits: string[], revealProgress: number, context: string): Promise<string> => {
  const prompt = buildAvatarPrompt(traits, context);
  const fallback = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop";

  try {
    const img = await generateImageWithGemini(prompt, "1:1");
    if (img) return img;
    return fallback;
  } catch (error: any) {
    return fallback;
  }
};

export const generateReactionImage = async (persona: PersonaState, reactionType: string): Promise<string> => {
  const desc = persona.appearance || "Cinematic noir character";
  const prompt = `Cinematic reaction shot of ${desc}. Action/Mood: ${reactionType}. Dark noir lighting.`;
  const img = await generateImageWithGemini(prompt, "4:3");
  return img || "";
};

interface PhotoAnalysisResult {
    estimatedAge: string;
    gender: string;
    appearance: string;
    traits: string[];
}

export const generateNarrativeSuggestion = async (
  round: number,
  vibe: VibeStats,
  chemistry: number,
  conversationLog: ConversationEntry[],
  promptContext?: PromptContext | null
): Promise<NarrativeSuggestion> => {
  const prompt = buildNarrativePrompt(round, vibe, chemistry, conversationLog, promptContext || null);

  try {
    const response = await callWithRetry(() => callProxy('/api/gemini/text', {
      model: MODEL_TEXT,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: T.OBJECT,
          properties: {
            suggestedAction: { type: T.STRING },
            suggestedCategory: { type: T.STRING },
            suggestedActivity: { type: T.STRING },
            reasoning: { type: T.STRING },
            transitionNarrative: { type: T.STRING },
          },
          required: ["suggestedAction", "transitionNarrative", "reasoning"],
        },
      },
    }));

    const data = cleanAndParseJSON(response.text);
    return {
      suggestedAction: data.suggestedAction === 'activity' ? 'activity' : 'question',
      suggestedCategory: data.suggestedCategory || undefined,
      suggestedActivity: data.suggestedActivity || undefined,
      reasoning: data.reasoning || '',
      transitionNarrative: data.transitionNarrative || 'The night continues...',
    };
  } catch (error) {
    console.error("Narrative suggestion failed:", error);
    throw error;
  }
};

// ── Shared Playlist ──────────────────────────────────────────────────────────
export const generatePlaylistSongs = async (
  userPersona: PersonaState,
  partnerPersona: PersonaState,
  vibe: VibeStats,
  conversationLog: ConversationEntry[],
  dateContext: DateContext | null,
  promptContext?: PromptContext | null
): Promise<PlaylistData> => {
  const dominant = getDominantVibe(vibe);
  const location = dateContext?.location?.title || 'a night out';
  const partnerTraits = partnerPersona.traits.join(', ') || 'mysterious';
  const userTraits = userPersona.traits.join(', ') || 'unknown';
  const recentTopics = conversationLog.slice(-5).map(e => e.category).join(', ');

  const prompt = `Generate a playlist of 8 songs for a date night. The setting: ${location}. The mood is ${dominant}. Partner traits: ${partnerTraits}. Host traits: ${userTraits}. Recent conversation topics: ${recentTopics || 'getting to know each other'}.

Mix genres. Include recognizable songs that evoke emotion. Each song should feel intentional, not random.

Return JSON array of exactly 8 objects: [{"title": "Song Name", "artist": "Artist Name", "vibe": "one-word mood descriptor"}]`;

  try {
    const result = await callProxy('/api/gemini/text', { prompt });
    const text = typeof result === 'string' ? result : result?.text || '';
    const songs = cleanAndParseJSON(text, []);
    if (Array.isArray(songs) && songs.length >= 6) {
      return { songs: songs.slice(0, 8) };
    }
    throw new Error('Invalid song array');
  } catch {
    return {
      songs: [
        { title: 'Wicked Game', artist: 'Chris Isaak', vibe: 'longing' },
        { title: 'Kiss of Life', artist: 'Sade', vibe: 'smooth' },
        { title: 'Slow Dancing in a Burning Room', artist: 'John Mayer', vibe: 'bittersweet' },
        { title: 'Do I Wanna Know?', artist: 'Arctic Monkeys', vibe: 'tension' },
        { title: 'Love on the Brain', artist: 'Rihanna', vibe: 'raw' },
        { title: 'The Night We Met', artist: 'Lord Huron', vibe: 'nostalgic' },
        { title: 'Earned It', artist: 'The Weeknd', vibe: 'dark' },
        { title: 'Something', artist: 'The Beatles', vibe: 'timeless' },
      ]
    };
  }
};

export const generateEndOfNightLetter = async (
  vibe: VibeStats,
  partnerPersona: PersonaState,
  rating: number,
  conversationLog: ConversationEntry[],
  dateContext: DateContext | null,
  promptContext?: PromptContext | null
): Promise<LetterData> => {
  const partnerName = promptContext?.profile?.name || 'your date';
  const location = dateContext?.location?.title || 'tonight';
  const highlights = conversationLog.slice(-8).map(e => `"${e.answer}"`).join(', ');
  const dominant = getDominantVibe(vibe);

  const prompt = `Write a short letter about tonight's date as if you're a close, perceptive friend who watched the whole evening. Address it to "You" (the host). Reference specific moments from the conversation highlights below. Tone: warm but sharp, like a friend who sees through both of you. Max 100 words.

PARTNER: ${partnerName}
LOCATION: ${location}
MOOD: ${dominant} (chemistry ${partnerPersona.chemistry}%)
RATING: ${rating}/10
CONVERSATION HIGHLIGHTS: ${highlights || 'a night of discovery'}
PARTNER TRAITS: ${partnerPersona.traits.join(', ') || 'still emerging'}

Respond as JSON: {"salutation": "short greeting (2-3 words)", "body": "the letter text", "signoff": "short sign-off (1-3 words)"}`;

  try {
    const result = await callProxy('/api/gemini/text', { prompt });
    const text = typeof result === 'string' ? result : result?.text || '';
    return cleanAndParseJSON(text, { salutation: 'Tonight', body: 'The words escaped before the ink could catch them.', signoff: '—' });
  } catch {
    return { salutation: 'Tonight', body: 'The words escaped before the ink could catch them.', signoff: '—' };
  }
};

export const generateFollowUpText = async (
  partnerPersona: PersonaState,
  conversationLog: ConversationEntry[],
  vibe: VibeStats,
  rating: number,
  letterBody: string,
  promptContext?: PromptContext | null
): Promise<string> => {
  const partnerName = promptContext?.profile?.name || 'them';
  const highlights = conversationLog.slice(-5).map(e =>
    `Q: "${e.questionText}" A: "${e.answer}"`
  ).join('\n');

  const prompt = `Write ONE follow-up text message to send after a date. It should reference a specific moment from the conversation — not be generic. 1-2 sentences, SMS length (under 200 chars). Match the tone of this letter that was just written about the night: "${letterBody}"

PARTNER: ${partnerName}
CHEMISTRY: ${partnerPersona.chemistry}%
RATING: ${rating}/10
KEY MOMENTS:
${highlights || 'a memorable evening'}

Respond with ONLY the text message. No quotes, no preamble, no explanation.`;

  try {
    const result = await callProxy('/api/gemini/text', { prompt });
    const text = typeof result === 'string' ? result : result?.text || '';
    return text.trim().slice(0, 280);
  } catch {
    return 'I had a great time tonight.';
  }
};

export const analyzeUserPhotoForAvatar = async (base64Image: string, hint?: string): Promise<PhotoAnalysisResult> => {
  const prompt = `
    Analyze this user photo for a social game.
    Return a JSON object with these 4 fields:
    1. estimatedAge (string)
    2. gender (string)
    3. appearance (string): A detailed visual description of their face, hair, clothes, and style.
    4. traits (array of strings): 3 personality traits guessed from the photo.

    Output PURE JSON.
  `;

  try {
    const response = await callWithRetry(() => callProxy('/api/gemini/text', {
      model: MODEL_COMPLEX,
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: base64Image } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: T.OBJECT,
          properties: {
            estimatedAge: { type: T.STRING },
            gender: { type: T.STRING },
            appearance: { type: T.STRING },
            traits: { type: T.ARRAY, items: { type: T.STRING } }
          },
          required: ["estimatedAge", "gender", "appearance", "traits"]
        }
      }
    }));

    const data = cleanAndParseJSON(response.text, {});

    return {
        estimatedAge: data.estimatedAge || "30",
        gender: data.gender || "Unknown",
        appearance: data.appearance || "A mysterious figure.",
        traits: data.traits || ["mysterious"]
    };
  } catch (error) {
    return {
        estimatedAge: "Unknown",
        gender: "Unknown",
        appearance: "A mysterious figure in the shadows.",
        traits: ["mysterious", "guarded", "unknown"]
    };
  }
};

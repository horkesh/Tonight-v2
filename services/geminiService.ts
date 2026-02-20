
import { GoogleGenAI, Type } from "@google/genai";
import { Scene, VibeStats, PersonaState, IntelligenceReport, Question, DateContext, DateLocation, DateVibe, ConversationEntry, TwoTruthsData, FinishSentenceData } from "../types";
import { 
  SYSTEM_INSTRUCTION
} from "../constants";
import {
  buildScenePrompt,
  buildIntelligenceReportPrompt,
  buildTwoTruthsPrompt,
  buildFinishSentencePrompt,
  buildAvatarPrompt,
  buildLocationImagePrompt
} from "./prompts/gamePrompts";

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  console.error("GeminiService: Missing API_KEY in environment variables.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const MODEL_TEXT = "gemini-3.1-pro-preview";
const MODEL_COMPLEX = "gemini-3.1-pro-preview"; 
const MODEL_IMAGE_GEN = "gemini-2.5-flash-image"; 

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
      console.warn(`Gemini Rate Limit (429). Retrying in ${delay}ms... (Attempts left: ${retries})`);
      await new Promise(r => setTimeout(r, delay));
      return callWithRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
};

const cleanAndParseJSON = (text: string | undefined, fallback: any = {}) => {
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
  const entries = Object.entries(vibe);
  if (entries.length === 0) return "Neutral noir atmosphere. Cool and detached.";
  
  const dominant = entries.reduce((a, b) => a[1] > b[1] ? a : b);
  const intensity = dominant[1];

  if (intensity < 30) return "The night is young. A cool, detached sophistication hangs in the air.";

  switch (dominant[0]) {
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
  type: Type.OBJECT,
  properties: {
    publicationName: { type: Type.STRING, description: "Creative newspaper name matching location/vibe." },
    headline: { type: Type.STRING, description: "A punchy, noir newspaper headline. Max 5 words." },
    lede: { type: Type.STRING, description: "A sharp, journalism-style opening sentence." },
    summary: { type: Type.STRING, description: "A sophisticated overview of the night's events. Max 30 words." },
    vibeAnalysis: { type: Type.STRING, description: "A marketing-style analysis of the connection's 'brand'." },
    closingThought: { type: Type.STRING, description: "A final, cynical yet elegant thought." },
    date: { type: Type.STRING },
    barTab: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING },
        description: "A list of 3-5 'items' consumed."
    }
  },
  required: ["publicationName", "headline", "lede", "summary", "vibeAnalysis", "closingThought", "date", "barTab"],
};

const generateImageWithGemini = async (prompt: string, aspectRatio: "1:1" | "16:9" | "4:3"): Promise<string | null> => {
  try {
    const response = await callWithRetry(() => ai.models.generateContent({
      model: MODEL_IMAGE_GEN,
      contents: prompt,
      config: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: { aspectRatio: aspectRatio }
      }
    }));

    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
    }
    return null;
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
    } = { conversationLog: [], round: 0, vibe: { playful: 0, flirty: 0, deep: 0, comfortable: 0 } }
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
    const dominantVibe = Object.entries(vibe).reduce((a, b) => a[1] > b[1] ? a : b);

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
    const locationAtmosphere = dateContext
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
        const response = await callWithRetry(() => ai.models.generateContent({
            model: MODEL_TEXT,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            category: { type: Type.STRING },
                            text: { type: Type.STRING },
                            options: { type: Type.ARRAY, items: { type: Type.STRING } },
                            knowledgeTemplate: { type: Type.STRING }
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
    const response = await callWithRetry(() => ai.models.generateContent({
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
    const response = await callWithRetry(() => ai.models.generateContent({
        model: MODEL_TEXT,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    narrative: { type: Type.STRING },
                    vibeUpdate: { 
                        type: Type.OBJECT, 
                        properties: { deep: { type: Type.NUMBER }, flirty: { type: Type.NUMBER } }
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
  dateContext: DateContext | null
): Promise<IntelligenceReport> => {
  const prompt = buildIntelligenceReportPrompt(vibe, partner, rating, dateContext);

  try {
    const response = await callWithRetry(() => ai.models.generateContent({
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
  dateContext: DateContext | null
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

  const locationCtx = dateContext ? `Setting: ${dateContext.location.title}. ${dateContext.location.environmentPrompt}` : '';

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
    const response = await callWithRetry(() => ai.models.generateContent({
      model: MODEL_TEXT,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            statements: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  isLie: { type: Type.BOOLEAN }
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
    // Validate: ensure exactly 1 lie
    const lies = data.statements.filter((s: any) => s.isLie);
    if (lies.length !== 1 || data.statements.length !== 3) {
      // Fix: force exactly 1 lie if AI messed up
      if (data.statements.length >= 3) {
        data.statements = data.statements.slice(0, 3);
        data.statements.forEach((s: any, i: number) => { s.isLie = i === 1; }); // Default: middle is lie
      }
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
  dateContext: DateContext | null
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

  const locationCtx = dateContext ? `Setting: ${dateContext.location.title}. ${dateContext.location.environmentPrompt}` : '';

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
    const response = await callWithRetry(() => ai.models.generateContent({
      model: MODEL_TEXT,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sentence: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } }
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

export const generateScene = async (
  currentVibe: VibeStats,
  round: number,
  partnerPersona: PersonaState, 
  userPersona: PersonaState,
  dateContext: DateContext | null,
  previousChoiceText?: string,
  mode: string = 'Standard'
): Promise<Scene> => {
  const prompt = buildScenePrompt(currentVibe, round, partnerPersona, userPersona, dateContext, previousChoiceText || "", mode);

  try {
    const response = await callWithRetry(() => ai.models.generateContent({
      model: MODEL_TEXT,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            type: { type: Type.STRING },
            narrative: { type: Type.STRING },
            choices: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  text: { type: Type.STRING },
                  symbol: { type: Type.STRING },
                  vibeEffect: { 
                    type: Type.OBJECT, 
                    properties: { 
                      playful: { type: Type.NUMBER }, 
                      flirty: { type: Type.NUMBER }, 
                      deep: { type: Type.NUMBER }, 
                      comfortable: { type: Type.NUMBER } 
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
    const response = await callWithRetry(() => ai.models.generateContent({
        model: MODEL_TEXT,
        contents: prompt,
        config: { 
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: { trait: { type: Type.STRING } }
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
    const response = await callWithRetry(() => ai.models.generateContent({
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
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            vibeUpdate: { 
              type: Type.OBJECT, 
              properties: { flirty: { type: Type.INTEGER }, playful: { type: Type.INTEGER } } 
            },
            secretUnlocked: { type: Type.STRING }
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
    const response = await callWithRetry(() => ai.models.generateContent({
      model: MODEL_COMPLEX, 
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: base64Image } }, 
          { text: prompt }
        ] 
      },
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

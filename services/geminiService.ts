
import { GoogleGenAI, Type } from "@google/genai";
import { Scene, VibeStats, PersonaState, IntelligenceReport, Question, DateContext } from "../types";
import { 
  SYSTEM_INSTRUCTION, 
  TRUTH_SEEDS, 
  TWIST_SEEDS, 
  NARRATIVE_SEEDS 
} from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- HELPERS ---

const cleanAndParseJSON = (text: string | undefined, fallback: any = {}) => {
  if (!text) return fallback;
  try {
    let cleaned = text.trim();
    // Remove markdown code blocks if present (handles json, text, or no lang specifier)
    cleaned = cleaned.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/, '');
    return JSON.parse(cleaned);
  } catch (e) {
    console.warn("JSON Parse Warning:", e);
    // Optionally try to salvage if there's trailing garbage, but robust schema usually avoids this
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
    publicationName: { type: Type.STRING, description: "Creative newspaper name matching location/vibe. E.g. 'The Velvet Gazette', 'Skyline Chronicles'." },
    headline: { type: Type.STRING, description: "A punchy, noir newspaper headline. Max 5 words." },
    lede: { type: Type.STRING, description: "A sharp, journalism-style opening sentence." },
    summary: { type: Type.STRING, description: "A sophisticated overview of the night's events. Max 30 words." },
    vibeAnalysis: { type: Type.STRING, description: "A marketing-style analysis of the connection's 'brand'." },
    closingThought: { type: Type.STRING, description: "A final, cynical yet elegant thought." },
    date: { type: Type.STRING },
    barTab: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING },
        description: "A list of 3-5 'items' consumed. E.g., '2x Pinot Noir', '1x Awkward Silence'."
    }
  },
  required: ["publicationName", "headline", "lede", "summary", "vibeAnalysis", "closingThought", "date", "barTab"],
};

// --- GENERATORS ---

export const generateDynamicQuestions = async (
    category: string,
    userPersona: PersonaState, 
    partnerPersona: PersonaState
): Promise<Question[]> => {
    const model = "gemini-3-flash-preview";
    
    // Construct context from recent memories to allow follow-ups
    const recentMemories = partnerPersona.memories.slice(-6);
    const contextString = recentMemories.length > 0 
        ? `Target's Past Answers/History: ${JSON.stringify(recentMemories)}`
        : "Target's Past Answers: None (First interaction)";

    const prompt = `
      Generate 3 distinct questions for a user to ask their partner.
      Category: ${category}
      
      Asker: ${userPersona.appearance || 'Unknown'} (${userPersona.age})
      Target: ${partnerPersona.appearance || 'Unknown'} (${partnerPersona.age})
      Chemistry: ${partnerPersona.chemistry}%
      ${contextString}
      
      Requirements:
      1. Tone: Sophisticated, 'noir' style, intimate but guarded.
      2. MIX STRATEGY: 
         - If Target has past answers, generate 1-2 questions that specifically follow up on them (e.g., "You mentioned X, but...").
         - ALWAYS generate at least 1 "fresh" question that opens a completely new tree of investigation.
         - If no history, generate 3 varied starter questions.
      3. Options: Provide 3 distinct, short (1-3 words) answer options for each question.
      
      Output JSON format array of objects with: id, category, text, options (3 short string answers), knowledgeTemplate (short string for memory).
    `;

    try {
        const response = await ai.models.generateContent({
            model,
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
        });
        const data = cleanAndParseJSON(response.text, []);
        return data.map((q: any, i: number) => ({ ...q, id: `${category.toLowerCase()}-${Date.now()}-${i}` }));
    } catch (e) {
        console.error("Question Gen Error", e);
        return [];
    }
};

export const generateInnerMonologue = async (vibe: VibeStats, activity: string): Promise<string> => {
  const model = "gemini-3-flash-preview";
  const vibeContext = getVibeInstruction(vibe);
  
  const prompt = `
    Context: A sophisticated adult on a virtual date.
    Current Vibe: ${vibeContext}.
    Task: Generate a fleeting, unsaid thought they have right now.
    Constraint: Max 6 words. First person. Lowercase. Noir style.
  `;
  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { responseMimeType: 'text/plain' }
    });
    return response.text?.trim() || "reading the silence...";
  } catch (e) {
    return "reading the silence...";
  }
};

export const generateSilentReaction = async (
  choiceText: string,
  vibe: VibeStats
): Promise<{ narrative: string; vibeUpdate: Partial<VibeStats> }> => {
  const model = "gemini-3-flash-preview";
  const vibeContext = getVibeInstruction(vibe);

  const prompt = `
    User ALMOST said: "${choiceText}" but chose silence/thought instead.
    Tone: ${vibeContext}
    Partner observes this hesitation.
    Generate a 10-word observation of this silence.
    And estimated vibe impact.
  `;
  try {
    const response = await ai.models.generateContent({
        model,
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
    });
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
  const model = "gemini-3-flash-preview";
  const vibeInstruction = getVibeInstruction(vibe);

  let publicationContext = "A standard noir intelligence file.";
  if (dateContext) {
      publicationContext = `
        Location: ${dateContext.location.title} (${dateContext.location.description}).
        Atmosphere: ${dateContext.vibe.title} (${dateContext.vibe.description}).
        Instruction: Create a fictional newspaper name that perfectly fits this specific location and vibe. 
        Example: For a Jazz Lounge, "The Velvet Gazette". For a Rooftop, "The Skyline Watch".
        The tone of the writing should match this atmosphere.
      `;
  }

  const prompt = `
    GENERATE INTELLIGENCE REPORT
    ${publicationContext}
    
    Current Vibe Stats: ${JSON.stringify(vibe)}
    Vibe Analysis: ${vibeInstruction}
    Partner Rating: ${rating}/10
    Partner Traits: ${partner.traits.join(", ")}
    
    Instruction: Write a journalism-style briefing summarizing this encounter. 
    Use the jargon of a sophisticated critic or investigative journalist.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: REPORT_SCHEMA,
      },
    });

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

export const generateScene = async (
  currentVibe: VibeStats,
  round: number,
  partnerPersona: PersonaState, 
  userPersona: PersonaState,
  dateContext: DateContext | null,
  previousChoiceText?: string,
  mode: string = 'Standard'
): Promise<Scene> => {
  const model = "gemini-3-flash-preview";
  const vibeInstruction = getVibeInstruction(currentVibe);
  
  const contextString = dateContext 
    ? `LOCATION: ${dateContext.location.environmentPrompt}
       INTENDED VIBE: ${dateContext.vibe.promptModifier}`
    : "LOCATION: A nondescript noir void.";

  // Random helper
  const randomSeed = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

  let specializedPrompt = "";
  if (mode === 'truth') {
    specializedPrompt = `ACTIVITY: TRUTH OR DRINK. Seed: "${randomSeed(TRUTH_SEEDS)}". Partner asks a truth question.`;
  } else if (mode === 'narrative') {
    specializedPrompt = `ACTIVITY: NOIR NARRATION. Seed: "${randomSeed(NARRATIVE_SEEDS)}". Partner narrates a scenario.`;
  } else if (mode === 'twist') {
    specializedPrompt = `ACTIVITY: PLOT TWIST. Seed: "${randomSeed(TWIST_SEEDS)}". A sudden dramatic event occurs.`;
  } else if (mode === 'lastCall') {
    specializedPrompt = `EVENT: LAST CALL. The night is ending. Choices: "Call the Cab" (End), "One Last Glass" (Risk).`;
  } else {
    specializedPrompt = `ACTIVITY: CONVERSATION. Seed: "${randomSeed(NARRATIVE_SEEDS)}". Natural conversation flow.`;
  }

  const prompt = `
    SCENE GENERATION PROTOCOL
    
    ${contextString}

    PARTNER PROFILE:
    - Name: ${partnerPersona.appearance ? "Partner" : "Mystery"}
    - Desc: ${partnerPersona.appearance || "Unknown"} (${partnerPersona.age})
    - State: ${partnerPersona.drunkFactor > 3 ? "Intoxicated" : "Composed"}
    - Traits: ${partnerPersona.traits.join(", ")}
    
    USER PROFILE:
    - Desc: ${userPersona.appearance || "Shadow"} (${userPersona.age})
    
    ATMOSPHERE:
    - Vibe Stats: ${JSON.stringify(currentVibe)}
    - Tone: "${vibeInstruction}"
    
    CONTEXT:
    - Round: ${round}
    - Previous Action: "${previousChoiceText || "Start"}"
    
    ${specializedPrompt}

    OUTPUT REQUIREMENTS:
    - Narrative: Pithy, cinematic, max 15 words. Fits the location.
    - Choices: EXACTLY 3 distinct choices (unless lastCall, then 2).
  `;

  try {
    const response = await ai.models.generateContent({
      model,
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
    });

    const sceneData = cleanAndParseJSON(response.text);
    return { ...sceneData, round };
  } catch (error) {
    console.error("Scene Gen Error", error);
    // Simple fallback logic if AI fails to prevent app crash
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

export const extractTraitFromInteraction = async (
  question: string, 
  answer: string
): Promise<string> => {
  const model = "gemini-3-flash-preview";
  const prompt = `
    Analyze this dating interaction.
    Q: "${question}"
    A: "${answer}"
    
    Task: Extract a single, insightful psychological trait (noun or adjective) that describes the person answering. 
    Constraint: ONE word. Sophisticated/Noir tone.
    Examples: "Guarded", "Idealist", "Cynic", "Hedonist", "Stoic".
  `;

  try {
    const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { 
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: { trait: { type: Type.STRING } }
            }
        }
    });
    const data = cleanAndParseJSON(response.text);
    // Capitalize first letter
    const t = data.trait || "";
    return t.charAt(0).toUpperCase() + t.slice(1);
  } catch (e) {
    return "";
  }
}

export const analyzeImageAction = async (
  base64Image: string,
  actionType: 'drink' | 'selfie',
  vibe: VibeStats
): Promise<{ text: string; vibeUpdate: Partial<VibeStats>; secretUnlocked?: string }> => {
  const model = "gemini-3-flash-preview";
  const vibeInstruction = getVibeInstruction(vibe);
  
  const prompt = actionType === 'drink' 
    ? `Partner perspective: Roast their drink choice. 6 words max. Vibe: ${vibeInstruction}.`
    : `Partner perspective: Analyze their selfie. 6 words max. Vibe: ${vibeInstruction}.`;

  try {
    const response = await ai.models.generateContent({
      model,
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
    });
    return cleanAndParseJSON(response.text);
  } catch (error) {
    return { text: "Passable.", vibeUpdate: {} };
  }
};

export const generateAbstractAvatar = async (traits: string[], revealProgress: number, context: string): Promise<string> => {
  const model = "gemini-2.5-flash-image"; 
  // Strict enforcement of the anchor context for consistency
  const prompt = `Cinematic silhouette portrait of: ${context}. Noir style. 
  The character MUST match the physical description exactly. 
  Emotional state/vibe implied by traits: ${traits.join(", ")}.`;
  
  try {
    const response = await ai.models.generateContent({ 
      model, 
      contents: { parts: [{ text: prompt }] }, 
      config: { imageConfig: { aspectRatio: "1:1" } } 
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData?.data) return `data:image/png;base64,${part.inlineData.data}`;
    }
    return "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1000&auto=format&fit=crop";
  } catch (error) { return "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1000&auto=format&fit=crop"; }
};

export const generateReactionImage = async (persona: PersonaState, reactionType: string): Promise<string> => {
  const model = "gemini-2.5-flash-image";
  const desc = persona.appearance || "Cinematic noir character";
  const prompt = `Cinematic reaction shot of ${desc}. Action/Mood: ${reactionType}. Dark noir lighting.`;
  try {
    const response = await ai.models.generateContent({ 
      model, 
      contents: { parts: [{ text: prompt }] }, 
      config: { imageConfig: { aspectRatio: "4:3" } } 
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData?.data) return `data:image/png;base64,${part.inlineData.data}`;
    }
    return "";
  } catch (error) { return ""; }
};

export const analyzeUserPhotoForAvatar = async (base64Image: string): Promise<string> => {
  const model = "gemini-3-flash-preview";
  const prompt = "Analyze the physical appearance for a character description. Output single comma-separated descriptive string (max 20 words) including age, hair, style.";
  
  try {
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: base64Image } }, 
          { text: prompt }
        ]
      },
      config: { responseMimeType: "text/plain" }
    });
    return response.text?.trim() || "A mysterious figure in the shadows.";
  } catch (error) {
    return "A silhouette in the dark.";
  }
};

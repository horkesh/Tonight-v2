/**
 * Standalone script to generate Haris's permanent abstract avatar.
 *
 * Usage:
 *   GEMINI_API_KEY=<key> node scripts/generate-haris-avatar.mjs
 *   — or —
 *   Create .env.local with GEMINI_API_KEY=<key> and run:
 *   node scripts/generate-haris-avatar.mjs
 */

import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ── Load API key ────────────────────────────────────────────────────────────
function loadApiKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;

  // Try .env.local
  const envPath = path.join(ROOT, ".env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const match = line.match(/^\s*GEMINI_API_KEY\s*=\s*(.+)\s*$/);
      if (match) return match[1].trim();
    }
  }

  // Try .env
  const envPath2 = path.join(ROOT, ".env");
  if (fs.existsSync(envPath2)) {
    const lines = fs.readFileSync(envPath2, "utf-8").split("\n");
    for (const line of lines) {
      const match = line.match(/^\s*GEMINI_API_KEY\s*=\s*(.+)\s*$/);
      if (match) return match[1].trim();
    }
  }

  return null;
}

const apiKey = loadApiKey();
if (!apiKey) {
  console.error("ERROR: No GEMINI_API_KEY found.");
  console.error("Set it via environment variable or create .env.local with GEMINI_API_KEY=<your-key>");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

const MODEL_TEXT = "gemini-2.5-flash";
const MODEL_IMAGE_GEN = "gemini-2.5-flash-image";

// ── Step 1: Read photo ──────────────────────────────────────────────────────
const photoPath = path.join(ROOT, "docs", "Haris.jpg");
if (!fs.existsSync(photoPath)) {
  console.error("ERROR: Photo not found at", photoPath);
  process.exit(1);
}

console.log("Reading photo from:", photoPath);
const photoBase64 = fs.readFileSync(photoPath).toString("base64");
console.log(`Photo loaded (${Math.round(photoBase64.length / 1024)}KB base64)\n`);

// ── Step 2: Analyze photo (same prompt as analyzeUserPhotoForAvatar) ────────
console.log("=== STEP 1: Analyzing photo with Gemini ===");

const analyzePrompt = `
    Analyze this user photo for a social game.
    Return a JSON object with these 4 fields:
    1. estimatedAge (string)
    2. gender (string)
    3. appearance (string): A detailed visual description of their face, hair, clothes, and style.
    4. traits (array of strings): 3 personality traits guessed from the photo.

    Output PURE JSON.
`;

let analysisResult;
try {
  const response = await ai.models.generateContent({
    model: MODEL_TEXT,
    contents: {
      parts: [
        { inlineData: { mimeType: "image/jpeg", data: photoBase64 } },
        { text: analyzePrompt },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          estimatedAge: { type: "STRING" },
          gender: { type: "STRING" },
          appearance: { type: "STRING" },
          traits: { type: "ARRAY", items: { type: "STRING" } },
        },
        required: ["estimatedAge", "gender", "appearance", "traits"],
      },
    },
  });

  const text = response.text;
  analysisResult = JSON.parse(text);
  console.log("\nPhoto Analysis Result:");
  console.log(JSON.stringify(analysisResult, null, 2));
} catch (err) {
  console.error("Photo analysis failed:", err.message || err);
  // Use fallback description
  analysisResult = {
    estimatedAge: "30s",
    gender: "Male",
    appearance:
      "Bald man with a groomed dark goatee/mustache, wearing aviator sunglasses, navy blue suit with white dress shirt and black bow tie. Sharp, sophisticated, confident look.",
    traits: ["confident", "sophisticated", "bold"],
  };
  console.log("Using fallback description:", JSON.stringify(analysisResult, null, 2));
}

// ── Step 3: Generate abstract avatar (same prompt as buildAvatarPrompt) ─────
console.log("\n=== STEP 2: Generating abstract avatar ===");

const traits = analysisResult.traits || ["confident", "sophisticated", "bold"];
const context = analysisResult.appearance || "A sophisticated bald man with aviator sunglasses and a bow tie.";
const traitList = traits.length > 0 ? traits.join(", ") : "mysterious, enigmatic";
const avatarPrompt = `Abstract artistic portrait avatar. Subject: ${context}. Personality: ${traitList}. Style: Minimalist geometric forms, cinematic noir lighting, moody desaturated color palette, high-end digital art, dramatic shadows and highlights, sophisticated composition. No text or words.`;

console.log("Avatar prompt:", avatarPrompt, "\n");

let avatarSaved = false;
try {
  const response = await ai.models.generateContent({
    model: MODEL_IMAGE_GEN,
    contents: avatarPrompt,
    config: {
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: { aspectRatio: "1:1" },
    },
  });

  const parts = response.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    if (part.inlineData && part.inlineData.data) {
      const mimeType = part.inlineData.mimeType || "image/png";
      const ext = mimeType.includes("png") ? "png" : "jpg";
      const outputPath = path.join(ROOT, "public", `haris-avatar.${ext}`);

      const imageBuffer = Buffer.from(part.inlineData.data, "base64");
      fs.writeFileSync(outputPath, imageBuffer);
      console.log(`Avatar saved to: ${outputPath} (${Math.round(imageBuffer.length / 1024)}KB)`);
      avatarSaved = true;
      break;
    }
  }

  if (!avatarSaved) {
    // Check if there's text response with info
    for (const part of parts) {
      if (part.text) {
        console.log("Model text response:", part.text);
      }
    }
    console.error("No image data in response. The model may not support image generation.");
  }
} catch (err) {
  console.error("Avatar generation failed:", err.message || err);
  console.error("Full error:", JSON.stringify(err, null, 2));
}

// ── Summary ─────────────────────────────────────────────────────────────────
console.log("\n=== SUMMARY ===");
console.log("Estimated Age:", analysisResult.estimatedAge);
console.log("Gender:", analysisResult.gender);
console.log("Appearance:", analysisResult.appearance);
console.log("Traits:", analysisResult.traits?.join(", "));
console.log("Avatar Saved:", avatarSaved ? "YES" : "NO");

if (avatarSaved) {
  console.log("\nYou can reference this avatar in the app as: /haris-avatar.png");
}

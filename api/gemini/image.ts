import { GoogleGenAI } from "@google/genai";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "API key not configured" });

  try {
    const { model, contents, config } = req.body;
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({ model, contents, config });

    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        return res.status(200).json({
          imageData: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
        });
      }
    }
    return res.status(200).json({ imageData: null });
  } catch (error: any) {
    const status = error?.status || error?.response?.status || 500;
    return res.status(status).json({ error: error?.message || "Image generation failed" });
  }
}

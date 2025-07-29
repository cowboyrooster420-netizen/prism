import { NextApiRequest, NextApiResponse } from "next";
import { handlePrompt } from "@/lib/aiHandler";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { prompt } = req.body;
    
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: "Prompt is required and must be a string" });
    }

    const tokens = await handlePrompt(prompt);
    
    res.status(200).json({ tokens });
  } catch (err) {
    console.error('API Error:', err);
    
    // Check if it's an OpenAI configuration error
    if (err instanceof Error && err.message.includes('OpenAI API key')) {
      return res.status(500).json({ 
        error: "OpenAI API key not configured. Please add OPENAI_API_KEY to your .env.local file." 
      });
    }
    
    res.status(500).json({ error: "Failed to process prompt" });
  }
} 
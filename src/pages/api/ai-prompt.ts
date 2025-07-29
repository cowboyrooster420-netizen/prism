import { NextApiRequest, NextApiResponse } from "next";
import { promptToFilters } from "@/lib/promptToFilters";
import { fetchTokensFromFilters } from "@/lib/fetchTokensFromFilters";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { prompt } = req.body;
    
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: "Prompt is required and must be a string" });
    }

    console.log('Processing prompt:', prompt);

    // Convert prompt to filters using AI
    const filters = await promptToFilters(prompt);
    console.log('AI generated filters:', filters);
    
    // Fetch tokens based on filters
    const tokens = await fetchTokensFromFilters(filters);
    console.log('Found tokens:', tokens.length);
    
    res.status(200).json({ tokens, filters }); // Include filters in response for debugging
  } catch (err) {
    console.error('AI Prompt API Error:', err);
    res.status(500).json({ error: "Failed to process prompt" });
  }
} 
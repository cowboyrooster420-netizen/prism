import { NextApiRequest, NextApiResponse } from "next";
import { promptToFilters } from "@/lib/promptToFilters";
import { fetchTokensFromFilters } from "@/lib/fetchTokensFromFilters";

// Input validation schema
const validatePrompt = (prompt: any): string | null => {
  if (!prompt || typeof prompt !== 'string') {
    return 'Prompt is required and must be a string';
  }
  
  if (prompt.trim().length === 0) {
    return 'Prompt cannot be empty';
  }
  
  if (prompt.length > 1000) {
    return 'Prompt is too long (max 1000 characters)';
  }
  
  // Basic security check - prevent potential injection
  if (/[<>{}]/.test(prompt)) {
    return 'Prompt contains invalid characters';
  }
  
  return null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { prompt } = req.body;
    
    // Validate input
    const validationError = validatePrompt(prompt);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    console.log('Processing prompt:', prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''));

    // Convert prompt to filters using AI
    const filters = await promptToFilters(prompt);
    console.log('AI generated filters:', JSON.stringify(filters));
    
    // Fetch tokens based on filters
    const tokens = await fetchTokensFromFilters(filters);
    console.log('Found tokens:', tokens.length);
    
    res.status(200).json({ tokens, filters }); // Include filters in response for debugging
  } catch (err) {
    console.error('AI Prompt API Error:', err);
    res.status(500).json({ error: "Failed to process prompt" });
  }
} 
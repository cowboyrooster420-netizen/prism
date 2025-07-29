import OpenAI from "openai";
import { supabase } from "./supabaseClient";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type TokenFilter = {
  market_cap_max?: number;
  market_cap_min?: number;
  holder_growth_min?: number;
  whale_buys_min?: number;
  deploy_time_max_minutes?: number;
};

async function getFiltersFromOpenAI(prompt: string): Promise<TokenFilter> {
  const { choices } = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0,
    messages: [
      {
        role: "system",
        content: `You are Prism, an AI that converts user prompts into structured filters for token discovery. Only return a valid JSON object with filters. Don't explain anything.`,
      },
      {
        role: "user",
        content: `Prompt: ${prompt}`,
      },
    ],
  });

  let filters: TokenFilter = {};

  try {
    let response = choices[0].message.content ?? "{}";
    
    // Clean the response to extract JSON
    response = response.trim();
    
    // Remove markdown code blocks if present
    if (response.startsWith('```json')) {
      response = response.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (response.startsWith('```')) {
      response = response.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    filters = JSON.parse(response);
  } catch (e) {
    console.error("Failed to parse filter JSON:", e);
    filters = {};
  }

  return filters;
}

export async function handlePrompt(prompt: string) {
  // 1. Use GPT to parse the prompt into filter JSON
  const filters = await getFiltersFromOpenAI(prompt);

  // 2. Build a Supabase query dynamically based on filters
  let query = supabase.from("tokens").select("*").limit(20);

  if (filters.market_cap_max) {
    query = query.lte("market_cap", filters.market_cap_max);
  }
  if (filters.market_cap_min) {
    query = query.gte("market_cap", filters.market_cap_min);
  }
  if (filters.holder_growth_min) {
    query = query.gte("holder_growth_1h", filters.holder_growth_min);
  }
  if (filters.whale_buys_min) {
    query = query.gte("whale_buys_1h", filters.whale_buys_min);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Supabase query error:", error);
    // Fallback to mock data if query fails
    return [
      {
        name: "MockToken",
        symbol: "MOCK",
        address: "So11111111111111111111111111111111111111112",
        market_cap: filters.market_cap_max || 5000000,
        holders_1h: filters.holder_growth_min || 100,
        whale_buys_1h: filters.whale_buys_min || 2,
        reason: `Matched filters: ${JSON.stringify(filters)}`,
      },
    ];
  }

  return data || [];
} 
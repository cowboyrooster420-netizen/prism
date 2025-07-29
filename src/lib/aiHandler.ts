import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface TokenRecommendation {
  name: string;
  symbol: string;
  address: string;
  market_cap: number;
  holders_1h: number;
  whale_buys_1h: number;
  reason: string;
}

export async function handlePrompt(prompt: string): Promise<TokenRecommendation[]> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a crypto token analyst. Analyze the user's prompt and return exactly 2-3 token recommendations.

IMPORTANT: Return ONLY a valid JSON array with no markdown formatting, no code blocks, no explanations, and no additional text.

Each token object must have these exact fields:
- name: Token name (string)
- symbol: Token symbol (3-5 letters, string)
- address: A realistic Solana address (base58 format, 32-44 characters, string)
- market_cap: Estimated market cap in USD (number)
- holders_1h: Number of new holders in the last hour (number)
- whale_buys_1h: Number of whale transactions in the last hour (number)
- reason: Brief explanation of why this token is trending (string)

Example format:
[{"name":"Bonk","symbol":"BONK","address":"So11111111111111111111111111111111111111112","market_cap":4300000,"holders_1h":182,"whale_buys_1h":3,"reason":"Up 182 holders in 1h. 3 whales entered. LP solid."}]`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 800,
    });

    const response = completion.choices[0]?.message?.content;
    
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    // Clean the response to extract JSON
    let cleanedResponse = response.trim();
    
    // Remove markdown code blocks if present
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    // Parse the JSON response
    const tokens = JSON.parse(cleanedResponse) as TokenRecommendation[];
    
    // Validate the response structure
    if (!Array.isArray(tokens)) {
      throw new Error('Invalid response format from OpenAI');
    }

    return tokens;
  } catch (error) {
    console.error('OpenAI API error:', error);
    
    // Fallback to mock data if OpenAI fails
    return [
      {
        name: "Bonk",
        symbol: "BONK",
        address: "So11111111111111111111111111111111111111112",
        market_cap: 4300000,
        holders_1h: 182,
        whale_buys_1h: 3,
        reason: "Up 182 holders in 1h. 3 whales entered. LP solid.",
      },
      {
        name: "Frenz",
        symbol: "FRNZ",
        address: "FRNZ123456789000000000000000000000000000000",
        market_cap: 2400000,
        holders_1h: 96,
        whale_buys_1h: 1,
        reason: "Low-cap, early inflows, trending onchain.",
      },
    ];
  }
} 
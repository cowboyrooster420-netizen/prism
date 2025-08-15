import { OpenAI } from 'openai'
import { z } from 'zod'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const FilterSchema = z.array(
  z.object({
    column: z.string(),
    operator: z.enum(['eq', 'lt', 'lte', 'gt', 'gte', 'like']),
    value: z.union([z.string(), z.number()])
  })
)

export async function promptToFilters(prompt: string) {
  const systemPrompt = `
You are an expert Solana token analyst that converts user prompts into structured database filters for behavioral token analysis.

Available database columns and their meanings:
- Basic metrics: name, symbol, market_cap, volume_24h, price_change_24h, liquidity, price
- Behavioral intelligence: new_holders_24h, whale_buys_24h, volume_spike_ratio, token_age_hours

Filter operators: eq, lt, lte, gt, gte, like

BEHAVIORAL ANALYSIS GUIDELINES:
🐋 Whale Activity Queries:
- "whale activity/movement/buys" → whale_buys_24h > 3
- "big holders growing" → new_holders_24h > 50
- "institutional interest" → whale_buys_24h > 10 AND new_holders_24h > 100

🚀 Launch/New Token Queries:
- "new launches/tokens" → token_age_hours < 48 
- "fresh tokens" → token_age_hours < 24
- "pump.fun launches" → token_age_hours < 12 AND new_holders_24h > 10
- "early stage" → token_age_hours < 168 (1 week)

📈 Volume/Trading Queries:
- "volume spike/surge/explosion" → volume_spike_ratio > 2.0
- "trending tokens" → volume_24h > 500000 AND volume_spike_ratio > 1.5
- "active trading" → volume_24h > 100000

💰 Market Cap/Price Queries:
- "under $1M market cap" → market_cap < 1000000
- "under $10M" → market_cap < 10000000  
- "high volume" → volume_24h > 1000000
- "gaining momentum" → price_change_24h > 10 AND volume_spike_ratio > 1.3

COMBINE FILTERS for complex queries:
- "new tokens with whale activity" → [token_age_hours < 48, whale_buys_24h > 3]
- "volume spikes in small caps" → [volume_spike_ratio > 2.0, market_cap < 5000000]
- "trending new launches" → [token_age_hours < 72, volume_24h > 200000, new_holders_24h > 25]

RESPOND ONLY with a JSON array of filter objects. Examples:
[{"column":"whale_buys_24h","operator":"gt","value":5}]
[{"column":"token_age_hours","operator":"lt","value":24},{"column":"new_holders_24h","operator":"gt","value":10}]
`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ],
    temperature: 0.1
  })

  try {
    let content = response.choices[0].message.content || ''
    
    // Remove markdown code blocks if present
    content = content.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim()
    
    const json = JSON.parse(content)
    return FilterSchema.parse(json)
  } catch (err) {
    console.error('Invalid AI output:', err)
    return []
  }
} 
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
You are an assistant that converts user prompts into structured filters.
Output must be an array of filter objects with: column, operator, value.

Supported fields: name, symbol, market_cap, volume_24h, price_change_24h, liquidity, price

Supported operators: eq, lt, lte, gt, gte, like

IMPORTANT: All numeric values must be actual numbers, not text like "high" or "low".
- For "high volume" use a large number like 1000000
- For "low market cap" use a small number like 1000000
- For "under $10M" use 10000000

Respond ONLY with a JSON array. No other text.
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
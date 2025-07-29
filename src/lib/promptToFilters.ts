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

Supported fields: name, symbol, market_cap, volume_1h, holder_growth_1h, whale_buys_1h, liquidity_usd

Supported operators: eq, lt, lte, gt, gte, like

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
    const json = JSON.parse(response.choices[0].message.content || '')
    return FilterSchema.parse(json)
  } catch (err) {
    console.error('Invalid AI output:', err)
    return []
  }
} 
import { supabase } from './supabaseClient'

interface Filter {
  column: string
  operator: 'eq' | 'lt' | 'lte' | 'gt' | 'gte' | 'like'
  value: string | number
}

export async function fetchTokensFromFilters(filters: Filter[]) {
  let query = supabase.from('tokens').select('*')

  for (const f of filters) {
    if (['eq', 'lt', 'lte', 'gt', 'gte', 'like'].includes(f.operator)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      query = (query as any)[f.operator](f.column, f.value)
    }
  }

  const { data, error } = await query.limit(50)

  if (error) {
    console.error(error)
    return []
  }

  return data
} 
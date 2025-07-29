import { supabase } from '@/lib/supabaseClient'

export async function fetchTokensUnder5M() {
  const { data, error } = await supabase
    .from('tokens')
    .select('*')
    .lte('market_cap', 5000000)
    .order('market_cap', { ascending: true })

  if (error) {
    console.error(error)
    return []
  }

  return data
} 
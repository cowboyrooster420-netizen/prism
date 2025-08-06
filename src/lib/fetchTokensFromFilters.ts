import { supabase } from './supabaseClient'

interface Filter {
  column: string
  operator: 'eq' | 'lt' | 'lte' | 'gt' | 'gte' | 'like'
  value: string | number
}

// Validate filter object
const validateFilter = (filter: any): filter is Filter => {
  return (
    filter &&
    typeof filter.column === 'string' &&
    ['eq', 'lt', 'lte', 'gt', 'gte', 'like'].includes(filter.operator) &&
    (typeof filter.value === 'string' || typeof filter.value === 'number')
  );
};

// Validate column names to prevent injection
const validColumns = [
  'name', 'symbol', 'market_cap', 'volume_24h', 
  'price_change_24h', 'liquidity', 'price', 'tier', 'source'
];

const isValidColumn = (column: string): boolean => {
  return validColumns.includes(column);
};

export async function fetchTokensFromFilters(filters: Filter[]) {
  try {
    // Validate filters array
    if (!Array.isArray(filters)) {
      console.error('Filters must be an array');
      return [];
    }

    // Validate each filter
    const validFilters = filters.filter(validateFilter);
    
    if (validFilters.length !== filters.length) {
      console.warn(`Filtered out ${filters.length - validFilters.length} invalid filters`);
    }

    let query = supabase.from('tokens').select('*')

    for (const f of validFilters) {
      // Additional security check for column names
      if (!isValidColumn(f.column)) {
        console.warn(`Invalid column name: ${f.column}`);
        continue;
      }

      if (['eq', 'lt', 'lte', 'gt', 'gte', 'like'].includes(f.operator)) {
        query = (query as any)[f.operator](f.column, f.value)
      }
    }

    const { data, error } = await query.limit(500)

    if (error) {
      console.error('Supabase query error:', error)
      return []
    }

    // Validate response data
    if (!data || !Array.isArray(data)) {
      console.error('Invalid response from Supabase')
      return []
    }

    return data
  } catch (error) {
    console.error('Error in fetchTokensFromFilters:', error)
    return []
  }
} 
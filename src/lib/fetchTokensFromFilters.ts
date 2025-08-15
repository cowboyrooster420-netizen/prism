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
  // Basic columns
  'name', 'symbol', 'market_cap', 'volume_24h', 
  'price_change_24h', 'liquidity', 'price', 'tier', 'source',
  // Behavioral columns
  'new_holders_24h', 'whale_buys_24h', 'volume_spike_ratio', 'token_age_hours'
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

      switch (f.operator) {
        case 'eq':
          query = query.eq(f.column, f.value);
          break;
        case 'lt':
          query = query.lt(f.column, f.value);
          break;
        case 'lte':
          query = query.lte(f.column, f.value);
          break;
        case 'gt':
          query = query.gt(f.column, f.value);
          break;
        case 'gte':
          query = query.gte(f.column, f.value);
          break;
        case 'like':
          query = query.ilike(f.column, `%${f.value}%`);
          break;
        default:
          console.warn(`Unsupported operator: ${f.operator}`);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error in fetchTokensFromFilters:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in fetchTokensFromFilters:', error);
    return [];
  }
}

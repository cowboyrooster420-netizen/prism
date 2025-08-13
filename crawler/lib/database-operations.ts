/* lib/database-operations.ts
   Database operations for TA features with enhanced error handling
*/

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Candle, TAFeature } from './feature-computation';
import { 
  DatabaseConnectionError, 
  DatabaseQueryError, 
  InsufficientDataError,
  ErrorFactory 
} from './error-types';
import { withRecovery, RecoveryContext } from './error-recovery';

export type DatabaseConfig = {
  url: string;
  serviceRoleKey: string;
};

/**
 * Create Supabase client with service role
 * @param config - Database configuration
 * @returns Supabase client instance
 */
export function createSupabaseClient(config: DatabaseConfig): SupabaseClient {
  return createClient(config.url, config.serviceRoleKey);
}

/**
 * Fetch candle data from database
 * @param supabase - Supabase client instance
 * @param token_id - Token identifier
 * @param timeframe - Timeframe identifier
 * @param limit - Maximum number of candles to fetch
 * @returns Promise resolving to array of candles
 */
export async function fetchCandlesFromDB(
  supabase: SupabaseClient,
  token_id: string,
  timeframe: string,
  limit: number = 300
): Promise<Candle[]> {
  const context: RecoveryContext = {
    operation: 'fetchCandlesFromDB',
    token_id,
    timeframe
  };

  return withRecovery(async () => {
    const { data, error } = await supabase
      .from('candles')
      .select('ts,open,high,low,close,volume,quote_volume_usd')
      .eq('token_id', token_id)
      .eq('timeframe', timeframe)
      .order('ts', { ascending: true })
      .limit(limit);

    if (error) {
      throw ErrorFactory.create('DB_QUERY_ERROR', 
        `Failed to fetch candles for ${token_id} ${timeframe}: ${error.message}`,
        { token_id, timeframe, limit, supabaseError: error }
      );
    }

    if (!data || data.length === 0) {
      throw new InsufficientDataError(
        `No candle data found for ${token_id} ${timeframe}`,
        { token_id, timeframe, limit }
      );
    }

    if (data.length < 60) {
      throw new InsufficientDataError(
        `Insufficient candle data for ${token_id} ${timeframe}: ${data.length} candles (minimum 60 required)`,
        { token_id, timeframe, limit, actualCount: data.length, requiredCount: 60 }
      );
    }

    return data.map((r: any) => ({
      ts: r.ts,
      open: Number(r.open),
      high: Number(r.high),
      low: Number(r.low),
      close: Number(r.close),
      volume: Number(r.volume),
      quote_volume_usd: Number(r.quote_volume_usd),
    }));
  }, context);
}

/**
 * Upsert TA features to database in batches
 * @param supabase - Supabase client instance
 * @param rows - Array of TA features to upsert
 * @param batchSize - Size of each batch (default: 500)
 * @returns Promise resolving when all batches are processed
 */
export async function upsertTA(
  supabase: SupabaseClient,
  rows: TAFeature[],
  batchSize: number = 500
): Promise<void> {
  if (rows.length === 0) return;

  const context: RecoveryContext = {
    operation: 'upsertTA',
    maxRetries: 3
  };

  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    
    await withRecovery(async () => {
      const { error } = await supabase
        .from('ta_features')
        .upsert(chunk, { onConflict: 'token_id,timeframe,ts' });
      
      if (error) {
        throw ErrorFactory.create('DB_QUERY_ERROR',
          `Failed to upsert TA features batch ${batchNumber}: ${error.message}`,
          { batchNumber, batchSize: chunk.length, supabaseError: error }
        );
      }
    }, { ...context, operation: `upsertTA_batch_${batchNumber}` });
  }
}

/**
 * Refresh the ta_latest materialized view
 * @param supabase - Supabase client instance
 * @returns Promise resolving when refresh is complete
 */
export async function refreshTALatest(supabase: SupabaseClient): Promise<void> {
  const context: RecoveryContext = {
    operation: 'refreshTALatest',
    maxRetries: 2
  };

  await withRecovery(async () => {
    const { error } = await supabase.rpc('refresh_ta_latest');
    
    if (error) {
      throw ErrorFactory.create('DB_QUERY_ERROR',
        `Failed to refresh ta_latest: ${error.message}`,
        { supabaseError: error }
      );
    }
  }, context);
}

/**
 * Get database connection status
 * @param supabase - Supabase client instance
 * @returns Promise resolving to connection status
 */
export async function checkDatabaseConnection(supabase: SupabaseClient): Promise<boolean> {
  try {
    const { data, error } = await supabase.from('ta_features').select('count').limit(1);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Get count of TA features for a specific token and timeframe
 * @param supabase - Supabase client instance
 * @param token_id - Token identifier
 * @param timeframe - Timeframe identifier
 * @returns Promise resolving to count of features
 */
export async function getTAFeatureCount(
  supabase: SupabaseClient,
  token_id: string,
  timeframe: string
): Promise<number> {
  const { count, error } = await supabase
    .from('ta_features')
    .select('*', { count: 'exact', head: true })
    .eq('token_id', token_id)
    .eq('timeframe', timeframe);

  if (error) {
    throw new Error(`Failed to get feature count for ${token_id} ${timeframe}: ${error.message}`);
  }

  return count ?? 0;
}

/**
 * Get latest TA feature timestamp for a specific token and timeframe
 * @param supabase - Supabase client instance
 * @param token_id - Token identifier
 * @param timeframe - Timeframe identifier
 * @returns Promise resolving to latest timestamp or null
 */
export async function getLatestTAFeatureTimestamp(
  supabase: SupabaseClient,
  token_id: string,
  timeframe: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('ta_features')
    .select('ts')
    .eq('token_id', token_id)
    .eq('timeframe', timeframe)
    .order('ts', { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(`Failed to get latest timestamp for ${token_id} ${timeframe}: ${error.message}`);
  }

  return data?.[0]?.ts ?? null;
}

/**
 * Delete TA features for a specific token and timeframe
 * @param supabase - Supabase client instance
 * @param token_id - Token identifier
 * @param timeframe - Timeframe identifier
 * @returns Promise resolving to number of deleted rows
 */
export async function deleteTAFeatures(
  supabase: SupabaseClient,
  token_id: string,
  timeframe: string
): Promise<number> {
  const { count, error } = await supabase
    .from('ta_features')
    .delete()
    .eq('token_id', token_id)
    .eq('timeframe', timeframe)
    .select('*', { count: 'exact' });

  if (error) {
    throw new Error(`Failed to delete features for ${token_id} ${timeframe}: ${error.message}`);
  }

  return count ?? 0;
}

/**
 * Get database table information
 * @param supabase - Supabase client instance
 * @returns Promise resolving to table information
 */
export async function getTableInfo(supabase: SupabaseClient): Promise<any> {
  const { data, error } = await supabase
    .from('ta_features')
    .select('*')
    .limit(0);

  if (error) {
    throw new Error(`Failed to get table info: ${error.message}`);
  }

  return {
    columns: Object.keys(data?.[0] ?? {}),
    rowCount: await getTAFeatureCount(supabase, '', '')
  };
}

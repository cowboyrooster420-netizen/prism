/**
 * Hook for fetching real OHLCV data from database
 */

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface OHLCVData {
  time: number; // Unix timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface UseOHLCVDataOptions {
  tokenAddress: string;
  timeframe: string;
  daysBack?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UseOHLCVDataReturn {
  data: OHLCVData[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
  hasData: boolean;
}

export function useOHLCVData({
  tokenAddress,
  timeframe,
  daysBack = 30,
  autoRefresh = false,
  refreshInterval = 60000 // 1 minute
}: UseOHLCVDataOptions): UseOHLCVDataReturn {
  const [data, setData] = useState<OHLCVData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    if (!tokenAddress || !timeframe) {
      setError('Token address and timeframe are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);

      const { data: ohlcvData, error: fetchError } = await supabase
        .from('token_ohlcv_history')
        .select('timestamp_unix, open_price, high_price, low_price, close_price, volume')
        .eq('token_address', tokenAddress)
        .eq('timeframe', timeframe)
        .gte('timestamp_utc', cutoffDate.toISOString())
        .order('timestamp_unix', { ascending: true })
        .limit(2000);

      if (fetchError) {
        throw new Error(`Database error: ${fetchError.message}`);
      }

      if (!ohlcvData || ohlcvData.length === 0) {
        setError(`No OHLCV data found for ${tokenAddress} (${timeframe})`);
        setData([]);
        setLastUpdated(new Date());
        return;
      }

      // Transform data to the expected format
      const transformedData: OHLCVData[] = ohlcvData.map(record => ({
        time: record.timestamp_unix,
        open: parseFloat(record.open_price),
        high: parseFloat(record.high_price),
        low: parseFloat(record.low_price),
        close: parseFloat(record.close_price),
        volume: parseFloat(record.volume) || 0,
      }));

      // Validate data quality
      const validData = transformedData.filter(candle => 
        candle.time > 0 &&
        candle.open > 0 &&
        candle.high > 0 &&
        candle.low > 0 &&
        candle.close > 0 &&
        candle.high >= candle.low &&
        candle.high >= Math.max(candle.open, candle.close) &&
        candle.low <= Math.min(candle.open, candle.close)
      );

      if (validData.length === 0) {
        setError('No valid OHLCV data found');
        setData([]);
      } else {
        // Ensure data is sorted by time in ascending order (required by lightweight-charts)
        const sortedData = validData.sort((a, b) => a.time - b.time);
        setData(sortedData);
        console.log(`✅ Loaded ${sortedData.length} candles for ${tokenAddress} (${timeframe})`);
      }

      setLastUpdated(new Date());

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error fetching OHLCV data:', err);
    } finally {
      setLoading(false);
    }
  }, [tokenAddress, timeframe, daysBack]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) return;

    const interval = setInterval(() => {
      fetchData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchData]);

  return {
    data,
    loading,
    error,
    lastUpdated,
    refresh: fetchData,
    hasData: data.length > 0
  };
}

/**
 * Hook for fetching available tokens with OHLCV data
 */
export function useAvailableTokens() {
  const [tokens, setTokens] = useState<Array<{ address: string; symbol?: string; name?: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTokens = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Get tokens that have recent OHLCV data
      const { data: tokenData, error: fetchError } = await supabase
        .from('token_ohlcv_history')
        .select('token_address, count(*)')
        .gte('timestamp_utc', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
        .group('token_address')
        .order('count', { ascending: false })
        .limit(100);

      if (fetchError) {
        throw new Error(`Database error: ${fetchError.message}`);
      }

      // Get token metadata if available
      const tokenAddresses = tokenData?.map(t => t.token_address) || [];
      
      if (tokenAddresses.length > 0) {
        const { data: metadata, error: metaError } = await supabase
          .from('tokens')
          .select('mint_address, symbol, name')
          .in('mint_address', tokenAddresses);

        if (!metaError && metadata) {
          const tokensWithMeta = tokenData?.map(t => {
            const meta = metadata.find(m => m.mint_address === t.token_address);
            return {
              address: t.token_address,
              symbol: meta?.symbol,
              name: meta?.name,
              dataPoints: t.count
            };
          }) || [];

          setTokens(tokensWithMeta);
        } else {
          // Fallback without metadata
          setTokens(tokenData?.map(t => ({ 
            address: t.token_address,
            dataPoints: t.count 
          })) || []);
        }
      } else {
        setTokens([]);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error fetching available tokens:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  return {
    tokens,
    loading,
    error,
    refresh: fetchTokens
  };
}

/**
 * Hook for fetching token tier information
 */
export function useTokenTier(tokenAddress: string) {
  const [tierInfo, setTierInfo] = useState<{
    tier: number;
    hotnessScore: number;
    rank?: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTierInfo = useCallback(async () => {
    if (!tokenAddress) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('token_tiers')
        .select('current_tier, hotness_score')
        .eq('token_address', tokenAddress)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // No data found - token not in tiers system
          setTierInfo(null);
        } else {
          throw new Error(`Database error: ${fetchError.message}`);
        }
        return;
      }

      // Get rank by counting tokens with higher scores
      const { count } = await supabase
        .from('token_tiers')
        .select('*', { count: 'exact', head: true })
        .gt('hotness_score', data.hotness_score);

      setTierInfo({
        tier: data.current_tier,
        hotnessScore: data.hotness_score,
        rank: (count || 0) + 1
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error fetching tier info:', err);
    } finally {
      setLoading(false);
    }
  }, [tokenAddress]);

  useEffect(() => {
    fetchTierInfo();
  }, [fetchTierInfo]);

  return {
    tierInfo,
    loading,
    error,
    refresh: fetchTierInfo
  };
}
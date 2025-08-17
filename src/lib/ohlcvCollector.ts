/**
 * OHLCV Data Collection Service
 * Collects and stores historical OHLCV data for technical analysis
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Use service role for data collection
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface OHLCVData {
  timestamp: number; // Unix timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface OHLCVRecord {
  token_address: string;
  timestamp_unix: number;
  timestamp_utc: string;
  timeframe: string;
  open_price: number;
  high_price: number;
  low_price: number;
  close_price: number;
  volume: number;
  volume_usd?: number;
  data_source: string;
  confidence_score: number;
}

export class OHLCVCollector {
  private readonly BIRDEYE_API_KEY = process.env.NEXT_PUBLIC_BIRDEYE_API_KEY || process.env.BIRDEYE_API_KEY;
  private readonly RATE_LIMIT_DELAY = 100; // ms between requests
  
  constructor() {
    if (!this.BIRDEYE_API_KEY) {
      console.warn('BIRDEYE_API_KEY not found, OHLCV collection may be limited');
    }
  }

  /**
   * Fetch OHLCV data from Birdeye v3 API
   */
  private async fetchBirdeyeOHLCV(
    tokenAddress: string, 
    timeframe: string = '1H',
    fromTime?: number,
    toTime?: number
  ): Promise<OHLCVData[]> {
    const baseUrl = 'https://public-api.birdeye.so/defi/v3/ohlcv';
    const params = new URLSearchParams({
      address: tokenAddress,
      type: timeframe,
    });
    
    if (fromTime) params.append('time_from', fromTime.toString());
    if (toTime) params.append('time_to', toTime.toString());

    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    
    if (this.BIRDEYE_API_KEY) {
      headers['X-API-KEY'] = this.BIRDEYE_API_KEY;
    }

    try {
      console.log(`📊 Fetching OHLCV data for ${tokenAddress} (${timeframe})`);
      
      const response = await fetch(`${baseUrl}?${params}`, { headers });
      
      if (!response.ok) {
        throw new Error(`Birdeye API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success || !data.data?.items) {
        console.warn(`No OHLCV data available for ${tokenAddress}`);
        return [];
      }

      return data.data.items.map((item: any) => ({
        timestamp: item.unix_time,
        open: parseFloat(item.o),
        high: parseFloat(item.h),
        low: parseFloat(item.l),
        close: parseFloat(item.c),
        volume: parseFloat(item.v) || 0,
      }));
      
    } catch (error) {
      console.error(`Error fetching OHLCV data for ${tokenAddress}:`, error);
      return [];
    }
  }

  /**
   * Get the latest timestamp for a token/timeframe to enable incremental updates
   */
  private async getLatestTimestamp(tokenAddress: string, timeframe: string): Promise<Date | null> {
    try {
      // Try using the database function first
      const { data, error } = await supabase
        .rpc('get_latest_ohlcv_timestamp', {
          token_addr: tokenAddress,
          timeframe_param: timeframe
        });

      if (!error && data) {
        return new Date(data);
      }

      // Fall back to direct query if function doesn't exist
      const { data: directData, error: directError } = await supabase
        .from('token_ohlcv_history')
        .select('timestamp_utc')
        .eq('token_address', tokenAddress)
        .eq('timeframe', timeframe)
        .order('timestamp_utc', { ascending: false })
        .limit(1)
        .single();

      if (directError) {
        console.log('No existing data found for incremental update, will do full collection');
        return null;
      }

      return directData ? new Date(directData.timestamp_utc) : null;
    } catch (error) {
      console.error('Error getting latest timestamp:', error);
      return null;
    }
  }

  /**
   * Store OHLCV data in the database
   */
  private async storeOHLCVData(records: OHLCVRecord[]): Promise<boolean> {
    if (records.length === 0) return true;

    try {
      const { error } = await supabase
        .from('token_ohlcv_history')
        .upsert(records, { 
          onConflict: 'token_address,timeframe,timestamp_unix',
          ignoreDuplicates: true 
        });

      if (error) {
        console.error('Error storing OHLCV data:', error);
        return false;
      }

      console.log(`✅ Stored ${records.length} OHLCV records`);
      return true;
      
    } catch (error) {
      console.error('Database error storing OHLCV data:', error);
      return false;
    }
  }

  /**
   * Convert timeframe format between systems
   */
  private convertTimeframe(timeframe: string): string {
    const timeframeMap: Record<string, string> = {
      '1h': '1H',
      '4h': '4H', 
      '1d': '1D',
      '1w': '1W'
    };
    
    return timeframeMap[timeframe] || '1H';
  }

  /**
   * Collect OHLCV data for a specific token and timeframe
   */
  public async collectTokenOHLCV(
    tokenAddress: string, 
    timeframe: string = '1h',
    daysBack: number = 30
  ): Promise<boolean> {
    try {
      console.log(`🔄 Starting OHLCV collection for ${tokenAddress} (${timeframe})`);

      // Get the latest timestamp we have for this token/timeframe
      const latestTimestamp = await this.getLatestTimestamp(tokenAddress, timeframe);
      
      // Calculate time range
      const now = Date.now();
      const msPerDay = 24 * 60 * 60 * 1000;
      
      let fromTime: number;
      if (latestTimestamp) {
        // Incremental update: start from latest + 1 hour
        fromTime = Math.floor(latestTimestamp.getTime() / 1000) + 3600;
        console.log(`📈 Incremental update from ${new Date(fromTime * 1000).toISOString()}`);
      } else {
        // Initial collection: go back specified days
        fromTime = Math.floor((now - (daysBack * msPerDay)) / 1000);
        console.log(`🆕 Initial collection from ${new Date(fromTime * 1000).toISOString()}`);
      }
      
      const toTime = Math.floor(now / 1000);

      // Birdeye v3 API requires time parameters, so ensure we always have them
      if (!fromTime) {
        fromTime = Math.floor((now - (7 * msPerDay)) / 1000); // Default to 7 days back
      }

      // Don't collect if we're already up to date
      if (fromTime >= toTime) {
        console.log(`✅ Already up to date for ${tokenAddress}`);
        return true;
      }

      // Fetch data from Birdeye
      const birdeyeTimeframe = this.convertTimeframe(timeframe);
      const ohlcvData = await this.fetchBirdeyeOHLCV(
        tokenAddress,
        birdeyeTimeframe,
        fromTime,
        toTime
      );

      if (ohlcvData.length === 0) {
        console.log(`⚠️ No new OHLCV data available for ${tokenAddress}`);
        return true;
      }

      // Convert to database format
      const records: OHLCVRecord[] = ohlcvData.map(candle => ({
        token_address: tokenAddress,
        timestamp_unix: candle.timestamp,
        timestamp_utc: new Date(candle.timestamp * 1000).toISOString(),
        timeframe: timeframe,
        open_price: candle.open,
        high_price: candle.high,
        low_price: candle.low,
        close_price: candle.close,
        volume: candle.volume || 0,
        volume_usd: (candle.volume || 0) * candle.close, // Rough USD volume estimate
        data_source: 'birdeye',
        confidence_score: 1.0
      }));

      // Store in database
      const success = await this.storeOHLCVData(records);
      
      if (success) {
        // Update collection status
        await this.updateCollectionStatus(tokenAddress, timeframe, true);
        console.log(`✅ Successfully collected ${records.length} candles for ${tokenAddress}`);
      }

      return success;

    } catch (error) {
      console.error(`❌ Error collecting OHLCV data for ${tokenAddress}:`, error);
      await this.updateCollectionStatus(tokenAddress, timeframe, false);
      return false;
    }
  }

  /**
   * Update collection status tracking
   */
  private async updateCollectionStatus(
    tokenAddress: string, 
    timeframe: string, 
    success: boolean
  ): Promise<void> {
    try {
      const updateData: any = {
        last_collection_at: new Date().toISOString(),
      };

      if (success) {
        updateData.last_successful_timestamp = new Date().toISOString();
        updateData.collection_errors = 0;
      } else {
        // Increment error count
        const { data: currentStatus } = await supabase
          .from('ohlcv_collection_status')
          .select('collection_errors')
          .eq('token_address', tokenAddress)
          .eq('timeframe', timeframe)
          .single();

        updateData.collection_errors = (currentStatus?.collection_errors || 0) + 1;
      }

      await supabase
        .from('ohlcv_collection_status')
        .upsert({
          token_address: tokenAddress,
          timeframe: timeframe,
          ...updateData
        }, {
          onConflict: 'token_address,timeframe'
        });

    } catch (error) {
      console.error('Error updating collection status:', error);
    }
  }

  /**
   * Collect OHLCV data for multiple tokens
   */
  public async collectMultipleTokens(
    tokenAddresses: string[], 
    timeframes: string[] = ['1h'],
    daysBack: number = 30
  ): Promise<void> {
    console.log(`🚀 Starting bulk OHLCV collection for ${tokenAddresses.length} tokens`);
    
    for (const tokenAddress of tokenAddresses) {
      for (const timeframe of timeframes) {
        try {
          await this.collectTokenOHLCV(tokenAddress, timeframe, daysBack);
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_DELAY));
          
        } catch (error) {
          console.error(`Error collecting data for ${tokenAddress}:`, error);
          continue;
        }
      }
    }
    
    console.log(`✅ Bulk OHLCV collection completed`);
  }

  /**
   * Get historical OHLCV data for TA analysis
   */
  public async getHistoricalData(
    tokenAddress: string,
    timeframe: string = '1h',
    daysBack: number = 30
  ): Promise<OHLCVData[]> {
    try {
      // Try using the database function first
      const { data, error } = await supabase
        .rpc('get_token_ohlcv_history', {
          token_addr: tokenAddress,
          timeframe_param: timeframe,
          days_back: daysBack,
          limit_rows: 1000
        });

      if (!error && data) {
        return data.map((record: any) => ({
          timestamp: record.timestamp_unix,
          open: parseFloat(record.open_price),
          high: parseFloat(record.high_price),
          low: parseFloat(record.low_price),
          close: parseFloat(record.close_price),
          volume: parseFloat(record.volume) || 0,
        }));
      }

      // Fall back to direct query if function doesn't exist
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);

      const { data: directData, error: directError } = await supabase
        .from('token_ohlcv_history')
        .select('timestamp_unix, open_price, high_price, low_price, close_price, volume')
        .eq('token_address', tokenAddress)
        .eq('timeframe', timeframe)
        .gte('timestamp_utc', cutoffDate.toISOString())
        .order('timestamp_utc', { ascending: false })
        .limit(1000);

      if (directError) {
        console.error('Error fetching historical OHLCV data:', directError);
        return [];
      }

      return (directData || []).map((record: any) => ({
        timestamp: record.timestamp_unix,
        open: parseFloat(record.open_price),
        high: parseFloat(record.high_price),
        low: parseFloat(record.low_price),
        close: parseFloat(record.close_price),
        volume: parseFloat(record.volume) || 0,
      }));
    } catch (error) {
      console.error('Error fetching historical OHLCV data:', error);
      return [];
    }
  }

  /**
   * Get data availability summary
   */
  public async getDataSummary(): Promise<any[]> {
    const { data, error } = await supabase
      .rpc('get_ohlcv_data_summary');

    if (error) {
      console.error('Error fetching data summary:', error);
      return [];
    }

    return data || [];
  }
}

// Export singleton instance
export const ohlcvCollector = new OHLCVCollector();
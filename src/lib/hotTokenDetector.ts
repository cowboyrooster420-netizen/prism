/**
 * Hot Token Detection Service
 * Calculates hotness scores and manages token tier assignments
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface HotnessMetrics {
  volume_24h: number;
  volume_1h: number;
  price_change_24h: number;
  price_change_1h: number;
  holders_change_24h: number;
  transaction_count_1h: number;
  unique_wallets_1h: number;
  age_hours: number;
  price_current: number;
  mentions_count?: number;
  social_sentiment?: number;
}

export interface TokenTier {
  token_address: string;
  current_tier: number;
  hotness_score: number;
  last_tier_change: string;
  consecutive_high_scores: number;
  consecutive_low_scores: number;
  rank?: number;
}

export interface HotnessResult {
  token_address: string;
  hotness_score: number;
  volume_score: number;
  volatility_score: number;
  activity_score: number;
  newness_score: number;
  previous_tier?: number;
  new_tier: number;
  rank: number;
}

export class HotTokenDetector {
  private readonly BIRDEYE_API_KEY = process.env.NEXT_PUBLIC_BIRDEYE_API_KEY || process.env.BIRDEYE_API_KEY;

  constructor() {
    if (!this.BIRDEYE_API_KEY) {
      console.warn('BIRDEYE_API_KEY not found, some metrics may be limited');
    }
  }

  /**
   * Calculate hotness score for a token
   */
  private calculateHotnessScore(metrics: HotnessMetrics): {
    total: number;
    breakdown: {
      volume: number;
      volatility: number;
      activity: number;
      newness: number;
    };
  } {
    const breakdown = {
      volume: 0,
      volatility: 0,
      activity: 0,
      newness: 0
    };

    // Volume momentum (40% weight)
    if (metrics.volume_24h > 0) {
      const volumeRatio = metrics.volume_1h / (metrics.volume_24h / 24);
      breakdown.volume = Math.min(volumeRatio * 40, 40);
    }

    // Price volatility (30% weight) 
    const volatility = Math.abs(metrics.price_change_1h) + Math.abs(metrics.price_change_24h);
    breakdown.volatility = Math.min(volatility * 0.3, 30);

    // Activity surge (20% weight)
    const activityScore = (metrics.transaction_count_1h / 100) + (metrics.unique_wallets_1h / 50);
    breakdown.activity = Math.min(activityScore, 20);

    // Newness bonus (10% weight) - favor tokens less than 48 hours old
    if (metrics.age_hours < 48) {
      breakdown.newness = (48 - metrics.age_hours) / 48 * 10;
    }

    const total = Math.min(
      breakdown.volume + breakdown.volatility + breakdown.activity + breakdown.newness,
      100
    );

    return { total, breakdown };
  }

  /**
   * Fetch current metrics for a token from various sources
   */
  private async fetchTokenMetrics(tokenAddress: string): Promise<HotnessMetrics | null> {
    try {
      // Get basic token data from our database
      const { data: tokenData, error: tokenError } = await supabase
        .from('tokens')
        .select('price, volume_24h, price_change_24h, holders, holder_change_24h, created_at')
        .eq('mint_address', tokenAddress)
        .single();

      if (tokenError || !tokenData) {
        console.warn(`Token ${tokenAddress} not found in database`);
        return null;
      }

      // Calculate age in hours
      const ageHours = (Date.now() - new Date(tokenData.created_at).getTime()) / (1000 * 60 * 60);

      // Get recent OHLCV data to calculate 1h metrics
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const { data: recentCandles } = await supabase
        .from('token_ohlcv_history')
        .select('volume, close_price, timestamp_utc')
        .eq('token_address', tokenAddress)
        .eq('timeframe', '1h')
        .gte('timestamp_utc', oneHourAgo.toISOString())
        .order('timestamp_utc', { ascending: false })
        .limit(2);

      // Calculate 1h metrics
      let volume1h = 0;
      let priceChange1h = 0;

      if (recentCandles && recentCandles.length >= 2) {
        volume1h = recentCandles[0].volume || 0;
        const currentPrice = recentCandles[0].close_price;
        const previousPrice = recentCandles[1].close_price;
        priceChange1h = ((currentPrice - previousPrice) / previousPrice) * 100;
      }

      // For now, we'll estimate transaction and wallet counts
      // In a production system, you'd get this from Solana RPC or other APIs
      const estimatedTxCount = Math.floor((volume1h / tokenData.price) * 0.1); // Rough estimate
      const estimatedWallets = Math.floor(estimatedTxCount * 0.3); // Rough estimate

      return {
        volume_24h: tokenData.volume_24h || 0,
        volume_1h: volume1h,
        price_change_24h: tokenData.price_change_24h || 0,
        price_change_1h: priceChange1h,
        holders_change_24h: tokenData.holder_change_24h || 0,
        transaction_count_1h: estimatedTxCount,
        unique_wallets_1h: estimatedWallets,
        age_hours: ageHours,
        price_current: tokenData.price || 0,
        mentions_count: 0, // Placeholder for social data
        social_sentiment: 0 // Placeholder for social sentiment
      };

    } catch (error) {
      console.error(`Error fetching metrics for ${tokenAddress}:`, error);
      return null;
    }
  }

  /**
   * Calculate hotness for a single token
   */
  public async calculateTokenHotness(tokenAddress: string): Promise<HotnessResult | null> {
    try {
      const metrics = await this.fetchTokenMetrics(tokenAddress);
      if (!metrics) return null;

      const hotnessCalc = this.calculateHotnessScore(metrics);
      
      // Store metrics in database
      const { error: metricsError } = await supabase
        .from('hotness_metrics')
        .insert({
          token_address: tokenAddress,
          volume_24h: metrics.volume_24h,
          volume_1h: metrics.volume_1h,
          volume_ratio: metrics.volume_24h > 0 ? metrics.volume_1h / (metrics.volume_24h / 24) : 0,
          price_change_24h: metrics.price_change_24h,
          price_change_1h: metrics.price_change_1h,
          price_current: metrics.price_current,
          holders_change_24h: metrics.holders_change_24h,
          transaction_count_1h: metrics.transaction_count_1h,
          unique_wallets_1h: metrics.unique_wallets_1h,
          age_hours: metrics.age_hours,
          mentions_count: metrics.mentions_count || 0,
          social_sentiment: metrics.social_sentiment || 0,
          volume_score: hotnessCalc.breakdown.volume,
          volatility_score: hotnessCalc.breakdown.volatility,
          activity_score: hotnessCalc.breakdown.activity,
          newness_score: hotnessCalc.breakdown.newness,
          hotness_score: hotnessCalc.total
        });

      if (metricsError) {
        console.error('Error storing hotness metrics:', metricsError);
      }

      // Get current tier
      const { data: currentTier } = await supabase
        .from('token_tiers')
        .select('current_tier')
        .eq('token_address', tokenAddress)
        .single();

      // Update tier based on hotness score
      const { data: newTierData, error: tierError } = await supabase
        .rpc('update_token_tier', {
          token_addr: tokenAddress,
          new_hotness_score: hotnessCalc.total
        });

      if (tierError) {
        console.error('Error updating token tier:', tierError);
      }

      // Get rank among all tokens
      const { data: rankData } = await supabase
        .from('token_tiers')
        .select('token_address')
        .order('hotness_score', { ascending: false });

      const rank = (rankData?.findIndex(t => t.token_address === tokenAddress) || 0) + 1;

      return {
        token_address: tokenAddress,
        hotness_score: hotnessCalc.total,
        volume_score: hotnessCalc.breakdown.volume,
        volatility_score: hotnessCalc.breakdown.volatility,
        activity_score: hotnessCalc.breakdown.activity,
        newness_score: hotnessCalc.breakdown.newness,
        previous_tier: currentTier?.current_tier,
        new_tier: newTierData || currentTier?.current_tier || 3,
        rank
      };

    } catch (error) {
      console.error(`Error calculating hotness for ${tokenAddress}:`, error);
      return null;
    }
  }

  /**
   * Calculate hotness for multiple tokens
   */
  public async calculateBulkHotness(tokenAddresses: string[]): Promise<HotnessResult[]> {
    console.log(`🔥 Calculating hotness for ${tokenAddresses.length} tokens...`);

    const results: HotnessResult[] = [];
    const batchSize = 10; // Process in batches to avoid overwhelming the system

    for (let i = 0; i < tokenAddresses.length; i += batchSize) {
      const batch = tokenAddresses.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (tokenAddress) => {
        try {
          const result = await this.calculateTokenHotness(tokenAddress);
          if (result) {
            results.push(result);
            console.log(`✅ ${tokenAddress}: Score ${result.hotness_score.toFixed(2)} (Tier ${result.new_tier}, Rank #${result.rank})`);
          }
          
          // Small delay to be nice to APIs
          await new Promise(resolve => setTimeout(resolve, 100));
          
          return result;
        } catch (error) {
          console.error(`❌ Error processing ${tokenAddress}:`, error);
          return null;
        }
      });

      await Promise.all(batchPromises);
      
      // Batch delay
      if (i + batchSize < tokenAddresses.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Update ranks after all calculations
    await this.updateHotnessRanks();

    console.log(`🎯 Hotness calculation completed: ${results.length}/${tokenAddresses.length} successful`);
    return results.sort((a, b) => b.hotness_score - a.hotness_score);
  }

  /**
   * Update hotness ranks for all tokens
   */
  private async updateHotnessRanks(): Promise<void> {
    try {
      // Update ranks in hotness_metrics table
      await supabase.rpc('exec_sql', {
        sql: `
          UPDATE hotness_metrics h1 SET 
            hotness_rank = ranks.rank,
            previous_rank = h1.hotness_rank
          FROM (
            SELECT 
              id,
              ROW_NUMBER() OVER (ORDER BY hotness_score DESC) as rank
            FROM hotness_metrics 
            WHERE calculated_at >= NOW() - INTERVAL '2 hours'
          ) ranks
          WHERE h1.id = ranks.id;
        `
      });
    } catch (error) {
      console.warn('Error updating hotness ranks:', error);
    }
  }

  /**
   * Get current hot tokens by tier
   */
  public async getHotTokensByTier(tier: number, limit = 50): Promise<TokenTier[]> {
    const { data, error } = await supabase
      .rpc('get_hot_tokens_by_tier', {
        tier_num: tier,
        limit_count: limit
      });

    if (error) {
      console.error(`Error getting tier ${tier} tokens:`, error);
      return [];
    }

    return data || [];
  }

  /**
   * Get top 150 hot tokens across all tiers
   */
  public async getTop150HotTokens(): Promise<TokenTier[]> {
    const { data, error } = await supabase
      .from('token_tiers')
      .select('token_address, current_tier, hotness_score, last_tier_change, consecutive_high_scores, consecutive_low_scores')
      .order('hotness_score', { ascending: false })
      .limit(150);

    if (error) {
      console.error('Error getting top 150 tokens:', error);
      return [];
    }

    return (data || []).map((item, index) => ({
      ...item,
      rank: index + 1
    }));
  }

  /**
   * Get all active tokens for hotness calculation
   */
  public async getAllActiveTokens(): Promise<string[]> {
    const { data, error } = await supabase
      .from('tokens')
      .select('mint_address')
      .eq('is_active', true)
      .gte('volume_24h', 1000) // Only tokens with some activity
      .order('volume_24h', { ascending: false })
      .limit(1000); // Limit to top 1000 by volume

    if (error) {
      console.error('Error getting active tokens:', error);
      return [];
    }

    return (data || []).map(t => t.mint_address);
  }
}

// Export singleton instance
export const hotTokenDetector = new HotTokenDetector();
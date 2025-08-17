/**
 * Technical Analysis Service - Integration wrapper for TA worker functionality
 * Provides real-time TA data and analysis for the unified crawler system
 */

import { createClient } from '@supabase/supabase-js';

export interface TAFeatures {
  token_id: string;
  timeframe: string;
  ts: string;
  
  // Moving Averages
  sma7: number;
  sma20: number;
  sma50: number;
  sma200: number;
  ema7: number;
  ema20: number;
  ema50: number;
  ema200: number;
  
  // Oscillators
  rsi14: number;
  macd: number;
  macd_signal: number;
  macd_hist: number;
  
  // Volatility & Range
  atr14: number;
  bb_width: number;
  bb_width_pctl60: number;
  donchian_high_20: number;
  donchian_low_20: number;
  
  // Volume Analysis
  vol_ma20: number;
  vol_z60: number;
  vol_z60_slope: number;
  
  // Pattern Recognition
  cross_ema7_over_ema20: boolean;
  cross_ema50_over_ema200: boolean;
  breakout_high_20: boolean;
  breakout_low_20: boolean;
  near_breakout_high_20: boolean;
  bullish_rsi_div: boolean;
  
  // ELITE TA FEATURES - Phase 1
  vwap?: number;
  vwap_distance?: number;
  vwap_band_position?: number;
  support_level?: number;
  resistance_level?: number;
  support_distance?: number;
  resistance_distance?: number;
  smart_money_index?: number;
  trend_alignment_score?: number;
  volume_profile_score?: number;
  
  // Elite Boolean Signals
  vwap_breakout_bullish?: boolean;
  vwap_breakout_bearish?: boolean;
  near_support?: boolean;
  near_resistance?: boolean;
  smart_money_bullish?: boolean;
  trend_alignment_strong?: boolean;
}

export interface TAAnalysis {
  token_address: string;
  symbol: string;
  
  // Current TA state across timeframes
  technical_score: number; // 0-100 composite score
  trend: 'bullish' | 'bearish' | 'neutral' | 'consolidating';
  momentum: 'strong_up' | 'weak_up' | 'neutral' | 'weak_down' | 'strong_down';
  volatility: 'low' | 'medium' | 'high' | 'extreme';
  
  // Key levels
  support_levels: number[];
  resistance_levels: number[];
  
  // Signals
  active_signals: string[];
  signal_strength: number;
  
  // Multi-timeframe analysis
  timeframes: {
    [timeframe: string]: {
      features: Partial<TAFeatures>;
      score: number;
      signals: string[];
    };
  };
  
  // Analysis metadata
  last_updated: string;
  confidence: number;
}

export class TechnicalAnalysisService {
  private supabase: any;
  private cache: Map<string, { data: TAAnalysis; timestamp: number }> = new Map();
  private cacheTTL = 5 * 60 * 1000; // 5 minutes

  constructor(config: {
    supabaseUrl: string;
    supabaseKey: string;
  }) {
    this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
    console.log('📈 Technical Analysis Service initialized');
  }

  /**
   * Get comprehensive TA analysis for a token
   */
  async getTokenAnalysis(tokenAddress: string): Promise<TAAnalysis | null> {
    const cacheKey = `ta_${tokenAddress}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    try {
      // Get token symbol and ID from database
      const { data: tokenData, error: tokenError } = await this.supabase
        .from('tokens')
        .select('symbol, address')
        .eq('address', tokenAddress)
        .single();

      if (tokenError || !tokenData) {
        console.warn(`Token not found: ${tokenAddress}`);
        return null;
      }

      // Fetch latest TA features across timeframes
      const taData = await this.fetchTAFeatures(tokenAddress);
      
      if (!taData || taData.length === 0) {
        console.warn(`No TA data found for: ${tokenAddress}`);
        return null;
      }

      // Compute comprehensive analysis
      const analysis = this.computeAnalysis(tokenAddress, tokenData.symbol, taData);
      
      // Cache the result
      this.cache.set(cacheKey, {
        data: analysis,
        timestamp: Date.now()
      });

      return analysis;

    } catch (error) {
      console.error(`Error getting TA analysis for ${tokenAddress}:`, error);
      return null;
    }
  }

  /**
   * Get TA analysis for multiple tokens
   */
  async getBatchAnalysis(tokenAddresses: string[]): Promise<{ [address: string]: TAAnalysis }> {
    const results: { [address: string]: TAAnalysis } = {};
    
    const analysisPromises = tokenAddresses.map(async (address) => {
      const analysis = await this.getTokenAnalysis(address);
      if (analysis) {
        results[address] = analysis;
      }
    });

    await Promise.allSettled(analysisPromises);
    return results;
  }

  /**
   * Get tokens with specific TA signals
   */
  async getTokensWithSignals(signals: string[], limit = 20): Promise<TAAnalysis[]> {
    try {
      // Query tokens with recent TA data
      const { data: recentTA, error } = await this.supabase
        .from('ta_latest')
        .select('*')
        .limit(100);

      if (error) throw error;

      const analyses: TAAnalysis[] = [];
      
      for (const taRow of recentTA || []) {
        try {
          const analysis = await this.getTokenAnalysis(taRow.token_id);
          if (analysis && this.hasSignals(analysis, signals)) {
            analyses.push(analysis);
          }
        } catch (e) {
          // Continue with other tokens
        }
      }

      // Sort by signal strength and return top results
      return analyses
        .sort((a, b) => b.signal_strength - a.signal_strength)
        .slice(0, limit);

    } catch (error) {
      console.error('Error getting tokens with signals:', error);
      return [];
    }
  }

  /**
   * Get market-wide TA summary
   */
  async getMarketSummary(): Promise<{
    total_tokens: number;
    bullish_tokens: number;
    bearish_tokens: number;
    breakout_tokens: number;
    high_momentum_tokens: number;
    avg_technical_score: number;
  }> {
    try {
      const { data: summary, error } = await this.supabase
        .rpc('get_ta_market_summary');

      if (error) throw error;

      return summary || {
        total_tokens: 0,
        bullish_tokens: 0,
        bearish_tokens: 0,
        breakout_tokens: 0,
        high_momentum_tokens: 0,
        avg_technical_score: 50
      };

    } catch (error) {
      console.error('Error getting market summary:', error);
      return {
        total_tokens: 0,
        bullish_tokens: 0,
        bearish_tokens: 0,
        breakout_tokens: 0,
        high_momentum_tokens: 0,
        avg_technical_score: 50
      };
    }
  }

  /**
   * Fetch TA features from database
   */
  private async fetchTAFeatures(tokenAddress: string): Promise<TAFeatures[]> {
    const { data, error } = await this.supabase
      .from('ta_latest')
      .select('*')
      .eq('token_id', tokenAddress);

    if (error) {
      console.error('Error fetching TA features:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Compute comprehensive analysis from TA features
   */
  private computeAnalysis(tokenAddress: string, symbol: string, taData: TAFeatures[]): TAAnalysis {
    const timeframes: { [timeframe: string]: any } = {};
    let overallScore = 50;
    let trend: 'bullish' | 'bearish' | 'neutral' | 'consolidating' = 'neutral';
    let momentum: 'strong_up' | 'weak_up' | 'neutral' | 'weak_down' | 'strong_down' = 'neutral';
    let volatility: 'low' | 'medium' | 'high' | 'extreme' = 'medium';
    const activeSignals: string[] = [];
    const supportLevels: number[] = [];
    const resistanceLevels: number[] = [];

    // Process each timeframe
    for (const ta of taData) {
      const timeframeScore = this.calculateTimeframeScore(ta);
      const timeframeSignals = this.extractSignals(ta);
      
      timeframes[ta.timeframe] = {
        features: ta,
        score: timeframeScore,
        signals: timeframeSignals
      };

      // Add to active signals
      activeSignals.push(...timeframeSignals);

      // Add support/resistance levels
      if (ta.donchian_low_20) supportLevels.push(ta.donchian_low_20);
      if (ta.donchian_high_20) resistanceLevels.push(ta.donchian_high_20);
    }

    // Calculate overall metrics
    const timeframeCount = Object.keys(timeframes).length;
    if (timeframeCount > 0) {
      overallScore = Object.values(timeframes)
        .reduce((sum: number, tf: any) => sum + tf.score, 0) / timeframeCount;
    }

    // Determine trend based on EMAs and signals
    if (overallScore > 70) trend = 'bullish';
    else if (overallScore < 30) trend = 'bearish';
    else if (overallScore > 45 && overallScore < 55) trend = 'consolidating';
    else trend = 'neutral';

    // Determine momentum from MACD and RSI
    const macdBullish = activeSignals.includes('macd_bullish');
    const rsiBullish = activeSignals.includes('rsi_oversold_recovery');
    const macdBearish = activeSignals.includes('macd_bearish');
    const rsiBearish = activeSignals.includes('rsi_overbought');

    if (macdBullish && rsiBullish) momentum = 'strong_up';
    else if (macdBullish || rsiBullish) momentum = 'weak_up';
    else if (macdBearish && rsiBearish) momentum = 'strong_down';
    else if (macdBearish || rsiBearish) momentum = 'weak_down';
    else momentum = 'neutral';

    // Determine volatility from ATR and BB width
    const avgBBWidth = taData.reduce((sum, ta) => sum + (ta.bb_width || 0), 0) / taData.length;
    if (avgBBWidth > 0.1) volatility = 'extreme';
    else if (avgBBWidth > 0.05) volatility = 'high';
    else if (avgBBWidth > 0.02) volatility = 'medium';
    else volatility = 'low';

    // Calculate signal strength
    const uniqueSignals = [...new Set(activeSignals)];
    const signalStrength = Math.min(100, uniqueSignals.length * 10);

    return {
      token_address: tokenAddress,
      symbol,
      technical_score: overallScore,
      trend,
      momentum,
      volatility,
      support_levels: [...new Set(supportLevels)].sort((a, b) => b - a),
      resistance_levels: [...new Set(resistanceLevels)].sort((a, b) => a - b),
      active_signals: uniqueSignals,
      signal_strength: signalStrength,
      timeframes,
      last_updated: new Date().toISOString(),
      confidence: Math.min(95, 50 + (timeframeCount * 15))
    };
  }

  /**
   * Calculate score for a single timeframe
   */
  private calculateTimeframeScore(ta: TAFeatures): number {
    let score = 50; // Start neutral

    // EMA alignment (20 points)
    if (ta.ema7 > ta.ema20 && ta.ema20 > ta.ema50) score += 20;
    else if (ta.ema7 < ta.ema20 && ta.ema20 < ta.ema50) score -= 20;

    // RSI (15 points)
    if (ta.rsi14 > 70) score -= 10; // Overbought
    else if (ta.rsi14 < 30) score += 10; // Oversold recovery potential
    else if (ta.rsi14 > 50) score += 5; // Bullish territory

    // MACD (15 points)
    if (ta.macd > ta.macd_signal && ta.macd_hist > 0) score += 15;
    else if (ta.macd < ta.macd_signal && ta.macd_hist < 0) score -= 15;

    // Breakouts (20 points)
    if (ta.breakout_high_20) score += 20;
    else if (ta.breakout_low_20) score -= 20;
    else if (ta.near_breakout_high_20) score += 10;

    // Volume confirmation (10 points)
    if (ta.vol_z60 > 2) score += 10; // High volume
    else if (ta.vol_z60 < -1) score -= 5; // Low volume

    // Divergence patterns (10 points)
    if (ta.bullish_rsi_div) score += 10;

    // Cross events (10 points)
    if (ta.cross_ema7_over_ema20) score += 5;
    if (ta.cross_ema50_over_ema200) score += 5;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Extract active signals from TA features
   */
  private extractSignals(ta: TAFeatures): string[] {
    const signals: string[] = [];

    // 🚀 ELITE TA SIGNALS - HIGHEST PRIORITY 🚀
    
    // VWAP Elite Signals
    if (ta.vwap_breakout_bullish) signals.push('vwap_breakout_bullish');
    if (ta.vwap_breakout_bearish) signals.push('vwap_breakout_bearish');
    if ((ta.vwap_distance || 0) > 0.05) signals.push('strong_above_vwap');
    if ((ta.vwap_distance || 0) < -0.1) signals.push('deep_below_vwap');
    
    // Smart Money Signals
    if (ta.smart_money_bullish || (ta.smart_money_index || 0) > 60) signals.push('smart_money_accumulation');
    if ((ta.smart_money_index || 0) < 20) signals.push('smart_money_distribution');
    
    // Trend Alignment Signals
    if (ta.trend_alignment_strong || (ta.trend_alignment_score || 0) > 0.75) signals.push('perfect_trend_alignment');
    if ((ta.trend_alignment_score || 0) < 0.25) signals.push('weak_trend_alignment');
    
    // Support/Resistance Signals
    if (ta.near_support) signals.push('near_key_support');
    if (ta.near_resistance) signals.push('testing_resistance');
    
    // Volume Profile Signals
    if ((ta.volume_profile_score || 0) > 0.8) signals.push('high_volume_profile');
    if ((ta.volume_profile_score || 0) < 0.2) signals.push('low_volume_profile');

    // Original signals
    // Trend signals
    if (ta.ema7 > ta.ema20 && ta.ema20 > ta.ema50) signals.push('bullish_trend');
    if (ta.ema7 < ta.ema20 && ta.ema20 < ta.ema50) signals.push('bearish_trend');

    // Momentum signals
    if (ta.macd > ta.macd_signal && ta.macd_hist > 0) signals.push('macd_bullish');
    if (ta.macd < ta.macd_signal && ta.macd_hist < 0) signals.push('macd_bearish');

    // RSI signals
    if (ta.rsi14 > 70) signals.push('rsi_overbought');
    if (ta.rsi14 < 30) signals.push('rsi_oversold');
    if (ta.rsi14 > 30 && ta.rsi14 < 50) signals.push('rsi_oversold_recovery');

    // Breakout signals
    if (ta.breakout_high_20) signals.push('breakout_high');
    if (ta.breakout_low_20) signals.push('breakout_low');
    if (ta.near_breakout_high_20) signals.push('near_breakout');

    // Volume signals
    if (ta.vol_z60 > 2) signals.push('high_volume');
    if (ta.vol_z60_slope > 0.5) signals.push('volume_increasing');

    // Cross signals
    if (ta.cross_ema7_over_ema20) signals.push('golden_cross_short');
    if (ta.cross_ema50_over_ema200) signals.push('golden_cross_long');

    // Pattern signals
    if (ta.bullish_rsi_div) signals.push('bullish_divergence');

    // Volatility signals
    if (ta.bb_width_pctl60 > 80) signals.push('high_volatility');
    if (ta.bb_width_pctl60 < 20) signals.push('low_volatility');

    return signals;
  }

  /**
   * Check if analysis has specific signals
   */
  private hasSignals(analysis: TAAnalysis, targetSignals: string[]): boolean {
    return targetSignals.some(signal => 
      analysis.active_signals.includes(signal)
    );
  }

  /**
   * Get service statistics
   */
  getStats(): any {
    return {
      cacheSize: this.cache.size,
      cacheTTL: this.cacheTTL,
      supportedTimeframes: ['5m', '15m', '1h', '4h', '1d'],
      availableSignals: [
        'bullish_trend', 'bearish_trend', 'macd_bullish', 'macd_bearish',
        'rsi_overbought', 'rsi_oversold', 'breakout_high', 'breakout_low',
        'high_volume', 'golden_cross_short', 'golden_cross_long', 'bullish_divergence'
      ]
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('📈 TA Service cache cleared');
  }
}

export default TechnicalAnalysisService;
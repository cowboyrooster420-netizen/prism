import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Get tokens with Elite TA features from our database
    const { data: taData, error: taError } = await supabase
      .from('ta_latest')
      .select(`
        token_id,
        timeframe,
        ts,
        rsi14,
        breakout_high_20,
        near_breakout_high_20,
        cross_ema7_over_ema20,
        cross_ema50_over_ema200,
        vwap,
        vwap_distance,
        vwap_band_position,
        support_level,
        resistance_level,
        support_distance,
        resistance_distance,
        smart_money_index,
        trend_alignment_score,
        volume_profile_score,
        vwap_breakout_bullish,
        vwap_breakout_bearish,
        near_support,
        near_resistance,
        smart_money_bullish,
        trend_alignment_strong,
        vol_z60
      `)
      .eq('timeframe', '1h')
      .order('ts', { ascending: false })
      .limit(10);

    if (taError) {
      console.error('Error fetching TA data:', taError);
    }

    // Get behavioral data for the same tokens
    const { data: behavioralData, error: behavioralError } = await supabase
      .from('token_behavioral_analysis')
      .select('*')
      .limit(10);

    if (behavioralError) {
      console.error('Error fetching behavioral data:', behavioralError);
    }

    // Get basic token info
    const { data: tokenInfo, error: tokenError } = await supabase
      .from('tokens')
      .select('*')
      .limit(10);

    if (tokenError) {
      console.error('Error fetching token info:', tokenError);
    }

    // Map token IDs to symbols for easy lookup
    const tokenMap: Record<string, string> = {
      'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 'BONK',
      'So11111111111111111111111111111111111111112': 'SOL',
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC'
    };

    // Combine the data with Elite TA features
    const eliteTokens = (taData || []).map((ta: any) => {
      const symbol = tokenMap[ta.token_id] || ta.token_id.slice(0, 8) + '...';
      const behavioral = (behavioralData || []).find((b: any) => b.token_id === ta.token_id);
      const token = (tokenInfo || []).find((t: any) => t.address === ta.token_id);

      // Calculate mock price data (in a real implementation, this would come from price feeds)
      let mockPrice = 100;
      let mockPriceChange = 0;
      let mockVolume = 1000000;
      let mockMarketCap = 50000000;

      if (symbol === 'BONK') {
        mockPrice = 0.000024;
        mockPriceChange = -8.5;
        mockVolume = 85000000;
        mockMarketCap = 1800000000;
      } else if (symbol === 'SOL') {
        mockPrice = 193.55;
        mockPriceChange = 3.2;
        mockVolume = 2500000000;
        mockMarketCap = 91000000000;
      } else if (symbol === 'USDC') {
        mockPrice = 0.9998;
        mockPriceChange = 0.01;
        mockVolume = 15000000000;
        mockMarketCap = 35000000000;
      }

      return {
        // Basic token data
        id: ta.token_id,
        symbol,
        name: token?.name || symbol,
        mint_address: ta.token_id,
        price: mockPrice,
        price_change_24h: mockPriceChange,
        volume_24h: mockVolume,
        market_cap: mockMarketCap,
        liquidity: token?.liquidity || 1000000,
        updated_at: ta.ts,

        // Behavioral metrics
        whale_buys_24h: behavioral?.whale_buys_24h || 0,
        new_holders_24h: behavioral?.new_holders_24h || 0,
        volume_spike_ratio: behavioral?.volume_spike_ratio || 1,
        token_age_hours: behavioral?.token_age_hours || 168,
        transaction_pattern_score: behavioral?.transaction_pattern_score || 0.5,
        smart_money_score: behavioral?.smart_money_score || 0.5,

        // Basic TA
        rsi14: ta.rsi14,
        breakout_high_20: ta.breakout_high_20,
        near_breakout_high_20: ta.near_breakout_high_20,
        cross_ema7_over_ema20: ta.cross_ema7_over_ema20,
        cross_ema50_over_ema200: ta.cross_ema50_over_ema200,

        // 🚀 ELITE TA FEATURES 🚀
        vwap: ta.vwap,
        vwap_distance: ta.vwap_distance,
        vwap_band_position: ta.vwap_band_position,
        support_level: ta.support_level,
        resistance_level: ta.resistance_level,
        support_distance: ta.support_distance,
        resistance_distance: ta.resistance_distance,
        smart_money_index: ta.smart_money_index,
        trend_alignment_score: ta.trend_alignment_score,
        volume_profile_score: ta.volume_profile_score,

        // Elite Boolean Signals
        vwap_breakout_bullish: ta.vwap_breakout_bullish,
        vwap_breakout_bearish: ta.vwap_breakout_bearish,
        near_support: ta.near_support,
        near_resistance: ta.near_resistance,
        smart_money_bullish: ta.smart_money_bullish,
        trend_alignment_strong: ta.trend_alignment_strong,

        // Additional metrics
        vol_z60: ta.vol_z60
      };
    });

    res.status(200).json({
      success: true,
      tokens: eliteTokens,
      count: eliteTokens.length,
      elite_features_active: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching elite trending tokens:', error);
    
    // Fallback with mock Elite TA data
    const fallbackTokens = [
      {
        id: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        symbol: 'BONK',
        name: 'Bonk',
        mint_address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        price: 0.000024,
        price_change_24h: -8.5,
        volume_24h: 85000000,
        market_cap: 1800000000,
        liquidity: 50000000,
        
        // Elite TA features
        vwap_breakout_bullish: false,
        vwap_breakout_bearish: true,
        near_support: true,
        near_resistance: false,
        smart_money_bullish: false,
        trend_alignment_strong: false,
        vwap_distance: -0.1057,
        smart_money_index: 11.93,
        trend_alignment_score: 0.15,
        volume_profile_score: 0.096
      },
      {
        id: 'So11111111111111111111111111111111111111112',
        symbol: 'SOL',
        name: 'Solana',
        mint_address: 'So11111111111111111111111111111111111111112',
        price: 193.55,
        price_change_24h: 3.2,
        volume_24h: 2500000000,
        market_cap: 91000000000,
        liquidity: 500000000,
        
        // Elite TA features
        vwap_breakout_bullish: true,
        vwap_breakout_bearish: false,
        near_support: false,
        near_resistance: false,
        smart_money_bullish: true,
        trend_alignment_strong: true,
        vwap_distance: 0.0346,
        smart_money_index: 47.66,
        trend_alignment_score: 0.85,
        volume_profile_score: 0.287
      },
      {
        id: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        symbol: 'USDC',
        name: 'USD Coin',
        mint_address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        price: 0.9998,
        price_change_24h: 0.01,
        volume_24h: 15000000000,
        market_cap: 35000000000,
        liquidity: 1000000000,
        
        // Elite TA features
        vwap_breakout_bullish: true,
        vwap_breakout_bearish: false,
        near_support: true,
        near_resistance: true,
        smart_money_bullish: false,
        trend_alignment_strong: false,
        vwap_distance: 0.0001,
        smart_money_index: 30.14,
        trend_alignment_score: 0.45,
        volume_profile_score: 1.000
      }
    ];

    res.status(200).json({
      success: false,
      error: 'Using fallback Elite TA data',
      tokens: fallbackTokens,
      count: fallbackTokens.length,
      elite_features_active: true,
      timestamp: new Date().toISOString()
    });
  }
}
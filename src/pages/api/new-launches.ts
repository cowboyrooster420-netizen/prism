import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { calculateEdgeScore } from '../../lib/edgeScoring'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get recently launched tokens (< 7 days old)
    const { data: tokens, error } = await supabase
      .from('ta_latest')
      .select(`
        token_id, symbol, name, mint_address, price, price_change_24h, 
        volume_24h, market_cap, liquidity, updated_at,
        whale_buys_24h, new_holders_24h, volume_spike_ratio, token_age_hours,
        transaction_pattern_score, smart_money_score,
        rsi14, breakout_high_20, near_breakout_high_20, 
        cross_ema7_over_ema20, cross_ema50_over_ema200,
        vwap, vwap_distance, vwap_band_position,
        support_level, resistance_level, support_distance, resistance_distance,
        smart_money_index, trend_alignment_score, volume_profile_score,
        vwap_breakout_bullish, vwap_breakout_bearish,
        near_support, near_resistance, smart_money_bullish, trend_alignment_strong
      `)
      .lt('token_age_hours', 168) // Less than 7 days old
      .gte('volume_24h', 10000) // Minimum volume threshold
      .order('token_age_hours', { ascending: true }) // Newest first
      .limit(30)

    if (error) {
      console.error('Error fetching new launches:', error)
      return res.status(500).json({ error: 'Failed to fetch new launches' })
    }

    if (!tokens || tokens.length === 0) {
      return res.status(200).json({ 
        success: true, 
        tokens: [],
        count: 0,
        message: 'No new launches found'
      })
    }

    // Calculate edge scores for all new launch tokens
    const newLaunchesWithScores = tokens.map(token => {
      const edgeScore = calculateEdgeScore({
        // Elite TA
        vwap_breakout_bullish: token.vwap_breakout_bullish,
        vwap_breakout_bearish: token.vwap_breakout_bearish,
        vwap_distance: token.vwap_distance,
        near_support: token.near_support,
        near_resistance: token.near_resistance,
        smart_money_index: token.smart_money_index,
        trend_alignment_score: token.trend_alignment_score,
        volume_profile_score: token.volume_profile_score,
        
        // Behavioral
        whale_buys_24h: token.whale_buys_24h,
        new_holders_24h: token.new_holders_24h,
        volume_spike_ratio: token.volume_spike_ratio,
        smart_money_score: token.smart_money_score,
        transaction_pattern_score: token.transaction_pattern_score,
        
        // Market Context
        volume_24h: token.volume_24h,
        liquidity: token.liquidity,
        market_cap: token.market_cap,
        token_age_hours: token.token_age_hours,
        price_change_24h: token.price_change_24h,
        
        // Technical
        rsi14: token.rsi14,
        breakout_high_20: token.breakout_high_20,
        near_breakout_high_20: token.near_breakout_high_20,
        cross_ema7_over_ema20: token.cross_ema7_over_ema20,
        cross_ema50_over_ema200: token.cross_ema50_over_ema200
      })

      return {
        id: token.token_id,
        symbol: token.symbol,
        name: token.name,
        mint_address: token.mint_address,
        price: token.price,
        price_change_24h: token.price_change_24h,
        volume_24h: token.volume_24h,
        market_cap: token.market_cap,
        liquidity: token.liquidity,
        updated_at: token.updated_at,
        
        // Behavioral metrics
        whale_buys_24h: token.whale_buys_24h || 0,
        new_holders_24h: token.new_holders_24h || 0,
        volume_spike_ratio: token.volume_spike_ratio || 1,
        token_age_hours: token.token_age_hours || 0,
        transaction_pattern_score: token.transaction_pattern_score || 0,
        smart_money_score: token.smart_money_score || 0,
        
        // Basic TA
        rsi14: token.rsi14,
        breakout_high_20: token.breakout_high_20 || false,
        near_breakout_high_20: token.near_breakout_high_20 || false,
        cross_ema7_over_ema20: token.cross_ema7_over_ema20 || false,
        cross_ema50_over_ema200: token.cross_ema50_over_ema200 || false,
        
        // Elite TA
        vwap: token.vwap,
        vwap_distance: token.vwap_distance,
        vwap_band_position: token.vwap_band_position,
        support_level: token.support_level,
        resistance_level: token.resistance_level,
        support_distance: token.support_distance,
        resistance_distance: token.resistance_distance,
        smart_money_index: token.smart_money_index,
        trend_alignment_score: token.trend_alignment_score,
        volume_profile_score: token.volume_profile_score,
        vwap_breakout_bullish: token.vwap_breakout_bullish || false,
        vwap_breakout_bearish: token.vwap_breakout_bearish || false,
        near_support: token.near_support || false,
        near_resistance: token.near_resistance || false,
        smart_money_bullish: token.smart_money_bullish || false,
        trend_alignment_strong: token.trend_alignment_strong || false,
        
        // Edge scoring results
        edge_score: edgeScore.total,
        edge_confidence: edgeScore.confidence,
        primary_signal: edgeScore.primarySignal,
        risk_factors: edgeScore.riskFactors,
        
        // Launch specific data
        launch_age_display: token.token_age_hours < 24 
          ? `${Math.round(token.token_age_hours)}h` 
          : `${Math.round(token.token_age_hours / 24)}d`,
        is_very_new: token.token_age_hours < 24,
        launch_momentum: (token.volume_spike_ratio || 1) > 2 && (token.new_holders_24h || 0) > 50
      }
    })

    // Sort new launches by a combination of edge score and newness
    const sortedNewLaunches = newLaunchesWithScores
      .sort((a, b) => {
        // Prefer newer tokens if edge scores are close
        const scoreDiff = b.edge_score - a.edge_score
        if (Math.abs(scoreDiff) < 10) {
          return a.token_age_hours - b.token_age_hours // Newer first
        }
        return scoreDiff // Higher edge score first
      })
      .slice(0, 20) // Top 20 new launches

    res.status(200).json({
      success: true,
      tokens: sortedNewLaunches,
      count: sortedNewLaunches.length,
      timestamp: new Date().toISOString(),
      criteria: {
        max_age_hours: 168,
        min_volume: 10000,
        sorting: 'edge_score + newness'
      }
    })

  } catch (error) {
    console.error('New launches error:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      tokens: []
    })
  }
}
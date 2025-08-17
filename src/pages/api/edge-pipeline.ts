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
    // Get TA data and join with token metadata manually
    const { data: taData, error: taError } = await supabase
      .from('ta_latest')
      .select(`
        token_id, ts, created_at,
        rsi14, breakout_high_20, near_breakout_high_20, 
        cross_ema7_over_ema20, cross_ema50_over_ema200,
        vwap, vwap_distance, vwap_band_position,
        support_level, resistance_level, support_distance, resistance_distance,
        smart_money_index, trend_alignment_score, volume_profile_score,
        vwap_breakout_bullish, vwap_breakout_bearish,
        near_support, near_resistance, smart_money_bullish, trend_alignment_strong
      `)
      .order('created_at', { ascending: false })
      .limit(50)

    if (taError) {
      console.error('Error fetching TA data:', taError)
      return res.status(500).json({ error: 'Failed to fetch TA data' })
    }

    if (!taData || taData.length === 0) {
      return res.status(200).json({ 
        success: true, 
        tokens: [],
        count: 0,
        message: 'No TA data found'
      })
    }

    // Get token metadata for the tokens that have TA data
    const tokenIds = taData.map(ta => ta.token_id)
    const { data: tokenMetadata, error: tokenError } = await supabase
      .from('tokens')
      .select('mint_address, symbol, name, price, volume_24h, market_cap, liquidity')
      .in('mint_address', tokenIds)

    if (tokenError) {
      console.error('Error fetching token metadata:', tokenError)
      return res.status(500).json({ error: 'Failed to fetch token metadata' })
    }

    // Create a map for easy lookup
    const tokenMetaMap = new Map()
    if (tokenMetadata) {
      tokenMetadata.forEach(token => {
        tokenMetaMap.set(token.mint_address, token)
      })
    }

    // Combine TA data with token metadata
    const tokens = taData.map(ta => {
      const meta = tokenMetaMap.get(ta.token_id)
      return {
        token_id: ta.token_id,
        symbol: meta?.symbol || 'UNKNOWN',
        name: meta?.name || 'Unknown Token',
        mint_address: ta.token_id,
        price: meta?.price || 0,
        price_change_24h: 0, // Not available in current schema
        volume_24h: meta?.volume_24h || 0,
        market_cap: meta?.market_cap || 0,
        liquidity: meta?.liquidity || 0,
        updated_at: ta.created_at,
        
        // Set behavioral data to defaults since we don't have it yet
        whale_buys_24h: 0,
        new_holders_24h: 0,
        volume_spike_ratio: 1,
        token_age_hours: 0,
        transaction_pattern_score: 0,
        smart_money_score: 0,
        
        // TA data from ta_latest
        rsi14: ta.rsi14,
        breakout_high_20: ta.breakout_high_20,
        near_breakout_high_20: ta.near_breakout_high_20,
        cross_ema7_over_ema20: ta.cross_ema7_over_ema20,
        cross_ema50_over_ema200: ta.cross_ema50_over_ema200,
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
        vwap_breakout_bullish: ta.vwap_breakout_bullish,
        vwap_breakout_bearish: ta.vwap_breakout_bearish,
        near_support: ta.near_support,
        near_resistance: ta.near_resistance,
        smart_money_bullish: ta.smart_money_bullish,
        trend_alignment_strong: ta.trend_alignment_strong
      }
    })

    if (!tokens || tokens.length === 0) {
      return res.status(200).json({ 
        success: true, 
        tokens: [],
        count: 0,
        message: 'No tokens found'
      })
    }

    // Calculate edge scores for all tokens
    const tokensWithEdgeScores = tokens.map(token => {
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
        risk_factors: edgeScore.riskFactors
      }
    })

    // Filter for tokens with meaningful edge scores (>= 20 to show available tokens) and sort by score
    const edgeOpportunities = tokensWithEdgeScores
      .filter(token => token.edge_score >= 20)
      .sort((a, b) => b.edge_score - a.edge_score)
      .slice(0, 20) // Top 20 opportunities

    res.status(200).json({
      success: true,
      tokens: edgeOpportunities,
      count: edgeOpportunities.length,
      timestamp: new Date().toISOString(),
      scoring_active: true
    })

  } catch (error) {
    console.error('Edge pipeline error:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      tokens: []
    })
  }
}
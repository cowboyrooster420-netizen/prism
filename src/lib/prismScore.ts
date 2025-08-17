/**
 * Prism Score - AI-powered token scoring system for general token discovery
 * Simplified version of edge scoring optimized for all token cards
 */

import { calculateEdgeScore, type EdgeScoringInput } from './edgeScoring'

export interface PrismScoreResult {
  score: number        // 0-100 simplified score
  rating: 'Exceptional' | 'Strong' | 'Good' | 'Fair' | 'Weak'
  confidence: 'High' | 'Medium' | 'Low'
  primarySignal: string
  color: string        // CSS color for UI
}

export function calculatePrismScore(token: any): PrismScoreResult {
  // Convert token data to EdgeScoringInput format
  const input: EdgeScoringInput = {
    // Elite TA Features
    vwap_breakout_bullish: token.vwap_breakout_bullish,
    vwap_breakout_bearish: token.vwap_breakout_bearish,
    vwap_distance: token.vwap_distance,
    near_support: token.near_support,
    near_resistance: token.near_resistance,
    smart_money_index: token.smart_money_index,
    trend_alignment_score: token.trend_alignment_score,
    volume_profile_score: token.volume_profile_score,
    
    // Behavioral Signals
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
    
    // Technical Analysis
    rsi14: token.rsi14,
    breakout_high_20: token.breakout_high_20,
    near_breakout_high_20: token.near_breakout_high_20,
    cross_ema7_over_ema20: token.cross_ema7_over_ema20,
    cross_ema50_over_ema200: token.cross_ema50_over_ema200
  }

  // Get the comprehensive edge score
  const edgeScore = calculateEdgeScore(input)
  
  // Simplify the score for general display (round to nearest 5)
  const simplifiedScore = Math.round(edgeScore.total / 5) * 5
  
  // Determine rating based on score
  let rating: PrismScoreResult['rating']
  let color: string
  
  if (simplifiedScore >= 90) {
    rating = 'Exceptional'
    color = 'text-purple-400'
  } else if (simplifiedScore >= 75) {
    rating = 'Strong' 
    color = 'text-emerald-400'
  } else if (simplifiedScore >= 60) {
    rating = 'Good'
    color = 'text-blue-400'
  } else if (simplifiedScore >= 40) {
    rating = 'Fair'
    color = 'text-yellow-400'
  } else {
    rating = 'Weak'
    color = 'text-gray-400'
  }
  
  // Simplify confidence
  let confidence: PrismScoreResult['confidence']
  if (edgeScore.confidence === 'high') {
    confidence = 'High'
  } else if (edgeScore.confidence === 'medium') {
    confidence = 'Medium'
  } else {
    confidence = 'Low'
  }
  
  // Simplify primary signal for general users
  let primarySignal = edgeScore.primarySignal
  if (primarySignal === "No clear signal") {
    if (simplifiedScore >= 60) {
      primarySignal = "Multiple positive factors"
    } else if (simplifiedScore >= 40) {
      primarySignal = "Mixed signals detected"
    } else {
      primarySignal = "Limited opportunity"
    }
  }

  return {
    score: simplifiedScore,
    rating,
    confidence,
    primarySignal,
    color
  }
}

export function getPrismScoreColor(score: number): string {
  if (score >= 90) return 'text-purple-400'
  if (score >= 75) return 'text-emerald-400'
  if (score >= 60) return 'text-blue-400'
  if (score >= 40) return 'text-yellow-400'
  return 'text-gray-400'
}

export function getPrismScoreBadgeColor(score: number): string {
  if (score >= 90) return 'bg-purple-500/20 border-purple-500/40 text-purple-300'
  if (score >= 75) return 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
  if (score >= 60) return 'bg-blue-500/20 border-blue-500/40 text-blue-300'
  if (score >= 40) return 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300'
  return 'bg-gray-500/20 border-gray-500/40 text-gray-400'
}
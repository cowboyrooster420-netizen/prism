/**
 * Prism Edge Scoring System
 * Calculates systematic opportunity scores (0-100) for token discovery
 */

export interface EdgeScoringInput {
  // Elite TA Features (40% weight)
  vwap_breakout_bullish?: boolean
  vwap_breakout_bearish?: boolean
  vwap_distance?: number
  near_support?: boolean
  near_resistance?: boolean
  smart_money_index?: number
  trend_alignment_score?: number
  volume_profile_score?: number
  
  // Behavioral Signals (30% weight)
  whale_buys_24h?: number
  new_holders_24h?: number
  volume_spike_ratio?: number
  smart_money_score?: number
  transaction_pattern_score?: number
  
  // Market Context (20% weight)
  volume_24h?: number
  liquidity?: number
  market_cap?: number
  token_age_hours?: number
  price_change_24h?: number
  
  // Technical Analysis (10% weight)
  rsi14?: number
  breakout_high_20?: boolean
  near_breakout_high_20?: boolean
  cross_ema7_over_ema20?: boolean
  cross_ema50_over_ema200?: boolean
}

export interface EdgeScore {
  total: number        // 0-100 total score
  eliteTA: number     // Elite TA component (0-40)
  behavioral: number  // Behavioral component (0-30)
  marketContext: number // Market context component (0-20)
  technical: number   // Technical component (0-10)
  confidence: 'low' | 'medium' | 'high'
  primarySignal: string
  riskFactors: string[]
}

export function calculateEdgeScore(input: EdgeScoringInput): EdgeScore {
  let eliteTA = 0
  let behavioral = 0
  let marketContext = 0
  let technical = 0
  const riskFactors: string[] = []
  let primarySignal = "No clear signal"

  // ======= ELITE TA SCORING (0-40 points) =======
  
  // VWAP Breakouts (0-15 points)
  if (input.vwap_breakout_bullish) {
    eliteTA += 15
    primarySignal = "VWAP Breakout Bullish"
  } else if (input.vwap_breakout_bearish) {
    eliteTA += 5 // Lower score for bearish
    riskFactors.push("VWAP breakdown risk")
  }
  
  // VWAP Position (0-8 points)
  const vwapDistance = input.vwap_distance || 0
  if (vwapDistance > 0.05) {
    eliteTA += 8 // Strong above VWAP
  } else if (vwapDistance > 0.02) {
    eliteTA += 5 // Moderately above VWAP
  } else if (vwapDistance < -0.1) {
    eliteTA += 3 // Deep oversold potential
  }
  
  // Smart Money Index (0-10 points)
  const smartMoneyIndex = input.smart_money_index || 0
  if (smartMoneyIndex > 70) {
    eliteTA += 10
    if (primarySignal === "No clear signal") primarySignal = "Strong Smart Money"
  } else if (smartMoneyIndex > 50) {
    eliteTA += 6
  } else if (smartMoneyIndex < 20) {
    riskFactors.push("Weak smart money interest")
  }
  
  // Support/Resistance (0-7 points)
  if (input.near_support && input.near_resistance) {
    eliteTA += 7 // Perfect squeeze setup
    if (primarySignal === "No clear signal") primarySignal = "Support/Resistance Squeeze"
  } else if (input.near_support) {
    eliteTA += 4 // Bouncing off support
  } else if (input.near_resistance) {
    eliteTA += 3 // Testing resistance
  }

  // ======= BEHAVIORAL SCORING (0-30 points) =======
  
  // Whale Activity (0-12 points)
  const whaleActivity = input.whale_buys_24h || 0
  if (whaleActivity >= 15) {
    behavioral += 12
    if (primarySignal === "No clear signal") primarySignal = "Heavy Whale Activity"
  } else if (whaleActivity >= 10) {
    behavioral += 8
  } else if (whaleActivity >= 5) {
    behavioral += 4
  }
  
  // Volume Spike (0-10 points)
  const volumeSpike = input.volume_spike_ratio || 1
  if (volumeSpike >= 10) {
    behavioral += 10
    if (primarySignal === "No clear signal") primarySignal = "Massive Volume Spike"
  } else if (volumeSpike >= 5) {
    behavioral += 7
  } else if (volumeSpike >= 2) {
    behavioral += 4
  }
  
  // Holder Growth (0-8 points)
  const holderGrowth = input.new_holders_24h || 0
  if (holderGrowth >= 500) {
    behavioral += 8
  } else if (holderGrowth >= 200) {
    behavioral += 5
  } else if (holderGrowth >= 100) {
    behavioral += 3
  }

  // ======= MARKET CONTEXT (0-20 points) =======
  
  // Volume & Liquidity (0-8 points)
  const volume = input.volume_24h || 0
  const liquidity = input.liquidity || 0
  if (volume > 5000000 && liquidity > 1000000) {
    marketContext += 8 // High volume + liquidity
  } else if (volume > 1000000 && liquidity > 500000) {
    marketContext += 5
  } else if (volume < 100000 || liquidity < 50000) {
    riskFactors.push("Low volume/liquidity")
  }
  
  // Market Cap Sweet Spot (0-6 points)
  const marketCap = input.market_cap || 0
  if (marketCap > 10000000 && marketCap < 100000000) {
    marketContext += 6 // Sweet spot for growth
  } else if (marketCap > 1000000 && marketCap < 10000000) {
    marketContext += 4 // Micro cap potential
  } else if (marketCap > 1000000000) {
    marketContext += 1 // Large cap stability
    riskFactors.push("Large market cap - limited upside")
  }
  
  // Token Age (0-6 points)
  const tokenAge = input.token_age_hours || 999
  if (tokenAge < 24 && (input.volume_spike_ratio || 1) > 3) {
    marketContext += 6 // Fresh with momentum
    if (primarySignal === "No clear signal") primarySignal = "New Hot Token"
  } else if (tokenAge < 72) {
    marketContext += 4 // Still fresh
  } else if (tokenAge > 8760) { // > 1 year
    marketContext += 2 // Established
  }

  // ======= TECHNICAL ANALYSIS (0-10 points) =======
  
  // Breakouts (0-5 points)
  if (input.breakout_high_20) {
    technical += 5
    if (primarySignal === "No clear signal") primarySignal = "20-Period Breakout"
  } else if (input.near_breakout_high_20) {
    technical += 3
  }
  
  // EMA Crosses (0-3 points)
  if (input.cross_ema50_over_ema200) {
    technical += 3 // Golden cross
  } else if (input.cross_ema7_over_ema20) {
    technical += 2
  }
  
  // RSI (0-2 points)
  const rsi = input.rsi14 || 50
  if (rsi <= 30) {
    technical += 2 // Oversold bounce potential
  } else if (rsi >= 70) {
    riskFactors.push("Overbought conditions")
  }

  // ======= RISK ADJUSTMENTS =======
  
  // Price pump risk
  const priceChange = input.price_change_24h || 0
  if (priceChange > 100) {
    riskFactors.push("Extreme price pump - high risk")
    // Reduce all scores by 20%
    eliteTA *= 0.8
    behavioral *= 0.8
    marketContext *= 0.8
    technical *= 0.8
  } else if (priceChange > 50) {
    riskFactors.push("Large price move - increased volatility")
    // Reduce scores by 10%
    eliteTA *= 0.9
    behavioral *= 0.9
    marketContext *= 0.9
    technical *= 0.9
  }

  // ======= FINAL CALCULATION =======
  
  const total = Math.round(eliteTA + behavioral + marketContext + technical)
  
  // Confidence calculation
  let confidence: 'low' | 'medium' | 'high' = 'low'
  if (total >= 80 && riskFactors.length <= 1) {
    confidence = 'high'
  } else if (total >= 60 && riskFactors.length <= 2) {
    confidence = 'medium'
  }

  return {
    total: Math.min(100, Math.max(0, total)),
    eliteTA: Math.round(eliteTA),
    behavioral: Math.round(behavioral),
    marketContext: Math.round(marketContext),
    technical: Math.round(technical),
    confidence,
    primarySignal,
    riskFactors
  }
}

export function getEdgeScoreColor(score: number): string {
  if (score >= 85) return 'text-emerald-400'
  if (score >= 70) return 'text-green-400'
  if (score >= 55) return 'text-yellow-400'
  if (score >= 40) return 'text-orange-400'
  return 'text-gray-400'
}

export function getEdgeScoreLabel(score: number): string {
  if (score >= 85) return 'Elite Edge'
  if (score >= 70) return 'Strong Edge'
  if (score >= 55) return 'Moderate Edge'
  if (score >= 40) return 'Weak Edge'
  return 'No Edge'
}
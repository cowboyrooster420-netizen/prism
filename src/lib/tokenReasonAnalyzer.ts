/**
 * Token Reason Analyzer - Determines why a token is interesting
 * Based on behavioral metrics and technical analysis data
 */

export interface TokenReason {
  text: string;
  color: 'emerald' | 'blue' | 'purple' | 'orange' | 'yellow' | 'cyan' | 'indigo' | 'teal' | 'lime' | 'amber' | 'violet' | 'pink';
  priority: number; // Higher = more important
}

export interface TokenWithBehavioral {
  // Basic token data
  symbol: string;
  price_change_24h?: number;
  volume_24h?: number;
  market_cap?: number;
  liquidity?: number;
  
  // Behavioral metrics
  whale_buys_24h?: number;
  new_holders_24h?: number;
  volume_spike_ratio?: number;
  token_age_hours?: number;
  transaction_pattern_score?: number;
  smart_money_score?: number;
  
  // Technical analysis (basic)
  rsi14?: number;
  breakout_high_20?: boolean;
  near_breakout_high_20?: boolean;
  cross_ema7_over_ema20?: boolean;
  cross_ema50_over_ema200?: boolean;
  
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

export function analyzeTokenReasons(token: TokenWithBehavioral): TokenReason[] {
  const reasons: TokenReason[] = [];
  
  // 🚀 ELITE TA FEATURES - HIGHEST PRIORITY 🚀
  
  // VWAP Elite Signals (Top Priority)
  if (token.vwap_breakout_bullish) {
    reasons.push({
      text: "VWAP Breakout Bullish",
      color: "emerald",
      priority: 110
    });
  }
  
  if (token.vwap_breakout_bearish) {
    reasons.push({
      text: "VWAP Breakdown Risk",
      color: "amber",
      priority: 105
    });
  }
  
  // Smart Money Institutional Signals
  if (token.smart_money_bullish || (token.smart_money_index || 0) > 60) {
    reasons.push({
      text: "Smart Money Accumulation",
      color: "violet",
      priority: 108
    });
  }
  
  // Perfect Trend Alignment
  if (token.trend_alignment_strong || (token.trend_alignment_score || 0) > 0.75) {
    reasons.push({
      text: "Perfect Trend Alignment",
      color: "cyan",
      priority: 107
    });
  }
  
  // Support/Resistance Elite Signals
  if (token.near_support && (token.support_distance || 0) > -0.02 && (token.support_distance || 0) < 0.02) {
    reasons.push({
      text: "Key Support Level",
      color: "teal",
      priority: 103
    });
  }
  
  if (token.near_resistance && (token.resistance_distance || 0) > -0.02 && (token.resistance_distance || 0) < 0.02) {
    reasons.push({
      text: "Testing Resistance",
      color: "orange",
      priority: 102
    });
  }
  
  // VWAP Position Analysis
  if ((token.vwap_distance || 0) > 0.05) {
    reasons.push({
      text: "Strong Above VWAP",
      color: "lime",
      priority: 101
    });
  } else if ((token.vwap_distance || 0) < -0.1) {
    reasons.push({
      text: "Deep Below VWAP",
      color: "blue",
      priority: 98
    });
  }
  
  // Volume Profile Elite Signal
  if ((token.volume_profile_score || 0) > 0.8) {
    reasons.push({
      text: "High Volume Profile",
      color: "indigo",
      priority: 96
    });
  }
  
  // High Priority Alerts (Original + Enhanced)
  if ((token.volume_spike_ratio || 1) >= 10) {
    reasons.push({
      text: "Massive Volume Spike",
      color: "emerald",
      priority: 100
    });
  } else if ((token.volume_spike_ratio || 1) >= 5) {
    reasons.push({
      text: "Volume Spike",
      color: "lime", 
      priority: 90
    });
  }
  
  if ((token.whale_buys_24h || 0) >= 15) {
    reasons.push({
      text: "High Whale Activity", 
      color: "cyan",
      priority: 95
    });
  } else if ((token.whale_buys_24h || 0) >= 10) {
    reasons.push({
      text: "Whale Activity",
      color: "teal",
      priority: 85
    });
  }
  
  // New token with high activity
  if ((token.token_age_hours || 999) < 24 && (token.volume_spike_ratio || 1) > 3) {
    reasons.push({
      text: "New Hot Token",
      color: "amber", 
      priority: 98
    });
  }
  
  // Technical Breakouts (if available)
  if (token.breakout_high_20) {
    reasons.push({
      text: "Breakout Confirmed",
      color: "violet",
      priority: 97
    });
  } else if (token.near_breakout_high_20) {
    reasons.push({
      text: "Near Breakout",
      color: "purple",
      priority: 80
    });
  }
  
  // Growth Signals (Each with unique color)
  if ((token.new_holders_24h || 0) >= 500) {
    reasons.push({
      text: "Massive Holder Growth",
      color: "violet",
      priority: 75
    });
  } else if ((token.new_holders_24h || 0) >= 200) {
    reasons.push({
      text: "Strong Holder Growth", 
      color: "teal",
      priority: 70
    });
  }
  
  if ((token.smart_money_score || 0) >= 0.8) {
    reasons.push({
      text: "Strong Smart Money",
      color: "cyan",
      priority: 78
    });
  } else if ((token.smart_money_score || 0) >= 0.6) {
    reasons.push({
      text: "Smart Money Interest",
      color: "lime", 
      priority: 65
    });
  }
  
  // Golden Cross
  if (token.cross_ema50_over_ema200) {
    reasons.push({
      text: "Golden Cross",
      color: "yellow",
      priority: 85
    });
  } else if (token.cross_ema7_over_ema20) {
    reasons.push({
      text: "Short-term Bullish",
      color: "indigo",
      priority: 60
    });
  }
  
  // Technical Signals (Each with unique color)
  if ((token.rsi14 || 50) <= 30) {
    reasons.push({
      text: "RSI Oversold",
      color: "blue",
      priority: 55
    });
  } else if ((token.rsi14 || 50) >= 70) {
    reasons.push({
      text: "RSI Overbought", 
      color: "purple",
      priority: 50
    });
  }
  
  // Strong price movement
  if ((token.price_change_24h || 0) >= 50) {
    reasons.push({
      text: "Strong Pump",
      color: "pink",
      priority: 73
    });
  } else if ((token.price_change_24h || 0) >= 20) {
    reasons.push({
      text: "Price Momentum",
      color: "amber", 
      priority: 58
    });
  }
  
  // Quality indicators (Lower priority)
  if ((token.volume_24h || 0) >= 1000000) {
    reasons.push({
      text: "High Volume",
      color: "orange",
      priority: 40
    });
  }
  
  if ((token.liquidity || 0) >= 500000) {
    reasons.push({
      text: "High Liquidity",
      color: "indigo", 
      priority: 35
    });
  }
  
  // Very new token
  if ((token.token_age_hours || 999) < 6) {
    reasons.push({
      text: "Very New",
      color: "orange",
      priority: 45
    });
  } else if ((token.token_age_hours || 999) < 24) {
    reasons.push({
      text: "Fresh Launch",
      color: "amber",
      priority: 38
    });
  }
  
  // Sort by priority (highest first) and return top 3
  return reasons
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3);
}

export function getColorClasses(color: TokenReason['color']) {
  const colorMap = {
    emerald: {
      dot: 'bg-emerald-400',
      text: 'text-emerald-400'
    },
    blue: {
      dot: 'bg-blue-400',
      text: 'text-blue-400'
    },
    purple: {
      dot: 'bg-purple-400',
      text: 'text-purple-400'
    },
    orange: {
      dot: 'bg-orange-400', 
      text: 'text-orange-400'
    },
    yellow: {
      dot: 'bg-yellow-400',
      text: 'text-yellow-400'
    },
    cyan: {
      dot: 'bg-cyan-400',
      text: 'text-cyan-400'
    },
    indigo: {
      dot: 'bg-indigo-400',
      text: 'text-indigo-400'
    },
    teal: {
      dot: 'bg-teal-400',
      text: 'text-teal-400'
    },
    lime: {
      dot: 'bg-lime-400',
      text: 'text-lime-400'
    },
    amber: {
      dot: 'bg-amber-400',
      text: 'text-amber-400'
    },
    violet: {
      dot: 'bg-violet-400',
      text: 'text-violet-400'
    },
    pink: {
      dot: 'bg-pink-400',
      text: 'text-pink-400'
    }
  };
  
  return colorMap[color];
}
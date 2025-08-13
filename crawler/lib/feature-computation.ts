/* lib/feature-computation.ts
   Feature computation functions for technical analysis
*/

import { Series, sma, emaAll, zscore, slopeK, percentileRank } from './math-utils';
import { 
  bollingerWidth, 
  atr, 
  rsi, 
  macd, 
  donchianChannels, 
  findSwingLows,
  detectBullishRSIDivergence 
} from './technical-indicators';

export type Candle = {
  ts: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  quote_volume_usd: number;
};

export type TAFeature = {
  token_id: string;
  timeframe: string;
  ts: string;
  sma7: number;
  sma20: number;
  sma50: number;
  sma200: number;
  ema7: number;
  ema20: number;
  ema50: number;
  ema200: number;
  rsi14: number;
  macd: number;
  macd_signal: number;
  macd_hist: number;
  atr14: number;
  donchian_high_20: number;
  donchian_low_20: number;
  bb_width: number;
  bb_width_pctl60: number;
  vol_ma20: number;
  vol_z60: number;
  vol_z60_slope: number;
  cross_ema7_over_ema20: boolean;
  cross_ema50_over_ema200: boolean;
  breakout_high_20: boolean;
  breakout_low_20: boolean;
  near_breakout_high_20: boolean;
  bullish_rsi_div: boolean;
};

/**
 * Calculate moving averages for all periods
 * @param close - Array of closing prices
 * @returns Object containing SMA and EMA arrays for all periods
 */
export function calculateMovingAverages(close: Series) {
  const sma7 = sma(close, 7);
  const sma20 = sma(close, 20);
  const sma50 = sma(close, 50);
  const sma200 = sma(close, 200);
  
  return {
    // Simple Moving Averages - pad with original values for indices < period-1
    sma7: close.map((val, i) => i < 6 ? val : sma7[i]),
    sma20: close.map((val, i) => i < 19 ? val : sma20[i]),
    sma50: close.map((val, i) => i < 49 ? val : sma50[i]),
    sma200: close.map((val, i) => i < 199 ? val : sma200[i]),
    
    // Exponential Moving Averages
    ema7: emaAll(close, 7),
    ema20: emaAll(close, 20),
    ema50: emaAll(close, 50),
    ema200: emaAll(close, 200)
  };
}

/**
 * Calculate volume-related features
 * @param vol - Array of volume values
 * @param i - Current index
 * @returns Object containing volume features
 */
export function calculateVolumeFeatures(vol: Series, i: number) {
  const volMA20 = i >= 19 ? sma(vol, 20, i) : vol[i];
  const volMean60 = vol.slice(i - 59, i + 1).reduce((a, b) => a + b, 0) / 60;
  const volSd60 = Math.sqrt(
    vol.slice(i - 59, i + 1).reduce((acc, val) => acc + (val - volMean60) ** 2, 0) / 59
  );
  const volZ = volSd60 > 0 ? (vol[i] - volMean60) / volSd60 : 0;
  
  // Volume slope (last 6 bars)
  const vzSlice = vol.slice(Math.max(0, i - 5), i + 1);
  const vzSlope = slopeK(vzSlice, Math.min(6, i + 1));
  
  return {
    vol_ma20: volMA20,
    vol_z60: volZ,
    vol_z60_slope: vzSlope
  };
}

/**
 * Calculate Bollinger Bands features
 * @param close - Array of closing prices
 * @param i - Current index
 * @returns Object containing Bollinger Bands features
 */
export function calculateBollingerBandsFeatures(close: Series, i: number) {
  const bbW = bollingerWidth(close, 20, 2, i);
  
  // Calculate percentile rank vs last 60 bars
  const start = Math.max(19, i - 59);
  const bbSlice: Series = [];
  for (let k = start; k <= i; k++) {
    bbSlice.push(bollingerWidth(close, 20, 2, k));
  }
  
  const pctl = percentileRank(bbW, bbSlice);
  
  return {
    bb_width: bbW,
    bb_width_pctl60: pctl
  };
}

/**
 * Calculate breakout and channel features
 * @param high - Array of high prices
 * @param low - Array of low prices
 * @param close - Array of closing prices
 * @param i - Current index
 * @returns Object containing breakout and channel features
 */
export function calculateBreakoutFeatures(high: Series, low: Series, close: Series, i: number) {
  const dHigh20 = Math.max(...high.slice(i - 19, i + 1));
  const dLow20 = Math.min(...low.slice(i - 19, i + 1));
  const closeNow = close[i];
  
  return {
    donchian_high_20: dHigh20,
    donchian_low_20: dLow20,
    breakout_high_20: closeNow > dHigh20,
    breakout_low_20: closeNow < dLow20,
    near_breakout_high_20: closeNow >= 0.99 * dHigh20
  };
}

/**
 * Calculate crossover events
 * @param ema7 - Array of EMA7 values
 * @param ema20 - Array of EMA20 values
 * @param ema50 - Array of EMA50 values
 * @param ema200 - Array of EMA200 values
 * @param i - Current index
 * @returns Object containing crossover events
 */
export function calculateCrossoverEvents(
  ema7: Series, 
  ema20: Series, 
  ema50: Series, 
  ema200: Series, 
  i: number
) {
  if (i === 0) {
    return {
      cross_ema7_over_ema20: false,
      cross_ema50_over_ema200: false
    };
  }
  
  const cross7_20 = ema7[i] >= ema20[i] && ema7[i - 1] < ema20[i - 1];
  const cross50_200 = ema50[i] >= ema200[i] && ema50[i - 1] < ema200[i - 1];
  
  return {
    cross_ema7_over_ema20: cross7_20,
    cross_ema50_over_ema200: cross50_200
  };
}

/**
 * Calculate RSI divergence
 * @param close - Array of closing prices
 * @param rsiValues - Array of RSI values
 * @param i - Current index
 * @returns True if bullish RSI divergence is detected
 */
export function calculateRSIDivergence(close: Series, rsiValues: Series, i: number): boolean {
  return detectBullishRSIDivergence(close, rsiValues, i);
}

/**
 * Compute all technical features for a single candle
 * @param candleData - Object containing all calculated arrays
 * @param i - Current index
 * @param token_id - Token identifier
 * @param timeframe - Timeframe identifier
 * @returns TAFeature object for the current candle
 */
export function computeSingleFeature(
  candleData: {
    ts: Series;
    close: Series;
    high: Series;
    low: Series;
    vol: Series;
    movingAverages: ReturnType<typeof calculateMovingAverages>;
    rsiValues: Series;
    atrValues: Series;
    macdData: ReturnType<typeof macd>;
  },
  i: number,
  token_id: string,
  timeframe: string
): TAFeature {
  const { ts, close, high, low, vol, movingAverages, rsiValues, atrValues, macdData } = candleData;
  const { ema7, ema20, ema50, ema200 } = movingAverages;
  
  const volumeFeatures = calculateVolumeFeatures(vol, i);
  const bbFeatures = calculateBollingerBandsFeatures(close, i);
  const breakoutFeatures = calculateBreakoutFeatures(high, low, close, i);
  const crossoverEvents = calculateCrossoverEvents(ema7, ema20, ema50, ema200, i);
  const rsiDivergence = calculateRSIDivergence(close, rsiValues, i);
  
  return {
    token_id,
    timeframe,
    ts: ts[i],
    sma7: movingAverages.sma7[i],
    sma20: movingAverages.sma20[i],
    sma50: movingAverages.sma50[i],
    sma200: movingAverages.sma200[i],
    ema7: ema7[i],
    ema20: ema20[i],
    ema50: ema50[i],
    ema200: ema200[i],
    rsi14: rsiValues[i] ?? 50,
    macd: macdData.macdLine[i],
    macd_signal: macdData.signalLine[i],
    macd_hist: macdData.histogram[i],
    atr14: atrValues[i],
    donchian_high_20: breakoutFeatures.donchian_high_20,
    donchian_low_20: breakoutFeatures.donchian_low_20,
    bb_width: bbFeatures.bb_width,
    bb_width_pctl60: bbFeatures.bb_width_pctl60,
    vol_ma20: volumeFeatures.vol_ma20,
    vol_z60: volumeFeatures.vol_z60,
    vol_z60_slope: volumeFeatures.vol_z60_slope,
    cross_ema7_over_ema20: crossoverEvents.cross_ema7_over_ema20,
    cross_ema50_over_ema200: crossoverEvents.cross_ema50_over_ema200,
    breakout_high_20: breakoutFeatures.breakout_high_20,
    breakout_low_20: breakoutFeatures.breakout_low_20,
    near_breakout_high_20: breakoutFeatures.near_breakout_high_20,
    bullish_rsi_div: rsiDivergence
  };
}

/**
 * Main function to compute all technical features from candle data
 * @param candles - Array of candle data
 * @param token_id - Token identifier
 * @param timeframe - Timeframe identifier
 * @returns Array of TAFeature objects
 */
export function computeFeatures(candles: Candle[], token_id: string, timeframe: string): TAFeature[] {
  if (candles.length < 60) return [];
  
  // Extract price and volume data
  const ts = candles.map(c => c.ts);
  const close = candles.map(c => c.close);
  const high = candles.map(c => c.high);
  const low = candles.map(c => c.low);
  const vol = candles.map(c => c.volume);
  
  // Calculate all moving averages
  const movingAverages = calculateMovingAverages(close);
  
  // Calculate technical indicators
  const rsiValues = rsi(close, 14);
  const atrValues = atr(high, low, close, 14);
  const macdData = macd(close, 12, 26, 9);
  
  // Prepare candle data object
  const candleData = {
    ts,
    close,
    high,
    low,
    vol,
    movingAverages,
    rsiValues,
    atrValues,
    macdData
  };
  
  // Compute features for each candle (starting from index 59)
  const features: TAFeature[] = [];
  for (let i = 59; i < close.length; i++) {
    const feature = computeSingleFeature(candleData, i, token_id, timeframe);
    features.push(feature);
  }
  
  return features;
}

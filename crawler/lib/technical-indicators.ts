/* lib/technical-indicators.ts
   Technical analysis indicators for financial data
*/

import { Series, sma, stdev, emaAll, maxN, minN, percentileRank } from './math-utils';

/**
 * Calculate Bollinger Bands width
 * @param closes - Array of closing prices
 * @param n - Period length (default: 20)
 * @param k - Standard deviation multiplier (default: 2)
 * @param i - Current index
 * @returns Bollinger Bands width as percentage of middle band
 */
export function bollingerWidth(closes: Series, n: number, k: number, i: number): number {
  if (i < n - 1) return 0;
  
  const m = sma(closes, n, i);
  const sd = stdev(closes, n, i);
  const upper = m + k * sd;
  const lower = m - k * sd;
  
  return m !== 0 ? (upper - lower) / m : 0;
}

/**
 * Calculate Average True Range (ATR) using Wilder's smoothing
 * @param highs - Array of high prices
 * @param lows - Array of low prices
 * @param closes - Array of closing prices
 * @param period - ATR period (default: 14)
 * @returns Array of ATR values
 */
export function atr(highs: Series, lows: Series, closes: Series, period: number = 14): Series {
  if (highs.length === 0 || lows.length === 0 || closes.length === 0) return [];
  
  const trs: Series = [];
  
  // Calculate True Range for each bar
  for (let i = 0; i < highs.length; i++) {
    const prevClose = i > 0 ? closes[i - 1] : closes[0];
    const tr = Math.max(
      highs[i] - lows[i],                    // High - Low
      Math.abs(highs[i] - prevClose),        // |High - Previous Close|
      Math.abs(lows[i] - prevClose)          // |Low - Previous Close|
    );
    trs.push(tr);
  }
  
  // Apply Wilder's smoothing
  const out: Series = [];
  let prev = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out[period - 1] = prev;
  
  for (let i = period; i < trs.length; i++) {
    prev = (prev * (period - 1) + trs[i]) / period;
    out[i] = prev;
  }
  
  // Fill early values with the first calculated ATR
  for (let i = 0; i < period - 1 && i < out.length; i++) {
    out[i] = out[period - 1];
  }
  
  return out;
}

/**
 * Calculate Relative Strength Index (RSI)
 * @param closes - Array of closing prices
 * @param period - RSI period (default: 14)
 * @returns Array of RSI values
 */
export function rsi(closes: Series, period: number = 14): Series {
  if (closes.length < 2) return new Array(closes.length).fill(50);
  
  const gains: Series = [];
  const losses: Series = [];
  
  // Calculate gains and losses
  for (let i = 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    gains.push(Math.max(0, change));
    losses.push(Math.max(0, -change));
  }
  
  const avgGain: Series = [];
  const avgLoss: Series = [];
  
  // Initialize with simple average
  let g = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let l = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  avgGain[period - 1] = g;
  avgLoss[period - 1] = l;
  
  // Apply Wilder's smoothing
  for (let i = period; i < gains.length; i++) {
    g = (g * (period - 1) + gains[i]) / period;
    l = (l * (period - 1) + losses[i]) / period;
    avgGain[i] = g;
    avgLoss[i] = l;
  }
  
  // Calculate RSI
  const rsi: Series = new Array(closes.length).fill(50);
  for (let i = 0; i < avgGain.length; i++) {
    const rs = avgLoss[i] === 0 ? 100 : avgGain[i] / avgLoss[i];
    const val = 100 - (100 / (1 + rs));
    rsi[i + 1] = val; // Shift by one because gains/losses start at index 1
  }
  
  return rsi;
}

/**
 * Calculate Moving Average Convergence Divergence (MACD)
 * @param closes - Array of closing prices
 * @param fast - Fast EMA period (default: 12)
 * @param slow - Slow EMA period (default: 26)
 * @param signal - Signal line period (default: 9)
 * @returns Object containing MACD line, signal line, and histogram
 */
export function macd(
  closes: Series, 
  fast: number = 12, 
  slow: number = 26, 
  signal: number = 9
): { macdLine: Series; signalLine: Series; histogram: Series } {
  const emaFast = emaAll(closes, fast);
  const emaSlow = emaAll(closes, slow);
  
  // MACD line = Fast EMA - Slow EMA
  const macdLine = emaFast.map((v, i) => v - (emaSlow[i] ?? 0));
  
  // Signal line = EMA of MACD line
  const signalLine = emaAll(macdLine, signal);
  
  // Histogram = MACD line - Signal line
  const histogram = macdLine.map((v, i) => v - (signalLine[i] ?? 0));
  
  return { macdLine, signalLine, histogram };
}

/**
 * Calculate Donchian Channels
 * @param highs - Array of high prices
 * @param lows - Array of low prices
 * @param period - Channel period (default: 20)
 * @returns Object containing upper and lower channel values
 */
export function donchianChannels(
  highs: Series, 
  lows: Series, 
  period: number = 20
): { upper: Series; lower: Series } {
  const upper: Series = [];
  const lower: Series = [];
  
  for (let i = 0; i < highs.length; i++) {
    upper.push(maxN(highs, period, i));
    lower.push(minN(lows, period, i));
  }
  
  return { upper, lower };
}

/**
 * Find swing lows in price data
 * @param closes - Array of closing prices
 * @param window - Window size for swing detection (default: 2)
 * @returns Array of indices where swing lows occur
 */
export function findSwingLows(closes: Series, window: number = 2): number[] {
  const lows: number[] = [];
  
  for (let i = window; i < closes.length - window; i++) {
    const val = closes[i];
    const left = closes.slice(i - window, i);
    const right = closes.slice(i + 1, i + 1 + window);
    
    if (val <= Math.min(...left) && val <= Math.min(...right)) {
      lows.push(i);
    }
  }
  
  return lows;
}

/**
 * Find swing highs in price data
 * @param closes - Array of closing prices
 * @param window - Window size for swing detection (default: 2)
 * @returns Array of indices where swing highs occur
 */
export function findSwingHighs(closes: Series, window: number = 2): number[] {
  const highs: number[] = [];
  
  for (let i = window; i < closes.length - window; i++) {
    const val = closes[i];
    const left = closes.slice(i - window, i);
    const right = closes.slice(i + 1, i + 1 + window);
    
    if (val >= Math.max(...left) && val >= Math.max(...right)) {
      highs.push(i);
    }
  }
  
  return highs;
}

/**
 * Detect bullish RSI divergence
 * @param closes - Array of closing prices
 * @param rsiValues - Array of RSI values
 * @param currentIndex - Current index to check for divergence
 * @returns True if bullish divergence is detected
 */
export function detectBullishRSIDivergence(
  closes: Series, 
  rsiValues: Series, 
  currentIndex: number
): boolean {
  const sw = findSwingLows(closes.slice(0, currentIndex + 1), 2);
  
  if (sw.length < 2) return false;
  
  const L2 = sw[sw.length - 1]; // More recent swing low
  const L1 = sw[sw.length - 2]; // Earlier swing low
  
  const priceLL = closes[L2] < closes[L1]; // Price making lower low
  const rsiHigher = (rsiValues[L2] ?? 0) > (rsiValues[L1] ?? 0); // RSI making higher low
  
  // Bullish divergence: price makes lower low but RSI makes higher low
  return (priceLL && rsiHigher) || (!priceLL && (rsiValues[L2] ?? 0) >= (rsiValues[L1] ?? 0));
}

/**
 * Detect bearish RSI divergence
 * @param closes - Array of closing prices
 * @param rsiValues - Array of RSI values
 * @param currentIndex - Current index to check for divergence
 * @returns True if bearish divergence is detected
 */
export function detectBearishRSIDivergence(
  closes: Series, 
  rsiValues: Series, 
  currentIndex: number
): boolean {
  const sw = findSwingHighs(closes.slice(0, currentIndex + 1), 2);
  
  if (sw.length < 2) return false;
  
  const H2 = sw[sw.length - 1]; // More recent swing high
  const H1 = sw[sw.length - 2]; // Earlier swing high
  
  const priceHH = closes[H2] > closes[H1]; // Price making higher high
  const rsiLower = (rsiValues[H2] ?? 0) < (rsiValues[H1] ?? 0); // RSI making lower high
  
  // Bearish divergence: price makes higher high but RSI makes lower high
  return (priceHH && rsiLower) || (!priceHH && (rsiValues[H2] ?? 0) <= (rsiValues[H1] ?? 0));
}

/**
 * Calculate Stochastic Oscillator
 * @param highs - Array of high prices
 * @param lows - Array of low prices
 * @param closes - Array of closing prices
 * @param kPeriod - %K period (default: 14)
 * @param dPeriod - %D period (default: 3)
 * @returns Object containing %K and %D values
 */
export function stochastic(
  highs: Series, 
  lows: Series, 
  closes: Series, 
  kPeriod: number = 14, 
  dPeriod: number = 3
): { k: Series; d: Series } {
  const k: Series = [];
  
  for (let i = 0; i < closes.length; i++) {
    if (i < kPeriod - 1) {
      k.push(50); // Default value when not enough data
      continue;
    }
    
    const highestHigh = Math.max(...highs.slice(i - kPeriod + 1, i + 1));
    const lowestLow = Math.min(...lows.slice(i - kPeriod + 1, i + 1));
    const range = highestHigh - lowestLow;
    
    if (range === 0) {
      k.push(50);
    } else {
      k.push(((closes[i] - lowestLow) / range) * 100);
    }
  }
  
  // Calculate %D (SMA of %K)
  const d: Series = [];
  for (let i = 0; i < k.length; i++) {
    if (i < dPeriod - 1) {
      d.push(k[i]);
    } else {
      const dValue = k.slice(i - dPeriod + 1, i + 1).reduce((a, b) => a + b, 0) / dPeriod;
      d.push(dValue);
    }
  }
  
  return { k, d };
}


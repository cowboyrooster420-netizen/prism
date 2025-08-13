/* lib/math-utils.ts
   Mathematical utilities for technical analysis calculations
*/

export type Series = number[];

/**
 * Calculate Simple Moving Average (SMA) for a given period
 * @param arr - Array of values
 * @param n - Period length
 * @returns Array of SMA values
 */
export const sma = (arr: Series, n: number): Series => {
  if (arr.length < n) return [];
  
  const result: Series = [];
  for (let i = 0; i <= arr.length - n; i++) {
    const s = arr.slice(i, i + n);
    result.push(s.reduce((a, b) => a + b, 0) / n);
  }
  
  return result;
};

/**
 * Calculate Exponential Moving Average (EMA) for entire array
 * @param arr - Array of values
 * @param n - Period length
 * @returns Array of EMA values
 */
export const emaAll = (arr: Series, n: number): Series => {
  if (arr.length === 0) return [];
  
  const k = 2 / (n + 1);
  const out: Series = [];
  let prev = arr[0];
  out[0] = prev;
  
  for (let i = 1; i < arr.length; i++) {
    const val = arr[i] * k + prev * (1 - k);
    out.push(val);
    prev = val;
  }
  
  return out;
};

/**
 * Calculate multiple EMAs for different periods
 * @param arr - Array of values
 * @param periods - Array of period lengths
 * @returns Object with EMA arrays for each period
 */
export const emaAllMultiple = (arr: Series, periods: number[]): Record<string, Series> => {
  const result: Record<string, Series> = {};
  
  periods.forEach(period => {
    result[`ema_${period}`] = emaAll(arr, period);
  });
  
  return result;
};

/**
 * Calculate Standard Deviation for a given period
 * @param arr - Array of values
 * @param n - Period length
 * @returns Array of standard deviation values
 */
export const stdev = (arr: Series, n: number): Series => {
  if (arr.length < n) return [];
  
  const result: Series = [];
  for (let i = 0; i <= arr.length - n; i++) {
    const s = arr.slice(i, i + n);
    if (n === 1) {
      result.push(0); // Standard deviation of single value is 0
    } else {
      const m = s.reduce((a, b) => a + b, 0) / n;
      const v = s.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1);
      result.push(Math.sqrt(v));
    }
  }
  
  return result;
};

/**
 * Calculate Z-score (standard score) for an array
 * @param arr - Array of values
 * @returns Array of Z-score values
 */
export const zscore = (arr: Series): Series => {
  if (arr.length === 0) return [];
  
  const m = mean(arr);
  const s = Math.sqrt(variance(arr));
  
  if (s === 0) return arr.map(() => 0);
  
  return arr.map(x => (x - m) / s);
};

/**
 * Calculate linear slope of last k points using linear regression
 * @param arr - Array of values
 * @param k - Number of points to use
 * @returns Slope value
 */
export const slopeK = (arr: Series, k: number): number => {
  if (arr.length < k) return 0;
  
  const y = arr.slice(-k);
  const n = y.length;
  const x = Array.from({ length: n }, (_, i) => i + 1);
  
  const xMean = (n + 1) / 2;
  const yMean = y.reduce((a, b) => a + b, 0) / n;
  
  const num = y.reduce((acc, yi, i) => acc + (x[i] - xMean) * (yi - yMean), 0);
  const den = x.reduce((acc, xi) => acc + (xi - xMean) ** 2, 0);
  
  return den > 0 ? num / den : 0;
};

/**
 * Find maximum value in a rolling window
 * @param arr - Array of values
 * @param n - Window size
 * @returns Array of maximum values for each window
 */
export const maxN = (arr: Series, n: number): Series => {
  if (arr.length < n) {
    // If N > data length, return sorted array in descending order
    return [...arr].sort((a, b) => b - a);
  }
  
  const result: Series = [];
  for (let i = 0; i <= arr.length - n; i++) {
    const window = arr.slice(i, i + n);
    result.push(Math.max(...window));
  }
  
  return result;
};

/**
 * Find minimum value in a rolling window
 * @param arr - Array of values
 * @param n - Window size
 * @returns Array of minimum values for each window
 */
export const minN = (arr: Series, n: number): Series => {
  if (arr.length < n) {
    // If N > data length, return sorted array in ascending order
    return [...arr].sort((a, b) => a - b);
  }
  
  const result: Series = [];
  for (let i = 0; i <= arr.length - n; i++) {
    const window = arr.slice(i, i + n);
    result.push(Math.min(...window));
  }
  
  return result;
};

/**
 * Calculate percentile rank of a value in an array
 * @param value - Value to find percentile for
 * @param arr - Array of values
 * @returns Percentile rank (0-100)
 */
export const percentileRank = (value: number, arr: Series): number => {
  if (arr.length === 0) return 0;
  
  const sorted = [...arr].sort((a, b) => a - b);
  const rankIdx = sorted.findIndex(v => v >= value);
  
  if (rankIdx < 0) return 100;
  return Math.round((rankIdx / sorted.length) * 100);
};

/**
 * Calculate sum of array values
 * @param arr - Array of values
 * @returns Sum of all values
 */
export const sum = (arr: Series): number => {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0);
};

/**
 * Calculate mean (average) of array values
 * @param arr - Array of values
 * @returns Mean value
 */
export const mean = (arr: Series): number => {
  if (arr.length === 0) return 0;
  return sum(arr) / arr.length;
};

/**
 * Calculate variance of array values
 * @param arr - Array of values
 * @returns Variance value
 */
export const variance = (arr: Series): number => {
  if (arr.length <= 1) return 0;
  
  const m = mean(arr);
  const v = arr.reduce((acc, val) => acc + (val - m) ** 2, 0);
  return v / (arr.length - 1);
};

/**
 * Calculate coefficient of variation (CV = std/mean)
 * @param arr - Array of values
 * @returns Coefficient of variation
 */
export const coefficientOfVariation = (arr: Series): number => {
  const m = mean(arr);
  if (m === 0) return 0;
  
  const std = Math.sqrt(variance(arr));
  return std / m;
};

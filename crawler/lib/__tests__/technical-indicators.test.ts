import {
  bollingerWidth,
  atr,
  rsi,
  macd,
  donchianChannels,
  findSwingLows,
  findSwingHighs,
  detectBullishRSIDivergence,
  detectBearishRSIDivergence,
  stochastic
} from '../technical-indicators';

describe('Technical Indicators', () => {
  describe('Bollinger Bands', () => {
    test('bollingerWidth should calculate band width', () => {
      const data = [100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110];
      const result = bollingerWidth(data, 5, 2);
      
      expect(result).toHaveLength(7);
      expect(result[0]).toBeGreaterThan(0);
      expect(result[6]).toBeGreaterThan(0);
    });

    test('bollingerWidth should handle insufficient data', () => {
      const data = [100, 101, 102];
      const result = bollingerWidth(data, 5, 2);
      expect(result).toHaveLength(0);
    });

    test('bollingerWidth should handle edge case data', () => {
      const data = [100, 100, 100, 100, 100];
      const result = bollingerWidth(data, 5, 2);
      expect(result[0]).toBe(0); // No variance = no width
    });
  });

  describe('ATR (Average True Range)', () => {
    test('atr should calculate average true range', () => {
      const highs = [110, 112, 115, 113, 116];
      const lows = [100, 101, 103, 102, 104];
      const closes = [105, 111, 114, 112, 115];
      
      const result = atr(highs, lows, closes, 3);
      
      expect(result).toHaveLength(3);
      expect(result[0]).toBeGreaterThan(0);
      expect(result[2]).toBeGreaterThan(0);
    });

    test('atr should handle insufficient data', () => {
      const highs = [110, 112];
      const lows = [100, 101];
      const closes = [105, 111];
      
      const result = atr(highs, lows, closes, 3);
      expect(result).toHaveLength(0);
    });

    test('atr should handle flat data', () => {
      const highs = [100, 100, 100, 100, 100];
      const lows = [100, 100, 100, 100, 100];
      const closes = [100, 100, 100, 100, 100];
      
      const result = atr(highs, lows, closes, 3);
      expect(result[0]).toBe(0); // No range = no ATR
    });
  });

  describe('RSI (Relative Strength Index)', () => {
    test('rsi should calculate RSI values', () => {
      const data = [100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113];
      const result = rsi(data, 14);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toBeGreaterThanOrEqual(0);
      expect(result[0]).toBeLessThanOrEqual(100);
    });

    test('rsi should handle insufficient data', () => {
      const data = [100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112];
      const result = rsi(data, 14);
      expect(result).toHaveLength(0);
    });

    test('rsi should handle all gains', () => {
      const data = [100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113];
      const result = rsi(data, 14);
      expect(result[0]).toBe(100); // All gains = RSI 100
    });

    test('rsi should handle all losses', () => {
      const data = [113, 112, 111, 110, 109, 108, 107, 106, 105, 104, 103, 102, 101, 100];
      const result = rsi(data, 14);
      expect(result[0]).toBe(0); // All losses = RSI 0
    });
  });

  describe('MACD (Moving Average Convergence Divergence)', () => {
    test('macd should calculate MACD values', () => {
      const data = Array.from({ length: 50 }, (_, i) => 100 + i);
      const result = macd(data, 12, 26, 9);
      
      expect(result).toHaveProperty('macd');
      expect(result).toHaveProperty('signal');
      expect(result).toHaveProperty('histogram');
      expect(result.macd.length).toBeGreaterThan(0);
      expect(result.signal.length).toBeGreaterThan(0);
      expect(result.histogram.length).toBeGreaterThan(0);
    });

    test('macd should handle insufficient data', () => {
      const data = Array.from({ length: 25 }, (_, i) => 100 + i);
      const result = macd(data, 12, 26, 9);
      expect(result.macd).toHaveLength(0);
    });

    test('macd should calculate correct relationships', () => {
      const data = Array.from({ length: 50 }, (_, i) => 100 + i);
      const result = macd(data, 12, 26, 9);
      
      // MACD should be faster than signal for trending data
      expect(result.macd[result.macd.length - 1]).toBeGreaterThan(result.signal[result.signal.length - 1]);
      
      // Histogram should be positive for upward trend
      expect(result.histogram[result.histogram.length - 1]).toBeGreaterThan(0);
    });
  });

  describe('Donchian Channels', () => {
    test('donchianChannels should calculate upper and lower bands', () => {
      const highs = [110, 112, 115, 113, 116, 118, 117, 119];
      const lows = [100, 101, 103, 102, 104, 105, 106, 107];
      
      const result = donchianChannels(highs, lows, 5);
      
      expect(result).toHaveProperty('upper');
      expect(result).toHaveProperty('lower');
      expect(result.upper).toHaveLength(4);
      expect(result.lower).toHaveLength(4);
      
      // Upper should always be >= lower
      result.upper.forEach((upper, i) => {
        expect(upper).toBeGreaterThanOrEqual(result.lower[i]);
      });
    });

    test('donchianChannels should handle insufficient data', () => {
      const highs = [110, 112, 115];
      const lows = [100, 101, 103];
      
      const result = donchianChannels(highs, lows, 5);
      expect(result.upper).toHaveLength(0);
      expect(result.lower).toHaveLength(0);
    });

    test('donchianChannels should handle flat data', () => {
      const highs = [100, 100, 100, 100, 100];
      const lows = [100, 100, 100, 100, 100];
      
      const result = donchianChannels(highs, lows, 5);
      expect(result.upper[0]).toBe(100);
      expect(result.lower[0]).toBe(100);
    });
  });

  describe('Swing Detection', () => {
    test('findSwingLows should identify swing lows', () => {
      const data = [100, 95, 90, 95, 100, 105, 100, 95, 90, 95, 100];
      const result = findSwingLows(data, 2);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toBe(2); // Index of 90
      expect(result[1]).toBe(8); // Index of 90
    });

    test('findSwingHighs should identify swing highs', () => {
      const data = [100, 105, 110, 105, 100, 95, 100, 105, 110, 105, 100];
      const result = findSwingHighs(data, 2);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toBe(2); // Index of 110
      expect(result[1]).toBe(8); // Index of 110
    });

    test('swing detection should handle edge cases', () => {
      const data = [100, 100, 100, 100, 100];
      const swingLows = findSwingLows(data, 2);
      const swingHighs = findSwingHighs(data, 2);
      
      expect(swingLows).toHaveLength(0);
      expect(swingHighs).toHaveLength(0);
    });

    test('swing detection should handle insufficient data', () => {
      const data = [100, 101, 102];
      const swingLows = findSwingLows(data, 2);
      const swingHighs = findSwingHighs(data, 2);
      
      expect(swingLows).toHaveLength(0);
      expect(swingHighs).toHaveLength(0);
    });
  });

  describe('RSI Divergence Detection', () => {
    test('detectBullishRSIDivergence should identify bullish divergence', () => {
      const prices = [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50];
      const rsiValues = [30, 25, 20, 15, 10, 5, 10, 15, 20, 25, 30];
      
      const result = detectBullishRSIDivergence(prices, rsiValues, 5);
      
      expect(result).toBe(true); // RSI increasing while price decreasing
    });

    test('detectBearishRSIDivergence should identify bearish divergence', () => {
      const prices = [50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100];
      const rsiValues = [70, 75, 80, 85, 90, 95, 90, 85, 80, 75, 70];
      
      const result = detectBearishRSIDivergence(prices, rsiValues, 5);
      
      expect(result).toBe(true); // RSI decreasing while price increasing
    });

    test('divergence detection should handle no divergence', () => {
      const prices = [100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110];
      const rsiValues = [50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60];
      
      const bullish = detectBullishRSIDivergence(prices, rsiValues, 5);
      const bearish = detectBearishRSIDivergence(prices, rsiValues, 5);
      
      expect(bullish).toBe(false);
      expect(bearish).toBe(false);
    });

    test('divergence detection should handle insufficient data', () => {
      const prices = [100, 101, 102, 103, 104];
      const rsiValues = [50, 51, 52, 53, 54];
      
      const bullish = detectBullishRSIDivergence(prices, rsiValues, 5);
      const bearish = detectBearishRSIDivergence(prices, rsiValues, 5);
      
      expect(bullish).toBe(false);
      expect(bearish).toBe(false);
    });
  });

  describe('Stochastic Oscillator', () => {
    test('stochastic should calculate %K and %D values', () => {
      const highs = [110, 112, 115, 113, 116, 118, 117, 119, 120, 121, 122, 123, 124, 125];
      const lows = [100, 101, 103, 102, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113];
      const closes = [105, 111, 114, 112, 115, 117, 116, 118, 119, 120, 121, 122, 123, 124];
      
      const result = stochastic(highs, lows, closes, 14, 3);
      
      expect(result).toHaveProperty('k');
      expect(result).toHaveProperty('d');
      expect(result.k).toHaveLength(1);
      expect(result.d).toHaveLength(1);
      
      // %K and %D should be between 0 and 100
      expect(result.k[0]).toBeGreaterThanOrEqual(0);
      expect(result.k[0]).toBeLessThanOrEqual(100);
      expect(result.d[0]).toBeGreaterThanOrEqual(0);
      expect(result.d[0]).toBeLessThanOrEqual(100);
    });

    test('stochastic should handle insufficient data', () => {
      const highs = [110, 112, 115, 113, 116, 118, 117, 119, 120, 121, 122, 123, 124];
      const lows = [100, 101, 103, 102, 104, 105, 106, 107, 108, 109, 110, 111, 112];
      const closes = [105, 111, 114, 112, 115, 117, 116, 118, 119, 120, 121, 122, 123];
      
      const result = stochastic(highs, lows, closes, 14, 3);
      expect(result.k).toHaveLength(0);
      expect(result.d).toHaveLength(0);
    });

    test('stochastic should handle flat data', () => {
      const highs = [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100];
      const lows = [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100];
      const closes = [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100];
      
      const result = stochastic(highs, lows, closes, 14, 3);
      expect(result.k[0]).toBe(50); // Middle value for flat data
      expect(result.d[0]).toBe(50);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle empty arrays', () => {
      expect(() => bollingerWidth([], 5, 2)).toThrow();
      expect(() => atr([], [], [], 3)).toThrow();
      expect(() => rsi([], 14)).toThrow();
      expect(() => macd([], 12, 26, 9)).toThrow();
      expect(() => donchianChannels([], [], 5)).toThrow();
      expect(() => findSwingLows([], 2)).toThrow();
      expect(() => findSwingHighs([], 2)).toThrow();
      expect(() => stochastic([], [], [], 14, 3)).toThrow();
    });

    test('should handle invalid periods', () => {
      const data = [100, 101, 102, 103, 104];
      expect(() => bollingerWidth(data, 0, 2)).toThrow();
      expect(() => bollingerWidth(data, -1, 2)).toThrow();
      expect(() => rsi(data, 0)).toThrow();
      expect(() => rsi(data, -1)).toThrow();
    });

    test('should handle NaN values', () => {
      const data = [100, 101, NaN, 103, 104];
      expect(() => bollingerWidth(data, 3, 2)).toThrow();
      expect(() => rsi(data, 3)).toThrow();
    });

    test('should handle Infinity values', () => {
      const data = [100, 101, Infinity, 103, 104];
      expect(() => bollingerWidth(data, 3, 2)).toThrow();
      expect(() => rsi(data, 3)).toThrow();
    });
  });

  describe('Performance Tests', () => {
    test('should handle large datasets efficiently', () => {
      const largeData = Array.from({ length: 10000 }, (_, i) => 100 + i);
      const start = performance.now();
      
      const result = rsi(largeData, 14);
      
      const end = performance.now();
      const duration = end - start;
      
      expect(result).toHaveLength(9987);
      expect(duration).toBeLessThan(100); // Should complete in under 100ms
    });

    test('should handle multiple indicator calculations efficiently', () => {
      const largeData = Array.from({ length: 1000 }, (_, i) => 100 + i);
      const highs = largeData.map(p => p + 5);
      const lows = largeData.map(p => p - 5);
      const closes = largeData;
      
      const start = performance.now();
      
      const bbResult = bollingerWidth(largeData, 20, 2);
      const atrResult = atr(highs, lows, closes, 14);
      const rsiResult = rsi(largeData, 14);
      
      const end = performance.now();
      const duration = end - start;
      
      expect(bbResult.length).toBeGreaterThan(0);
      expect(atrResult.length).toBeGreaterThan(0);
      expect(rsiResult.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(50); // Should complete in under 50ms
    });
  });

  describe('Integration Tests', () => {
    test('should work together for comprehensive analysis', () => {
      const data = Array.from({ length: 100 }, (_, i) => 100 + Math.sin(i * 0.1) * 10);
      const highs = data.map(p => p + 2);
      const lows = data.map(p => p - 2);
      const closes = data;
      
      // Calculate all indicators
      const bbWidth = bollingerWidth(closes, 20, 2);
      const atrValues = atr(highs, lows, closes, 14);
      const rsiValues = rsi(closes, 14);
      const macdResult = macd(closes, 12, 26, 9);
      const donchianResult = donchianChannels(highs, lows, 20);
      const swingLows = findSwingLows(closes, 5);
      const swingHighs = findSwingHighs(closes, 5);
      const stochasticResult = stochastic(highs, lows, closes, 14, 3);
      
      // Verify all results are valid
      expect(bbWidth.length).toBeGreaterThan(0);
      expect(atrValues.length).toBeGreaterThan(0);
      expect(rsiValues.length).toBeGreaterThan(0);
      expect(macdResult.macd.length).toBeGreaterThan(0);
      expect(donchianResult.upper.length).toBeGreaterThan(0);
      expect(swingLows.length).toBeGreaterThanOrEqual(0);
      expect(swingHighs.length).toBeGreaterThanOrEqual(0);
      expect(stochasticResult.k.length).toBeGreaterThan(0);
      
      // Verify relationships
      expect(bbWidth[0]).toBeGreaterThanOrEqual(0);
      expect(atrValues[0]).toBeGreaterThanOrEqual(0);
      expect(rsiValues[0]).toBeGreaterThanOrEqual(0);
      expect(rsiValues[0]).toBeLessThanOrEqual(100);
      expect(stochasticResult.k[0]).toBeGreaterThanOrEqual(0);
      expect(stochasticResult.k[0]).toBeLessThanOrEqual(100);
    });
  });
});


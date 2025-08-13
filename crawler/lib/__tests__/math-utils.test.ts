import {
  sma,
  emaAll,
  stdev,
  zscore,
  slopeK,
  maxN,
  minN,
  percentileRank,
  sum,
  mean,
  variance,
  coefficientOfVariation,
  Series
} from '../math-utils';

describe('Math Utils', () => {
  describe('Basic Math Functions', () => {
    test('sum should calculate sum of array', () => {
      const data = [1, 2, 3, 4, 5];
      expect(sum(data)).toBe(15);
    });

    test('sum should handle empty array', () => {
      expect(sum([])).toBe(0);
    });

    test('sum should handle single element', () => {
      expect(sum([42])).toBe(42);
    });

    test('mean should calculate average', () => {
      const data = [1, 2, 3, 4, 5];
      expect(mean(data)).toBe(3);
    });

    test('mean should handle empty array', () => {
      expect(mean([])).toBe(0);
    });

    test('variance should calculate variance', () => {
      const data = [1, 2, 3, 4, 5];
      expect(variance(data)).toBe(2.5);
    });

    test('variance should handle single element', () => {
      expect(variance([42])).toBe(0);
    });

    test('coefficientOfVariation should calculate CV', () => {
      const data = [1, 2, 3, 4, 5];
      const cv = coefficientOfVariation(data);
      expect(cv).toBeCloseTo(0.527, 3);
    });

    test('coefficientOfVariation should handle zero mean', () => {
      expect(coefficientOfVariation([0, 0, 0])).toBe(0);
    });
  });

  describe('Moving Averages', () => {
    test('sma should calculate simple moving average', () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const result = sma(data, 3);
      expect(result).toHaveLength(8);
      expect(result[0]).toBe(2); // (1+2+3)/3
      expect(result[7]).toBe(9); // (8+9+10)/3
    });

    test('sma should handle period larger than data', () => {
      const data = [1, 2, 3];
      const result = sma(data, 5);
      expect(result).toHaveLength(0);
    });

    test('sma should handle period equal to data length', () => {
      const data = [1, 2, 3];
      const result = sma(data, 3);
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(2);
    });

    test('emaAll should calculate exponential moving average', () => {
      const data = [1, 2, 3, 4, 5];
      const result = emaAll(data, 3);
      
      expect(result).toHaveLength(5);
      expect(result[0]).toBe(1);
      expect(result[4]).toBeGreaterThan(0);
    });

    test('emaAll should handle empty array', () => {
      const data: Series = [];
      const result = emaAll(data, 3);
      expect(result).toEqual([]);
    });

    test('emaAll should handle single element', () => {
      const data = [1];
      const result = emaAll(data, 3);
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(1);
    });
  });

  describe('Statistical Functions', () => {
    test('stdev should calculate standard deviation', () => {
      const data = [1, 2, 3, 4, 5];
      const result = stdev(data, 3);
      expect(result).toHaveLength(3);
      // First window [1,2,3]: mean=2, variance=1, stdev=1
      expect(result[0]).toBeCloseTo(1, 3);
      // Second window [2,3,4]: mean=3, variance=1, stdev=1
      expect(result[1]).toBeCloseTo(1, 3);
      // Third window [3,4,5]: mean=4, variance=1, stdev=1
      expect(result[2]).toBeCloseTo(1, 3);
    });

    test('stdev should handle single element', () => {
      const result = stdev([42], 1);
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(0);
    });

    test('stdev should handle empty array', () => {
      const result = stdev([], 3);
      expect(result).toHaveLength(0);
    });

    test('zscore should calculate z-score', () => {
      const data = [1, 2, 3, 4, 5];
      const zscores = zscore(data);
      expect(zscores).toHaveLength(5);
      expect(zscores[0]).toBeCloseTo(-1.265, 3);
      expect(zscores[2]).toBeCloseTo(0, 3);
      expect(zscores[4]).toBeCloseTo(1.265, 3);
    });

    test('zscore should handle single element', () => {
      expect(zscore([42])).toEqual([0]);
    });

    test('zscore should handle empty array', () => {
      expect(zscore([])).toEqual([]);
    });
  });

  describe('Trend Analysis', () => {
    test('slopeK should calculate slope', () => {
      const data = [1, 2, 3, 4, 5];
      const slope = slopeK(data, 3);
      expect(slope).toBeCloseTo(1, 3);
    });

    test('slopeK should handle period larger than data', () => {
      const data = [1, 2, 3];
      expect(slopeK(data, 5)).toBe(0);
    });

    test('slopeK should handle flat data', () => {
      const data = [5, 5, 5, 5, 5];
      expect(slopeK(data, 3)).toBe(0);
    });

    test('slopeK should handle decreasing data', () => {
      const data = [5, 4, 3, 2, 1];
      expect(slopeK(data, 3)).toBeCloseTo(-1, 3);
    });
  });

  describe('Extreme Values', () => {
    test('maxN should find maximum in rolling windows', () => {
      const data = [1, 5, 3, 9, 2, 8, 4, 7, 6];
      const result = maxN(data, 3);
      // For 3-period windows: [1,5,3], [5,3,9], [3,9,2], [9,2,8], [2,8,4], [8,4,7], [4,7,6]
      expect(result).toHaveLength(7);
      expect(result[0]).toBe(5); // max of [1,5,3]
      expect(result[1]).toBe(9); // max of [5,3,9]
      expect(result[2]).toBe(9); // max of [3,9,2]
      expect(result[3]).toBe(9); // max of [9,2,8]
      expect(result[4]).toBe(8); // max of [2,8,4]
      expect(result[5]).toBe(8); // max of [8,4,7]
      expect(result[6]).toBe(7); // max of [4,7,6]
    });

    test('maxN should handle N larger than data', () => {
      const data = [1, 2, 3];
      const result = maxN(data, 5);
      expect(result).toEqual([3, 2, 1]);
    });

    test('maxN should handle empty array', () => {
      expect(maxN([], 3)).toEqual([]);
    });

    test('minN should find minimum in rolling windows', () => {
      const data = [1, 5, 3, 9, 2, 8, 4, 7, 6];
      const result = minN(data, 3);
      // For 3-period windows: [1,5,3], [5,3,9], [3,9,2], [9,2,8], [2,8,4], [8,4,7], [4,7,6]
      expect(result).toHaveLength(7);
      expect(result[0]).toBe(1); // min of [1,5,3]
      expect(result[1]).toBe(3); // min of [5,3,9]
      expect(result[2]).toBe(2); // min of [3,9,2]
      expect(result[3]).toBe(2); // min of [9,2,8]
      expect(result[4]).toBe(2); // min of [2,8,4]
      expect(result[5]).toBe(4); // min of [8,4,7]
      expect(result[6]).toBe(4); // min of [4,7,6]
    });

    test('minN should handle N larger than data', () => {
      const data = [1, 2, 3];
      const result = minN(data, 5);
      expect(result).toEqual([1, 2, 3]);
    });

    test('minN should handle empty array', () => {
      expect(minN([], 3)).toEqual([]);
    });
  });

  describe('Percentile Functions', () => {
    test('percentileRank should calculate percentile rank', () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      expect(percentileRank(5, data)).toBe(40);
      expect(percentileRank(1, data)).toBe(0);
      expect(percentileRank(10, data)).toBe(90);
    });

    test('percentileRank should handle value not in data', () => {
      const data = [1, 2, 3, 4, 5];
      // 2.5 is between 2 and 3, so it's at position 2, rank = 2/5 = 0.4 = 40%
      expect(percentileRank(2.5, data)).toBe(40);
    });

    test('percentileRank should handle empty array', () => {
      expect(percentileRank(5, [])).toBe(0);
    });

    test('percentileRank should handle single element', () => {
      expect(percentileRank(42, [42])).toBe(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle very large numbers', () => {
      const data = [1e15, 2e15, 3e15];
      expect(sum(data)).toBe(6e15);
      expect(mean(data)).toBe(2e15);
    });

    test('should handle very small numbers', () => {
      const data = [1e-15, 2e-15, 3e-15];
      expect(sum(data)).toBe(6e-15);
      expect(mean(data)).toBeCloseTo(2e-15, 15); // Use toBeCloseTo for floating point precision
    });

    test('should handle mixed positive and negative numbers', () => {
      const data = [-1, 2, -3, 4, -5];
      expect(sum(data)).toBe(-3);
      expect(mean(data)).toBe(-0.6);
    });

    test('should handle all negative numbers', () => {
      const data = [-1, -2, -3, -4, -5];
      expect(sum(data)).toBe(-15);
      expect(mean(data)).toBe(-3);
    });

    test('should handle duplicate values', () => {
      const data = [1, 1, 1, 1, 1];
      const stdevResult = stdev(data, 3);
      expect(stdevResult[0]).toBe(0);
      expect(variance(data)).toBe(0);
    });

    test('should handle NaN values gracefully', () => {
      const data = [1, 2, NaN, 4, 5];
      // Note: Our functions don't currently validate for NaN/Infinity
      // They will produce NaN results, which is mathematically correct
      expect(sum(data)).toBeNaN();
      expect(mean(data)).toBeNaN();
    });

    test('should handle Infinity values gracefully', () => {
      const data = [1, 2, Infinity, 4, 5];
      // Note: Our functions don't currently validate for NaN/Infinity
      // They will produce Infinity results, which is mathematically correct
      expect(sum(data)).toBe(Infinity);
      expect(mean(data)).toBe(Infinity);
    });
  });

  describe('Performance Tests', () => {
    test('should handle large datasets efficiently', () => {
      const largeData = Array.from({ length: 10000 }, (_, i) => i);
      const start = performance.now();
      
      const result = sma(largeData, 100);
      
      const end = performance.now();
      const duration = end - start;
      
      expect(result).toHaveLength(9901);
      expect(duration).toBeLessThan(100); // Should complete in under 100ms
    });

    test('should handle multiple EMA calculations efficiently', () => {
      const largeData = Array.from({ length: 1000 }, (_, i) => i);
      const start = performance.now();
      
      const result = emaAll(largeData, 20);
      
      const end = performance.now();
      const duration = end - start;
      
      expect(result).toHaveLength(1000);
      expect(duration).toBeLessThan(50); // Should complete in under 50ms
    });
  });

  describe('Type Safety', () => {
    test('should maintain Series type consistency', () => {
      const data: Series = [1, 2, 3, 4, 5];
      const result = sma(data, 3);
      expect(Array.isArray(result)).toBe(true);
      expect(typeof result[0]).toBe('number');
    });

    test('should handle different numeric types', () => {
      const data = [1.0, 2.5, 3.7, 4.2, 5.9];
      const result = sma(data, 3);
      expect(result[0]).toBeCloseTo(2.4, 1);
    });
  });
});

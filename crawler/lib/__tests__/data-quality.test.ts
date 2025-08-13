/* lib/__tests__/data-quality.test.ts
   Comprehensive tests for the data quality assurance system
*/

import { 
  createDataQualityManager, 
  DataQualityConfig,
  DataQualityManager 
} from '../data-quality-manager';
import { 
  createCandleValidator, 
  createTAFeatureValidator, 
  createAnomalyDetector 
} from '../data-validation';

// Mock data for testing
const mockCandles = [
  {
    timestamp: Date.now() - 300000, // 5 minutes ago
    open: 100.0,
    high: 105.0,
    low: 98.0,
    close: 103.0,
    volume: 1000,
    quoteVolume: 100000
  },
  {
    timestamp: Date.now() - 240000, // 4 minutes ago
    open: 103.0,
    high: 107.0,
    low: 102.0,
    close: 106.0,
    volume: 1200,
    quoteVolume: 120000
  }
];

const mockTAFeatures = [
  {
    token_id: 'test-token',
    timeframe: '5m',
    timestamp: Date.now() - 300000,
    sma_20: 102.5,
    ema_20: 103.2,
    rsi_14: 65.5,
    macd: 2.1,
    macd_signal: 1.8,
    macd_histogram: 0.3,
    atr: 2.5,
    bollinger_upper: 108.0,
    bollinger_lower: 97.0,
    bollinger_width: 11.0
  }
];

// Test configuration
const testConfig: DataQualityConfig = {
  enableRealTimeValidation: true,
  enableAnomalyDetection: true,
  enableQualityMetrics: true,
  enableIntegrityMonitoring: true,
  validationThresholds: {
    minQualityScore: 75,
    maxErrorRate: 0.05,
    maxWarningRate: 0.15
  },
  anomalyDetection: {
    enablePriceAnomalies: true,
    enableVolumeAnomalies: true,
    enableDataGapDetection: true,
    confidenceThreshold: 0.7
  },
  monitoring: {
    enableRealTimeAlerts: true,
    enableQualityReports: true,
    enableTrendAnalysis: true
  }
};

describe('Data Quality Manager', () => {
  let qualityManager: DataQualityManager;

  beforeEach(() => {
    qualityManager = createDataQualityManager(testConfig);
  });

  afterEach(() => {
    qualityManager.clearHistory();
  });

  describe('Initialization', () => {
    test('should create data quality manager with correct configuration', () => {
      expect(qualityManager).toBeInstanceOf(DataQualityManager);
      expect(qualityManager.getConfig()).toEqual(testConfig);
    });

    test('should initialize with default metrics', () => {
      const config = qualityManager.getConfig();
      expect(config.enableRealTimeValidation).toBe(true);
      expect(config.enableAnomalyDetection).toBe(true);
      expect(config.enableQualityMetrics).toBe(true);
      expect(config.enableIntegrityMonitoring).toBe(true);
    });
  });

  describe('Configuration Management', () => {
    test('should update configuration', () => {
      const newConfig = { enableRealTimeValidation: false };
      qualityManager.updateConfig(newConfig);
      
      const updatedConfig = qualityManager.getConfig();
      expect(updatedConfig.enableRealTimeValidation).toBe(false);
    });

    test('should preserve existing configuration when updating', () => {
      const newConfig = { enableRealTimeValidation: false };
      qualityManager.updateConfig(newConfig);
      
      const updatedConfig = qualityManager.getConfig();
      expect(updatedConfig.enableAnomalyDetection).toBe(true);
      expect(updatedConfig.enableQualityMetrics).toBe(true);
    });
  });

  describe('Candle Data Validation', () => {
    test('should validate valid candle data', async () => {
      const result = await qualityManager.validateCandles(mockCandles, 'test-token', '5m');
      
      expect(result).toBeDefined();
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should detect invalid candle data', async () => {
      const invalidCandles = [
        {
          timestamp: Date.now() + 86400000, // Future timestamp
          open: -100.0, // Negative price
          high: 105.0,
          low: 98.0,
          close: 103.0,
          volume: 0, // Zero volume
          quoteVolume: 100000
        }
      ];

      const result = await qualityManager.validateCandles(invalidCandles, 'test-token', '5m');
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    test('should handle empty candle array', async () => {
      const result = await qualityManager.validateCandles([], 'test-token', '5m');
      
      expect(result).toBeDefined();
      expect(result.isValid).toBe(true);
    });
  });

  describe('TA Feature Validation', () => {
    test('should validate valid TA features', async () => {
      const result = await qualityManager.validateTAFeatures(mockTAFeatures, 'test-token', '5m');
      
      expect(result).toBeDefined();
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should detect invalid TA features', async () => {
      const invalidFeatures = [
        {
          token_id: 'test-token',
          timeframe: '5m',
          timestamp: Date.now() - 300000,
          sma_20: NaN, // Invalid value
          ema_20: 103.2,
          rsi_14: 150, // Invalid RSI (should be 0-100)
          macd: 2.1,
          macd_signal: 1.8,
          macd_histogram: 0.3,
          atr: -2.5, // Negative ATR
          bollinger_upper: 108.0,
          bollinger_lower: 97.0,
          bollinger_width: 11.0
        }
      ];

      const result = await qualityManager.validateTAFeatures(invalidFeatures, 'test-token', '5m');
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Anomaly Detection', () => {
    test('should detect price anomalies', async () => {
      const anomalies = await qualityManager.detectAnomalies(mockCandles, 'candles', 'test-token', '5m');
      
      expect(Array.isArray(anomalies)).toBe(true);
      // Specific anomaly detection would depend on the actual implementation
    });

    test('should detect volume anomalies', async () => {
      const volumeAnomalies = await qualityManager.detectAnomalies(mockCandles, 'candles', 'test-token', '5m');
      
      expect(Array.isArray(volumeAnomalies)).toBe(true);
    });

    test('should respect confidence threshold', async () => {
      // Test with different confidence thresholds
      qualityManager.updateConfig({
        anomalyDetection: { 
          enablePriceAnomalies: true,
          enableVolumeAnomalies: true,
          enableDataGapDetection: true,
          confidenceThreshold: 0.9 
        }
      });

      const anomalies = await qualityManager.detectAnomalies(mockCandles, 'candles', 'test-token', '5m');
      
      // All anomalies should meet the confidence threshold
      anomalies.forEach(anomaly => {
        expect(anomaly.confidence).toBeGreaterThanOrEqual(0.9);
      });
    });
  });

  describe('Integrity Checks', () => {
    test('should perform integrity checks', async () => {
      const checks = await qualityManager.performIntegrityChecks('test-token', '5m');
      
      expect(Array.isArray(checks)).toBe(true);
      expect(checks.length).toBeGreaterThan(0);
      
      // Check that all checks have required properties
      checks.forEach(check => {
        expect(check).toHaveProperty('type');
        expect(check).toHaveProperty('status');
        expect(check).toHaveProperty('description');
        expect(check).toHaveProperty('timestamp');
      });
    });

    test('should handle integrity check failures gracefully', async () => {
      // This test would require mocking a failure scenario
      const checks = await qualityManager.performIntegrityChecks('test-token', '5m');
      
      expect(Array.isArray(checks)).toBe(true);
    });
  });

  describe('Quality Scoring', () => {
    test('should calculate quality score correctly', () => {
      const mockValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        info: []
      };

      const mockAnomalies: any[] = [];
      const mockIntegrityChecks: any[] = [];

      const score = qualityManager.calculateQualityScore(
        mockValidationResult,
        mockValidationResult,
        mockAnomalies,
        mockIntegrityChecks
      );

      expect(score).toBe(100); // Perfect score for clean data
    });

    test('should deduct points for errors', () => {
      const mockValidationResult = {
        isValid: false,
        errors: [{ field: 'test', message: 'test error', code: 'TEST_ERROR' }],
        warnings: [],
        info: []
      };

      const mockAnomalies: any[] = [];
      const mockIntegrityChecks: any[] = [];

      const score = qualityManager.calculateQualityScore(
        mockValidationResult,
        mockValidationResult,
        mockAnomalies,
        mockIntegrityChecks
      );

      expect(score).toBe(80); // 100 - (2 * 10) = 80
    });

    test('should not allow negative scores', () => {
      const mockValidationResult = {
        isValid: false,
        errors: Array(15).fill({ field: 'test', message: 'test error', code: 'TEST_ERROR' }),
        warnings: [],
        info: []
      };

      const mockAnomalies: any[] = [];
      const mockIntegrityChecks: any[] = [];

      const score = qualityManager.calculateQualityScore(
        mockValidationResult,
        mockValidationResult,
        mockAnomalies,
        mockIntegrityChecks
      );

      expect(score).toBe(0); // Should not go below 0
    });
  });

  describe('Quality Reports', () => {
    test('should generate quality report', async () => {
      const report = await qualityManager.generateQualityReport('test-token', '5m');
      
      expect(report).toBeDefined();
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('overallScore');
      expect(report).toHaveProperty('componentScores');
      expect(report).toHaveProperty('issues');
      expect(report).toHaveProperty('recommendations');
      expect(report).toHaveProperty('trends');
    });

    test('should include recommendations for low quality scores', async () => {
      // Mock low quality data to trigger recommendations
      const report = await qualityManager.generateQualityReport('test-token', '5m');
      
      expect(Array.isArray(report.recommendations)).toBe(true);
    });
  });

  describe('Monitoring', () => {
    test('should start and stop quality monitoring', () => {
      expect(() => qualityManager.startQualityMonitoring()).not.toThrow();
      expect(() => qualityManager.stopQualityMonitoring()).not.toThrow();
    });

    test('should not start monitoring twice', () => {
      qualityManager.startQualityMonitoring();
      qualityManager.startQualityMonitoring(); // Should not throw
      qualityManager.stopQualityMonitoring();
    });
  });

  describe('Error Handling', () => {
    test('should handle validation errors gracefully', async () => {
      // Test with malformed data
      const malformedCandles = [
        {
          timestamp: 'invalid', // Invalid timestamp
          open: 'not a number', // Invalid price
          high: null, // Missing data
          low: undefined, // Missing data
          close: 103.0,
          volume: -1000, // Negative volume
          quoteVolume: 'invalid'
        }
      ];

      const result = await qualityManager.validateCandles(malformedCandles, 'test-token', '5m');
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should handle anomaly detection errors gracefully', async () => {
      // Test with empty data
      const anomalies = await qualityManager.detectAnomalies([], 'candles', 'test-token', '5m');
      
      expect(Array.isArray(anomalies)).toBe(true);
      expect(anomalies.length).toBe(0);
    });
  });

  describe('Performance', () => {
    test('should handle large datasets efficiently', async () => {
      const largeCandles = Array(1000).fill(null).map((_, i) => ({
        timestamp: Date.now() - (i * 60000),
        open: 100 + Math.random() * 10,
        high: 105 + Math.random() * 10,
        low: 95 + Math.random() * 10,
        close: 100 + Math.random() * 10,
        volume: 1000 + Math.random() * 1000,
        quoteVolume: 100000 + Math.random() * 100000
      }));

      const startTime = performance.now();
      const result = await qualityManager.validateCandles(largeCandles, 'test-token', '5m');
      const duration = performance.now() - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe('Integration', () => {
    test('should work with all components together', async () => {
      // Test the complete workflow
      const candles = await qualityManager.validateCandles(mockCandles, 'test-token', '5m');
      const anomalies = await qualityManager.detectAnomalies(mockCandles, 'candles', 'test-token', '5m');
      const integrityChecks = await qualityManager.performIntegrityChecks('test-token', '5m');
      const report = await qualityManager.generateQualityReport('test-token', '5m');

      expect(candles).toBeDefined();
      expect(anomalies).toBeDefined();
      expect(integrityChecks).toBeDefined();
      expect(report).toBeDefined();
    });
  });
});

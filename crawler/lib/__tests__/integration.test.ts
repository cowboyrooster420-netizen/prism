import { computeFeatures } from '../feature-computation';
import { createConfigurationManager } from '../configuration';
import { createRecoveryManager } from '../error-recovery';
import { CircuitBreaker } from '../retry-mechanism';

describe('Integration Tests', () => {
  describe('Configuration with Feature Computation', () => {
    test('should use configuration for feature computation', () => {
      const manager = createConfigurationManager();
      const config = manager.getConfig();
      
      // Generate test data
      const candles = global.testUtils.generateMockCandles(100);
      
      // Update configuration
      manager.updateValue('technicalAnalysis', 'rsiPeriod', 21);
      manager.updateValue('technicalAnalysis', 'rsiOverbought', 75);
      manager.updateValue('technicalAnalysis', 'rsiOversold', 25);
      
      // Verify configuration changes
      expect(config.technicalAnalysis.rsiPeriod).toBe(21);
      expect(config.technicalAnalysis.rsiOverbought).toBe(75);
      expect(config.technicalAnalysis.rsiOversold).toBe(25);
      
      // Test that feature computation works with configuration
      const features = computeFeatures(candles, 'test-token', '5m');
      expect(features).toBeDefined();
      expect(features.length).toBeGreaterThan(0);
    });
  });

  describe('Error Recovery with Configuration', () => {
    test('should use configuration for error recovery', () => {
      const manager = createConfigurationManager();
      const recoveryManager = createRecoveryManager();
      
      // Update error handling configuration
      manager.updateValue('errorHandling', 'maxRetryAttempts', 5);
      manager.updateValue('errorHandling', 'baseRetryDelay', 2000);
      
      const config = manager.getConfig();
      expect(config.errorHandling.maxRetryAttempts).toBe(5);
      expect(config.errorHandling.baseRetryDelay).toBe(2000);
      
      // Verify recovery manager can access configuration
      const strategies = recoveryManager.getStrategies();
      expect(strategies).toContain('DatabaseConnectionRecovery');
      expect(strategies).toContain('RateLimitRecovery');
    });
  });

  describe('Circuit Breaker with Configuration', () => {
    test('should use configuration for circuit breaker', () => {
      const manager = createConfigurationManager();
      
      // Update circuit breaker configuration
      manager.updateValue('errorHandling', 'circuitBreakerThreshold', 3);
      manager.updateValue('errorHandling', 'circuitBreakerTimeout', 5000);
      
      const config = manager.getConfig();
      
      // Create circuit breaker with configuration
      const circuitBreaker = new CircuitBreaker(
        config.errorHandling.circuitBreakerThreshold,
        config.errorHandling.circuitBreakerTimeout,
        config.errorHandling.circuitBreakerMonitoringWindow
      );
      
      expect(circuitBreaker.getThreshold()).toBe(3);
      expect(circuitBreaker.getTimeout()).toBe(5000);
    });
  });

  describe('End-to-End Workflow', () => {
    test('should handle complete TA computation workflow', async () => {
      const manager = createConfigurationManager();
      const recoveryManager = createRecoveryManager();
      
      // Configure for testing
      manager.updateSection('performance', {
        maxWorkers: 2,
        batchSize: 50
      });
      
      manager.updateSection('technicalAnalysis', {
        rsiPeriod: 14,
        macdFastPeriod: 12,
        macdSlowPeriod: 26
      });
      
      const config = manager.getConfig();
      
      // Generate test data
      const candles = global.testUtils.generateMockCandles(100);
      
      // Simulate feature computation
      const features = computeFeatures(candles, 'test-token', '5m');
      
      // Verify results
      expect(features).toBeDefined();
      expect(features.length).toBeGreaterThan(0);
      
      // Verify configuration was used
      expect(config.performance.maxWorkers).toBe(2);
      expect(config.performance.batchSize).toBe(50);
      expect(config.technicalAnalysis.rsiPeriod).toBe(14);
    });
  });
});

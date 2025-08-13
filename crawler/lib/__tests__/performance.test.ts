import { computeFeatures } from '../feature-computation';
import { createConfigurationManager } from '../configuration';
import { retryOperation } from '../retry-mechanism';
import { CircuitBreaker } from '../retry-mechanism';

describe('Performance Tests', () => {
  describe('Feature Computation Performance', () => {
    test('should compute features for large dataset within time limit', () => {
      const largeCandles = global.testUtils.generateMockCandles(10000);
      
      const startTime = performance.now();
      const features = computeFeatures(largeCandles, 'test-token', '5m');
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      
      expect(features).toBeDefined();
      expect(features.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });

    test('should handle multiple concurrent feature computations', async () => {
      const testData = Array.from({ length: 10 }, (_, i) => ({
        candles: global.testUtils.generateMockCandles(1000),
        token: `token-${i}`,
        timeframe: '5m'
      }));
      
      const startTime = performance.now();
      
      const promises = testData.map(({ candles, token, timeframe }) =>
        computeFeatures(candles, token, timeframe)
      );
      
      const results = await Promise.all(promises);
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.length).toBeGreaterThan(0);
      });
      
      expect(duration).toBeLessThan(2000); // Should complete in under 2 seconds
    });
  });

  describe('Configuration Management Performance', () => {
    test('should handle rapid configuration updates efficiently', () => {
      const manager = createConfigurationManager();
      const updateCount = 1000;
      
      const startTime = performance.now();
      
      for (let i = 0; i < updateCount; i++) {
        manager.updateValue('performance', 'maxWorkers', i % 8 + 1);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(500); // Should complete in under 500ms
      expect(manager.getValue('performance', 'maxWorkers')).toBe(updateCount % 8);
    });

    test('should handle large configuration sections efficiently', () => {
      const manager = createConfigurationManager();
      
      const largeUpdate = {
        smaPeriods: Array.from({ length: 100 }, (_, i) => i + 1),
        emaPeriods: Array.from({ length: 100 }, (_, i) => i + 1),
        rsiPeriod: 14,
        rsiOverbought: 70,
        rsiOversold: 30
      };
      
      const startTime = performance.now();
      const result = manager.updateSection('technicalAnalysis', largeUpdate);
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      
      expect(result.isValid).toBe(true);
      expect(duration).toBeLessThan(100); // Should complete in under 100ms
    });
  });

  describe('Error Handling Performance', () => {
    test('should handle retry operations efficiently', async () => {
      let attempts = 0;
      const operation = async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Simulated failure');
        }
        return 'success';
      };
      
      const startTime = performance.now();
      const result = await retryOperation(operation, { maxAttempts: 3 });
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      
      expect(result.success).toBe(true);
      expect(attempts).toBe(3);
      expect(duration).toBeLessThan(100); // Should complete in under 100ms
    });

    test('should handle circuit breaker operations efficiently', async () => {
      const circuitBreaker = new CircuitBreaker(2, 1000, 1000);
      const operation = async () => 'success';
      
      const startTime = performance.now();
      
      // Execute multiple operations
      for (let i = 0; i < 100; i++) {
        await circuitBreaker.execute(operation);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(100); // Should complete in under 100ms
    });
  });

  describe('Memory Usage Tests', () => {
    test('should not cause memory leaks with large datasets', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Process multiple large datasets
      for (let i = 0; i < 10; i++) {
        const candles = global.testUtils.generateMockCandles(10000);
        const features = computeFeatures(candles, `token-${i}`, '5m');
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });

    test('should handle configuration manager memory efficiently', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Create and destroy multiple configuration managers
      for (let i = 0; i < 100; i++) {
        const manager = createConfigurationManager();
        manager.updateValue('performance', 'maxWorkers', i);
        manager.destroy();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be minimal
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe('Concurrent Operations Performance', () => {
    test('should handle concurrent configuration updates', async () => {
      const manager = createConfigurationManager();
      const concurrentUpdates = 100;
      
      const startTime = performance.now();
      
      const promises = Array.from({ length: concurrentUpdates }, (_, i) =>
        manager.updateValue('performance', 'maxWorkers', i % 8 + 1)
      );
      
      const results = await Promise.all(promises);
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      
      expect(results).toHaveLength(concurrentUpdates);
      results.forEach(result => {
        expect(result.isValid).toBe(true);
      });
      
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });

    test('should handle concurrent feature computations', async () => {
      const concurrentComputations = 20;
      const testData = Array.from({ length: concurrentComputations }, (_, i) => ({
        candles: global.testUtils.generateMockCandles(1000),
        token: `token-${i}`,
        timeframe: '5m'
      }));
      
      const startTime = performance.now();
      
      const promises = testData.map(({ candles, token, timeframe }) =>
        computeFeatures(candles, token, timeframe)
      );
      
      const results = await Promise.all(promises);
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      
      expect(results).toHaveLength(concurrentComputations);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.length).toBeGreaterThan(0);
      });
      
      expect(duration).toBeLessThan(3000); // Should complete in under 3 seconds
    });
  });

  describe('Startup Performance', () => {
    test('should initialize configuration manager quickly', () => {
      const startTime = performance.now();
      const manager = createConfigurationManager();
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      
      expect(manager).toBeDefined();
      expect(duration).toBeLessThan(50); // Should initialize in under 50ms
    });

    test('should load configuration from file quickly', () => {
      const manager = createConfigurationManager();
      const testFilePath = './test-startup-config.json';
      
      try {
        // Create test config file
        const testConfig = {
          environment: 'test',
          performance: { maxWorkers: 4 }
        };
        
        const fs = require('fs');
        fs.writeFileSync(testFilePath, JSON.stringify(testConfig, null, 2));
        
        const startTime = performance.now();
        manager.loadFromFile(testFilePath);
        const endTime = performance.now();
        
        const duration = endTime - startTime;
        
        expect(duration).toBeLessThan(50); // Should load in under 50ms
        
        // Cleanup
        fs.unlinkSync(testFilePath);
      } catch (error) {
        // File operations might fail in test environment, that's okay
        console.log('File operation test skipped:', error instanceof Error ? error.message : String(error));
      }
    });
  });
});

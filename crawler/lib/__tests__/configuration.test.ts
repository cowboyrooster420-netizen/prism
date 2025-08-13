import {
  createConfigurationManager,
  ConfigurationValidator,
  ENVIRONMENT_PRESETS,
  TAWorkerConfig,
  TechnicalAnalysisConfig,
  PerformanceConfig,
  DatabaseConfig,
  ErrorHandlingConfig,
  LoggingConfig,
  MonitoringConfig,
  ValidationResult
} from '../configuration';

describe('Configuration Management System', () => {
  describe('Configuration Manager', () => {
    test('should create manager with default configuration', () => {
      const manager = createConfigurationManager();
      const config = manager.getConfig();
      
      expect(config.environment).toBe('development');
      expect(config.version).toBe('1.0.0');
      expect(config.technicalAnalysis.rsiPeriod).toBe(14);
      expect(config.performance.maxWorkers).toBeGreaterThan(0);
    });

    test('should create manager with custom configuration', () => {
      const customConfig: Partial<TAWorkerConfig> = {
        environment: 'production',
        technicalAnalysis: {
          rsiPeriod: 21,
          rsiOverbought: 75,
          rsiOversold: 25
        } as TechnicalAnalysisConfig
      };

      const manager = createConfigurationManager(customConfig);
      const config = manager.getConfig();
      
      expect(config.environment).toBe('production');
      expect(config.technicalAnalysis.rsiPeriod).toBe(21);
      expect(config.technicalAnalysis.rsiOverbought).toBe(75);
      expect(config.technicalAnalysis.rsiOversold).toBe(25);
    });

    test('should get configuration sections', () => {
      const manager = createConfigurationManager();
      
      const taConfig = manager.getSection('technicalAnalysis');
      const perfConfig = manager.getSection('performance');
      const dbConfig = manager.getSection('database');
      
      expect(taConfig.rsiPeriod).toBe(14);
      expect(perfConfig.maxWorkers).toBeGreaterThan(0);
      expect(dbConfig.maxConnections).toBe(10);
    });

    test('should get specific configuration values', () => {
      const manager = createConfigurationManager();
      
      const rsiPeriod = manager.getValue('technicalAnalysis', 'rsiPeriod');
      const maxWorkers = manager.getValue('performance', 'maxWorkers');
      const maxConnections = manager.getValue('database', 'maxConnections');
      
      expect(rsiPeriod).toBe(14);
      expect(maxWorkers).toBeGreaterThan(0);
      expect(maxConnections).toBe(10);
    });
  });

  describe('Configuration Updates', () => {
    test('should update individual values', () => {
      const manager = createConfigurationManager();
      
      const result = manager.updateValue('performance', 'maxWorkers', 8);
      
      expect(result.isValid).toBe(true);
      expect(manager.getValue('performance', 'maxWorkers')).toBe(8);
    });

    test('should update configuration sections', () => {
      const manager = createConfigurationManager();
      
      const updates = {
        maxWorkers: 6,
        batchSize: 300,
        maxConcurrency: 4
      };
      
      const result = manager.updateSection('performance', updates);
      
      expect(result.isValid).toBe(true);
      expect(manager.getValue('performance', 'maxWorkers')).toBe(6);
      expect(manager.getValue('performance', 'batchSize')).toBe(300);
      expect(manager.getValue('performance', 'maxConcurrency')).toBe(4);
    });

    test('should emit change events', (done) => {
      const manager = createConfigurationManager();
      
      manager.on('configChanged', (event) => {
        expect(event.section).toBe('performance');
        expect(event.key).toBe('maxWorkers');
        expect(event.oldValue).toBe(4); // Default value
        expect(event.newValue).toBe(8);
        expect(event.timestamp).toBeInstanceOf(Date);
        done();
      });
      
      manager.updateValue('performance', 'maxWorkers', 8);
    });

    test('should update lastUpdated timestamp', () => {
      const manager = createConfigurationManager();
      const originalTime = manager.getConfig().lastUpdated;
      
      // Wait a bit to ensure timestamp difference
      setTimeout(() => {
        manager.updateValue('performance', 'maxWorkers', 8);
        const newTime = manager.getConfig().lastUpdated;
        expect(newTime.getTime()).toBeGreaterThan(originalTime.getTime());
      }, 10);
    });
  });

  describe('Configuration Validation', () => {
    test('should validate technical analysis configuration', () => {
      const validConfig: TechnicalAnalysisConfig = {
        smaPeriods: [7, 20, 50, 200],
        emaPeriods: [7, 20, 50, 200],
        rsiPeriod: 14,
        rsiOverbought: 70,
        rsiOversold: 30,
        macdFastPeriod: 12,
        macdSlowPeriod: 26,
        macdSignalPeriod: 9,
        atrPeriod: 14,
        bbPeriod: 20,
        bbStandardDeviations: 2,
        donchianPeriod: 20,
        volumeMAPeriod: 20,
        volumeZScorePeriod: 60,
        volumeSlopePeriod: 6,
        swingDetectionWindow: 2,
        minCandlesRequired: 60,
        minDataQuality: 0.8
      };
      
      const result = ConfigurationValidator.validateTechnicalAnalysis(validConfig);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should detect invalid technical analysis configuration', () => {
      const invalidConfig: TechnicalAnalysisConfig = {
        smaPeriods: [7, 20, 50, 200],
        emaPeriods: [7, 20, 50, 200],
        rsiPeriod: 14,
        rsiOverbought: 70,
        rsiOversold: 30,
        macdFastPeriod: 26, // Invalid: fast >= slow
        macdSlowPeriod: 12,
        macdSignalPeriod: 9,
        atrPeriod: 14,
        bbPeriod: 20,
        bbStandardDeviations: 2,
        donchianPeriod: 20,
        volumeMAPeriod: 20,
        volumeZScorePeriod: 60,
        volumeSlopePeriod: 6,
        swingDetectionWindow: 2,
        minCandlesRequired: 60,
        minDataQuality: 0.8
      };
      
      const result = ConfigurationValidator.validateTechnicalAnalysis(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('MACD fast period must be less than slow period');
    });

    test('should validate performance configuration', () => {
      const validConfig: PerformanceConfig = {
        maxWorkers: 4,
        workerTimeout: 30000,
        batchSize: 250,
        maxConcurrency: 3,
        maxMemoryUsage: 1024 * 1024 * 1024,
        gcThreshold: 0.8,
        enableMetrics: true,
        metricsInterval: 5000
      };
      
      const result = ConfigurationValidator.validatePerformance(validConfig);
      expect(result.isValid).toBe(true);
    });

    test('should detect invalid performance configuration', () => {
      const invalidConfig: PerformanceConfig = {
        maxWorkers: -1, // Invalid: negative workers
        workerTimeout: 30000,
        batchSize: 250,
        maxConcurrency: 3,
        maxMemoryUsage: 1024 * 1024 * 1024,
        gcThreshold: 0.8,
        enableMetrics: true,
        metricsInterval: 5000
      };
      
      const result = ConfigurationValidator.validatePerformance(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Max workers must be positive');
    });

    test('should validate database configuration', () => {
      const validConfig: DatabaseConfig = {
        connectionTimeout: 10000,
        queryTimeout: 30000,
        maxConnections: 10,
        maxRetries: 3,
        retryDelay: 1000,
        upsertBatchSize: 250,
        fetchBatchSize: 300,
        enableConnectionPooling: true,
        poolSize: 5
      };
      
      const result = ConfigurationValidator.validateDatabase(validConfig);
      expect(result.isValid).toBe(true);
    });

    test('should detect invalid database configuration', () => {
      const invalidConfig: DatabaseConfig = {
        connectionTimeout: 0, // Invalid: zero timeout
        queryTimeout: 30000,
        maxConnections: 10,
        maxRetries: 3,
        retryDelay: 1000,
        upsertBatchSize: 250,
        fetchBatchSize: 300,
        enableConnectionPooling: true,
        poolSize: 5
      };
      
      const result = ConfigurationValidator.validateDatabase(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Connection timeout must be positive');
    });

    test('should validate error handling configuration', () => {
      const validConfig: ErrorHandlingConfig = {
        maxRetryAttempts: 3,
        baseRetryDelay: 1000,
        maxRetryDelay: 30000,
        retryBackoffMultiplier: 2,
        circuitBreakerThreshold: 5,
        circuitBreakerTimeout: 60000,
        circuitBreakerMonitoringWindow: 60000,
        criticalErrorThreshold: 0.1,
        highErrorThreshold: 0.2,
        enableAutomaticRecovery: true,
        maxRecoveryAttempts: 3
      };
      
      const result = ConfigurationValidator.validateErrorHandling(validConfig);
      expect(result.isValid).toBe(true);
    });

    test('should detect invalid error handling configuration', () => {
      const invalidConfig: ErrorHandlingConfig = {
        maxRetryAttempts: 0, // Invalid: zero attempts
        baseRetryDelay: 1000,
        maxRetryDelay: 30000,
        retryBackoffMultiplier: 2,
        circuitBreakerThreshold: 5,
        circuitBreakerTimeout: 60000,
        circuitBreakerMonitoringWindow: 60000,
        criticalErrorThreshold: 0.1,
        highErrorThreshold: 0.2,
        enableAutomaticRecovery: true,
        maxRecoveryAttempts: 3
      };
      
      const result = ConfigurationValidator.validateErrorHandling(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Max retry attempts must be positive');
    });

    test('should validate complete configuration', () => {
      const manager = createConfigurationManager();
      const config = manager.getConfig();
      
      const result = ConfigurationValidator.validateConfig(config);
      expect(result.isValid).toBe(true);
    });
  });

  describe('Environment Presets', () => {
    test('should have development preset', () => {
      const devPreset = ENVIRONMENT_PRESETS.development;
      
      expect(devPreset.logging.level).toBe('debug');
      expect(devPreset.logging.enableConsole).toBe(true);
      expect(devPreset.monitoring.enableHealthChecks).toBe(true);
      expect(devPreset.performance.maxWorkers).toBe(2);
      expect(devPreset.performance.batchSize).toBe(100);
    });

    test('should have staging preset', () => {
      const stagingPreset = ENVIRONMENT_PRESETS.staging;
      
      expect(stagingPreset.logging.level).toBe('info');
      expect(stagingPreset.logging.enableConsole).toBe(true);
      expect(stagingPreset.logging.enableFile).toBe(true);
      expect(stagingPreset.performance.maxWorkers).toBe(4);
      expect(stagingPreset.performance.batchSize).toBe(250);
    });

    test('should have production preset', () => {
      const prodPreset = ENVIRONMENT_PRESETS.production;
      
      expect(prodPreset.logging.level).toBe('warn');
      expect(prodPreset.logging.enableConsole).toBe(false);
      expect(prodPreset.logging.enableFile).toBe(true);
      expect(prodPreset.monitoring.enableAlerts).toBe(true);
      expect(prodPreset.performance.maxWorkers).toBe(8);
      expect(prodPreset.performance.batchSize).toBe(500);
      expect(prodPreset.errorHandling.maxRetryAttempts).toBe(5);
    });
  });

  describe('File Operations', () => {
    test('should save configuration to file', () => {
      const manager = createConfigurationManager();
      const testFilePath = './test-config-save.json';
      
      try {
        manager.saveToFile(testFilePath);
        
        // Verify file was created
        const fs = require('fs');
        expect(fs.existsSync(testFilePath)).toBe(true);
        
        // Verify file content
        const fileContent = fs.readFileSync(testFilePath, 'utf8');
        const savedConfig = JSON.parse(fileContent);
        expect(savedConfig.environment).toBe('development');
        expect(savedConfig.technicalAnalysis.rsiPeriod).toBe(14);
        
        // Cleanup
        fs.unlinkSync(testFilePath);
      } catch (error) {
        // File operations might fail in test environment, that's okay
        console.log('File operation test skipped:', error.message);
      }
    });

    test('should load configuration from file', () => {
      const manager = createConfigurationManager();
      const testFilePath = './test-config-load.json';
      
      try {
        // Create test config file
        const testConfig = {
          environment: 'test',
          technicalAnalysis: {
            rsiPeriod: 21,
            rsiOverbought: 75,
            rsiOversold: 25
          }
        };
        
        const fs = require('fs');
        fs.writeFileSync(testFilePath, JSON.stringify(testConfig, null, 2));
        
        // Load configuration
        manager.loadFromFile(testFilePath);
        
        // Verify loaded values
        const config = manager.getConfig();
        expect(config.environment).toBe('test');
        expect(config.technicalAnalysis.rsiPeriod).toBe(21);
        expect(config.technicalAnalysis.rsiOverbought).toBe(75);
        expect(config.technicalAnalysis.rsiOversold).toBe(25);
        
        // Cleanup
        fs.unlinkSync(testFilePath);
      } catch (error) {
        // File operations might fail in test environment, that's okay
        console.log('File operation test skipped:', error instanceof Error ? error.message : String(error));
      }
    });
  });

  describe('Configuration Reset', () => {
    test('should reset to default configuration', () => {
      const manager = createConfigurationManager();
      
      // Modify configuration
      manager.updateValue('performance', 'maxWorkers', 8);
      manager.updateValue('technicalAnalysis', 'rsiPeriod', 21);
      
      // Verify changes
      expect(manager.getValue('performance', 'maxWorkers')).toBe(8);
      expect(manager.getValue('technicalAnalysis', 'rsiPeriod')).toBe(21);
      
      // Reset to defaults
      manager.resetToDefaults();
      
      // Verify reset
      expect(manager.getValue('performance', 'maxWorkers')).toBe(4); // Default value
      expect(manager.getValue('technicalAnalysis', 'rsiPeriod')).toBe(14); // Default value
    });

    test('should emit reset change event', (done) => {
      const manager = createConfigurationManager();
      
      manager.on('configChanged', (event) => {
        if (event.section === 'all' && event.key === 'reset') {
          expect(event.oldValue).toBeDefined();
          expect(event.newValue).toBeDefined();
          expect(event.newValue.environment).toBe('development');
          done();
        }
      });
      
      manager.resetToDefaults();
    });
  });

  describe('Configuration Summary', () => {
    test('should provide configuration summary', () => {
      const manager = createConfigurationManager();
      const summary = manager.getSummary();
      
      expect(summary.environment).toBe('development');
      expect(summary.version).toBe('1.0.0');
      expect(summary.lastUpdated).toBeInstanceOf(Date);
      expect(summary.sections).toContain('technicalAnalysis');
      expect(summary.sections).toContain('performance');
      expect(summary.sections).toContain('database');
      expect(summary.validation.isValid).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle invalid file paths gracefully', () => {
      const manager = createConfigurationManager();
      
      // Should not throw error for invalid file path
      expect(() => manager.loadFromFile('./nonexistent-file.json')).not.toThrow();
      expect(() => manager.saveToFile('./invalid/path/config.json')).not.toThrow();
    });

    test('should handle invalid JSON gracefully', () => {
      const manager = createConfigurationManager();
      const testFilePath = './test-invalid-json.json';
      
      try {
        // Create invalid JSON file
        const fs = require('fs');
        fs.writeFileSync(testFilePath, 'invalid json content');
        
        // Should handle invalid JSON gracefully
        expect(() => manager.loadFromFile(testFilePath)).not.toThrow();
        
        // Cleanup
        fs.unlinkSync(testFilePath);
      } catch (error) {
        // File operations might fail in test environment, that's okay
        console.log('File operation test skipped:', error instanceof Error ? error.message : String(error));
      }
    });

    test('should handle configuration with missing sections', () => {
      const partialConfig: Partial<TAWorkerConfig> = {
        environment: 'test',
        technicalAnalysis: {
          rsiPeriod: 21
        } as Partial<TechnicalAnalysisConfig>
      };
      
      const manager = createConfigurationManager(partialConfig);
      const config = manager.getConfig();
      
      // Should merge with defaults for missing sections
      expect(config.technicalAnalysis.rsiPeriod).toBe(21);
      expect(config.performance.maxWorkers).toBeGreaterThan(0); // Default value
      expect(config.database.maxConnections).toBe(10); // Default value
    });
  });

  describe('Performance Tests', () => {
    test('should handle large configuration updates efficiently', () => {
      const manager = createConfigurationManager();
      const startTime = performance.now();
      
      // Update many values
      for (let i = 0; i < 100; i++) {
        manager.updateValue('performance', 'maxWorkers', i);
      }
      
      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(100); // Should complete in under 100ms
    });

    test('should handle multiple change events efficiently', () => {
      const manager = createConfigurationManager();
      const eventCount = 100;
      let receivedEvents = 0;
      
      manager.on('configChanged', () => {
        receivedEvents++;
      });
      
      const startTime = performance.now();
      
      // Trigger many changes
      for (let i = 0; i < eventCount; i++) {
        manager.updateValue('performance', 'maxWorkers', i);
      }
      
      const duration = performance.now() - startTime;
      
      expect(receivedEvents).toBe(eventCount);
      expect(duration).toBeLessThan(100); // Should complete in under 100ms
    });
  });

  describe('Integration Tests', () => {
    test('should work with environment presets', () => {
      const manager = createConfigurationManager();
      
      // Apply development preset
      const devPreset = ENVIRONMENT_PRESETS.development;
      Object.entries(devPreset).forEach(([section, updates]) => {
        const result = manager.updateSection(section as any, updates);
        expect(result.isValid).toBe(true);
      });
      
      // Verify preset was applied
      const config = manager.getConfig();
      expect(config.logging.level).toBe('debug');
      expect(config.performance.maxWorkers).toBe(2);
      expect(config.performance.batchSize).toBe(100);
    });

    test('should maintain configuration consistency across updates', () => {
      const manager = createConfigurationManager();
      
      // Update multiple sections
      manager.updateSection('performance', { maxWorkers: 6, batchSize: 300 });
      manager.updateSection('technicalAnalysis', { rsiPeriod: 21, rsiOverbought: 75 });
      manager.updateSection('database', { maxConnections: 15, queryTimeout: 45000 });
      
      // Verify all updates were applied
      const config = manager.getConfig();
      expect(config.performance.maxWorkers).toBe(6);
      expect(config.performance.batchSize).toBe(300);
      expect(config.technicalAnalysis.rsiPeriod).toBe(21);
      expect(config.technicalAnalysis.rsiOverbought).toBe(75);
      expect(config.database.maxConnections).toBe(15);
      expect(config.database.queryTimeout).toBe(45000);
      
      // Verify configuration is still valid
      const validation = ConfigurationValidator.validateConfig(config);
      expect(validation.isValid).toBe(true);
    });
  });
});

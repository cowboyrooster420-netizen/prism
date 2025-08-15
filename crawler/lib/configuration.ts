/* lib/configuration.ts
   Configuration management system for TA worker with runtime updates and validation
*/

import { EventEmitter } from 'events';

// Configuration interfaces
export interface TechnicalAnalysisConfig {
  // Moving average periods
  smaPeriods: number[];
  emaPeriods: number[];
  
  // RSI configuration
  rsiPeriod: number;
  rsiOverbought: number;
  rsiOversold: number;
  
  // MACD configuration
  macdFastPeriod: number;
  macdSlowPeriod: number;
  macdSignalPeriod: number;
  
  // ATR configuration
  atrPeriod: number;
  
  // Bollinger Bands configuration
  bbPeriod: number;
  bbStandardDeviations: number;
  
  // Donchian Channels configuration
  donchianPeriod: number;
  
  // Volume analysis configuration
  volumeMAPeriod: number;
  volumeZScorePeriod: number;
  volumeSlopePeriod: number;
  
  // Swing detection configuration
  swingDetectionWindow: number;
  
  // Minimum data requirements
  minCandlesRequired: number;
  minDataQuality: number;
}

export interface PerformanceConfig {
  // Worker configuration
  maxWorkers: number;
  workerTimeout: number;
  
  // Batch processing
  batchSize: number;
  maxConcurrency: number;
  
  // Memory management
  maxMemoryUsage: number;
  gcThreshold: number;
  
  // Performance monitoring
  enableMetrics: boolean;
  metricsInterval: number;
}

export interface DatabaseConfig {
  // Connection settings
  connectionTimeout: number;
  queryTimeout: number;
  maxConnections: number;
  
  // Retry configuration
  maxRetries: number;
  retryDelay: number;
  
  // Batch operations
  upsertBatchSize: number;
  fetchBatchSize: number;
  
  // Connection pooling
  enableConnectionPooling: boolean;
  poolSize: number;
}

export interface ErrorHandlingConfig {
  // Retry configuration
  maxRetryAttempts: number;
  baseRetryDelay: number;
  maxRetryDelay: number;
  retryBackoffMultiplier: number;
  
  // Circuit breaker configuration
  circuitBreakerThreshold: number;
  circuitBreakerTimeout: number;
  circuitBreakerMonitoringWindow: number;
  
  // Error severity thresholds
  criticalErrorThreshold: number;
  highErrorThreshold: number;
  
  // Recovery strategies
  enableAutomaticRecovery: boolean;
  maxRecoveryAttempts: number;
}

export interface LoggingConfig {
  // Log levels
  level: 'debug' | 'info' | 'warn' | 'error';
  enableConsole: boolean;
  enableFile: boolean;
  
  // File logging
  logFilePath: string;
  maxLogFileSize: number;
  maxLogFiles: number;
  
  // Structured logging
  enableStructuredLogging: boolean;
  includeTimestamp: boolean;
  includeContext: boolean;
}

export interface MonitoringConfig {
  // Health checks
  enableHealthChecks: boolean;
  healthCheckInterval: number;
  
  // Metrics collection
  enableMetrics: boolean;
  metricsPort: number;
  metricsEndpoint: string;
  
  // Alerting
  enableAlerts: boolean;
  alertThresholds: Record<string, number>;
  
  // Performance profiling
  enableProfiling: boolean;
  profileThreshold: number;
}

export interface TAWorkerConfig {
  // Core configuration
  technicalAnalysis: TechnicalAnalysisConfig;
  performance: PerformanceConfig;
  database: DatabaseConfig;
  errorHandling: ErrorHandlingConfig;
  logging: LoggingConfig;
  monitoring: MonitoringConfig;
  
  // Runtime configuration
  environment: 'development' | 'staging' | 'production';
  version: string;
  lastUpdated: Date;
}

// Configuration validation
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Configuration change event
export interface ConfigChangeEvent {
  section: string;
  key: string;
  oldValue: any;
  newValue: any;
  timestamp: Date;
}

/**
 * Configuration validator
 */
export class ConfigurationValidator {
  /**
   * Validate technical analysis configuration
   */
  static validateTechnicalAnalysis(config: TechnicalAnalysisConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate periods
    if (config.smaPeriods.some(p => p <= 0)) {
      errors.push('SMA periods must be positive numbers');
    }
    if (config.emaPeriods.some(p => p <= 0)) {
      errors.push('EMA periods must be positive numbers');
    }
    if (config.rsiPeriod <= 0) {
      errors.push('RSI period must be positive');
    }
    if (config.macdFastPeriod >= config.macdSlowPeriod) {
      errors.push('MACD fast period must be less than slow period');
    }
    if (config.bbStandardDeviations <= 0) {
      errors.push('Bollinger Bands standard deviations must be positive');
    }
    if (config.minCandlesRequired < 60) {
      warnings.push('Minimum candles required is less than 60, may cause computation issues');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate performance configuration
   */
  static validatePerformance(config: PerformanceConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (config.maxWorkers <= 0) {
      errors.push('Max workers must be positive');
    }
    if (config.maxWorkers > 16) {
      warnings.push('Max workers exceeds 16, may cause resource issues');
    }
    if (config.batchSize <= 0) {
      errors.push('Batch size must be positive');
    }
    if (config.batchSize > 1000) {
      warnings.push('Batch size exceeds 1000, may cause memory issues');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate database configuration
   */
  static validateDatabase(config: DatabaseConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (config.connectionTimeout <= 0) {
      errors.push('Connection timeout must be positive');
    }
    if (config.queryTimeout <= 0) {
      errors.push('Query timeout must be positive');
    }
    if (config.maxConnections <= 0) {
      errors.push('Max connections must be positive');
    }
    if (config.maxConnections > 100) {
      warnings.push('Max connections exceeds 100, may cause database issues');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate error handling configuration
   */
  static validateErrorHandling(config: ErrorHandlingConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (config.maxRetryAttempts <= 0) {
      errors.push('Max retry attempts must be positive');
    }
    if (config.maxRetryAttempts > 10) {
      warnings.push('Max retry attempts exceeds 10, may cause excessive delays');
    }
    if (config.baseRetryDelay <= 0) {
      errors.push('Base retry delay must be positive');
    }
    if (config.circuitBreakerThreshold <= 0) {
      errors.push('Circuit breaker threshold must be positive');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate complete configuration
   */
  static validateConfig(config: TAWorkerConfig): ValidationResult {
    const results = [
      this.validateTechnicalAnalysis(config.technicalAnalysis),
      this.validatePerformance(config.performance),
      this.validateDatabase(config.database),
      this.validateErrorHandling(config.errorHandling)
    ];

    const allErrors = results.flatMap(r => r.errors);
    const allWarnings = results.flatMap(r => r.warnings);

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings
    };
  }
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: TAWorkerConfig = {
  technicalAnalysis: {
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
  },
  performance: {
    maxWorkers: Math.max(1, Math.min(require('os').cpus().length - 1, 8)),
    workerTimeout: 30000,
    batchSize: 500,
    maxConcurrency: 3,
    maxMemoryUsage: 1024 * 1024 * 1024, // 1GB
    gcThreshold: 0.8,
    enableMetrics: true,
    metricsInterval: 5000
  },
  database: {
    connectionTimeout: 10000,
    queryTimeout: 30000,
    maxConnections: 10,
    maxRetries: 3,
    retryDelay: 1000,
    upsertBatchSize: 500,
    fetchBatchSize: 300,
    enableConnectionPooling: true,
    poolSize: 5
  },
  errorHandling: {
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
  },
  logging: {
    level: 'info',
    enableConsole: true,
    enableFile: false,
    logFilePath: './logs/ta-worker.log',
    maxLogFileSize: 10 * 1024 * 1024, // 10MB
    maxLogFiles: 5,
    enableStructuredLogging: true,
    includeTimestamp: true,
    includeContext: true
  },
  monitoring: {
    enableHealthChecks: true,
    healthCheckInterval: 30000,
    enableMetrics: true,
    metricsPort: 8080,
    metricsEndpoint: '/metrics',
    enableAlerts: false,
    alertThresholds: {
      errorRate: 0.1,
      responseTime: 5000,
      memoryUsage: 0.8
    },
    enableProfiling: false,
    profileThreshold: 1000
  },
  environment: 'development',
  version: '1.0.0',
  lastUpdated: new Date()
};

/**
 * Configuration manager with runtime updates
 */
export class ConfigurationManager extends EventEmitter {
  private config: TAWorkerConfig;
  private configFile?: string;
  private watchInterval?: NodeJS.Timeout;

  constructor(initialConfig?: Partial<TAWorkerConfig>, configFile?: string) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...initialConfig };
    this.configFile = configFile;
    
    if (configFile) {
      this.loadFromFile(configFile);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): TAWorkerConfig {
    return { ...this.config };
  }

  /**
   * Get configuration section
   */
  getSection<K extends keyof TAWorkerConfig>(section: K): TAWorkerConfig[K] {
    return this.config[section];
  }

  /**
   * Get specific configuration value
   */
  getValue<K extends keyof TAWorkerConfig, V extends keyof TAWorkerConfig[K]>(
    section: K,
    key: V
  ): TAWorkerConfig[K][V] {
    return this.config[section][key];
  }

  /**
   * Update configuration section
   */
  updateSection<K extends keyof TAWorkerConfig>(
    section: K,
    updates: Partial<TAWorkerConfig[K]>
  ): ValidationResult {
    const oldSection = { ...this.config[section] };
    const newSection = { ...oldSection, ...updates };
    
    // Validate the updated section
    let validationResult: ValidationResult;
    
    switch (section) {
      case 'technicalAnalysis':
        validationResult = ConfigurationValidator.validateTechnicalAnalysis(newSection as TechnicalAnalysisConfig);
        break;
      case 'performance':
        validationResult = ConfigurationValidator.validatePerformance(newSection as PerformanceConfig);
        break;
      case 'database':
        validationResult = ConfigurationValidator.validateDatabase(newSection as DatabaseConfig);
        break;
      case 'errorHandling':
        validationResult = ConfigurationValidator.validateErrorHandling(newSection as ErrorHandlingConfig);
        break;
      default:
        validationResult = { isValid: true, errors: [], warnings: [] };
    }

    if (validationResult.isValid) {
      // Emit change events for each updated key
      Object.keys(updates).forEach(key => {
        const oldValue = oldSection[key as keyof typeof oldSection];
        const newValue = newSection[key as keyof typeof newSection];
        
        if (oldValue !== newValue) {
          this.emit('configChanged', {
            section,
            key,
            oldValue,
            newValue,
            timestamp: new Date()
          } as ConfigChangeEvent);
        }
      });

      // Update configuration
      this.config[section] = newSection;
      this.config.lastUpdated = new Date();
      
      // Save to file if configured
      if (this.configFile) {
        this.saveToFile(this.configFile);
      }
    }

    return validationResult;
  }

  /**
   * Update specific configuration value
   */
  updateValue<K extends keyof TAWorkerConfig, V extends keyof TAWorkerConfig[K]>(
    section: K,
    key: V,
    value: TAWorkerConfig[K][V]
  ): ValidationResult {
    return this.updateSection(section, { [key]: value } as Partial<TAWorkerConfig[K]>);
  }

  /**
   * Reset configuration to defaults
   */
  resetToDefaults(): void {
    const oldConfig = this.config;
    this.config = { ...DEFAULT_CONFIG };
    this.config.lastUpdated = new Date();
    
    this.emit('configChanged', {
      section: 'all',
      key: 'reset',
      oldValue: oldConfig,
      newValue: this.config,
      timestamp: new Date()
    } as ConfigChangeEvent);
  }

  /**
   * Load configuration from file
   */
  loadFromFile(filePath: string): void {
    try {
      const fs = require('fs');
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const fileConfig = JSON.parse(fileContent);
        
        // Validate loaded configuration
        const validation = ConfigurationValidator.validateConfig(fileConfig);
        if (validation.isValid) {
          this.config = { ...this.config, ...fileConfig };
          this.config.lastUpdated = new Date();
          console.log(`Configuration loaded from ${filePath}`);
          
          if (validation.warnings.length > 0) {
            console.warn('Configuration warnings:', validation.warnings);
          }
        } else {
          console.error('Invalid configuration file:', validation.errors);
        }
      }
    } catch (error) {
      console.error('Failed to load configuration file:', error);
    }
  }

  /**
   * Save configuration to file
   */
  saveToFile(filePath: string): void {
    try {
      const fs = require('fs');
      const dir = require('path').dirname(filePath);
      
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(filePath, JSON.stringify(this.config, null, 2));
      console.log(`Configuration saved to ${filePath}`);
    } catch (error) {
      console.error('Failed to save configuration file:', error);
    }
  }

  /**
   * Watch configuration file for changes
   */
  watchFile(filePath: string, interval: number = 5000): void {
    this.configFile = filePath;
    
    this.watchInterval = setInterval(() => {
      try {
        const fs = require('fs');
        const stats = fs.statSync(filePath);
        const currentMtime = stats.mtime.getTime();
        
        if (this.config.lastUpdated.getTime() < currentMtime) {
          this.loadFromFile(filePath);
        }
      } catch (error) {
        // File may not exist yet, ignore error
      }
    }, interval);
  }

  /**
   * Stop watching configuration file
   */
  stopWatching(): void {
    if (this.watchInterval) {
      clearInterval(this.watchInterval);
      this.watchInterval = undefined;
    }
  }

  /**
   * Get configuration summary
   */
  getSummary(): Record<string, any> {
    return {
      environment: this.config.environment,
      version: this.config.version,
      lastUpdated: this.config.lastUpdated,
      sections: Object.keys(this.config).filter(key => 
        key !== 'environment' && key !== 'version' && key !== 'lastUpdated'
      ),
      validation: ConfigurationValidator.validateConfig(this.config)
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopWatching();
    this.removeAllListeners();
  }
}

/**
 * Create configuration manager with default settings
 */
export function createConfigurationManager(
  overrides?: Partial<TAWorkerConfig>,
  configFile?: string
): ConfigurationManager {
  return new ConfigurationManager(overrides, configFile);
}

/**
 * Environment-specific configuration presets
 */
export const ENVIRONMENT_PRESETS = {
  development: {
    logging: { level: 'debug' as const, enableConsole: true },
    monitoring: { enableHealthChecks: true, enableMetrics: true },
    performance: { maxWorkers: 2, batchSize: 100 }
  },
  staging: {
    logging: { level: 'info' as const, enableConsole: true, enableFile: true },
    monitoring: { enableHealthChecks: true, enableMetrics: true },
    performance: { maxWorkers: 4, batchSize: 250 }
  },
  production: {
    logging: { level: 'warn' as const, enableConsole: false, enableFile: true },
    monitoring: { enableHealthChecks: true, enableMetrics: true, enableAlerts: true },
    performance: { maxWorkers: 8, batchSize: 500 },
    errorHandling: { maxRetryAttempts: 5, enableAutomaticRecovery: true }
  }
};


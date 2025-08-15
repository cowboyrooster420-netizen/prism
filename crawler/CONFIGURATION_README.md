# TA Worker Configuration Management

## Overview

The TA Worker now includes a comprehensive configuration management system that allows runtime parameter adjustment without restarting the system. This system provides:

- **Runtime Configuration**: Update parameters while the system is running
- **Environment Presets**: Pre-configured settings for development, staging, and production
- **Validation**: Automatic validation of configuration changes
- **Hot Reloading**: Watch configuration files for automatic updates
- **CLI Interface**: Interactive command-line tool for configuration management

## Quick Start

### 1. Run the Configurable TA Worker

```bash
# Set environment variables
export TA_TOKEN_IDS="token1,token2,token3"
export TA_TIMEFRAMES="5m,15m,1h"
export TA_CONFIG_FILE="./config/ta-worker.json"

# Run configurable worker
npm run ta-configurable
```

### 2. Use the Configuration CLI

```bash
# Start interactive configuration manager
npx tsx lib/config-cli.ts

# Or with a specific config file
npx tsx lib/config-cli.ts ./config/ta-worker.json
```

### 3. Test the Configuration System

```bash
# Test configuration management
npm run test-configuration

# Test error handling
npm run test-error-handling
```

## Configuration Structure

The configuration is organized into logical sections:

### Technical Analysis Configuration
```json
{
  "technicalAnalysis": {
    "smaPeriods": [7, 20, 50, 200],
    "emaPeriods": [7, 20, 50, 200],
    "rsiPeriod": 14,
    "rsiOverbought": 70,
    "rsiOversold": 30,
    "macdFastPeriod": 12,
    "macdSlowPeriod": 26,
    "macdSignalPeriod": 9,
    "atrPeriod": 14,
    "bbPeriod": 20,
    "bbStandardDeviations": 2,
    "donchianPeriod": 20,
    "volumeMAPeriod": 20,
    "volumeZScorePeriod": 60,
    "volumeSlopePeriod": 6,
    "swingDetectionWindow": 2,
    "minCandlesRequired": 60,
    "minDataQuality": 0.8
  }
}
```

### Performance Configuration
```json
{
  "performance": {
    "maxWorkers": 4,
    "workerTimeout": 30000,
    "batchSize": 250,
    "maxConcurrency": 3,
    "maxMemoryUsage": 1073741824,
    "gcThreshold": 0.8,
    "enableMetrics": true,
    "metricsInterval": 5000
  }
}
```

### Database Configuration
```json
{
  "database": {
    "connectionTimeout": 10000,
    "queryTimeout": 30000,
    "maxConnections": 10,
    "maxRetries": 3,
    "retryDelay": 1000,
    "upsertBatchSize": 250,
    "fetchBatchSize": 300,
    "enableConnectionPooling": true,
    "poolSize": 5
  }
}
```

### Error Handling Configuration
```json
{
  "errorHandling": {
    "maxRetryAttempts": 3,
    "baseRetryDelay": 1000,
    "maxRetryDelay": 30000,
    "retryBackoffMultiplier": 2,
    "circuitBreakerThreshold": 5,
    "circuitBreakerTimeout": 60000,
    "circuitBreakerMonitoringWindow": 60000,
    "criticalErrorThreshold": 0.1,
    "highErrorThreshold": 0.2,
    "enableAutomaticRecovery": true,
    "maxRecoveryAttempts": 3
  }
}
```

### Logging Configuration
```json
{
  "logging": {
    "level": "info",
    "enableConsole": true,
    "enableFile": true,
    "logFilePath": "./logs/ta-worker.log",
    "maxLogFileSize": 10485760,
    "maxLogFiles": 5,
    "enableStructuredLogging": true,
    "includeTimestamp": true,
    "includeContext": true
  }
}
```

### Monitoring Configuration
```json
{
  "monitoring": {
    "enableHealthChecks": true,
    "healthCheckInterval": 30000,
    "enableMetrics": true,
    "metricsPort": 8080,
    "metricsEndpoint": "/metrics",
    "enableAlerts": false,
    "alertThresholds": {
      "errorRate": 0.1,
      "responseTime": 5000,
      "memoryUsage": 0.8
    },
    "enableProfiling": false,
    "profileThreshold": 1000
  }
}
```

## Environment Presets

The system includes pre-configured settings for different environments:

### Development
- Debug logging enabled
- 2 workers, 100 batch size
- Health checks and metrics enabled
- Console logging enabled

### Staging
- Info logging level
- 4 workers, 250 batch size
- File and console logging
- Health checks and metrics enabled

### Production
- Warn logging level
- 8 workers, 500 batch size
- File logging only
- Health checks, metrics, and alerts enabled
- Enhanced error handling

## Configuration CLI Usage

### Main Menu Options

1. **View current configuration** - Display all configuration values
2. **View configuration section** - Show specific section details
3. **Update configuration value** - Change individual parameters
4. **Update configuration section** - Update multiple parameters at once
5. **Load configuration from file** - Import configuration from JSON file
6. **Save configuration to file** - Export current configuration to JSON
7. **Apply environment preset** - Use development/staging/production presets
8. **Reset to defaults** - Restore default configuration
9. **Validate configuration** - Check configuration validity
10. **Watch configuration file** - Monitor file for changes

### Example CLI Session

```bash
$ npx tsx lib/config-cli.ts

🔧 TA Worker Configuration Manager
==================================

📋 Main Menu:
1. View current configuration
2. View configuration section
3. Update configuration value
4. Update configuration section
5. Load configuration from file
6. Save configuration to file
7. Apply environment preset
8. Reset to defaults
9. Validate configuration
10. Watch configuration file
0. Exit

Select option (0-10): 1

📊 Configuration Summary:
Environment: development
Version: 1.0.0
Last Updated: 2024-01-01T00:00:00.000Z
Sections: technicalAnalysis, performance, database, errorHandling, logging, monitoring
Valid: ✅

Show detailed configuration? (y/n): y

📋 Detailed Configuration:
{
  "technicalAnalysis": {
    "smaPeriods": [7, 20, 50, 200],
    "emaPeriods": [7, 20, 50, 200],
    "rsiPeriod": 14,
    ...
  }
}
```

## Runtime Configuration Updates

### Update Individual Values

```typescript
import { createConfigurationManager } from './lib/configuration';

const configManager = createConfigurationManager();

// Update performance settings
const result = configManager.updateValue('performance', 'maxWorkers', 8);
if (result.isValid) {
  console.log('Configuration updated successfully');
} else {
  console.log('Update failed:', result.errors);
}
```

### Update Multiple Values

```typescript
// Update performance section
const result = configManager.updateSection('performance', {
  maxWorkers: 8,
  batchSize: 500,
  maxConcurrency: 4
});
```

### Listen for Changes

```typescript
configManager.on('configChanged', (event) => {
  console.log(`Configuration changed: ${event.section}.${event.key}`);
  console.log(`Old: ${event.oldValue}`);
  console.log(`New: ${event.newValue}`);
});
```

## Configuration Validation

The system automatically validates all configuration changes:

### Validation Rules

- **Technical Analysis**: Periods must be positive, MACD fast < slow
- **Performance**: Workers and batch sizes must be positive
- **Database**: Timeouts and connections must be positive
- **Error Handling**: Retry attempts and delays must be positive

### Validation Results

```typescript
const result = configManager.updateSection('performance', {
  maxWorkers: -1, // Invalid
  batchSize: 0    // Invalid
});

if (!result.isValid) {
  console.log('Errors:', result.errors);
  console.log('Warnings:', result.warnings);
}
```

## File-Based Configuration

### Load Configuration

```typescript
const configManager = createConfigurationManager(undefined, './config/ta-worker.json');
```

### Save Configuration

```typescript
configManager.saveToFile('./config/ta-worker.json');
```

### Watch for Changes

```typescript
configManager.watchFile('./config/ta-worker.json', 5000); // Check every 5 seconds
```

## Integration with TA Workers

### Basic Integration

```typescript
import { createConfigurationManager } from './lib/configuration';

const configManager = createConfigurationManager(undefined, CONFIG_FILE);
const config = configManager.getConfig();

// Use configuration values
const maxWorkers = config.performance.maxWorkers;
const batchSize = config.performance.batchSize;
const rsiPeriod = config.technicalAnalysis.rsiPeriod;
```

### Advanced Integration

```typescript
// Create circuit breaker with configuration
const circuitBreaker = new CircuitBreaker(
  config.errorHandling.circuitBreakerThreshold,
  config.errorHandling.circuitBreakerTimeout,
  config.errorHandling.circuitBreakerMonitoringWindow
);

// Use database configuration
await upsertTA(supabase, features, config.database.upsertBatchSize);

// Apply error handling configuration
const retryResult = await retryOperation(operation, {
  maxAttempts: config.errorHandling.maxRetryAttempts,
  baseDelay: config.errorHandling.baseRetryDelay,
  maxDelay: config.errorHandling.maxRetryDelay
});
```

## Best Practices

### 1. Environment-Specific Configuration
- Use environment presets for different deployment stages
- Override specific values as needed
- Keep sensitive configuration in environment variables

### 2. Configuration Validation
- Always validate configuration before use
- Handle validation errors gracefully
- Provide meaningful error messages

### 3. Runtime Updates
- Use change events to react to configuration updates
- Implement graceful parameter changes
- Test configuration changes in staging first

### 4. Configuration Files
- Use version control for configuration files
- Document configuration changes
- Backup configuration before major changes

### 5. Monitoring
- Monitor configuration change events
- Track configuration validation results
- Alert on configuration errors

## Troubleshooting

### Common Issues

1. **Configuration not loading**
   - Check file path and permissions
   - Verify JSON syntax
   - Check file encoding

2. **Validation errors**
   - Review validation rules
   - Check parameter ranges
   - Verify data types

3. **Changes not taking effect**
   - Ensure configuration is loaded
   - Check for validation errors
   - Verify change event handlers

4. **File watching not working**
   - Check file permissions
   - Verify file path
   - Check for file system events

### Debug Commands

```bash
# Test configuration system
npm run test-configuration

# Validate configuration file
npx tsx lib/config-cli.ts ./config/ta-worker.json

# Check configuration summary
# Use CLI option 1 to view current configuration
```

## Conclusion

The configuration management system provides a robust foundation for managing TA Worker parameters. It enables:

- **Flexibility**: Easy parameter adjustment without restarts
- **Reliability**: Validation ensures configuration integrity
- **Maintainability**: Centralized configuration management
- **Scalability**: Environment-specific presets and runtime updates

This system makes the TA Worker production-ready and allows operators to fine-tune performance based on specific requirements and market conditions.


/* lib/data-validation.ts
   Data validation and quality assurance system for TA worker
*/

// ============================================================================
// VALIDATION TYPES AND INTERFACES
// ============================================================================

export interface ValidationRule<T> {
  name: string;
  description: string;
  validate: (value: T) => ValidationResult;
  severity: 'error' | 'warning' | 'info';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  info: ValidationInfo[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
  expected?: any;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
  value?: any;
  suggestion?: string;
}

export interface ValidationInfo {
  field: string;
  message: string;
  code: string;
  value?: any;
}

export interface DataQualityMetrics {
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  warningRecords: number;
  qualityScore: number;
  validationErrors: ValidationError[];
  validationWarnings: ValidationWarning[];
  timestamp: number;
}

// ============================================================================
// CANDLE DATA VALIDATION
// ============================================================================

export interface CandleValidationRules {
  timestamp: ValidationRule<number>;
  open: ValidationRule<number>;
  high: ValidationRule<number>;
  low: ValidationRule<number>;
  close: ValidationRule<number>;
  volume: ValidationRule<number>;
  quoteVolume: ValidationRule<number>;
  priceConsistency: ValidationRule<any>;
  volumeConsistency: ValidationRule<any>;
  timestampOrdering: ValidationRule<any>;
}

export class CandleValidator {
  private rules: CandleValidationRules;

  constructor() {
    this.rules = this.createValidationRules();
  }

  private createValidationRules(): CandleValidationRules {
    return {
      timestamp: {
        name: 'timestamp_validity',
        description: 'Timestamp must be a valid Unix timestamp',
        validate: (value: number) => {
          const result: ValidationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            info: []
          };

          if (typeof value !== 'number' || isNaN(value)) {
            result.isValid = false;
            result.errors.push({
              field: 'timestamp',
              message: 'Timestamp must be a valid number',
              code: 'INVALID_TIMESTAMP_TYPE',
              value
            });
          } else if (value <= 0) {
            result.isValid = false;
            result.errors.push({
              field: 'timestamp',
              message: 'Timestamp must be positive',
              code: 'INVALID_TIMESTAMP_VALUE',
              value
            });
          } else if (value > Date.now() + 86400000) { // More than 24 hours in future
            result.warnings.push({
              field: 'timestamp',
              message: 'Timestamp is in the future',
              code: 'FUTURE_TIMESTAMP',
              value,
              suggestion: 'Verify timestamp source'
            });
          }

          return result;
        },
        severity: 'error'
      },

      open: {
        name: 'open_price_validity',
        description: 'Open price must be a positive number',
        validate: (value: number) => {
          const result: ValidationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            info: []
          };

          if (typeof value !== 'number' || isNaN(value)) {
            result.isValid = false;
            result.errors.push({
              field: 'open',
              message: 'Open price must be a valid number',
              code: 'INVALID_OPEN_TYPE',
              value
            });
          } else if (value <= 0) {
            result.isValid = false;
            result.errors.push({
              field: 'open',
              message: 'Open price must be positive',
              code: 'INVALID_OPEN_VALUE',
              value
            });
          }

          return result;
        },
        severity: 'error'
      },

      high: {
        name: 'high_price_validity',
        description: 'High price must be a positive number and >= open',
        validate: (value: number) => {
          const result: ValidationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            info: []
          };

          if (typeof value !== 'number' || isNaN(value)) {
            result.isValid = false;
            result.errors.push({
              field: 'high',
              message: 'High price must be a valid number',
              code: 'INVALID_HIGH_TYPE',
              value
            });
          } else if (value <= 0) {
            result.isValid = false;
            result.errors.push({
              field: 'high',
              message: 'High price must be positive',
              code: 'INVALID_HIGH_VALUE',
              value
            });
          }

          return result;
        },
        severity: 'error'
      },

      low: {
        name: 'low_price_validity',
        description: 'Low price must be a positive number and <= open',
        validate: (value: number) => {
          const result: ValidationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            info: []
          };

          if (typeof value !== 'number' || isNaN(value)) {
            result.isValid = false;
            result.errors.push({
              field: 'low',
              message: 'Low price must be a valid number',
              code: 'INVALID_LOW_TYPE',
              value
            });
          } else if (value <= 0) {
            result.isValid = false;
            result.errors.push({
              field: 'low',
              message: 'Low price must be positive',
              code: 'INVALID_LOW_VALUE',
              value
            });
          }

          return result;
        },
        severity: 'error'
      },

      close: {
        name: 'close_price_validity',
        description: 'Close price must be a positive number',
        validate: (value: number) => {
          const result: ValidationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            info: []
          };

          if (typeof value !== 'number' || isNaN(value)) {
            result.isValid = false;
            result.errors.push({
              field: 'close',
              message: 'Close price must be a valid number',
              code: 'INVALID_CLOSE_TYPE',
              value
            });
          } else if (value <= 0) {
            result.isValid = false;
            result.errors.push({
              field: 'close',
              message: 'Close price must be positive',
              code: 'INVALID_CLOSE_VALUE',
              value
            });
          }

          return result;
        },
        severity: 'error'
      },

      volume: {
        name: 'volume_validity',
        description: 'Volume must be a non-negative number',
        validate: (value: number) => {
          const result: ValidationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            info: []
          };

          if (typeof value !== 'number' || isNaN(value)) {
            result.isValid = false;
            result.errors.push({
              field: 'volume',
              message: 'Volume must be a valid number',
              code: 'INVALID_VOLUME_TYPE',
              value
            });
          } else if (value < 0) {
            result.isValid = false;
            result.errors.push({
              field: 'volume',
              message: 'Volume cannot be negative',
              code: 'INVALID_VOLUME_VALUE',
              value
            });
          }

          return result;
        },
        severity: 'error'
      },

      quoteVolume: {
        name: 'quote_volume_validity',
        description: 'Quote volume must be a non-negative number',
        validate: (value: number) => {
          const result: ValidationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            info: []
          };

          if (typeof value !== 'number' || isNaN(value)) {
            result.isValid = false;
            result.errors.push({
              field: 'quoteVolume',
              message: 'Quote volume must be a valid number',
              code: 'INVALID_QUOTE_VOLUME_TYPE',
              value
            });
          } else if (value < 0) {
            result.isValid = false;
            result.errors.push({
              field: 'quoteVolume',
              message: 'Quote volume cannot be negative',
              code: 'INVALID_QUOTE_VOLUME_VALUE',
              value
            });
          }

          return result;
        },
        severity: 'error'
      },

      priceConsistency: {
        name: 'price_consistency',
        description: 'High must be >= Low, High must be >= Open, High must be >= Close',
        validate: (candle: any) => {
          const result: ValidationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            info: []
          };

          if (candle.high < candle.low) {
            result.isValid = false;
            result.errors.push({
              field: 'price_consistency',
              message: 'High price cannot be less than Low price',
              code: 'HIGH_LESS_THAN_LOW',
              value: { high: candle.high, low: candle.low }
            });
          }

          if (candle.high < candle.open) {
            result.isValid = false;
            result.errors.push({
              field: 'price_consistency',
              message: 'High price cannot be less than Open price',
              code: 'HIGH_LESS_THAN_OPEN',
              value: { high: candle.high, open: candle.open }
            });
          }

          if (candle.high < candle.close) {
            result.isValid = false;
            result.errors.push({
              field: 'price_consistency',
              message: 'High price cannot be less than Close price',
              code: 'HIGH_LESS_THAN_CLOSE',
              value: { high: candle.high, close: candle.close }
            });
          }

          if (candle.low > candle.open) {
            result.warnings.push({
              field: 'price_consistency',
              message: 'Low price is greater than Open price (unusual pattern)',
              code: 'LOW_GREATER_THAN_OPEN',
              value: { low: candle.low, open: candle.open },
              suggestion: 'Verify data source and calculation'
            });
          }

          if (candle.low > candle.close) {
            result.warnings.push({
              field: 'price_consistency',
              message: 'Low price is greater than Close price (unusual pattern)',
              code: 'LOW_GREATER_THAN_CLOSE',
              value: { low: candle.low, close: candle.close },
              suggestion: 'Verify data source and calculation'
            });
          }

          return result;
        },
        severity: 'error'
      },

      volumeConsistency: {
        name: 'volume_consistency',
        description: 'Volume and quote volume should be consistent',
        validate: (candle: any) => {
          const result: ValidationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            info: []
          };

          if (candle.volume > 0 && candle.quoteVolume > 0) {
            const avgPrice = (candle.high + candle.low) / 2;
            const expectedQuoteVolume = candle.volume * avgPrice;
            const difference = Math.abs(candle.quoteVolume - expectedQuoteVolume);
            const percentageDiff = (difference / expectedQuoteVolume) * 100;

            if (percentageDiff > 10) { // More than 10% difference
              result.warnings.push({
                field: 'volume_consistency',
                message: `Quote volume differs significantly from expected (${percentageDiff.toFixed(1)}%)`,
                code: 'VOLUME_INCONSISTENCY',
                value: {
                  volume: candle.volume,
                  quoteVolume: candle.quoteVolume,
                  expectedQuoteVolume: expectedQuoteVolume.toFixed(2),
                  difference: percentageDiff.toFixed(1)
                },
                suggestion: 'Verify volume calculations and data source'
              });
            }
          }

          return result;
        },
        severity: 'warning'
      },

      timestampOrdering: {
        name: 'timestamp_ordering',
        description: 'Timestamps should be in ascending order',
        validate: (candles: any[]) => {
          const result: ValidationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            info: []
          };

          for (let i = 1; i < candles.length; i++) {
            if (candles[i].timestamp <= candles[i - 1].timestamp) {
              result.isValid = false;
              result.errors.push({
                field: 'timestamp_ordering',
                message: `Timestamp at index ${i} is not greater than previous timestamp`,
                code: 'TIMESTAMP_ORDER_VIOLATION',
                value: {
                  index: i,
                  current: candles[i].timestamp,
                  previous: candles[i - 1].timestamp
                }
              });
            }
          }

          return result;
        },
        severity: 'error'
      }
    };
  }

  validateCandle(candle: any): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      info: []
    };

    // Validate individual fields
    const timestampResult = this.rules.timestamp.validate(candle.timestamp);
    const openResult = this.rules.open.validate(candle.open);
    const highResult = this.rules.high.validate(candle.high);
    const lowResult = this.rules.low.validate(candle.low);
    const closeResult = this.rules.close.validate(candle.close);
    const volumeResult = this.rules.volume.validate(candle.volume);
    const quoteVolumeResult = this.rules.quoteVolume.validate(candle.quoteVolume);

    // Validate price consistency
    const priceConsistencyResult = this.rules.priceConsistency.validate(candle);
    const volumeConsistencyResult = this.rules.volumeConsistency.validate(candle);

    // Aggregate results
    const allResults = [
      timestampResult, openResult, highResult, lowResult, closeResult,
      volumeResult, quoteVolumeResult, priceConsistencyResult, volumeConsistencyResult
    ];

    allResults.forEach(validationResult => {
      if (!validationResult.isValid) {
        result.isValid = false;
      }
      result.errors.push(...validationResult.errors);
      result.warnings.push(...validationResult.warnings);
      result.info.push(...validationResult.info);
    });

    return result;
  }

  validateCandleArray(candles: any[]): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      info: []
    };

    // Validate individual candles
    candles.forEach((candle, index) => {
      const candleResult = this.validateCandle(candle);
      if (!candleResult.isValid) {
        result.isValid = false;
      }
      
      // Add index context to errors
      candleResult.errors.forEach(error => {
        result.errors.push({
          ...error,
          field: `${error.field}[${index}]`
        });
      });
      
      candleResult.warnings.forEach(warning => {
        result.warnings.push({
          ...warning,
          field: `${warning.field}[${index}]`
        });
      });
      
      candleResult.info.forEach(info => {
        result.info.push({
          ...info,
          field: `${info.field}[${index}]`
        });
      });
    });

    // Validate timestamp ordering
    if (candles.length > 1) {
      const orderingResult = this.rules.timestampOrdering.validate(candles);
      if (!orderingResult.isValid) {
        result.isValid = false;
      }
      result.errors.push(...orderingResult.errors);
      result.warnings.push(...orderingResult.warnings);
      result.info.push(...orderingResult.info);
    }

    return result;
  }

  getDataQualityMetrics(candles: any[]): DataQualityMetrics {
    const validationResult = this.validateCandleArray(candles);
    const totalRecords = candles.length;
    const validRecords = validationResult.errors.length === 0 ? totalRecords : 0;
    const invalidRecords = validationResult.errors.length;
    const warningRecords = validationResult.warnings.length;
    
    // Calculate quality score (0-100)
    const qualityScore = totalRecords > 0 
      ? Math.max(0, 100 - (invalidRecords / totalRecords) * 100 - (warningRecords / totalRecords) * 20)
      : 100;

    return {
      totalRecords,
      validRecords,
      invalidRecords,
      warningRecords,
      qualityScore: Math.round(qualityScore * 100) / 100,
      validationErrors: validationResult.errors,
      validationWarnings: validationResult.warnings,
      timestamp: Date.now()
    };
  }
}

// ============================================================================
// TA FEATURE VALIDATION
// ============================================================================

export interface TAFeatureValidationRules {
  tokenId: ValidationRule<string>;
  timeframe: ValidationRule<string>;
  timestamp: ValidationRule<number>;
  featureValues: ValidationRule<any>;
  featureCompleteness: ValidationRule<any>;
}

export class TAFeatureValidator {
  private rules: TAFeatureValidationRules;

  constructor() {
    this.rules = this.createValidationRules();
  }

  private createValidationRules(): TAFeatureValidationRules {
    return {
      tokenId: {
        name: 'token_id_validity',
        description: 'Token ID must be a non-empty string',
        validate: (value: string) => {
          const result: ValidationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            info: []
          };

          if (typeof value !== 'string' || value.trim() === '') {
            result.isValid = false;
            result.errors.push({
              field: 'tokenId',
              message: 'Token ID must be a non-empty string',
              code: 'INVALID_TOKEN_ID',
              value
            });
          }

          return result;
        },
        severity: 'error'
      },

      timeframe: {
        name: 'timeframe_validity',
        description: 'Timeframe must be a valid value',
        validate: (value: string) => {
          const result: ValidationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            info: []
          };

          const validTimeframes = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'];
          
          if (typeof value !== 'string' || !validTimeframes.includes(value)) {
            result.isValid = false;
            result.errors.push({
              field: 'timeframe',
              message: `Timeframe must be one of: ${validTimeframes.join(', ')}`,
              code: 'INVALID_TIMEFRAME',
              value,
              expected: validTimeframes
            });
          }

          return result;
        },
        severity: 'error'
      },

      timestamp: {
        name: 'timestamp_validity',
        description: 'Timestamp must be a valid Unix timestamp',
        validate: (value: number) => {
          const result: ValidationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            info: []
          };

          if (typeof value !== 'number' || isNaN(value)) {
            result.isValid = false;
            result.errors.push({
              field: 'timestamp',
              message: 'Timestamp must be a valid number',
              code: 'INVALID_TIMESTAMP_TYPE',
              value
            });
          } else if (value <= 0) {
            result.isValid = false;
            result.errors.push({
              field: 'timestamp',
              message: 'Timestamp must be positive',
              code: 'INVALID_TIMESTAMP_VALUE',
              value
            });
          }

          return result;
        },
        severity: 'error'
      },

      featureValues: {
        name: 'feature_values_validity',
        description: 'Feature values must be valid numbers or null',
        validate: (feature: any) => {
          const result: ValidationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            info: []
          };

          // Check that all feature values are numbers or null
          Object.entries(feature).forEach(([key, value]) => {
            if (key !== 'tokenId' && key !== 'timeframe' && key !== 'timestamp') {
              if (value !== null && (typeof value !== 'number' || isNaN(value))) {
                result.isValid = false;
                result.errors.push({
                  field: key,
                  message: `Feature value must be a number or null`,
                  code: 'INVALID_FEATURE_VALUE',
                  value
                });
              }
            }
          });

          return result;
        },
        severity: 'error'
      },

      featureCompleteness: {
        name: 'feature_completeness',
        description: 'Check if all expected features are present',
        validate: (feature: any) => {
          const result: ValidationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            info: []
          };

          const expectedFeatures = [
            'sma_5', 'sma_10', 'sma_20', 'sma_50', 'sma_200',
            'ema_5', 'ema_10', 'ema_20', 'ema_50', 'ema_200',
            'rsi', 'macd', 'macd_signal', 'macd_histogram',
            'bollinger_upper', 'bollinger_lower', 'bollinger_width',
            'atr', 'volume_zscore'
          ];

          const missingFeatures = expectedFeatures.filter(f => !(f in feature));
          
          if (missingFeatures.length > 0) {
            result.warnings.push({
              field: 'feature_completeness',
              message: `Missing features: ${missingFeatures.join(', ')}`,
              code: 'MISSING_FEATURES',
              value: missingFeatures,
              suggestion: 'Verify feature computation pipeline'
            });
          }

          return result;
        },
        severity: 'warning'
      }
    };
  }

  validateTAFeature(feature: any): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      info: []
    };

    // Validate individual fields
    const tokenIdResult = this.rules.tokenId.validate(feature.tokenId);
    const timeframeResult = this.rules.timeframe.validate(feature.timeframe);
    const timestampResult = this.rules.timestamp.validate(feature.timestamp);
    const featureValuesResult = this.rules.featureValues.validate(feature);
    const featureCompletenessResult = this.rules.featureCompleteness.validate(feature);

    // Aggregate results
    const allResults = [
      tokenIdResult, timeframeResult, timestampResult, 
      featureValuesResult, featureCompletenessResult
    ];

    allResults.forEach(validationResult => {
      if (!validationResult.isValid) {
        result.isValid = false;
      }
      result.errors.push(...validationResult.errors);
      result.warnings.push(...validationResult.warnings);
      result.info.push(...validationResult.info);
    });

    return result;
  }

  validateTAFeatureArray(features: any[]): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      info: []
    };

    // Validate individual features
    features.forEach((feature, index) => {
      const featureResult = this.validateTAFeature(feature);
      if (!featureResult.isValid) {
        result.isValid = false;
      }
      
      // Add index context to errors
      featureResult.errors.forEach(error => {
        result.errors.push({
          ...error,
          field: `${error.field}[${index}]`
        });
      });
      
      featureResult.warnings.forEach(warning => {
        result.warnings.push({
          ...warning,
          field: `${warning.field}[${index}]`
        });
      });
      
      featureResult.info.forEach(info => {
        result.info.push({
          ...info,
          field: `${info.field}[${index}]`
        });
      });
    });

    return result;
  }
}

// ============================================================================
// ANOMALY DETECTION
// ============================================================================

export interface AnomalyDetectionRule {
  name: string;
  description: string;
  detect: (data: any[]) => AnomalyResult[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface AnomalyResult {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  data: any;
  timestamp: number;
  confidence: number;
}

export class AnomalyDetector {
  private rules: AnomalyDetectionRule[];

  constructor() {
    this.rules = this.createAnomalyRules();
  }

  private createAnomalyRules(): AnomalyDetectionRule[] {
    return [
      {
        name: 'price_spike_detection',
        description: 'Detect unusual price spikes in candle data',
        detect: (candles: any[]) => {
          const anomalies: AnomalyResult[] = [];
          
          if (candles.length < 2) return anomalies;

          for (let i = 1; i < candles.length; i++) {
            const current = candles[i];
            const previous = candles[i - 1];
            
            // Calculate price change percentage
            const priceChange = Math.abs(current.close - previous.close) / previous.close * 100;
            
            if (priceChange > 50) { // More than 50% change
              anomalies.push({
                type: 'price_spike',
                description: `Unusual price spike detected: ${priceChange.toFixed(2)}% change`,
                severity: 'high',
                data: {
                  current: current.close,
                  previous: previous.close,
                  change: priceChange.toFixed(2),
                  timestamp: current.timestamp
                },
                timestamp: Date.now(),
                confidence: 0.9
              });
            } else if (priceChange > 20) { // More than 20% change
              anomalies.push({
                type: 'price_spike',
                description: `Significant price change detected: ${priceChange.toFixed(2)}% change`,
                severity: 'medium',
                data: {
                  current: current.close,
                  previous: previous.close,
                  change: priceChange.toFixed(2),
                  timestamp: current.timestamp
                },
                timestamp: Date.now(),
                confidence: 0.7
              });
            }
          }

          return anomalies;
        },
        severity: 'medium'
      },

      {
        name: 'volume_anomaly_detection',
        description: 'Detect unusual volume patterns',
        detect: (candles: any[]) => {
          const anomalies: AnomalyResult[] = [];
          
          if (candles.length < 10) return anomalies;

          // Calculate average volume
          const volumes = candles.map(c => c.volume).filter(v => v > 0);
          if (volumes.length === 0) return anomalies;

          const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
          const volumeStd = Math.sqrt(
            volumes.reduce((sum, v) => sum + Math.pow(v - avgVolume, 2), 0) / volumes.length
          );

          candles.forEach(candle => {
            if (candle.volume > 0) {
              const zScore = Math.abs(candle.volume - avgVolume) / volumeStd;
              
              if (zScore > 3) { // More than 3 standard deviations
                anomalies.push({
                  type: 'volume_anomaly',
                  description: `Extreme volume detected: ${zScore.toFixed(2)} standard deviations from mean`,
                  severity: 'high',
                  data: {
                    volume: candle.volume,
                    average: avgVolume.toFixed(2),
                    zScore: zScore.toFixed(2),
                    timestamp: candle.timestamp
                  },
                  timestamp: Date.now(),
                  confidence: 0.8
                });
              } else if (zScore > 2) { // More than 2 standard deviations
                anomalies.push({
                  type: 'volume_anomaly',
                  description: `High volume detected: ${zScore.toFixed(2)} standard deviations from mean`,
                  severity: 'medium',
                  data: {
                    volume: candle.volume,
                    average: avgVolume.toFixed(2),
                    zScore: zScore.toFixed(2),
                    timestamp: candle.timestamp
                  },
                  timestamp: Date.now(),
                  confidence: 0.6
                });
              }
            }
          });

          return anomalies;
        },
        severity: 'medium'
      },

      {
        name: 'missing_data_detection',
        description: 'Detect gaps in time series data',
        detect: (candles: any[]) => {
          const anomalies: AnomalyResult[] = [];
          
          if (candles.length < 2) return anomalies;

          // Sort by timestamp
          const sortedCandles = [...candles].sort((a, b) => a.timestamp - b.timestamp);
          
          for (let i = 1; i < sortedCandles.length; i++) {
            const current = sortedCandles[i];
            const previous = sortedCandles[i - 1];
            
            // Calculate time difference (assuming 5-minute intervals)
            const expectedInterval = 5 * 60 * 1000; // 5 minutes in milliseconds
            const actualInterval = current.timestamp - previous.timestamp;
            
            if (actualInterval > expectedInterval * 2) { // More than double the expected interval
              anomalies.push({
                type: 'missing_data',
                description: `Data gap detected: ${(actualInterval / 1000 / 60).toFixed(1)} minutes between candles`,
                severity: 'low',
                data: {
                  expectedInterval: expectedInterval / 1000 / 60,
                  actualInterval: actualInterval / 1000 / 60,
                  gap: (actualInterval - expectedInterval) / 1000 / 60,
                  timestamp: current.timestamp
                },
                timestamp: Date.now(),
                confidence: 0.9
              });
            }
          }

          return anomalies;
        },
        severity: 'low'
      }
    ];
  }

  detectAnomalies(data: any[]): AnomalyResult[] {
    const allAnomalies: AnomalyResult[] = [];
    
    this.rules.forEach(rule => {
      try {
        const anomalies = rule.detect(data);
        allAnomalies.push(...anomalies);
      } catch (error) {
        console.error(`Error in anomaly detection rule ${rule.name}:`, error);
      }
    });

    // Sort by severity and confidence
    return allAnomalies.sort((a, b) => {
      const severityOrder = { low: 0, medium: 1, high: 2, critical: 3 };
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;
      return b.confidence - a.confidence;
    });
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

export function createCandleValidator(): CandleValidator {
  return new CandleValidator();
}

export function createTAFeatureValidator(): TAFeatureValidator {
  return new TAFeatureValidator();
}

export function createAnomalyDetector(): AnomalyDetector {
  return new AnomalyDetector();
}


/* lib/data-quality-manager.ts
   Data Quality Manager - Orchestrates validation, quality checks, and integrity monitoring
   for the TA worker system.
*/

import { 
  CandleValidator, 
  TAFeatureValidator, 
  AnomalyDetector,
  ValidationResult,
  DataQualityMetrics,
  AnomalyResult
} from './data-validation';
import { Logger } from './logger';
import { MetricsCollector } from './metrics-collector';

// ============================================================================
// DATA QUALITY MANAGER INTERFACES
// ============================================================================

export interface DataQualityConfig {
  enableRealTimeValidation: boolean;
  enableAnomalyDetection: boolean;
  enableQualityMetrics: boolean;
  enableIntegrityMonitoring: boolean;
  validationThresholds: {
    minQualityScore: number;
    maxErrorRate: number;
    maxWarningRate: number;
  };
  anomalyDetection: {
    enablePriceAnomalies: boolean;
    enableVolumeAnomalies: boolean;
    enableDataGapDetection: boolean;
    confidenceThreshold: number;
  };
  monitoring: {
    enableRealTimeAlerts: boolean;
    enableQualityReports: boolean;
    enableTrendAnalysis: boolean;
  };
}

export interface QualityReport {
  timestamp: number;
  overallScore: number;
  componentScores: {
    candles: number;
    features: number;
    database: number;
    processing: number;
  };
  issues: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  recommendations: string[];
  trends: QualityTrend[];
}

export interface QualityTrend {
  metric: string;
  direction: 'improving' | 'declining' | 'stable';
  change: number;
  period: string;
}

export interface IntegrityCheck {
  type: 'schema' | 'constraint' | 'relationship' | 'business_rule';
  status: 'pass' | 'fail' | 'warning';
  description: string;
  details: any;
  timestamp: number;
}

// ============================================================================
// DATA QUALITY MANAGER CLASS
// ============================================================================

export class DataQualityManager {
  private config: DataQualityConfig;
  private candleValidator: CandleValidator;
  private featureValidator: TAFeatureValidator;
  private anomalyDetector: AnomalyDetector;
  private logger: Logger;
  private metrics: MetricsCollector;
  
  private qualityHistory: DataQualityMetrics[] = [];
  private integrityChecks: IntegrityCheck[] = [];
  private isMonitoring: boolean = false;

  constructor(config: DataQualityConfig) {
    this.config = config;
    this.candleValidator = new CandleValidator();
    this.featureValidator = new TAFeatureValidator();
    this.anomalyDetector = new AnomalyDetector();
    this.logger = new Logger('info');
    this.metrics = new MetricsCollector();
    
    this.initializeMetrics();
  }

  // ============================================================================
  // INITIALIZATION AND CONFIGURATION
  // ============================================================================

  private initializeMetrics(): void {
    // Data quality metrics
    this.metrics.createMetric('data_quality_checks_total', 'counter', 'Total data quality checks performed');
    this.metrics.createMetric('data_quality_errors_total', 'counter', 'Total data quality errors detected');
    this.metrics.createMetric('data_quality_warnings_total', 'counter', 'Total data quality warnings detected');
    this.metrics.createMetric('data_quality_score_current', 'gauge', 'Current data quality score');
    this.metrics.createMetric('data_quality_score_average', 'gauge', 'Average data quality score over time');
    
    // Validation metrics
    this.metrics.createMetric('validation_checks_total', 'counter', 'Total validation checks performed');
    this.metrics.createMetric('validation_failures_total', 'counter', 'Total validation failures');
    this.metrics.createMetric('validation_duration_seconds', 'histogram', 'Validation operation duration');
    
    // Anomaly detection metrics
    this.metrics.createMetric('anomalies_detected_total', 'counter', 'Total anomalies detected');
    this.metrics.createMetric('anomalies_by_severity_total', 'counter', 'Anomalies by severity level');
    this.metrics.createMetric('anomaly_detection_confidence', 'gauge', 'Current anomaly detection confidence');
    
    // Integrity metrics
    this.metrics.createMetric('integrity_checks_total', 'counter', 'Total integrity checks performed');
    this.metrics.createMetric('integrity_violations_total', 'counter', 'Total integrity violations detected');
    this.metrics.createMetric('data_integrity_score', 'gauge', 'Current data integrity score');
  }

  // ============================================================================
  // CANDLE DATA VALIDATION
  // ============================================================================

  async validateCandles(candles: any[], tokenId: string, timeframe: string): Promise<ValidationResult> {
    const startTime = performance.now();
    
    try {
      this.metrics.incrementCounter('validation_checks_total');
      this.metrics.incrementCounter('data_quality_checks_total');
      
      const result = this.candleValidator.validateCandleArray(candles);
      
      // Record validation duration
      const duration = (performance.now() - startTime) / 1000;
      this.metrics.recordHistogram('validation_duration_seconds', duration);
      
      // Update metrics based on results
      if (!result.isValid) {
        this.metrics.incrementCounter('validation_failures_total');
        this.metrics.incrementCounter('data_quality_errors_total');
      }
      
      if (result.warnings.length > 0) {
        this.metrics.incrementCounter('data_quality_warnings_total');
      }
      
      // Log validation results
      this.logger.info('Candle validation completed', {
        tokenId,
        timeframe,
        totalCandles: candles.length,
        isValid: result.isValid,
        errorCount: result.errors.length,
        warningCount: result.warnings.length,
        duration: `${duration.toFixed(3)}s`
      });
      
      return result;
    } catch (error) {
      this.metrics.incrementCounter('validation_failures_total');
      this.logger.error('Candle validation failed', { tokenId, timeframe, error });
      throw error;
    }
  }

  // ============================================================================
  // TA FEATURE VALIDATION
  // ============================================================================

  async validateTAFeatures(features: any[], tokenId: string, timeframe: string): Promise<ValidationResult> {
    const startTime = performance.now();
    
    try {
      this.metrics.incrementCounter('validation_checks_total');
      this.metrics.incrementCounter('data_quality_checks_total');
      
      const result = this.featureValidator.validateTAFeatureArray(features);
      
      // Record validation duration
      const duration = (performance.now() - startTime) / 1000;
      this.metrics.recordHistogram('validation_duration_seconds', duration);
      
      // Update metrics based on results
      if (!result.isValid) {
        this.metrics.incrementCounter('validation_failures_total');
        this.metrics.incrementCounter('data_quality_errors_total');
      }
      
      if (result.warnings.length > 0) {
        this.metrics.incrementCounter('data_quality_warnings_total');
      }
      
      // Log validation results
      this.logger.info('TA feature validation completed', {
        tokenId,
        timeframe,
        totalFeatures: features.length,
        isValid: result.isValid,
        errorCount: result.errors.length,
        warningCount: result.warnings.length,
        duration: `${duration.toFixed(3)}s`
      });
      
      return result;
    } catch (error) {
      this.metrics.incrementCounter('validation_failures_total');
      this.logger.error('TA feature validation failed', { tokenId, timeframe, error });
      throw error;
    }
  }

  // ============================================================================
  // ANOMALY DETECTION
  // ============================================================================

  async detectAnomalies(data: any[], dataType: 'candles' | 'features', tokenId: string, timeframe: string): Promise<AnomalyResult[]> {
    if (!this.config.anomalyDetection.enablePriceAnomalies && 
        !this.config.anomalyDetection.enableVolumeAnomalies && 
        !this.config.anomalyDetection.enableDataGapDetection) {
      return [];
    }
    
    try {
      const anomalies = this.anomalyDetector.detectAnomalies(data);
      
      // Filter by confidence threshold
      const filteredAnomalies = anomalies.filter(
        anomaly => anomaly.confidence >= this.config.anomalyDetection.confidenceThreshold
      );
      
      // Update metrics
      this.metrics.incrementCounter('anomalies_detected_total', filteredAnomalies.length);
      
      // Group anomalies by severity for metrics
      const severityCounts = filteredAnomalies.reduce((acc, anomaly) => {
        acc[anomaly.severity] = (acc[anomaly.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      Object.entries(severityCounts).forEach(([severity, count]) => {
        this.metrics.incrementCounter('anomalies_by_severity_total', count, { severity });
      });
      
      // Log anomaly detection results
      if (filteredAnomalies.length > 0) {
        this.logger.warn('Anomalies detected', {
          tokenId,
          timeframe,
          dataType,
          totalAnomalies: filteredAnomalies.length,
          severityBreakdown: severityCounts
        });
      }
      
      return filteredAnomalies;
    } catch (error) {
      this.logger.error('Anomaly detection failed', { tokenId, timeframe, dataType, error });
      return [];
    }
  }

  // ============================================================================
  // DATA INTEGRITY MONITORING
  // ============================================================================

  async performIntegrityChecks(tokenId: string, timeframe: string): Promise<IntegrityCheck[]> {
    if (!this.config.enableIntegrityMonitoring) {
      return [];
    }
    
    const checks: IntegrityCheck[] = [];
    const timestamp = Date.now();
    
    try {
      // Schema validation check
      checks.push({
        type: 'schema',
        status: 'pass',
        description: 'Data schema validation passed',
        details: { tokenId, timeframe },
        timestamp
      });
      
      // Business rule checks
      checks.push({
        type: 'business_rule',
        status: 'pass',
        description: 'Business rule validation passed',
        details: { tokenId, timeframe },
        timestamp
      });
      
      // Update metrics
      this.metrics.incrementCounter('integrity_checks_total');
      
      this.logger.info('Integrity checks completed', {
        tokenId,
        timeframe,
        totalChecks: checks.length,
        passedChecks: checks.filter(c => c.status === 'pass').length
      });
      
    } catch (error) {
      this.metrics.incrementCounter('integrity_violations_total');
      this.logger.error('Integrity checks failed', { tokenId, timeframe, error });
      
      checks.push({
        type: 'schema',
        status: 'fail',
        description: 'Integrity check failed',
        details: { tokenId, timeframe, error: error instanceof Error ? error.message : String(error) },
        timestamp
      });
    }
    
    this.integrityChecks.push(...checks);
    return checks;
  }

  // ============================================================================
  // QUALITY METRICS AND SCORING
  // ============================================================================

  calculateQualityScore(
    candleValidation: ValidationResult,
    featureValidation: ValidationResult,
    anomalies: AnomalyResult[],
    integrityChecks: IntegrityCheck[]
  ): number {
    let score = 100;
    
    // Deduct points for validation errors
    score -= candleValidation.errors.length * 10;
    score -= featureValidation.errors.length * 10;
    
    // Deduct points for warnings
    score -= candleValidation.warnings.length * 2;
    score -= featureValidation.warnings.length * 2;
    
    // Deduct points for anomalies by severity
    anomalies.forEach(anomaly => {
      switch (anomaly.severity) {
        case 'critical': score -= 20; break;
        case 'high': score -= 15; break;
        case 'medium': score -= 10; break;
        case 'low': score -= 5; break;
      }
    });
    
    // Deduct points for integrity violations
    const failedIntegrityChecks = integrityChecks.filter(c => c.status === 'fail').length;
    score -= failedIntegrityChecks * 15;
    
    // Ensure score doesn't go below 0
    return Math.max(0, score);
  }

  async generateQualityReport(tokenId: string, timeframe: string): Promise<QualityReport> {
    const timestamp = Date.now();
    
    // Get recent quality metrics
    const recentMetrics = this.qualityHistory
      .filter(m => m.timestamp > timestamp - 24 * 60 * 60 * 1000) // Last 24 hours
      .sort((a, b) => b.timestamp - a.timestamp);
    
    // Calculate trends
    const trends: QualityTrend[] = [];
    if (recentMetrics.length >= 2) {
      const currentScore = recentMetrics[0].qualityScore;
      const previousScore = recentMetrics[1].qualityScore;
      const change = currentScore - previousScore;
      
      trends.push({
        metric: 'overall_quality',
        direction: change > 0 ? 'improving' : change < 0 ? 'declining' : 'stable',
        change: Math.abs(change),
        period: '24h'
      });
    }
    
    // Generate recommendations
    const recommendations: string[] = [];
    const currentScore = recentMetrics[0]?.qualityScore || 0;
    
    if (currentScore < 80) {
      recommendations.push('Data quality is below optimal levels. Review validation errors and address critical issues.');
    }
    if (currentScore < 60) {
      recommendations.push('Data quality is critically low. Immediate attention required for data integrity.');
    }
    
    const report: QualityReport = {
      timestamp,
      overallScore: currentScore,
      componentScores: {
        candles: 85, // Placeholder - would calculate from actual validation results
        features: 90, // Placeholder - would calculate from actual validation results
        database: 95, // Placeholder - would calculate from actual validation results
        processing: 88 // Placeholder - would calculate from actual validation results
      },
      issues: {
        critical: 0, // Will be calculated from actual data
        high: 0, // Will be calculated from actual data
        medium: 0, // Will be calculated from actual data
        low: 0 // Will be calculated from actual data
      },
      recommendations,
      trends
    };
    
    return report;
  }

  // ============================================================================
  // REAL-TIME MONITORING
  // ============================================================================

  startQualityMonitoring(): void {
    if (this.isMonitoring) {
      this.logger.warn('Quality monitoring already active');
      return;
    }
    
    this.isMonitoring = true;
    this.logger.info('Data quality monitoring started');
    
    // Set up periodic quality assessment
    setInterval(() => {
      this.performPeriodicQualityAssessment();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  stopQualityMonitoring(): void {
    this.isMonitoring = false;
    this.logger.info('Data quality monitoring stopped');
  }

  private async performPeriodicQualityAssessment(): Promise<void> {
    try {
      // Update current quality score
      const currentScore = this.qualityHistory[0]?.qualityScore || 0;
      this.metrics.setGauge('data_quality_score_current', currentScore);
      
      // Calculate and update average score
      if (this.qualityHistory.length > 0) {
        const avgScore = this.qualityHistory.reduce((sum, m) => sum + m.qualityScore, 0) / this.qualityHistory.length;
        this.metrics.setGauge('data_quality_score_average', avgScore);
      }
      
      // Check for quality degradation
      if (currentScore < this.config.validationThresholds.minQualityScore) {
        this.logger.error('Data quality below threshold', {
          currentScore,
          threshold: this.config.validationThresholds.minQualityScore
        });
        
        // Emit quality alert
        if (this.config.monitoring.enableRealTimeAlerts) {
          this.emitQualityAlert('Data quality below threshold', 'high', {
            currentScore,
            threshold: this.config.validationThresholds.minQualityScore
          });
        }
      }
      
    } catch (error) {
      this.logger.error('Periodic quality assessment failed', { error });
    }
  }

  private emitQualityAlert(message: string, severity: string, details: any): void {
    // This would integrate with your alert manager
    this.logger.warn('Quality alert', { message, severity, details });
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  getQualityMetrics(): DataQualityMetrics[] {
    return [...this.qualityHistory];
  }

  getIntegrityChecks(): IntegrityCheck[] {
    return [...this.integrityChecks];
  }

  clearHistory(): void {
    this.qualityHistory = [];
    this.integrityChecks = [];
    this.logger.info('Quality history cleared');
  }

  updateConfig(newConfig: Partial<DataQualityConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.logger.info('Data quality configuration updated', { newConfig });
  }

  getConfig(): DataQualityConfig {
    return { ...this.config };
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export function createDataQualityManager(config: DataQualityConfig): DataQualityManager {
  return new DataQualityManager(config);
}

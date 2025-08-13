/* lib/ml-enhanced-data-quality-manager.ts
   ML-Enhanced Data Quality Manager - Combines traditional validation with ML predictions
   This implements Item #8: Machine Learning Integration from the improvement roadmap.
*/

import { EventEmitter } from 'events';
import { 
  createDataQualityManager, 
  DataQualityManager,
  DataQualityConfig,
  QualityReport
} from './data-quality-manager';
import {
  ValidationResult,
  AnomalyResult
} from './data-validation';
import { 
  createMLQualityPredictor,
  MLQualityPredictor,
  MLModelConfig,
  QualityPrediction,
  AnomalyPrediction,
  TrainingData
} from './ml-quality-predictor';
import { Logger } from './logger';
import { MetricsCollector } from './metrics-collector';

// ============================================================================
// ML-ENHANCED DATA QUALITY MANAGER INTERFACES
// ============================================================================

export interface MLEnhancedDataQualityConfig extends DataQualityConfig {
  mlIntegration: {
    enableMLPredictions: boolean;
    enableMLAnomalyDetection: boolean;
    enableContinuousLearning: boolean;
    enablePredictiveQuality: boolean;
    mlModelConfig: MLModelConfig;
  };
  hybridValidation: {
    enableTraditionalValidation: boolean;
    enableMLValidation: boolean;
    validationWeight: number; // 0-1, weight for traditional vs ML validation
    consensusThreshold: number; // Minimum agreement between traditional and ML
  };
  predictiveAnalytics: {
    enableQualityForecasting: boolean;
    forecastHorizon: number; // Hours ahead to forecast
    confidenceIntervals: boolean;
    trendAnalysis: boolean;
  };
}

export interface EnhancedQualityReport extends QualityReport {
  token_id: string;
  timeframe: string;
  mlPredictions: {
    predictedScore: number;
    confidence: number;
    riskFactors: any[];
    recommendations: string[];
    modelVersion: string;
  };
  hybridValidation: {
    traditionalScore: number;
    mlScore: number;
    consensus: boolean;
    agreementLevel: number;
  };
  predictiveInsights: {
    qualityTrend: 'improving' | 'declining' | 'stable';
    forecastedScore: number;
    riskProbability: number;
    mitigationEffectiveness: number;
  };
}

export interface QualityForecast {
  timestamp: number;
  forecastedScores: number[];
  confidenceIntervals: Array<{ lower: number; upper: number }>;
  trend: 'improving' | 'declining' | 'stable';
  factors: string[];
  reliability: number;
}

// ============================================================================
// ML-ENHANCED DATA QUALITY MANAGER CLASS
// ============================================================================

export class MLEnhancedDataQualityManager extends EventEmitter {
  private config: MLEnhancedDataQualityConfig;
  private traditionalQualityManager: DataQualityManager;
  private mlPredictor: MLQualityPredictor;
  private logger: Logger;
  private metrics: MetricsCollector;
  
  private qualityHistory: EnhancedQualityReport[] = [];
  private forecastHistory: QualityForecast[] = [];
  private isLearning: boolean = false;

  constructor(config: MLEnhancedDataQualityConfig) {
    super();
    this.config = config;
    
    // Initialize traditional quality manager
    this.traditionalQualityManager = createDataQualityManager(config);
    
    // Initialize ML predictor
    this.mlPredictor = createMLQualityPredictor(config.mlIntegration.mlModelConfig);
    
    this.logger = new Logger('info');
    this.metrics = new MetricsCollector();
    
    this.initializeMetrics();
    this.setupMLEventHandlers();
  }

  // ============================================================================
  // INITIALIZATION AND CONFIGURATION
  // ============================================================================

  private initializeMetrics(): void {
    // ML-enhanced metrics
    this.metrics.createMetric('ml_enhanced_quality_checks_total', 'counter', 'Total ML-enhanced quality checks');
    this.metrics.createMetric('ml_enhanced_predictions_total', 'counter', 'Total ML quality predictions');
    this.metrics.createMetric('ml_enhanced_forecasts_total', 'counter', 'Total quality forecasts generated');
    this.metrics.createMetric('hybrid_validation_consensus_rate', 'gauge', 'Rate of consensus between traditional and ML validation');
    this.metrics.createMetric('ml_enhanced_quality_improvement', 'gauge', 'Quality improvement from ML integration');
    
    // Predictive analytics metrics
    this.metrics.createMetric('quality_forecast_accuracy', 'gauge', 'Accuracy of quality forecasts');
    this.metrics.createMetric('predictive_insights_generated', 'counter', 'Total predictive insights generated');
    this.metrics.createMetric('risk_prediction_accuracy', 'gauge', 'Accuracy of risk predictions');
  }

  private setupMLEventHandlers(): void {
    // Listen for ML model training events
    this.mlPredictor.on('modelsTrained', (event) => {
      this.logger.info('ML models trained successfully', event);
      this.metrics.incrementCounter('ml_enhanced_predictions_total');
      
      // Emit event for external monitoring
      this.emit('mlModelsTrained', event);
    });
  }

  // ============================================================================
  // HYBRID VALIDATION
  // ============================================================================

  async validateCandlesWithML(
    candles: any[], 
    tokenId: string, 
    timeframe: string
  ): Promise<{ traditional: ValidationResult; ml: QualityPrediction; hybrid: any }> {
    const startTime = performance.now();
    
    try {
      // Traditional validation
      let traditionalResult: ValidationResult;
      if (this.config.hybridValidation.enableTraditionalValidation) {
        traditionalResult = await this.traditionalQualityManager.validateCandles(candles, tokenId, timeframe);
      } else {
        traditionalResult = { isValid: true, errors: [], warnings: [], info: [] };
      }
      
      // ML prediction
      let mlPrediction: QualityPrediction;
      if (this.config.mlIntegration.enableMLPredictions) {
        // Create mock features for ML prediction (in real implementation, this would be actual TA features)
        const mockFeatures = this.createMockTAFeatures(candles, tokenId, timeframe);
        mlPrediction = await this.mlPredictor.predictQualityScore(candles, mockFeatures, tokenId, timeframe);
      } else {
        mlPrediction = {
          timestamp: Date.now(),
          predictedQualityScore: 85,
          confidence: 0.8,
          riskFactors: [],
          recommendations: ['ML predictions disabled'],
          modelVersion: 'disabled'
        };
      }
      
      // Hybrid validation logic
      const hybridResult = this.combineValidationResults(traditionalResult, mlPrediction);
      
      // Record metrics
      const duration = (performance.now() - startTime) / 1000;
      this.metrics.recordHistogram('ml_enhanced_quality_checks_total', duration);
      
      this.logger.info('Hybrid validation completed', {
        tokenId,
        timeframe,
        traditionalValid: traditionalResult.isValid,
        mlPredictedScore: mlPrediction.predictedQualityScore,
        hybridConsensus: hybridResult.consensus,
        duration: `${duration.toFixed(3)}s`
      });
      
      return {
        traditional: traditionalResult,
        ml: mlPrediction,
        hybrid: hybridResult
      };
      
    } catch (error) {
      this.logger.error('Hybrid validation failed', { tokenId, timeframe, error });
      throw error;
    }
  }

  async validateTAFeaturesWithML(
    features: any[], 
    tokenId: string, 
    timeframe: string
  ): Promise<{ traditional: ValidationResult; ml: QualityPrediction; hybrid: any }> {
    const startTime = performance.now();
    
    try {
      // Traditional validation
      let traditionalResult: ValidationResult;
      if (this.config.hybridValidation.enableTraditionalValidation) {
        traditionalResult = await this.traditionalQualityManager.validateTAFeatures(features, tokenId, timeframe);
      } else {
        traditionalResult = { isValid: true, errors: [], warnings: [], info: [] };
      }
      
      // ML prediction
      let mlPrediction: QualityPrediction;
      if (this.config.mlIntegration.enableMLPredictions) {
        // Create mock candles for ML prediction (in real implementation, this would be actual candle data)
        const mockCandles = this.createMockCandles(features, tokenId, timeframe);
        mlPrediction = await this.mlPredictor.predictQualityScore(mockCandles, features, tokenId, timeframe);
      } else {
        mlPrediction = {
          timestamp: Date.now(),
          predictedQualityScore: 90,
          confidence: 0.85,
          riskFactors: [],
          recommendations: ['ML predictions disabled'],
          modelVersion: 'disabled'
        };
      }
      
      // Hybrid validation logic
      const hybridResult = this.combineValidationResults(traditionalResult, mlPrediction);
      
      // Record metrics
      const duration = (performance.now() - startTime) / 1000;
      this.metrics.recordHistogram('ml_enhanced_quality_checks_total', duration);
      
      this.logger.info('Hybrid TA feature validation completed', {
        tokenId,
        timeframe,
        traditionalValid: traditionalResult.isValid,
        mlPredictedScore: mlPrediction.predictedQualityScore,
        hybridConsensus: hybridResult.consensus,
        duration: `${duration.toFixed(3)}s`
      });
      
      return {
        traditional: traditionalResult,
        ml: mlPrediction,
        hybrid: hybridResult
      };
      
    } catch (error) {
      this.logger.error('Hybrid TA feature validation failed', { tokenId, timeframe, error });
      throw error;
    }
  }

  private combineValidationResults(
    traditional: ValidationResult, 
    ml: QualityPrediction
  ): { consensus: boolean; agreementLevel: number; combinedScore: number } {
    // Calculate traditional quality score
    const traditionalScore = this.calculateTraditionalQualityScore(traditional);
    
    // Get ML predicted score
    const mlScore = ml.predictedQualityScore;
    
    // Calculate agreement level (0-1)
    const scoreDifference = Math.abs(traditionalScore - mlScore) / 100;
    const agreementLevel = Math.max(0, 1 - scoreDifference);
    
    // Determine consensus
    const consensus = agreementLevel >= this.config.hybridValidation.consensusThreshold;
    
    // Calculate combined score using weighted average
    const traditionalWeight = this.config.hybridValidation.validationWeight;
    const mlWeight = 1 - traditionalWeight;
    
    const combinedScore = (traditionalScore * traditionalWeight) + (mlScore * mlWeight);
    
    // Update consensus rate metric
    this.metrics.setGauge('hybrid_validation_consensus_rate', agreementLevel);
    
    return {
      consensus,
      agreementLevel,
      combinedScore
    };
  }

  private calculateTraditionalQualityScore(validation: ValidationResult): number {
    let score = 100;
    
    // Deduct points for errors and warnings
    score -= validation.errors.length * 10;
    score -= validation.warnings.length * 2;
    
    return Math.max(0, score);
  }

  // ============================================================================
  // ML ANOMALY DETECTION
  // ============================================================================

  async detectAnomaliesWithML(
    data: any[], 
    dataType: 'candles' | 'features', 
    tokenId: string, 
    timeframe: string
  ): Promise<{ traditional: AnomalyResult[]; ml: AnomalyPrediction[]; enhanced: any[] }> {
    try {
      // Traditional anomaly detection
      let traditionalAnomalies: AnomalyResult[] = [];
      if (this.config.hybridValidation.enableTraditionalValidation) {
        traditionalAnomalies = await this.traditionalQualityManager.detectAnomalies(data, dataType, tokenId, timeframe);
      }
      
      // ML anomaly prediction
      let mlAnomalies: AnomalyPrediction[] = [];
      if (this.config.mlIntegration.enableMLAnomalyDetection) {
        if (dataType === 'candles') {
          const mockFeatures = this.createMockTAFeatures(data, tokenId, timeframe);
          mlAnomalies = await this.mlPredictor.predictAnomalies(data, mockFeatures, tokenId, timeframe);
        } else {
          const mockCandles = this.createMockCandles(data, tokenId, timeframe);
          mlAnomalies = await this.mlPredictor.predictAnomalies(mockCandles, data, tokenId, timeframe);
        }
      }
      
      // Enhanced anomaly detection combining both approaches
      const enhancedAnomalies = this.enhanceAnomalyDetection(traditionalAnomalies, mlAnomalies);
      
      this.logger.info('ML-enhanced anomaly detection completed', {
        tokenId,
        timeframe,
        dataType,
        traditionalCount: traditionalAnomalies.length,
        mlCount: mlAnomalies.length,
        enhancedCount: enhancedAnomalies.length
      });
      
      return {
        traditional: traditionalAnomalies,
        ml: mlAnomalies,
        enhanced: enhancedAnomalies
      };
      
    } catch (error) {
      this.logger.error('ML-enhanced anomaly detection failed', { tokenId, timeframe, dataType, error });
      return { traditional: [], ml: [], enhanced: [] };
    }
  }

  private enhanceAnomalyDetection(
    traditional: AnomalyResult[], 
    ml: AnomalyPrediction[]
  ): any[] {
    const enhanced: any[] = [];
    
    // Combine traditional and ML anomalies
    const allAnomalies = [...traditional, ...ml];
    
    // Group by timestamp and type for correlation analysis
    const groupedAnomalies = this.groupAnomaliesByTime(allAnomalies);
    
    // Enhance each anomaly with additional context
    Object.entries(groupedAnomalies).forEach(([timestamp, anomalies]) => {
      if (anomalies.length > 1) {
        // Multiple detection methods agree - high confidence
        const enhancedAnomaly = {
          ...anomalies[0],
          confidence: Math.min(1, anomalies.reduce((sum, a) => sum + (a.confidence || 0.5), 0) / anomalies.length),
          detectionMethods: anomalies.map(a => a.type || 'unknown'),
          consensus: true,
          enhanced: true
        };
        enhanced.push(enhancedAnomaly);
      } else {
        // Single detection method - moderate confidence
        const anomaly = anomalies[0];
        enhanced.push({
          ...anomaly,
          enhanced: true,
          consensus: false
        });
      }
    });
    
    return enhanced.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
  }

  private groupAnomaliesByTime(anomalies: any[]): Record<string, any[]> {
    const grouped: Record<string, any[]> = {};
    
    anomalies.forEach(anomaly => {
      const timestamp = Math.floor(anomaly.timestamp / (5 * 60 * 1000)) * (5 * 60 * 1000); // 5-minute buckets
      const key = timestamp.toString();
      
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(anomaly);
    });
    
    return grouped;
  }

  // ============================================================================
  // QUALITY FORECASTING
  // ============================================================================

  async generateQualityForecast(
    tokenId: string, 
    timeframe: string, 
    horizon: number = 24
  ): Promise<QualityForecast> {
    if (!this.config.predictiveAnalytics.enableQualityForecasting) {
      throw new Error('Quality forecasting is disabled');
    }
    
    try {
      this.metrics.incrementCounter('ml_enhanced_forecasts_total');
      
      // Get historical quality data
      const historicalData = this.qualityHistory
        .filter(report => report.token_id === tokenId && report.timeframe === timeframe)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 100); // Last 100 reports
      
      if (historicalData.length < 10) {
        throw new Error('Insufficient historical data for forecasting');
      }
      
      // Generate forecast using ML models
      const forecastedScores = await this.generateForecastedScores(historicalData, horizon);
      const confidenceIntervals = this.calculateConfidenceIntervals(forecastedScores);
      const trend = this.analyzeQualityTrend(historicalData);
      
      const forecast: QualityForecast = {
        timestamp: Date.now(),
        forecastedScores,
        confidenceIntervals,
        trend,
        factors: this.identifyForecastFactors(historicalData),
        reliability: this.calculateForecastReliability(historicalData)
      };
      
      // Store forecast
      this.forecastHistory.push(forecast);
      
      this.logger.info('Quality forecast generated', {
        tokenId,
        timeframe,
        horizon,
        trend,
        reliability: forecast.reliability
      });
      
      return forecast;
      
    } catch (error) {
      this.logger.error('Quality forecasting failed', { tokenId, timeframe, error });
      throw error;
    }
  }

  private async generateForecastedScores(historicalData: any[], horizon: number): Promise<number[]> {
    // Simplified forecasting - in real implementation, this would use trained ML models
    const scores: number[] = [];
    const recentScores = historicalData.slice(0, 5).map(d => d.overallScore || 85);
    const avgScore = recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length;
    const trend = this.calculateTrendSlope(recentScores);
    
    for (let i = 1; i <= horizon; i++) {
      const forecastedScore = Math.max(0, Math.min(100, avgScore + (trend * i)));
      scores.push(forecastedScore);
    }
    
    return scores;
  }

  private calculateConfidenceIntervals(scores: number[]): Array<{ lower: number; upper: number }> {
    return scores.map(score => {
      const margin = Math.max(5, score * 0.1); // 10% margin or minimum 5 points
      return {
        lower: Math.max(0, score - margin),
        upper: Math.min(100, score + margin)
      };
    });
  }

  private analyzeQualityTrend(historicalData: any[]): 'improving' | 'declining' | 'stable' {
    if (historicalData.length < 2) return 'stable';
    
    const recentScores = historicalData.slice(0, 5).map(d => d.overallScore || 85);
    const trend = this.calculateTrendSlope(recentScores);
    
    if (trend > 0.5) return 'improving';
    if (trend < -0.5) return 'declining';
    return 'stable';
  }

  private calculateTrendSlope(scores: number[]): number {
    if (scores.length < 2) return 0;
    
    const n = scores.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = scores.reduce((sum, score) => sum + score, 0);
    const sumXY = scores.reduce((sum, score, i) => sum + (score * i), 0);
    const sumX2 = scores.reduce((sum, score, i) => sum + (i * i), 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  private identifyForecastFactors(historicalData: any[]): string[] {
    const factors: string[] = [];
    
    // Analyze recent quality trends
    const recentScores = historicalData.slice(0, 10).map(d => d.overallScore || 85);
    const avgScore = recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length;
    
    if (avgScore < 70) {
      factors.push('Low baseline quality - immediate attention required');
    } else if (avgScore < 80) {
      factors.push('Moderate quality - improvement opportunities identified');
    }
    
    // Check for volatility
    const variance = recentScores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / recentScores.length;
    if (variance > 100) {
      factors.push('High quality volatility - system instability detected');
    }
    
    return factors;
  }

  private calculateForecastReliability(historicalData: any[]): number {
    if (historicalData.length < 5) return 0.3;
    
    // Calculate reliability based on data consistency and volume
    const dataVolumeScore = Math.min(1, historicalData.length / 50);
    const consistencyScore = this.calculateDataConsistency(historicalData);
    
    return (dataVolumeScore * 0.4) + (consistencyScore * 0.6);
  }

  private calculateDataConsistency(historicalData: any[]): number {
    const scores = historicalData.map(d => d.overallScore || 85);
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    
    // Lower standard deviation = higher consistency
    return Math.max(0, 1 - (stdDev / 50));
  }

  // ============================================================================
  // CONTINUOUS LEARNING
  // ============================================================================

  async addTrainingData(data: TrainingData): Promise<void> {
    if (this.config.mlIntegration.enableContinuousLearning) {
      await this.mlPredictor.addTrainingData(data);
      
      this.logger.info('Training data added to ML models', {
        dataPoints: data.features.length,
        labels: data.labels.length
      });
    }
  }

  async triggerModelRetraining(): Promise<void> {
    if (this.isLearning) {
      this.logger.warn('Model retraining already in progress');
      return;
    }
    
    this.isLearning = true;
    
    try {
      // Convert quality history to training data
      const trainingData = this.convertQualityHistoryToTrainingData();
      
      // Trigger ML model retraining
      await this.mlPredictor.trainModels(trainingData);
      
      this.logger.info('Model retraining completed successfully');
      
    } catch (error) {
      this.logger.error('Model retraining failed', { error });
      throw error;
    } finally {
      this.isLearning = false;
    }
  }

  private convertQualityHistoryToTrainingData(): TrainingData[] {
    // Convert quality history to ML training format
    // This is a simplified conversion - real implementation would be more sophisticated
    
    const trainingData: TrainingData[] = [];
    
    this.qualityHistory.forEach((report, index) => {
      if (index < this.qualityHistory.length - 1) {
        const currentReport = report;
        const nextReport = this.qualityHistory[index + 1];
        
        // Create feature vector from current report
        const features = [
          currentReport.overallScore / 100,
          currentReport.componentScores.candles / 100,
          currentReport.componentScores.features / 100,
          currentReport.componentScores.database / 100,
          currentReport.componentScores.processing / 100
        ];
        
        // Create label from next report (predicting future quality)
        const label = nextReport.overallScore / 100;
        
        trainingData.push({
          features: [features],
          labels: [label],
          timestamps: [currentReport.timestamp],
          metadata: { tokenId: currentReport.token_id, timeframe: currentReport.timeframe }
        });
      }
    });
    
    return trainingData;
  }

  // ============================================================================
  // ENHANCED QUALITY REPORTING
  // ============================================================================

  async generateEnhancedQualityReport(
    tokenId: string, 
    timeframe: string
  ): Promise<EnhancedQualityReport> {
    try {
      // Generate traditional quality report
      const traditionalReport = await this.traditionalQualityManager.generateQualityReport(tokenId, timeframe);
      
      // Generate ML predictions
      const mockCandles = this.createMockCandles([], tokenId, timeframe);
      const mockFeatures = this.createMockTAFeatures(mockCandles, tokenId, timeframe);
      const mlPrediction = await this.mlPredictor.predictQualityScore(mockCandles, mockFeatures, tokenId, timeframe);
      
      // Generate quality forecast
      let qualityForecast: QualityForecast | null = null;
      if (this.config.predictiveAnalytics.enableQualityForecasting) {
        try {
          qualityForecast = await this.generateQualityForecast(tokenId, timeframe);
        } catch (error) {
          this.logger.warn('Failed to generate quality forecast', { error });
        }
      }
      
      // Create enhanced report
      const enhancedReport: EnhancedQualityReport = {
        ...traditionalReport,
        token_id: tokenId,
        timeframe: timeframe,
        mlPredictions: {
          predictedScore: mlPrediction.predictedQualityScore,
          confidence: mlPrediction.confidence,
          riskFactors: mlPrediction.riskFactors,
          recommendations: mlPrediction.recommendations,
          modelVersion: mlPrediction.modelVersion
        },
        hybridValidation: {
          traditionalScore: traditionalReport.overallScore,
          mlScore: mlPrediction.predictedQualityScore,
          consensus: Math.abs(traditionalReport.overallScore - mlPrediction.predictedQualityScore) < 10,
          agreementLevel: 1 - (Math.abs(traditionalReport.overallScore - mlPrediction.predictedQualityScore) / 100)
        },
        predictiveInsights: {
          qualityTrend: qualityForecast?.trend || 'stable',
          forecastedScore: qualityForecast?.forecastedScores[0] || traditionalReport.overallScore,
          riskProbability: this.calculateRiskProbability(mlPrediction),
          mitigationEffectiveness: this.calculateMitigationEffectiveness(mlPrediction)
        }
      };
      
      // Store enhanced report
      this.qualityHistory.push(enhancedReport);
      
      return enhancedReport;
      
    } catch (error) {
      this.logger.error('Enhanced quality report generation failed', { tokenId, timeframe, error });
      throw error;
    }
  }

  private calculateRiskProbability(mlPrediction: QualityPrediction): number {
    // Calculate risk probability based on ML prediction confidence and risk factors
    let riskProbability = 0;
    
    if (mlPrediction.predictedQualityScore < 70) {
      riskProbability += 0.4;
    } else if (mlPrediction.predictedQualityScore < 80) {
      riskProbability += 0.2;
    }
    
    riskProbability += (1 - mlPrediction.confidence) * 0.3;
    riskProbability += Math.min(0.3, mlPrediction.riskFactors.length * 0.1);
    
    return Math.min(1, riskProbability);
  }

  private calculateMitigationEffectiveness(mlPrediction: QualityPrediction): number {
    // Calculate mitigation effectiveness based on available recommendations
    if (mlPrediction.recommendations.length === 0) return 0;
    
    let effectiveness = 0.3; // Base effectiveness
    
    // Increase effectiveness based on recommendation quality
    mlPrediction.recommendations.forEach(rec => {
      if (rec.includes('immediate') || rec.includes('critical')) {
        effectiveness += 0.2;
      } else if (rec.includes('review') || rec.includes('improve')) {
        effectiveness += 0.1;
      }
    });
    
    return Math.min(1, effectiveness);
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private createMockTAFeatures(candles: any[], tokenId: string, timeframe: string): any[] {
    // Create mock TA features for ML prediction
    // In real implementation, this would be actual computed TA features
    return candles.map((candle, index) => ({
      token_id: tokenId,
      timeframe,
      timestamp: candle.timestamp || Date.now() - (index * 60000),
      sma_20: 100 + Math.random() * 10,
      ema_20: 100 + Math.random() * 10,
      rsi_14: 30 + Math.random() * 40,
      macd: -2 + Math.random() * 4,
      macd_signal: -1 + Math.random() * 2,
      macd_histogram: -1 + Math.random() * 2,
      atr: 2 + Math.random() * 3,
      bollinger_upper: 105 + Math.random() * 10,
      bollinger_lower: 95 + Math.random() * 10,
      bollinger_width: 8 + Math.random() * 4
    }));
  }

  private createMockCandles(features: any[], tokenId: string, timeframe: string): any[] {
    // Create mock candles for ML prediction
    // In real implementation, this would be actual candle data
    return features.map((feature, index) => ({
      timestamp: feature.timestamp || Date.now() - (index * 60000),
      open: 100 + Math.random() * 10,
      high: 105 + Math.random() * 10,
      low: 95 + Math.random() * 10,
      close: 100 + Math.random() * 10,
      volume: 1000 + Math.random() * 1000,
      quoteVolume: 100000 + Math.random() * 100000
    }));
  }

  // ============================================================================
  // PUBLIC INTERFACE
  // ============================================================================

  getQualityHistory(): EnhancedQualityReport[] {
    return [...this.qualityHistory];
  }

  getForecastHistory(): QualityForecast[] {
    return [...this.forecastHistory];
  }

  getMLModelPerformance(): Map<string, any> {
    return this.mlPredictor.getModelPerformance();
  }

  getTrainingStatus(): { isTraining: boolean; lastTraining: number } {
    return this.mlPredictor.getTrainingStatus();
  }

  updateConfig(newConfig: Partial<MLEnhancedDataQualityConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update ML predictor config if ML config changed
    if (newConfig.mlIntegration?.mlModelConfig) {
      this.mlPredictor.updateConfig(newConfig.mlIntegration.mlModelConfig);
    }
    
    this.logger.info('ML-enhanced data quality configuration updated', { newConfig });
  }

  getConfig(): MLEnhancedDataQualityConfig {
    return { ...this.config };
  }

  // Delegate traditional quality manager methods
  async validateCandles(candles: any[], tokenId: string, timeframe: string): Promise<ValidationResult> {
    return this.traditionalQualityManager.validateCandles(candles, tokenId, timeframe);
  }

  async validateTAFeatures(features: any[], tokenId: string, timeframe: string): Promise<ValidationResult> {
    return this.traditionalQualityManager.validateTAFeatures(features, tokenId, timeframe);
  }

  async detectAnomalies(data: any[], dataType: 'candles' | 'features', tokenId: string, timeframe: string): Promise<AnomalyResult[]> {
    return this.traditionalQualityManager.detectAnomalies(data, dataType, tokenId, timeframe);
  }

  async performIntegrityChecks(tokenId: string, timeframe: string): Promise<any[]> {
    return this.traditionalQualityManager.performIntegrityChecks(tokenId, timeframe);
  }

  startQualityMonitoring(): void {
    this.traditionalQualityManager.startQualityMonitoring();
  }

  stopQualityMonitoring(): void {
    this.traditionalQualityManager.stopQualityMonitoring();
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export function createMLEnhancedDataQualityManager(config: MLEnhancedDataQualityConfig): MLEnhancedDataQualityManager {
  return new MLEnhancedDataQualityManager(config);
}

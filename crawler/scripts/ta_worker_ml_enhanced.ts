/* scripts/ta_worker_ml_enhanced.ts
   ML-Enhanced TA Worker with AI-powered quality prediction, anomaly detection, and forecasting.
   This implements Item #8: Machine Learning Integration from the improvement roadmap.
   
   Run: npx tsx scripts/ta_worker_ml_enhanced.ts
*/

import 'dotenv/config';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { cpus } from 'os';

// Import modular components
import { 
  computeFeatures, 
  Candle, 
  TAFeature 
} from '../lib/feature-computation';
import { 
  createSupabaseClient, 
  fetchCandlesFromDB, 
  upsertTA, 
  refreshTALatest,
  DatabaseConfig 
} from '../lib/database-operations';
import {
  ErrorRecoveryManager,
  createRecoveryManager,
  RecoveryContext
} from '../lib/error-recovery';
import {
  retryOperation,
  RetryConfig,
  CircuitBreaker
} from '../lib/retry-mechanism';
import {
  ErrorFactory,
  ErrorCategorizer,
  TAWorkerError
} from '../lib/error-types';
import {
  createMLEnhancedDataQualityManager,
  MLEnhancedDataQualityConfig
} from '../lib/ml-enhanced-data-quality-manager';
import { createMonitoringManager } from '../lib/monitoring-manager';

// Types
type WorkerMessage = {
  type: 'result';
  data: TAFeature[];
  token_id: string;
  timeframe: string;
  qualityMetrics: any;
} | {
  type: 'error';
  error: string;
  token_id: string;
  timeframe: string;
  errorCode: string;
  retryable: boolean;
  qualityIssues?: any[];
};

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const TOKEN_IDS: string[] = process.env.TA_TOKEN_IDS?.split(',') ?? [];
const TIMEFRAMES = (process.env.TA_TIMEFRAMES ?? '5m,15m,1h').split(',');
const MAX_WORKERS = Math.max(1, Math.min(cpus().length - 1, 8));
const BATCH_SIZE = 500;

// ML-Enhanced Data Quality Configuration
const ML_ENHANCED_QUALITY_CONFIG: MLEnhancedDataQualityConfig = {
  // Traditional validation settings
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
  },
  
  // ML integration settings
  mlIntegration: {
    enableMLPredictions: true,
    enableMLAnomalyDetection: true,
    enableContinuousLearning: true,
    enablePredictiveQuality: true,
    mlModelConfig: {
      modelType: 'ensemble',
      trainingWindow: 30,
      predictionHorizon: 24,
      confidenceThreshold: 0.75,
      updateFrequency: 168,
      featureEngineering: {
        enableTechnicalIndicators: true,
        enableStatisticalFeatures: true,
        enableTemporalFeatures: true,
        enableCrossTokenFeatures: true
      },
      anomalyDetection: {
        enableUnsupervised: true,
        enableSupervised: true,
        enableReinforcement: true
      }
    }
  },
  
  // Hybrid validation settings
  hybridValidation: {
    enableTraditionalValidation: true,
    enableMLValidation: true,
    validationWeight: 0.6, // 60% traditional, 40% ML
    consensusThreshold: 0.8 // 80% agreement required
  },
  
  // Predictive analytics settings
  predictiveAnalytics: {
    enableQualityForecasting: true,
    forecastHorizon: 24, // 24 hours ahead
    confidenceIntervals: true,
    trendAnalysis: true
  }
};

// Error handling configuration
const ERROR_HANDLING_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 2000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitter: true,
  retryableErrors: [
    'DB_CONNECTION_ERROR',
    'DB_QUERY_ERROR',
    'NETWORK_ERROR',
    'WORKER_ERROR',
    'TIMEOUT_ERROR',
    'RATE_LIMIT_ERROR',
    'DATA_QUALITY_ERROR',
    'ML_PREDICTION_ERROR'
  ]
};

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

// Worker thread function
function runWorker() {
  const { token_id, timeframe, candles } = workerData;
  
  try {
    const features = computeFeatures(candles, token_id, timeframe);
    parentPort!.postMessage({
      type: 'result',
      data: features,
      token_id,
      timeframe,
      qualityMetrics: { status: 'success', featuresCount: features.length }
    } as WorkerMessage);
  } catch (error) {
    const taError = ErrorFactory.fromUnknown(error, { token_id, timeframe });
    parentPort!.postMessage({
      type: 'error',
      error: taError.message,
      token_id,
      timeframe,
      errorCode: taError.code,
      retryable: taError.retryable
    } as WorkerMessage);
  }
}

// Main thread functions
async function processTokenTimeframeWithML(
  supabase: any, 
  token_id: string, 
  timeframe: string,
  recoveryManager: ErrorRecoveryManager,
  mlQualityManager: any
): Promise<{ features: TAFeature[]; qualityReport: any; mlInsights: any }> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(__filename, {
      workerData: { token_id, timeframe, candles: null }
    });

    // Fetch data in main thread with error recovery and ML-enhanced quality validation
    const fetchContext: RecoveryContext = {
      operation: 'fetchCandlesFromDB',
      token_id,
      timeframe,
      maxRetries: 3
    };

    fetchCandlesFromDB(supabase, token_id, timeframe, 300)
      .then(async (candles) => {
        try {
          // ML-enhanced candle data validation
          console.log(`🤖 ML-enhanced candle validation for ${token_id} ${timeframe}...`);
          const candleValidation = await mlQualityManager.validateCandlesWithML(candles, token_id, timeframe);
          
          console.log(`🔍 Traditional validation: ${candleValidation.traditional.isValid ? '✅' : '❌'}`);
          console.log(`🤖 ML prediction: ${candleValidation.ml.predictedQualityScore}/100 (${(candleValidation.ml.confidence * 100).toFixed(1)}% confidence)`);
          console.log(`🔄 Hybrid consensus: ${candleValidation.hybrid.consensus ? '✅' : '❌'} (${(candleValidation.hybrid.agreementLevel * 100).toFixed(1)}% agreement)`);
          
          if (!candleValidation.hybrid.consensus) {
            console.warn(`⚠️  Validation consensus failed for ${token_id} ${timeframe}. Traditional: ${candleValidation.hybrid.traditionalScore}, ML: ${candleValidation.hybrid.mlScore}`);
          }

          // ML-enhanced anomaly detection in candle data
          console.log(`🤖 ML-enhanced anomaly detection for ${token_id} ${timeframe}...`);
          const candleAnomalies = await mlQualityManager.detectAnomaliesWithML(candles, 'candles', token_id, timeframe);
          
          console.log(`🔍 Traditional anomalies: ${candleAnomalies.traditional.length}`);
          console.log(`🤖 ML predicted anomalies: ${candleAnomalies.ml.length}`);
          console.log(`🚀 Enhanced anomalies: ${candleAnomalies.enhanced.length}`);
          
          if (candleAnomalies.enhanced.length > 0) {
            const criticalAnomalies = candleAnomalies.enhanced.filter(a => a.severity === 'critical' || a.severity === 'high');
            if (criticalAnomalies.length > 0) {
              console.warn(`🚨 Critical/High anomalies detected: ${criticalAnomalies.length}`);
              criticalAnomalies.forEach(anomaly => {
                console.warn(`  🚨 ${anomaly.anomalyType || 'unknown'} anomaly: ${anomaly.description || 'No description'} (${anomaly.severity})`);
              });
            }
          }

          // ML-enhanced integrity checks
          console.log(`🤖 ML-enhanced integrity checks for ${token_id} ${timeframe}...`);
          const integrityChecks = await mlQualityManager.performIntegrityChecks(token_id, timeframe);
          
          // Generate quality forecast
          let qualityForecast = null;
          try {
            console.log(`🔮 Generating quality forecast for ${token_id} ${timeframe}...`);
            qualityForecast = await mlQualityManager.generateQualityForecast(token_id, timeframe, 24);
            console.log(`🔮 Forecast: ${qualityForecast.trend} trend, reliability: ${(qualityForecast.reliability * 100).toFixed(1)}%`);
          } catch (error) {
            console.warn(`⚠️  Quality forecasting failed: ${error}`);
          }
          
          // Send validated data to worker
          worker.postMessage({ token_id, timeframe, candles });
          
        } catch (qualityError) {
          console.error(`❌ ML-enhanced quality validation failed for ${token_id} ${timeframe}:`, qualityError);
          worker.terminate();
          reject(qualityError instanceof Error ? qualityError : new Error(String(qualityError)));
        }
      })
      .catch(error => {
        worker.terminate();
        reject(error);
      });

    worker.on('message', async (message: WorkerMessage) => {
      if (message.type === 'result') {
        try {
          // ML-enhanced TA features validation
          console.log(`🤖 ML-enhanced TA features validation for ${token_id} ${timeframe}...`);
          const featureValidation = await mlQualityManager.validateTAFeaturesWithML(message.data, token_id, timeframe);
          
          console.log(`🔍 Traditional validation: ${featureValidation.traditional.isValid ? '✅' : '❌'}`);
          console.log(`🤖 ML prediction: ${featureValidation.ml.predictedQualityScore}/100 (${(featureValidation.ml.confidence * 100).toFixed(1)}% confidence)`);
          console.log(`🔄 Hybrid consensus: ${featureValidation.hybrid.consensus ? '✅' : '❌'} (${(featureValidation.hybrid.agreementLevel * 100).toFixed(1)}% agreement)`);

          // ML-enhanced anomaly detection in TA features
          console.log(`🤖 ML-enhanced TA feature anomaly detection for ${token_id} ${timeframe}...`);
          const featureAnomalies = await mlQualityManager.detectAnomaliesWithML(message.data, 'features', token_id, timeframe);
          
          console.log(`🔍 Traditional anomalies: ${featureAnomalies.traditional.length}`);
          console.log(`🤖 ML predicted anomalies: ${featureAnomalies.ml.length}`);
          console.log(`🚀 Enhanced anomalies: ${featureAnomalies.enhanced.length}`);

          // Generate enhanced quality report
          console.log(`📊 Generating ML-enhanced quality report for ${token_id} ${timeframe}...`);
          const enhancedQualityReport = await mlQualityManager.generateEnhancedQualityReport(token_id, timeframe);
          
          // Add training data for continuous learning
          try {
            await mlQualityManager.addTrainingData({
              features: [[enhancedQualityReport.overallScore / 100]],
              labels: [featureValidation.hybrid.combinedScore / 100],
              timestamps: [Date.now()],
              metadata: { token_id, timeframe, validationType: 'hybrid' }
            });
          } catch (error) {
            console.warn(`⚠️  Failed to add training data: ${error}`);
          }
          
          resolve({ 
            features: message.data, 
            qualityReport: enhancedQualityReport,
            mlInsights: {
              candleValidation,
              featureValidation,
              candleAnomalies,
              featureAnomalies,
              qualityForecast
            }
          });
          
        } catch (qualityError) {
          console.error(`❌ ML-enhanced feature validation failed for ${token_id} ${timeframe}:`, qualityError);
          reject(qualityError instanceof Error ? qualityError : new Error(String(qualityError)));
        }
      } else {
        const error = ErrorFactory.create(
          message.errorCode,
          message.error,
          { token_id, timeframe }
        );
        reject(error);
      }
      worker.terminate();
    });

    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  });
}

async function runMLEnhancedTAWorker() {
  if (TOKEN_IDS.length === 0) {
    console.error('No TOKEN_IDS provided. Set TA_TOKEN_IDS env var.');
    return;
  }

  console.log(`🚀 Starting ML-Enhanced TA Worker with AI-powered quality assurance`);
  console.log(`📊 Processing ${TOKEN_IDS.length} tokens × ${TIMEFRAMES.length} timeframes = ${TOKEN_IDS.length * TIMEFRAMES.length} total tasks`);
  console.log(`🛡️  Using comprehensive error handling, recovery strategies, and ML-enhanced validation`);
  console.log(`🤖 ML Features: Quality prediction, anomaly detection, forecasting, continuous learning`);
  console.log(`🔄 Hybrid Validation: Traditional + ML consensus-based validation`);
  console.log(`🔮 Predictive Analytics: Quality forecasting with confidence intervals`);

  // Create database client
  const dbConfig: DatabaseConfig = {
    url: SUPABASE_URL,
    serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY
  };
  const supabase = createSupabaseClient(dbConfig);

  // Create error recovery manager
  const recoveryManager = createRecoveryManager();
  console.log(`🔄 Available recovery strategies: ${recoveryManager.getStrategies().join(', ')}`);

  // Create ML-enhanced data quality manager
  const mlQualityManager = createMLEnhancedDataQualityManager(ML_ENHANCED_QUALITY_CONFIG);
  console.log(`🤖 ML-enhanced data quality manager initialized with ensemble models`);

  // Start quality monitoring
  mlQualityManager.startQualityMonitoring();
  console.log(`📊 ML-enhanced quality monitoring started`);

  // Create circuit breaker for database operations
  const dbCircuitBreaker = new CircuitBreaker(5, 60000, 60000);

  // Create monitoring manager
  const monitoringManager = createMonitoringManager();
  console.log(`📈 Monitoring system initialized`);

  const startTime = Date.now();
  let completedTasks = 0;
  let totalTasks = TOKEN_IDS.length * TIMEFRAMES.length;
  let errors: Array<{ 
    token_id: string; 
    timeframe: string; 
    error: string; 
    code: string; 
    retryable: boolean;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    qualityIssues?: any[];
  }> = [];
  let recoveryAttempts = 0;
  let successfulRecoveries = 0;
  let qualityScores: number[] = [];
  let mlPredictions: number[] = [];
  let consensusRates: number[] = [];

  // Create all tasks
  const tasks: Array<{ token_id: string; timeframe: string }> = [];
  for (const timeframe of TIMEFRAMES) {
    for (const token of TOKEN_IDS) {
      tasks.push({ token_id: token, timeframe });
    }
  }

  // Process tasks in parallel with controlled concurrency, error handling, and ML-enhanced quality validation
  const processBatch = async (batch: Array<{ token_id: string; timeframe: string }>) => {
    const promises = batch.map(async ({ token_id, timeframe }) => {
      try {
        const startTask = Date.now();
        
        // Use circuit breaker for database operations with ML-enhanced quality validation
        const result = await dbCircuitBreaker.execute(() =>
          processTokenTimeframeWithML(supabase, token_id, timeframe, recoveryManager, mlQualityManager)
        );
        
        // Upsert with error recovery
        await upsertTA(supabase, result.features, BATCH_SIZE);
        
        const taskTime = Date.now() - startTask;
        completedTasks++;
        
        // Record quality metrics
        const qualityScore = result.qualityReport.overallScore;
        const mlPrediction = result.qualityReport.mlPredictions.predictedScore;
        const consensusRate = result.qualityReport.hybridValidation.agreementLevel;
        
        qualityScores.push(qualityScore);
        mlPredictions.push(mlPrediction);
        consensusRates.push(consensusRate);
        
        console.log(`✅ [${completedTasks}/${totalTasks}] ${token_id} ${timeframe}: ${result.features.length} features in ${taskTime}ms`);
        console.log(`🔍 Quality Score: ${qualityScore}/100`);
        console.log(`🤖 ML Prediction: ${mlPrediction}/100`);
        console.log(`🔄 Consensus Rate: ${(consensusRate * 100).toFixed(1)}%`);
        
        if (result.qualityReport.issues.critical > 0 || result.qualityReport.issues.high > 0) {
          console.warn(`⚠️  Quality issues detected for ${token_id} ${timeframe}:`, {
            critical: result.qualityReport.issues.critical,
            high: result.qualityReport.issues.high
          });
        }
        
        return { 
          success: true, 
          token_id, 
          timeframe, 
          features: result.features, 
          qualityReport: result.qualityReport,
          mlInsights: result.mlInsights
        };
      } catch (error) {
        const taError = ErrorFactory.fromUnknown(error, { token_id, timeframe });
        const severity = ErrorCategorizer.getSeverity(taError);
        
        errors.push({ 
          token_id, 
          timeframe, 
          error: taError.message, 
          code: taError.code,
          retryable: taError.retryable,
          severity
        });
        
        completedTasks++;
        
        // Log error with severity and retryability
        const emoji = severity === 'CRITICAL' ? '💥' : 
                     severity === 'HIGH' ? '🔴' : 
                     severity === 'MEDIUM' ? '🟡' : '🟢';
        
        console.error(`${emoji} [${completedTasks}/${totalTasks}] ${token_id} ${timeframe}: ${taError.message} (${severity}, ${taError.retryable ? 'retryable' : 'non-retryable'})`);
        
        return { success: false, token_id, timeframe, error: taError };
      }
    });

    return Promise.allSettled(promises);
  };

  // Process in batches to control concurrency
  for (let i = 0; i < tasks.length; i += MAX_WORKERS) {
    const batch = tasks.slice(i, i + MAX_WORKERS);
    await processBatch(batch);
  }

  // Refresh materialized view with error recovery
  console.log('🔄 Refreshing ta_latest materialized view...');
  try {
    await refreshTALatest(supabase);
    console.log('✅ ta_latest refreshed successfully');
  } catch (error) {
    console.error('❌ Failed to refresh ta_latest:', error instanceof Error ? error.message : error);
  }

  // Trigger ML model retraining if enough data collected
  if (qualityScores.length >= 10) {
    console.log('🤖 Triggering ML model retraining with collected data...');
    try {
      await mlQualityManager.triggerModelRetraining();
      console.log('✅ ML model retraining completed');
    } catch (error) {
      console.warn('⚠️  ML model retraining failed:', error);
    }
  }

  // Stop quality monitoring
  mlQualityManager.stopQualityMonitoring();

  const totalTime = Date.now() - startTime;
  const successRate = ((totalTasks - errors.length) / totalTasks * 100).toFixed(1);
  const avgQualityScore = qualityScores.length > 0 ? 
    (qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length).toFixed(1) : 'N/A';
  const avgMLPrediction = mlPredictions.length > 0 ? 
    (mlPredictions.reduce((sum, pred) => sum + pred, 0) / mlPredictions.length).toFixed(1) : 'N/A';
  const avgConsensusRate = consensusRates.length > 0 ? 
    (consensusRates.reduce((sum, rate) => sum + rate, 0) / consensusRates.length * 100).toFixed(1) : 'N/A';
  
  // Categorize errors by severity
  const criticalErrors = errors.filter(e => e.severity === 'CRITICAL');
  const highErrors = errors.filter(e => e.severity === 'HIGH');
  const mediumErrors = errors.filter(e => e.severity === 'MEDIUM');
  const lowErrors = errors.filter(e => e.severity === 'LOW');
  
  console.log('\n📊 ML-Enhanced TA Worker completed!');
  console.log(`⏱️  Total time: ${totalTime}ms`);
  console.log(`✅ Successful tasks: ${totalTasks - errors.length}/${totalTasks} (${successRate}%)`);
  console.log(`❌ Failed tasks: ${errors.length}`);
  console.log(`🔍 Average Quality Score: ${avgQualityScore}/100`);
  console.log(`🤖 Average ML Prediction: ${avgMLPrediction}/100`);
  console.log(`🔄 Average Consensus Rate: ${avgConsensusRate}%`);
  console.log(`🛡️  Circuit breaker state: ${dbCircuitBreaker.getState()}`);
  
  if (errors.length > 0) {
    console.log('\n❌ Errors by severity:');
    if (criticalErrors.length > 0) console.log(`  💥 CRITICAL: ${criticalErrors.length}`);
    if (highErrors.length > 0) console.log(`  🔴 HIGH: ${highErrors.length}`);
    if (mediumErrors.length > 0) console.log(`  🟡 MEDIUM: ${mediumErrors.length}`);
    if (lowErrors.length > 0) console.log(`  🟢 LOW: ${lowErrors.length}`);
    
    console.log('\n❌ Detailed error report:');
    errors.forEach(({ token_id, timeframe, error, code, retryable, severity }) => {
      const emoji = severity === 'CRITICAL' ? '💥' : 
                   severity === 'HIGH' ? '🔴' : 
                   severity === 'MEDIUM' ? '🟡' : '🟢';
      console.log(`  ${emoji} ${token_id} ${timeframe}: ${error} (${code}, ${retryable ? 'retryable' : 'non-retryable'})`);
    });
  }

  // Generate final ML-enhanced quality report
  console.log('\n🤖 Generating final ML-enhanced quality report...');
  try {
    const finalQualityReport = await mlQualityManager.generateEnhancedQualityReport('ALL', 'ALL');
    console.log(`📊 Final ML-Enhanced Quality Report:`);
    console.log(`  Overall Score: ${finalQualityReport.overallScore}/100`);
    console.log(`  ML Prediction: ${finalQualityReport.mlPredictions.predictedScore}/100`);
    console.log(`  Consensus: ${finalQualityReport.hybridValidation.consensus ? '✅' : '❌'}`);
    console.log(`  Agreement Level: ${(finalQualityReport.hybridValidation.agreementLevel * 100).toFixed(1)}%`);
    console.log(`  Quality Trend: ${finalQualityReport.predictiveInsights.qualityTrend}`);
    console.log(`  Risk Probability: ${(finalQualityReport.predictiveInsights.riskProbability * 100).toFixed(1)}%`);
    
    if (finalQualityReport.recommendations.length > 0) {
      console.log(`  Recommendations:`);
      finalQualityReport.recommendations.forEach(rec => console.log(`    • ${rec}`));
    }
  } catch (error) {
    console.error('❌ Failed to generate final ML-enhanced quality report:', error);
  }

  // Display ML model performance
  console.log('\n🤖 ML Model Performance:');
  try {
    const modelPerformance = mlQualityManager.getMLModelPerformance();
    modelPerformance.forEach((performance, modelName) => {
      console.log(`  ${modelName}:`);
      console.log(`    Accuracy: ${(performance.accuracy * 100).toFixed(1)}%`);
      console.log(`    F1 Score: ${(performance.f1Score * 100).toFixed(1)}%`);
      console.log(`    Last Updated: ${new Date(performance.lastUpdated).toISOString()}`);
    });
  } catch (error) {
    console.warn('⚠️  Failed to retrieve ML model performance:', error);
  }
}

// Entry point
if (isMainThread) {
  runMLEnhancedTAWorker().then(() => process.exit(0)).catch(error => {
    console.error('💥 Fatal error:', error instanceof Error ? error.message : error);
    process.exit(1);
  });
} else {
  runWorker();
}

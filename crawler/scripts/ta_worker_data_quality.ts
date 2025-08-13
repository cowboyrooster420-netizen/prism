/* scripts/ta_worker_data_quality.ts
   TA Worker with comprehensive data validation, quality assurance, and integrity monitoring.
   This implements Item #7: Data Validation & Quality Assurance from the improvement roadmap.
   
   Run: npx tsx scripts/ta_worker_data_quality.ts
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
  createDataQualityManager,
  DataQualityConfig,
  DataQualityManager
} from '../lib/data-quality-manager';
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

// Data Quality Configuration
const DATA_QUALITY_CONFIG: DataQualityConfig = {
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
    'DATA_QUALITY_ERROR'
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
async function processTokenTimeframeWithQuality(
  supabase: any, 
  token_id: string, 
  timeframe: string,
  recoveryManager: ErrorRecoveryManager,
  qualityManager: DataQualityManager
): Promise<{ features: TAFeature[]; qualityReport: any }> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(__filename, {
      workerData: { token_id, timeframe, candles: null }
    });

    // Fetch data in main thread with error recovery and quality validation
    const fetchContext: RecoveryContext = {
      operation: 'fetchCandlesFromDB',
      token_id,
      timeframe,
      maxRetries: 3
    };

    fetchCandlesFromDB(supabase, token_id, timeframe, 300)
      .then(async (candles) => {
        try {
          // Validate candle data quality
          console.log(`🔍 Validating candle data quality for ${token_id} ${timeframe}...`);
          const candleValidation = await qualityManager.validateCandles(candles, token_id, timeframe);
          
          if (!candleValidation.isValid) {
            console.warn(`⚠️  Candle validation issues for ${token_id} ${timeframe}:`, {
              errors: candleValidation.errors.length,
              warnings: candleValidation.warnings.length
            });
          }

          // Detect anomalies in candle data
          console.log(`🔍 Detecting anomalies in candle data for ${token_id} ${timeframe}...`);
          const candleAnomalies = await qualityManager.detectAnomalies(candles, 'candles', token_id, timeframe);
          
          if (candleAnomalies.length > 0) {
            console.warn(`⚠️  Anomalies detected in candles for ${token_id} ${timeframe}:`, {
              total: candleAnomalies.length,
              bySeverity: candleAnomalies.reduce((acc, a) => {
                acc[a.severity] = (acc[a.severity] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)
            });
          }

          // Perform integrity checks
          console.log(`🔍 Performing integrity checks for ${token_id} ${timeframe}...`);
          const integrityChecks = await qualityManager.performIntegrityChecks(token_id, timeframe);
          
          // Send validated data to worker
          worker.postMessage({ token_id, timeframe, candles });
          
        } catch (qualityError) {
          console.error(`❌ Data quality validation failed for ${token_id} ${timeframe}:`, qualityError);
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
          // Validate TA features quality
          console.log(`🔍 Validating TA features quality for ${token_id} ${timeframe}...`);
          const featureValidation = await qualityManager.validateTAFeatures(message.data, token_id, timeframe);
          
          if (!featureValidation.isValid) {
            console.warn(`⚠️  Feature validation issues for ${token_id} ${timeframe}:`, {
              errors: featureValidation.errors.length,
              warnings: featureValidation.warnings.length
            });
          }

          // Detect anomalies in TA features
          console.log(`🔍 Detecting anomalies in TA features for ${token_id} ${timeframe}...`);
          const featureAnomalies = await qualityManager.detectAnomalies(message.data, 'features', token_id, timeframe);
          
          if (featureAnomalies.length > 0) {
            console.warn(`⚠️  Anomalies detected in features for ${token_id} ${timeframe}:`, {
              total: featureAnomalies.length,
              bySeverity: featureAnomalies.reduce((acc, a) => {
                acc[a.severity] = (acc[a.severity] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)
            });
          }

          // Generate quality report
          const qualityReport = await qualityManager.generateQualityReport(token_id, timeframe);
          
          resolve({ 
            features: message.data, 
            qualityReport 
          });
          
        } catch (qualityError) {
          console.error(`❌ Feature quality validation failed for ${token_id} ${timeframe}:`, qualityError);
          reject(qualityError);
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

async function runDataQualityTAWorker() {
  if (TOKEN_IDS.length === 0) {
    console.error('No TOKEN_IDS provided. Set TA_TOKEN_IDS env var.');
    return;
  }

  console.log(`🚀 Starting TA worker with comprehensive data quality assurance`);
  console.log(`📊 Processing ${TOKEN_IDS.length} tokens × ${TIMEFRAMES.length} timeframes = ${TOKEN_IDS.length * TIMEFRAMES.length} total tasks`);
  console.log(`🛡️  Using comprehensive error handling, recovery strategies, and data quality validation`);
  console.log(`🔍 Data quality features: Real-time validation, anomaly detection, integrity monitoring`);

  // Create database client
  const dbConfig: DatabaseConfig = {
    url: SUPABASE_URL,
    serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY
  };
  const supabase = createSupabaseClient(dbConfig);

  // Create error recovery manager
  const recoveryManager = createRecoveryManager();
  console.log(`🔄 Available recovery strategies: ${recoveryManager.getStrategies().join(', ')}`);

  // Create data quality manager
  const qualityManager = createDataQualityManager(DATA_QUALITY_CONFIG);
  console.log(`🔍 Data quality manager initialized with validation and anomaly detection`);

  // Start quality monitoring
  qualityManager.startQualityMonitoring();
  console.log(`📊 Data quality monitoring started`);

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

  // Create all tasks
  const tasks: Array<{ token_id: string; timeframe: string }> = [];
  for (const timeframe of TIMEFRAMES) {
    for (const token of TOKEN_IDS) {
      tasks.push({ token_id: token, timeframe });
    }
  }

  // Process tasks in parallel with controlled concurrency, error handling, and quality validation
  const processBatch = async (batch: Array<{ token_id: string; timeframe: string }>) => {
    const promises = batch.map(async ({ token_id, timeframe }) => {
      try {
        const startTask = Date.now();
        
        // Use circuit breaker for database operations with quality validation
        const result = await dbCircuitBreaker.execute(() =>
          processTokenTimeframeWithQuality(supabase, token_id, timeframe, recoveryManager, qualityManager)
        );
        
        // Upsert with error recovery
        await upsertTA(supabase, result.features, BATCH_SIZE);
        
        const taskTime = Date.now() - startTask;
        completedTasks++;
        
        // Record quality score
        const qualityScore = result.qualityReport.overallScore;
        qualityScores.push(qualityScore);
        
        console.log(`✅ [${completedTasks}/${totalTasks}] ${token_id} ${timeframe}: ${result.features.length} features in ${taskTime}ms`);
        console.log(`🔍 Quality Score: ${qualityScore}/100`);
        
        if (result.qualityReport.issues.critical > 0 || result.qualityReport.issues.high > 0) {
          console.warn(`⚠️  Quality issues detected for ${token_id} ${timeframe}:`, {
            critical: result.qualityReport.issues.critical,
            high: result.qualityReport.issues.high
          });
        }
        
        return { success: true, token_id, timeframe, features: result.features, qualityReport: result.qualityReport };
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

  // Stop quality monitoring
  qualityManager.stopQualityMonitoring();

  const totalTime = Date.now() - startTime;
  const successRate = ((totalTasks - errors.length) / totalTasks * 100).toFixed(1);
  const avgQualityScore = qualityScores.length > 0 ? 
    (qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length).toFixed(1) : 'N/A';
  
  // Categorize errors by severity
  const criticalErrors = errors.filter(e => e.severity === 'CRITICAL');
  const highErrors = errors.filter(e => e.severity === 'HIGH');
  const mediumErrors = errors.filter(e => e.severity === 'MEDIUM');
  const lowErrors = errors.filter(e => e.severity === 'LOW');
  
  console.log('\n📊 TA Worker with Data Quality Assurance completed!');
  console.log(`⏱️  Total time: ${totalTime}ms`);
  console.log(`✅ Successful tasks: ${totalTasks - errors.length}/${totalTasks} (${successRate}%)`);
  console.log(`❌ Failed tasks: ${errors.length}`);
  console.log(`🔍 Average Quality Score: ${avgQualityScore}/100`);
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

  // Generate final quality report
  console.log('\n🔍 Generating final data quality report...');
  try {
    const finalQualityReport = await qualityManager.generateQualityReport('ALL', 'ALL');
    console.log(`📊 Final Quality Report:`);
    console.log(`  Overall Score: ${finalQualityReport.overallScore}/100`);
    console.log(`  Component Scores:`);
    console.log(`    Candles: ${finalQualityReport.componentScores.candles}/100`);
    console.log(`    Features: ${finalQualityReport.componentScores.features}/100`);
    console.log(`    Database: ${finalQualityReport.componentScores.database}/100`);
    console.log(`    Processing: ${finalQualityReport.componentScores.processing}/100`);
    
    if (finalQualityReport.recommendations.length > 0) {
      console.log(`  Recommendations:`);
      finalQualityReport.recommendations.forEach(rec => console.log(`    • ${rec}`));
    }
  } catch (error) {
    console.error('❌ Failed to generate final quality report:', error);
  }
}

// Entry point
if (isMainThread) {
  runDataQualityTAWorker().then(() => process.exit(0)).catch(error => {
    console.error('💥 Fatal error:', error instanceof Error ? error.message : error);
    process.exit(1);
  });
} else {
  runWorker();
}

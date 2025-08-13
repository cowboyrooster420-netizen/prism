/* scripts/ta_worker_configurable.ts
   Configurable TA worker with runtime configuration management.
   Run: npx tsx scripts/ta_worker_configurable.ts
*/
import 'dotenv/config';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { cpus } from 'os';

// Import modular components with configuration
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
  createConfigurationManager,
  TAWorkerConfig,
  ENVIRONMENT_PRESETS
} from '../lib/configuration';

// Types
type WorkerMessage = {
  type: 'result';
  data: TAFeature[];
  token_id: string;
  timeframe: string;
} | {
  type: 'error';
  error: string;
  token_id: string;
  timeframe: string;
  errorCode: string;
  retryable: boolean;
};

// Environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const TOKEN_IDS: string[] = process.env.TA_TOKEN_IDS?.split(',') ?? [];
const TIMEFRAMES = (process.env.TA_TIMEFRAMES ?? '5m,15m,1h').split(',');
const CONFIG_FILE = process.env.TA_CONFIG_FILE || './config/ta-worker.json';
const ENVIRONMENT = (process.env.NODE_ENV || 'development') as 'development' | 'staging' | 'production';

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
      timeframe
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
async function processTokenTimeframe(
  supabase: any, 
  token_id: string, 
  timeframe: string,
  recoveryManager: ErrorRecoveryManager,
  config: TAWorkerConfig
): Promise<TAFeature[]> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(__filename, {
      workerData: { token_id, timeframe, candles: null }
    });

    // Fetch data in main thread with error recovery
    const fetchContext: RecoveryContext = {
      operation: 'fetchCandlesFromDB',
      token_id,
      timeframe,
      maxRetries: config.errorHandling.maxRetryAttempts
    };

    fetchCandlesFromDB(supabase, token_id, timeframe, config.database.fetchBatchSize)
      .then(candles => {
        worker.postMessage({ token_id, timeframe, candles });
      })
      .catch(error => {
        worker.terminate();
        reject(error);
      });

    worker.on('message', (message: WorkerMessage) => {
      if (message.type === 'result') {
        resolve(message.data);
      } else {
        const error = ErrorFactory.create(
          message.errorCode,
          message.error,
          { token_id, timeframe },
          message.retryable
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

async function runConfigurable() {
  if (TOKEN_IDS.length === 0) {
    console.error('No TOKEN_IDS provided. Set TA_TOKEN_IDS env var.');
    return;
  }

  console.log(`🚀 Starting configurable TA computation`);
  console.log(`🌍 Environment: ${ENVIRONMENT}`);
  console.log(`📁 Config file: ${CONFIG_FILE}`);
  console.log(`📊 Processing ${TOKEN_IDS.length} tokens × ${TIMEFRAMES.length} timeframes = ${TOKEN_IDS.length * TIMEFRAMES.length} total tasks`);

  // Create configuration manager
  const configManager = createConfigurationManager(undefined, CONFIG_FILE);
  
  // Apply environment preset if no custom config
  if (!configManager.getConfig().lastUpdated) {
    console.log(`🔄 Applying ${ENVIRONMENT} environment preset...`);
    const preset = ENVIRONMENT_PRESETS[ENVIRONMENT];
    Object.entries(preset).forEach(([section, updates]) => {
      configManager.updateSection(section as any, updates);
    });
  }

  // Get current configuration
  const config = configManager.getConfig();
  
  // Validate configuration
  const validation = configManager.getSummary().validation;
  if (!validation.isValid) {
    console.error('❌ Invalid configuration:', validation.errors);
    process.exit(1);
  }
  
  if (validation.warnings.length > 0) {
    console.warn('⚠️  Configuration warnings:', validation.warnings);
  }

  console.log(`✅ Configuration loaded and validated`);
  console.log(`🛠️  Max workers: ${config.performance.maxWorkers}`);
  console.log(`📦 Batch size: ${config.performance.batchSize}`);
  console.log(`🔄 Retry attempts: ${config.errorHandling.maxRetryAttempts}`);

  // Create database client with configuration
  const dbConfig: DatabaseConfig = {
    url: SUPABASE_URL,
    serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY
  };
  const supabase = createSupabaseClient(dbConfig);

  // Create error recovery manager
  const recoveryManager = createRecoveryManager();
  console.log(`🔄 Available recovery strategies: ${recoveryManager.getStrategies().join(', ')}`);

  // Create circuit breaker with configuration
  const dbCircuitBreaker = new CircuitBreaker(
    config.errorHandling.circuitBreakerThreshold,
    config.errorHandling.circuitBreakerTimeout,
    config.errorHandling.circuitBreakerMonitoringWindow
  );

  const startTime = Date.now();
  let completedTasks = 0;
  let totalTasks = TOKEN_IDS.length * TIMEFRAMES.length;
  let errors: Array<{ 
    token_id: string; 
    timeframe: string; 
    error: string; 
    code: string; 
    retryable: boolean;
    severity: string;
  }> = [];

  // Create all tasks
  const tasks: Array<{ token_id: string; timeframe: string }> = [];
  for (const timeframe of TIMEFRAMES) {
    for (const token of TOKEN_IDS) {
      tasks.push({ token_id: token, timeframe });
    }
  }

  // Process tasks in parallel with controlled concurrency and error handling
  const processBatch = async (batch: Array<{ token_id: string; timeframe: string }>) => {
    const promises = batch.map(async ({ token_id, timeframe }) => {
      try {
        const startTask = Date.now();
        
        // Use circuit breaker for database operations
        const features = await dbCircuitBreaker.execute(() =>
          processTokenTimeframe(supabase, token_id, timeframe, recoveryManager, config)
        );
        
        // Upsert with error recovery
        await upsertTA(supabase, features, config.database.upsertBatchSize);
        
        const taskTime = Date.now() - startTask;
        completedTasks++;
        
        console.log(`✅ [${completedTasks}/${totalTasks}] ${token_id} ${timeframe}: ${features.length} features in ${taskTime}ms`);
        
        return { success: true, token_id, timeframe, features };
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
  for (let i = 0; i < tasks.length; i += config.performance.maxWorkers) {
    const batch = tasks.slice(i, i + config.performance.maxWorkers);
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

  const totalTime = Date.now() - startTime;
  const successRate = ((totalTasks - errors.length) / totalTasks * 100).toFixed(1);
  
  // Categorize errors by severity
  const criticalErrors = errors.filter(e => e.severity === 'CRITICAL');
  const highErrors = errors.filter(e => e.severity === 'HIGH');
  const mediumErrors = errors.filter(e => e.severity === 'MEDIUM');
  const lowErrors = errors.filter(e => e.severity === 'LOW');
  
  console.log('\n📊 Configurable TA computation completed!');
  console.log(`⏱️  Total time: ${totalTime}ms`);
  console.log(`✅ Successful tasks: ${totalTasks - errors.length}/${totalTasks} (${successRate}%)`);
  console.log(`❌ Failed tasks: ${errors.length}`);
  console.log(`🛡️  Circuit breaker state: ${dbCircuitBreaker.getState()}`);
  console.log(`⚙️  Configuration: ${config.performance.maxWorkers} workers, ${config.performance.batchSize} batch size`);
  
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

  // Cleanup
  configManager.destroy();
}

// Entry point
if (isMainThread) {
  runConfigurable().then(() => process.exit(0)).catch(error => {
    console.error('💥 Fatal error:', error instanceof Error ? error.message : error);
    process.exit(1);
  });
} else {
  runWorker();
}

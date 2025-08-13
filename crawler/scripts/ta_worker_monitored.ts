/* scripts/ta_worker_monitored.ts
   TA Worker with comprehensive monitoring and observability
*/

import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { createConfigurationManager } from '../lib/configuration';
import { createMonitoringManager } from '../lib/monitoring';
import { createRecoveryManager } from '../lib/error-recovery';
import { CircuitBreaker } from '../lib/retry-mechanism';
import { computeFeatures } from '../lib/feature-computation';
import { 
  createSupabaseClient, 
  fetchCandlesFromDB, 
  upsertTA, 
  refreshTALatest 
} from '../lib/database-operations';

// ============================================================================
// WORKER THREAD LOGIC
// ============================================================================

if (!isMainThread && parentPort) {
  const { candles, tokenId, timeframe, taskId } = workerData;
  
  try {
    // Compute TA features
    const features = computeFeatures(candles, tokenId, timeframe);
    
    // Send success result back to main thread
    parentPort!.postMessage({
      type: 'success',
      taskId,
      features,
      tokenId,
      timeframe
    });
  } catch (error) {
    // Send error result back to main thread
    parentPort!.postMessage({
      type: 'error',
      taskId,
      error: error instanceof Error ? error.message : String(error),
      tokenId,
      timeframe
    });
  }
}

// ============================================================================
// MAIN THREAD LOGIC
// ============================================================================

async function runMonitored(): Promise<void> {
  console.log('🚀 Starting TA Worker with Comprehensive Monitoring...\n');

  // Initialize monitoring system
  const monitoringManager = createMonitoringManager({
    logLevel: 'info',
    healthCheckInterval: 30000, // 30 seconds
    systemMetricsInterval: 5000  // 5 seconds
  });

  const { metrics, logger, profiler, alerts } = monitoringManager;

  // Initialize configuration
  const configManager = createConfigurationManager();
  const config = configManager.getConfig();

  // Initialize error recovery
  const recoveryManager = createRecoveryManager();

  // Initialize circuit breaker for database operations
  const dbCircuitBreaker = new CircuitBreaker(
    config.errorHandling.circuitBreakerThreshold,
    config.errorHandling.circuitBreakerTimeout,
    config.errorHandling.circuitBreakerMonitoringWindow
  );

  // Log startup
  logger.info('TA Worker started with monitoring', {
    config: {
      maxWorkers: config.performance.maxWorkers,
      batchSize: config.performance.batchSize,
      maxRetryAttempts: config.errorHandling.maxRetryAttempts
    }
  });

  try {
    // Record startup metrics
    metrics.incrementCounter('ta_worker_tasks_total');
    metrics.setGauge('worker_threads_active', 0);
    metrics.setGauge('worker_threads_total', 0);

    // Create Supabase client
    const supabase = createSupabaseClient();

    // Get token IDs and timeframes from configuration
    const tokenIds = config.technicalAnalysis.tokenIds;
    const timeframes = config.technicalAnalysis.timeframes;

    logger.info('Processing configuration', { tokenIds, timeframes });

    // Create tasks
    const tasks: Array<{ tokenId: string; timeframe: string; taskId: string }> = [];
    
    for (const tokenId of tokenIds) {
      for (const timeframe of timeframes) {
        tasks.push({
          tokenId,
          timeframe,
          taskId: `${tokenId}_${timeframe}_${Date.now()}`
        });
      }
    }

    logger.info(`Created ${tasks.length} tasks for processing`);

    // Process tasks in batches
    const batchSize = config.performance.batchSize;
    const maxWorkers = config.performance.maxWorkers;
    
    let successfulTasks = 0;
    let failedTasks = 0;
    const startTime = Date.now();

    for (let i = 0; i < tasks.length; i += batchSize) {
      const batch = tasks.slice(i, i + batchSize);
      
      logger.info(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(tasks.length / batchSize)}`, {
        batchSize: batch.length,
        totalTasks: tasks.length
      });

      // Process batch with controlled concurrency
      const batchPromises = batch.map(async (task) => {
        return profiler.profileOperation(
          `process_token_timeframe_${task.tokenId}_${task.timeframe}`,
          async () => {
            try {
              // Update worker thread metrics
              metrics.incrementCounter('worker_threads_total');
              
              // Fetch candles from database
              const candles = await dbCircuitBreaker.execute(async () => {
                return fetchCandlesFromDB(supabase, task.tokenId, task.timeframe);
              });

              if (!candles || candles.length === 0) {
                throw new Error(`No candles found for ${task.tokenId} ${task.timeframe}`);
              }

              // Record data metrics
              metrics.setGauge('database_queries_total', candles.length);
              
              // Create worker thread
              const worker = new Worker(__filename, {
                workerData: {
                  candles,
                  tokenId: task.tokenId,
                  timeframe: task.timeframe,
                  taskId: task.taskId
                }
              });

              // Handle worker messages
              const result = await new Promise<any>((resolve, reject) => {
                worker.on('message', (message) => {
                  if (message.type === 'success') {
                    resolve(message);
                  } else if (message.type === 'error') {
                    reject(new Error(message.error));
                  }
                });

                worker.on('error', reject);
                worker.on('exit', (code) => {
                  if (code !== 0) {
                    reject(new Error(`Worker stopped with exit code ${code}`));
                  }
                });

                // Set timeout for worker
                setTimeout(() => {
                  reject(new Error('Worker timeout'));
                }, config.errorHandling.workerTimeout);
              });

              // Upsert TA features
              await dbCircuitBreaker.execute(async () => {
                return upsertTA(supabase, result.features);
              });

              // Record success metrics
              metrics.incrementCounter('ta_worker_tasks_successful');
              successfulTasks++;

              logger.info(`Task completed successfully`, {
                taskId: task.taskId,
                tokenId: task.tokenId,
                timeframe: task.timeframe,
                featuresCount: result.features.length
              });

              return result;
            } catch (error) {
              // Record error metrics
              metrics.incrementCounter('ta_worker_tasks_failed');
              metrics.incrementCounter('errors_total');
              failedTasks++;

              logger.error(`Task failed`, {
                taskId: task.taskId,
                tokenId: task.tokenId,
                timeframe: task.timeframe,
                error: error instanceof Error ? error.message : String(error)
              });

              // Create alert for failed task
              alerts.createAlert(
                'warning',
                `TA Task Failed: ${task.tokenId} ${task.timeframe}`,
                `Task ${task.taskId} failed: ${error instanceof Error ? error.message : String(error)}`,
                {
                  taskId: task.taskId,
                  tokenId: task.tokenId,
                  timeframe: task.timeframe,
                  error: error instanceof Error ? error.message : String(error)
                }
              );

              throw error;
            } finally {
              // Update worker thread metrics
              metrics.setGauge('worker_threads_active', 
                Math.max(0, metrics.getMetric('worker_threads_total')?.values[0]?.value || 0) - 1);
            }
          },
          {
            tokenId: task.tokenId,
            timeframe: task.timeframe,
            taskId: task.taskId
          }
        );
      });

      // Wait for batch to complete
      await Promise.allSettled(batchPromises);

      // Record batch metrics
      metrics.recordHistogram('batch_processing_time', Date.now() - startTime);
    }

    // Refresh TA latest view
    logger.info('Refreshing TA latest view...');
    await dbCircuitBreaker.execute(async () => {
      return refreshTALatest(supabase);
    });

    // Calculate final metrics
    const totalTime = Date.now() - startTime;
    const successRate = (successfulTasks / (successfulTasks + failedTasks)) * 100;

    // Record final metrics
    metrics.recordHistogram('ta_worker_processing_time', totalTime);
    metrics.setGauge('ta_worker_memory_usage', 
      (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100);

    // Log completion summary
    logger.info('TA Worker completed successfully', {
      totalTasks: tasks.length,
      successfulTasks,
      failedTasks,
      successRate: `${successRate.toFixed(2)}%`,
      totalTime: `${(totalTime / 1000).toFixed(2)}s`
    });

    // Create summary alert if there were failures
    if (failedTasks > 0) {
      alerts.createAlert(
        'warning',
        'TA Worker Completed with Failures',
        `Completed ${successfulTasks}/${tasks.length} tasks successfully. ${failedTasks} tasks failed.`,
        {
          totalTasks: tasks.length,
          successfulTasks,
          failedTasks,
          successRate,
          totalTime
        }
      );
    } else {
      alerts.createAlert(
        'info',
        'TA Worker Completed Successfully',
        `All ${tasks.length} tasks completed successfully in ${(totalTime / 1000).toFixed(2)}s`,
        {
          totalTasks: tasks.length,
          successfulTasks,
          failedTasks,
          successRate,
          totalTime
        }
      );
    }

    console.log('\n✅ TA Worker completed successfully!');
    console.log(`📊 Summary: ${successfulTasks}/${tasks.length} tasks completed (${successRate.toFixed(2)}% success rate)`);
    console.log(`⏱️  Total time: ${(totalTime / 1000).toFixed(2)}s`);
    console.log(`🚨 Failed tasks: ${failedTasks}`);

  } catch (error) {
    // Record critical error
    metrics.incrementCounter('errors_total');
    
    logger.error('TA Worker failed critically', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    // Create critical alert
    alerts.createAlert(
      'critical',
      'TA Worker Critical Failure',
      `TA Worker failed: ${error instanceof Error ? error.message : String(error)}`,
      {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    );

    console.error('\n❌ TA Worker failed critically:', error);
    process.exit(1);
  } finally {
    // Shutdown monitoring gracefully
    await monitoringManager.shutdown();
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

if (isMainThread) {
  runMonitored().catch((error) => {
    console.error('Failed to run monitored TA worker:', error);
    process.exit(1);
  });
}

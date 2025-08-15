/* scripts/ta_worker_modular.ts
   Modular TA worker using separated concerns and improved architecture.
   Run: npx tsx scripts/ta_worker_modular.ts
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
};

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const TOKEN_IDS: string[] = process.env.TA_TOKEN_IDS?.split(',') ?? [];
const TIMEFRAMES = (process.env.TA_TIMEFRAMES ?? '5m,15m,1h').split(',');
const MAX_WORKERS = Math.max(1, Math.min(cpus().length - 1, 8));
const BATCH_SIZE = 500;

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
    parentPort!.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : String(error),
      token_id,
      timeframe
    } as WorkerMessage);
  }
}

// Main thread functions
async function processTokenTimeframe(
  supabase: any, 
  token_id: string, 
  timeframe: string
): Promise<TAFeature[]> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(__filename, {
      workerData: { token_id, timeframe, candles: null }
    });

    // Fetch data in main thread, then send to worker
    fetchCandlesFromDB(supabase, token_id, timeframe, 300)
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
        reject(new Error(message.error));
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

async function runModular() {
  if (TOKEN_IDS.length === 0) {
    console.error('No TOKEN_IDS provided. Set TA_TOKEN_IDS env var.');
    return;
  }

  console.log(`🚀 Starting modular TA computation with ${MAX_WORKERS} workers`);
  console.log(`📊 Processing ${TOKEN_IDS.length} tokens × ${TIMEFRAMES.length} timeframes = ${TOKEN_IDS.length * TIMEFRAMES.length} total tasks`);
  console.log(`🏗️  Using modular architecture with separated concerns`);

  // Create database client
  const dbConfig: DatabaseConfig = {
    url: SUPABASE_URL,
    serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY
  };
  const supabase = createSupabaseClient(dbConfig);

  const startTime = Date.now();
  let completedTasks = 0;
  let totalTasks = TOKEN_IDS.length * TIMEFRAMES.length;
  let errors: Array<{ token_id: string; timeframe: string; error: string }> = [];

  // Create all tasks
  const tasks: Array<{ token_id: string; timeframe: string }> = [];
  for (const timeframe of TIMEFRAMES) {
    for (const token of TOKEN_IDS) {
      tasks.push({ token_id: token, timeframe });
    }
  }

  // Process tasks in parallel with controlled concurrency
  const processBatch = async (batch: Array<{ token_id: string; timeframe: string }>) => {
    const promises = batch.map(async ({ token_id, timeframe }) => {
      try {
        const startTask = Date.now();
        const features = await processTokenTimeframe(supabase, token_id, timeframe);
        await upsertTA(supabase, features, BATCH_SIZE);
        
        const taskTime = Date.now() - startTask;
        completedTasks++;
        
        console.log(`✅ [${completedTasks}/${totalTasks}] ${token_id} ${timeframe}: ${features.length} features in ${taskTime}ms`);
        
        return { success: true, token_id, timeframe, features };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push({ token_id, timeframe, error: errorMsg });
        completedTasks++;
        console.error(`❌ [${completedTasks}/${totalTasks}] ${token_id} ${timeframe}: ${errorMsg}`);
        return { success: false, token_id, timeframe, error: errorMsg };
      }
    });

    return Promise.allSettled(promises);
  };

  // Process in batches to control concurrency
  for (let i = 0; i < tasks.length; i += MAX_WORKERS) {
    const batch = tasks.slice(i, i + MAX_WORKERS);
    await processBatch(batch);
  }

  // Refresh materialized view
  console.log('🔄 Refreshing ta_latest materialized view...');
  await refreshTALatest(supabase);

  const totalTime = Date.now() - startTime;
  const successRate = ((totalTasks - errors.length) / totalTasks * 100).toFixed(1);
  
  console.log('\n📊 Modular TA computation completed!');
  console.log(`⏱️  Total time: ${totalTime}ms`);
  console.log(`✅ Successful tasks: ${totalTasks - errors.length}/${totalTasks} (${successRate}%)`);
  console.log(`❌ Failed tasks: ${errors.length}`);
  console.log(`🏗️  Architecture: Modular with separated concerns`);
  
  if (errors.length > 0) {
    console.log('\n❌ Errors encountered:');
    errors.forEach(({ token_id, timeframe, error }) => {
      console.log(`  - ${token_id} ${timeframe}: ${error}`);
    });
  }
}

// Entry point
if (isMainThread) {
  runModular().then(() => process.exit(0)).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
} else {
  runWorker();
}


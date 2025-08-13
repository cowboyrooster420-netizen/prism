/* scripts/benchmark-ta.ts
   Benchmark script to compare sequential vs parallel TA computation performance.
   Run: npx tsx scripts/benchmark-ta.ts
*/
import 'dotenv/config';
import { execSync } from 'child_process';
import { cpus } from 'os';

console.log('🚀 TA Worker Performance Benchmark');
console.log('==================================');
console.log(`💻 CPU Cores: ${cpus().length}`);
console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
console.log('');

// Check if we have the required environment variables
const requiredEnvVars = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'TA_TOKEN_IDS'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  console.error('\nPlease set these variables and try again.');
  process.exit(1);
}

console.log('✅ Environment variables configured');
console.log(`📊 Token IDs: ${process.env.TA_TOKEN_IDS?.split(',').length || 0} tokens`);
console.log(`⏱️  Timeframes: ${process.env.TA_TIMEFRAMES || '5m,15m,1h'}`);
console.log('');

// Function to run a command and measure execution time
function runCommand(command: string, description: string): { time: number; success: boolean } {
  console.log(`🔄 Running: ${description}`);
  console.log(`   Command: ${command}`);
  
  const startTime = Date.now();
  let success = false;
  
  try {
    execSync(command, { 
      stdio: 'pipe',
      cwd: process.cwd(),
      timeout: 300000 // 5 minute timeout
    });
    success = true;
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    success = false;
  }
  
  const endTime = Date.now();
  const executionTime = endTime - startTime;
  
  console.log(`   ⏱️  Execution time: ${executionTime}ms`);
  console.log(`   ${success ? '✅' : '❌'} Status: ${success ? 'Success' : 'Failed'}`);
  console.log('');
  
  return { time: executionTime, success };
}

// Run benchmarks
console.log('🏁 Starting benchmarks...\n');

// Benchmark 1: Sequential TA Worker
const sequentialResult = runCommand(
  'npm run ta',
  'Sequential TA Worker (Original)'
);

// Wait a bit between runs
console.log('⏳ Waiting 2 seconds between benchmarks...\n');
await new Promise(resolve => setTimeout(resolve, 2000));

// Benchmark 2: Parallel TA Worker
const parallelResult = runCommand(
  'npm run ta-parallel',
  'Parallel TA Worker (New)'
);

// Calculate performance improvement
if (sequentialResult.success && parallelResult.success) {
  const improvement = ((sequentialResult.time - parallelResult.time) / sequentialResult.time * 100).toFixed(1);
  const speedup = (sequentialResult.time / parallelResult.time).toFixed(2);
  
  console.log('📊 Benchmark Results');
  console.log('===================');
  console.log(`Sequential: ${sequentialResult.time}ms`);
  console.log(`Parallel:   ${parallelResult.time}ms`);
  console.log(`Improvement: ${improvement}% faster`);
  console.log(`Speedup: ${speedup}x`);
  
  if (parseFloat(improvement) > 0) {
    console.log(`\n🎉 Parallel version is ${improvement}% faster!`);
  } else {
    console.log(`\n⚠️  Parallel version is ${Math.abs(parseFloat(improvement))}% slower. This might indicate overhead or configuration issues.`);
  }
} else {
  console.log('❌ Benchmark failed - cannot calculate performance improvement');
  console.log(`Sequential: ${sequentialResult.success ? 'Success' : 'Failed'}`);
  console.log(`Parallel: ${parallelResult.success ? 'Success' : 'Failed'}`);
}

console.log('\n🏁 Benchmark completed!');

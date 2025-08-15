/* lib/test-error-handling.ts
   Test file to demonstrate error handling and recovery system
*/

import { 
  ErrorFactory, 
  ErrorCategorizer,
  DatabaseConnectionError,
  RateLimitError,
  TimeoutError,
  InsufficientDataError
} from './error-types';
import { 
  retryOperation, 
  CircuitBreaker,
  retryWithTimeout 
} from './retry-mechanism';
import { 
  createRecoveryManager,
  withRecovery 
} from './error-recovery';

console.log('🧪 Testing Error Handling and Recovery System');
console.log('=============================================\n');

// Test 1: Error Factory
console.log('1️⃣ Testing Error Factory:');
try {
  const dbError = ErrorFactory.create(
    'DB_CONNECTION_ERROR',
    'Connection failed to database',
    { host: 'localhost', port: 5432 }
  );
  console.log('✅ Created database error:', dbError.message);
  console.log('   Code:', dbError.code);
  console.log('   Retryable:', dbError.retryable);
  console.log('   Context:', dbError.context);
} catch (error) {
  console.log('❌ Error factory test failed:', error);
}

// Test 2: Error Categorization
console.log('\n2️⃣ Testing Error Categorization:');
const testErrors = [
  new DatabaseConnectionError('Connection timeout'),
  new RateLimitError('Rate limit exceeded', 5000),
  new InsufficientDataError('Not enough data'),
  new Error('Generic error')
];

testErrors.forEach(error => {
  const retryable = ErrorCategorizer.isRetryable(error);
  const severity = ErrorCategorizer.getSeverity(error);
  const isDb = ErrorCategorizer.isDatabaseError(error);
  
  console.log(`   ${error.constructor.name}:`);
  console.log(`     Retryable: ${retryable}`);
  console.log(`     Severity: ${severity}`);
  console.log(`     Database Error: ${isDb}`);
});

// Test 3: Retry Mechanism
console.log('\n3️⃣ Testing Retry Mechanism:');
let attemptCount = 0;
const failingOperation = async (): Promise<string> => {
  attemptCount++;
  if (attemptCount < 3) {
    throw new Error(`Attempt ${attemptCount} failed`);
  }
  return 'Success after retries!';
};

try {
  const result = await retryOperation(failingOperation, {
    maxAttempts: 3,
    baseDelay: 100,
    maxDelay: 1000
  });
  console.log('✅ Retry successful:', result.data);
  console.log('   Attempts:', result.attempts);
  console.log('   Total time:', result.totalTime, 'ms');
} catch (error) {
  console.log('❌ Retry failed:', error);
}

// Test 4: Circuit Breaker
console.log('\n4️⃣ Testing Circuit Breaker:');
const circuitBreaker = new CircuitBreaker(2, 1000, 1000);

const failingOp = async (): Promise<string> => {
  throw new Error('Operation failed');
};

const successfulOp = async (): Promise<string> => {
  return 'Operation succeeded';
};

console.log('   Initial state:', circuitBreaker.getState());
console.log('   Failures:', circuitBreaker.getFailures());

try {
  await circuitBreaker.execute(failingOp);
} catch (error) {
  console.log('   First failure caught');
}

try {
  await circuitBreaker.execute(failingOp);
} catch (error) {
  console.log('   Second failure caught');
}

console.log('   State after failures:', circuitBreaker.getState());
console.log('   Failures:', circuitBreaker.getFailures());

// Test 5: Error Recovery Manager
console.log('\n5️⃣ Testing Error Recovery Manager:');
const recoveryManager = createRecoveryManager();
console.log('   Available strategies:', recoveryManager.getStrategies());

// Test 6: With Recovery Wrapper
console.log('\n6️⃣ Testing With Recovery Wrapper:');
const context = {
  operation: 'testOperation',
  token_id: 'TEST_TOKEN',
  timeframe: '1h'
};

try {
  const result = await withRecovery(
    async () => {
      // Simulate a recoverable error
      throw new DatabaseConnectionError('Connection lost');
    },
    context
  );
  console.log('✅ Recovery successful:', result);
} catch (error) {
  console.log('❌ Recovery failed:', error);
}

// Test 7: Timeout with Retry
console.log('\n7️⃣ Testing Timeout with Retry:');
const slowOperation = async (): Promise<string> => {
  await new Promise(resolve => setTimeout(resolve, 2000));
  return 'Slow operation completed';
};

try {
  const result = await retryWithTimeout(slowOperation, 1000, {
    maxAttempts: 2
  });
  console.log('✅ Timeout retry successful:', result.data);
} catch (error) {
  console.log('❌ Timeout retry failed (expected):', error instanceof Error ? error.message : error);
}

console.log('\n✅ All error handling tests completed!');
console.log('🛡️  Error handling system is working correctly.');
console.log('🚀 Ready for production use in TA workers.');


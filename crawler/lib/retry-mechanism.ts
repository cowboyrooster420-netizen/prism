/* lib/retry-mechanism.ts
   Retry mechanisms with exponential backoff for TA worker resilience
*/

import { TAWorkerError, ErrorCategorizer, RateLimitError, TimeoutError } from './error-types';

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
  retryableErrors: string[];
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalTime: number;
}

export interface RetryContext {
  operation: string;
  token_id?: string;
  timeframe?: string;
  attempt: number;
  maxAttempts: number;
  lastError?: Error;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
  jitter: true,
  retryableErrors: [
    'DB_CONNECTION_ERROR',
    'DB_QUERY_ERROR',
    'NETWORK_ERROR',
    'WORKER_ERROR',
    'TIMEOUT_ERROR',
    'RATE_LIMIT_ERROR'
  ]
};

/**
 * Calculate delay for retry with exponential backoff
 */
export function calculateRetryDelay(
  attempt: number,
  config: RetryConfig
): number {
  const delay = Math.min(
    config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
    config.maxDelay
  );

  if (config.jitter) {
    // Add random jitter to prevent thundering herd
    const jitter = delay * 0.1; // 10% jitter
    return delay + (Math.random() - 0.5) * jitter;
  }

  return delay;
}

/**
 * Check if operation should be retried
 */
export function shouldRetry(
  error: Error,
  attempt: number,
  config: RetryConfig
): boolean {
  if (attempt >= config.maxAttempts) {
    return false;
  }

  if (error instanceof TAWorkerError) {
    return error.retryable && config.retryableErrors.includes(error.code);
  }

  return ErrorCategorizer.isRetryable(error);
}

/**
 * Wait for specified delay
 */
export function wait(delayMs: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, delayMs));
}

/**
 * Retry operation with exponential backoff
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  context: Partial<RetryContext> = {}
): Promise<RetryResult<T>> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  const finalContext: RetryContext = {
    operation: 'unknown',
    attempt: 1,
    maxAttempts: finalConfig.maxAttempts,
    ...context
  };

  const startTime = Date.now();
  let lastError: Error;

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    finalContext.attempt = attempt;
    
    try {
      const result = await operation();
      
      return {
        success: true,
        data: result,
        attempts: attempt,
        totalTime: Date.now() - startTime
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      finalContext.lastError = lastError;

      // Check if we should retry
      if (!shouldRetry(lastError, attempt, finalConfig)) {
        break;
      }

      // Calculate delay for next attempt
      const delay = calculateRetryDelay(attempt, finalConfig);
      
      // Handle rate limiting
      if (lastError instanceof RateLimitError && lastError.retryAfter > 0) {
        console.log(`Rate limited, waiting ${lastError.retryAfter}ms before retry...`);
        await wait(lastError.retryAfter);
      } else {
        console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await wait(delay);
      }
    }
  }

  return {
    success: false,
    error: lastError!,
    attempts: finalContext.attempt,
    totalTime: Date.now() - startTime
  };
}

/**
 * Retry operation with custom retry logic
 */
export async function retryWithCustomLogic<T>(
  operation: () => Promise<T>,
  retryLogic: (error: Error, attempt: number, context: RetryContext) => Promise<boolean>,
  config: Partial<RetryConfig> = {},
  context: Partial<RetryContext> = {}
): Promise<RetryResult<T>> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  const finalContext: RetryContext = {
    operation: 'unknown',
    attempt: 1,
    maxAttempts: finalConfig.maxAttempts,
    ...context
  };

  const startTime = Date.now();
  let lastError: Error;

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    finalContext.attempt = attempt;
    
    try {
      const result = await operation();
      
      return {
        success: true,
        data: result,
        attempts: attempt,
        totalTime: Date.now() - startTime
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      finalContext.lastError = lastError;

      // Use custom retry logic
      const shouldRetry = await retryLogic(lastError, attempt, finalContext);
      
      if (!shouldRetry) {
        break;
      }

      // Calculate delay for next attempt
      const delay = calculateRetryDelay(attempt, finalConfig);
      console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
      await wait(delay);
    }
  }

  return {
    success: false,
    error: lastError!,
    attempts: finalContext.attempt,
    totalTime: Date.now() - startTime
  };
}

/**
 * Retry operation with circuit breaker pattern
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private failureThreshold: number = 5,
    private recoveryTimeout: number = 60000, // 1 minute
    private monitoringWindow: number = 60000 // 1 minute
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  getState(): string {
    return this.state;
  }

  getFailures(): number {
    return this.failures;
  }
}

/**
 * Retry operation with timeout
 */
export async function retryWithTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  config: Partial<RetryConfig> = {}
): Promise<RetryResult<T>> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new TimeoutError('Operation timed out', timeoutMs)), timeoutMs);
  });

  const operationPromise = retryOperation(operation, config);
  
  try {
    const result = await Promise.race([operationPromise, timeoutPromise]);
    return result;
  } catch (error) {
    if (error instanceof TimeoutError) {
      return {
        success: false,
        error,
        attempts: 0,
        totalTime: timeoutMs
      };
    }
    throw error;
  }
}

/**
 * Batch retry operations with concurrency control
 */
export async function retryBatch<T>(
  operations: Array<() => Promise<T>>,
  concurrency: number = 3,
  config: Partial<RetryConfig> = {}
): Promise<Array<RetryResult<T>>> {
  const results: Array<RetryResult<T>> = [];
  const executing: Array<Promise<void>> = [];

  for (let i = 0; i < operations.length; i++) {
    const operation = operations[i];
    
    if (executing.length >= concurrency) {
      await Promise.race(executing);
    }

    const promise = retryOperation(operation, config, { operation: `batch_${i}` })
      .then(result => {
        results[i] = result;
        const index = executing.indexOf(promise);
        if (index > -1) {
          executing.splice(index, 1);
        }
      });

    executing.push(promise);
  }

  await Promise.all(executing);
  return results;
}

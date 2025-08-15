/* lib/error-recovery.ts
   Error recovery strategies for TA worker resilience
*/

import { 
  TAWorkerError, 
  DatabaseConnectionError, 
  DatabaseQueryError,
  InsufficientDataError,
  RateLimitError,
  TimeoutError,
  ErrorCategorizer,
  ErrorFactory
} from './error-types';
import { retryOperation, RetryConfig, RetryContext } from './retry-mechanism';

export interface RecoveryStrategy {
  canHandle(error: Error): boolean;
  recover<T>(operation: () => Promise<T>, context: RecoveryContext): Promise<T>;
}

export interface RecoveryContext {
  operation: string;
  token_id?: string;
  timeframe?: string;
  maxRetries?: number;
  customConfig?: Partial<RetryConfig>;
}

export interface RecoveryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  strategy: string;
  attempts: number;
  recoveryTime: number;
}

/**
 * Database connection recovery strategy
 */
export class DatabaseConnectionRecovery implements RecoveryStrategy {
  canHandle(error: Error): boolean {
    return error instanceof DatabaseConnectionError;
  }

  async recover<T>(operation: () => Promise<T>, context: RecoveryContext): Promise<T> {
    const config: Partial<RetryConfig> = {
      maxAttempts: context.maxRetries || 5,
      baseDelay: 2000, // 2 seconds
      maxDelay: 60000, // 1 minute
      backoffMultiplier: 2,
      jitter: true
    };

    const retryContext: RetryContext = {
      operation: context.operation,
      token_id: context.token_id,
      timeframe: context.timeframe,
      attempt: 1,
      maxAttempts: config.maxAttempts || 5
    };

    const result = await retryOperation(operation, config, retryContext);
    
    if (!result.success) {
      throw new DatabaseConnectionError(
        `Failed to recover from database connection error after ${result.attempts} attempts`,
        { ...context, totalTime: result.totalTime },
        result.error
      );
    }

    return result.data!;
  }
}

/**
 * Database query recovery strategy
 */
export class DatabaseQueryRecovery implements RecoveryStrategy {
  canHandle(error: Error): boolean {
    return error instanceof DatabaseQueryError;
  }

  async recover<T>(operation: () => Promise<T>, context: RecoveryContext): Promise<T> {
    const config: Partial<RetryConfig> = {
      maxAttempts: context.maxRetries || 3,
      baseDelay: 1000, // 1 second
      maxDelay: 30000, // 30 seconds
      backoffMultiplier: 1.5,
      jitter: true
    };

    const retryContext: RetryContext = {
      operation: context.operation,
      token_id: context.token_id,
      timeframe: context.timeframe,
      attempt: 1,
      maxAttempts: config.maxAttempts || 3
    };

    const result = await retryOperation(operation, config, retryContext);
    
    if (!result.success) {
      throw new DatabaseQueryError(
        `Failed to recover from database query error after ${result.attempts} attempts`,
        { ...context, totalTime: result.totalTime },
        result.error
      );
    }

    return result.data!;
  }
}

/**
 * Rate limiting recovery strategy
 */
export class RateLimitRecovery implements RecoveryStrategy {
  canHandle(error: Error): boolean {
    return error instanceof RateLimitError;
  }

  async recover<T>(operation: () => Promise<T>, context: RecoveryContext): Promise<T> {
    const rateLimitError = context.error as RateLimitError;
    
    if (rateLimitError.retryAfter > 0) {
      console.log(`Rate limited, waiting ${rateLimitError.retryAfter}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, rateLimitError.retryAfter));
    } else {
      // Wait with exponential backoff
      const delay = Math.min(1000 * Math.pow(2, 0), 30000); // Start with 1s, max 30s
      console.log(`Rate limited, waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    try {
      return await operation();
    } catch (error) {
      if (error instanceof RateLimitError) {
        // If still rate limited, try one more time with longer delay
        const longerDelay = rateLimitError.retryAfter * 2 || 10000;
        console.log(`Still rate limited, waiting ${longerDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, longerDelay));
        return await operation();
      }
      throw error;
    }
  }
}

/**
 * Timeout recovery strategy
 */
export class TimeoutRecovery implements RecoveryStrategy {
  canHandle(error: Error): boolean {
    return error instanceof TimeoutError;
  }

  async recover<T>(operation: () => Promise<T>, context: RecoveryContext): Promise<T> {
    const timeoutError = context.error as TimeoutError;
    
    // Increase timeout for retry
    const newTimeout = timeoutError.timeoutMs * 1.5;
    console.log(`Operation timed out, retrying with increased timeout: ${newTimeout}ms`);
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new TimeoutError('Operation timed out on retry', newTimeout)), newTimeout);
    });

    try {
      const result = await Promise.race([operation(), timeoutPromise]);
      return result;
    } catch (error) {
      if (error instanceof TimeoutError) {
        throw new TimeoutError(
          `Operation still timed out after timeout increase to ${newTimeout}ms`,
          newTimeout
        );
      }
      throw error;
    }
  }
}

/**
 * Insufficient data recovery strategy
 */
export class InsufficientDataRecovery implements RecoveryStrategy {
  canHandle(error: Error): boolean {
    return error instanceof InsufficientDataError;
  }

  async recover<T>(operation: () => Promise<T>, context: RecoveryContext): Promise<T> {
    // For insufficient data, we can try to fetch more data or use defaults
    console.log('Insufficient data detected, attempting to recover...');
    
    // Try the operation again (maybe data was added in the meantime)
    try {
      return await operation();
    } catch (error) {
      if (error instanceof InsufficientDataError) {
        // If still insufficient data, this is not recoverable
        throw new InsufficientDataError(
          'Insufficient data persists, cannot recover',
          { ...context, originalError: error.message },
          error
        );
      }
      throw error;
    }
  }
}

/**
 * Fallback recovery strategy for unknown errors
 */
export class FallbackRecovery implements RecoveryStrategy {
  canHandle(error: Error): boolean {
    return true; // Handles any error
  }

  async recover<T>(operation: () => Promise<T>, context: RecoveryContext): Promise<T> {
    const config: Partial<RetryConfig> = {
      maxAttempts: context.maxRetries || 2,
      baseDelay: 2000, // 2 seconds
      maxDelay: 15000, // 15 seconds
      backoffMultiplier: 1.5,
      jitter: true
    };

    const retryContext: RetryContext = {
      operation: context.operation,
      token_id: context.token_id,
      timeframe: context.timeframe,
      attempt: 1,
      maxAttempts: config.maxAttempts || 2
    };

    const result = await retryOperation(operation, config, retryContext);
    
    if (!result.success) {
      // Convert to appropriate error type
      const error = ErrorFactory.fromUnknown(result.error!, context);
      throw error;
    }

    return result.data!;
  }
}

/**
 * Main error recovery manager
 */
export class ErrorRecoveryManager {
  private strategies: RecoveryStrategy[] = [];

  constructor() {
    // Register default recovery strategies in order of specificity
    this.strategies = [
      new RateLimitRecovery(),
      new TimeoutRecovery(),
      new DatabaseConnectionRecovery(),
      new DatabaseQueryRecovery(),
      new InsufficientDataRecovery(),
      new FallbackRecovery() // Always last as fallback
    ];
  }

  /**
   * Register a custom recovery strategy
   */
  registerStrategy(strategy: RecoveryStrategy, priority: number = 0): void {
    if (priority === 0) {
      this.strategies.push(strategy);
    } else {
      // Insert at specific position
      this.strategies.splice(priority, 0, strategy);
    }
  }

  /**
   * Attempt to recover from an error
   */
  async recover<T>(
    operation: () => Promise<T>,
    error: Error,
    context: RecoveryContext
  ): Promise<RecoveryResult<T>> {
    const startTime = Date.now();
    
    // Find appropriate recovery strategy
    const strategy = this.strategies.find(s => s.canHandle(error));
    
    if (!strategy) {
      return {
        success: false,
        error,
        strategy: 'none',
        attempts: 0,
        recoveryTime: Date.now() - startTime
      };
    }

    try {
      const data = await strategy.recover(operation, { ...context, error });
      
      return {
        success: true,
        data,
        strategy: strategy.constructor.name,
        attempts: 1,
        recoveryTime: Date.now() - startTime
      };
    } catch (recoveryError) {
      return {
        success: false,
        error: recoveryError instanceof Error ? recoveryError : new Error(String(recoveryError)),
        strategy: strategy.constructor.name,
        attempts: 1,
        recoveryTime: Date.now() - startTime
      };
    }
  }

  /**
   * Get available recovery strategies
   */
  getStrategies(): string[] {
    return this.strategies.map(s => s.constructor.name);
  }
}

/**
 * Create recovery manager with default strategies
 */
export function createRecoveryManager(): ErrorRecoveryManager {
  return new ErrorRecoveryManager();
}

/**
 * Simple recovery wrapper for common operations
 */
export async function withRecovery<T>(
  operation: () => Promise<T>,
  context: RecoveryContext,
  recoveryManager?: ErrorRecoveryManager
): Promise<T> {
  const manager = recoveryManager || createRecoveryManager();
  
  try {
    return await operation();
  } catch (error) {
    const recoveryResult = await manager.recover(operation, error, context);
    
    if (!recoveryResult.success) {
      throw recoveryResult.error;
    }
    
    return recoveryResult.data!;
  }
}


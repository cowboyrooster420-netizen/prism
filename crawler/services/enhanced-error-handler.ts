/**
 * Enhanced Error Handling System for Behavioral Analysis
 * Provides comprehensive error recovery, retry logic, and circuit breaker patterns
 */

export enum ErrorType {
  RATE_LIMIT = 'RATE_LIMIT',
  API_ERROR = 'API_ERROR', 
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  PARSING_ERROR = 'PARSING_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export enum ErrorSeverity {
  LOW = 'LOW',       // Temporary issues, retry immediately
  MEDIUM = 'MEDIUM', // Intermittent issues, retry with backoff
  HIGH = 'HIGH',     // Persistent issues, circuit breaker
  CRITICAL = 'CRITICAL' // System-level issues, emergency fallback
}

export interface ErrorContext {
  operation: string;
  tokenAddress?: string;
  apiEndpoint?: string;
  attempt: number;
  maxAttempts: number;
  timestamp: Date;
  duration?: number;
}

export interface ErrorAnalysis {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  isRetryable: boolean;
  suggestedDelay: number;
  context: ErrorContext;
}

export interface CircuitBreakerState {
  isOpen: boolean;
  failureCount: number;
  lastFailure: Date | null;
  nextAttempt: Date | null;
}

export class EnhancedErrorHandler {
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private readonly CIRCUIT_BREAKER_THRESHOLD = 5; // Failures before opening circuit
  private readonly CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minute timeout
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly BASE_DELAY = 1000; // 1 second base delay
  private readonly MAX_DELAY = 30000; // 30 second max delay

  /**
   * Analyze an error and determine the appropriate response strategy
   */
  analyzeError(error: any, context: ErrorContext): ErrorAnalysis {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const errorCode = error?.status || error?.code;

    // Determine error type based on error characteristics
    let type = ErrorType.UNKNOWN_ERROR;
    let severity = ErrorSeverity.MEDIUM;
    let isRetryable = true;
    let suggestedDelay = this.calculateDelay(context.attempt);

    // Rate limiting errors
    if (errorCode === 429 || errorMessage.includes('rate limit')) {
      type = ErrorType.RATE_LIMIT;
      severity = ErrorSeverity.LOW;
      suggestedDelay = Math.min(suggestedDelay * 2, this.MAX_DELAY); // Longer delay for rate limits
    }
    // API errors
    else if (errorCode >= 400 && errorCode < 500) {
      type = ErrorType.API_ERROR;
      if (errorCode === 401 || errorCode === 403) {
        type = ErrorType.AUTHENTICATION_ERROR;
        severity = ErrorSeverity.CRITICAL;
        isRetryable = false;
      } else if (errorCode === 400) {
        severity = ErrorSeverity.MEDIUM;
        isRetryable = false; // Bad requests shouldn't be retried
      }
    }
    // Server errors
    else if (errorCode >= 500) {
      type = ErrorType.API_ERROR;
      severity = ErrorSeverity.HIGH;
      suggestedDelay = suggestedDelay * 1.5; // Longer delay for server errors
    }
    // Network errors
    else if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('timeout')) {
      type = ErrorType.NETWORK_ERROR;
      severity = ErrorSeverity.MEDIUM;
    }
    // Parsing errors
    else if (errorMessage.includes('parse') || errorMessage.includes('JSON') || errorMessage.includes('invalid')) {
      type = ErrorType.PARSING_ERROR;
      severity = ErrorSeverity.LOW;
      isRetryable = false; // Don't retry parsing errors
    }

    // Check if we've exceeded max attempts
    if (context.attempt >= context.maxAttempts) {
      isRetryable = false;
      severity = ErrorSeverity.HIGH;
    }

    return {
      type,
      severity,
      message: errorMessage,
      isRetryable,
      suggestedDelay,
      context
    };
  }

  /**
   * Execute an operation with comprehensive error handling and retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: ErrorContext
  ): Promise<{ success: boolean; result?: T; error?: ErrorAnalysis }> {
    
    const circuitBreakerKey = `${context.operation}-${context.apiEndpoint || 'default'}`;
    
    // Check circuit breaker
    if (this.isCircuitBreakerOpen(circuitBreakerKey)) {
      console.warn(`🚫 Circuit breaker open for ${context.operation}, skipping attempt`);
      return {
        success: false,
        error: {
          type: ErrorType.API_ERROR,
          severity: ErrorSeverity.HIGH,
          message: 'Circuit breaker open - too many recent failures',
          isRetryable: false,
          suggestedDelay: 0,
          context
        }
      };
    }

    for (let attempt = 1; attempt <= context.maxAttempts; attempt++) {
      const attemptStart = Date.now();
      
      try {
        console.log(`🔄 ${context.operation} attempt ${attempt}/${context.maxAttempts}${context.tokenAddress ? ` for ${context.tokenAddress}` : ''}`);
        
        const result = await operation();
        
        // Success - reset circuit breaker
        this.resetCircuitBreaker(circuitBreakerKey);
        
        const duration = Date.now() - attemptStart;
        console.log(`✅ ${context.operation} succeeded in ${duration}ms`);
        
        return { success: true, result };
        
      } catch (error) {
        const duration = Date.now() - attemptStart;
        const errorContext = { ...context, attempt, duration };
        const errorAnalysis = this.analyzeError(error, errorContext);
        
        console.error(`❌ ${context.operation} failed (attempt ${attempt}/${context.maxAttempts}):`, {
          type: errorAnalysis.type,
          severity: errorAnalysis.severity,
          message: errorAnalysis.message,
          duration: `${duration}ms`
        });

        // Record failure for circuit breaker
        this.recordFailure(circuitBreakerKey);
        
        // If not retryable or last attempt, return the error
        if (!errorAnalysis.isRetryable || attempt === context.maxAttempts) {
          return { success: false, error: errorAnalysis };
        }
        
        // Wait before retrying
        if (errorAnalysis.suggestedDelay > 0) {
          console.log(`⏳ Waiting ${errorAnalysis.suggestedDelay}ms before retry...`);
          await this.sleep(errorAnalysis.suggestedDelay);
        }
      }
    }

    // Should never reach here, but TypeScript safety
    return {
      success: false,
      error: {
        type: ErrorType.UNKNOWN_ERROR,
        severity: ErrorSeverity.HIGH,
        message: 'Maximum retry attempts exceeded',
        isRetryable: false,
        suggestedDelay: 0,
        context
      }
    };
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateDelay(attempt: number): number {
    const delay = this.BASE_DELAY * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 0.1 * delay; // Add 10% jitter
    return Math.min(delay + jitter, this.MAX_DELAY);
  }

  /**
   * Check if circuit breaker is open for a given key
   */
  private isCircuitBreakerOpen(key: string): boolean {
    const state = this.circuitBreakers.get(key);
    if (!state) return false;

    if (state.isOpen && state.nextAttempt && Date.now() > state.nextAttempt.getTime()) {
      // Circuit breaker timeout expired, allow one attempt
      state.isOpen = false;
      console.log(`🔄 Circuit breaker timeout expired for ${key}, allowing retry`);
    }

    return state.isOpen;
  }

  /**
   * Record a failure for circuit breaker logic
   */
  private recordFailure(key: string): void {
    let state = this.circuitBreakers.get(key);
    if (!state) {
      state = { isOpen: false, failureCount: 0, lastFailure: null, nextAttempt: null };
      this.circuitBreakers.set(key, state);
    }

    state.failureCount++;
    state.lastFailure = new Date();

    if (state.failureCount >= this.CIRCUIT_BREAKER_THRESHOLD) {
      state.isOpen = true;
      state.nextAttempt = new Date(Date.now() + this.CIRCUIT_BREAKER_TIMEOUT);
      console.warn(`🚫 Circuit breaker opened for ${key} after ${state.failureCount} failures`);
    }
  }

  /**
   * Reset circuit breaker after successful operation
   */
  private resetCircuitBreaker(key: string): void {
    const state = this.circuitBreakers.get(key);
    if (state && (state.failureCount > 0 || state.isOpen)) {
      console.log(`✅ Circuit breaker reset for ${key}`);
      this.circuitBreakers.set(key, { 
        isOpen: false, 
        failureCount: 0, 
        lastFailure: null, 
        nextAttempt: null 
      });
    }
  }

  /**
   * Get circuit breaker status for monitoring
   */
  getCircuitBreakerStatus(): { [key: string]: CircuitBreakerState } {
    const status: { [key: string]: CircuitBreakerState } = {};
    this.circuitBreakers.forEach((state, key) => {
      status[key] = { ...state };
    });
    return status;
  }

  /**
   * Sleep utility with promise
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create a safe wrapper for any async function
   */
  createSafeWrapper<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    operation: string,
    maxAttempts: number = this.MAX_RETRY_ATTEMPTS
  ) {
    return async (...args: T): Promise<R | null> => {
      const context: ErrorContext = {
        operation,
        attempt: 1,
        maxAttempts,
        timestamp: new Date()
      };

      const result = await this.executeWithRetry(() => fn(...args), context);
      
      if (result.success) {
        return result.result!;
      } else {
        console.error(`🚨 ${operation} failed permanently:`, result.error);
        return null;
      }
    };
  }
}
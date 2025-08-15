/* lib/error-types.ts
   Custom error types for TA worker error handling
*/

/**
 * Base error class for TA worker errors
 */
export class TAWorkerError extends Error {
  public readonly code: string;
  public readonly context: Record<string, any>;
  public readonly timestamp: Date;
  public readonly retryable: boolean;

  constructor(
    message: string,
    code: string,
    context: Record<string, any> = {},
    retryable: boolean = false,
    cause?: Error
  ) {
    super(message);
    this.name = 'TAWorkerError';
    this.code = code;
    this.context = context;
    this.timestamp = new Date();
    this.retryable = retryable;
    
    if (cause) {
      this.cause = cause;
    }

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TAWorkerError);
    }
  }

  /**
   * Convert error to plain object for logging
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      retryable: this.retryable,
      stack: this.stack,
      cause: this.cause
    };
  }
}

/**
 * Database connection errors
 */
export class DatabaseConnectionError extends TAWorkerError {
  constructor(message: string, context: Record<string, any> = {}, cause?: Error) {
    super(message, 'DB_CONNECTION_ERROR', context, true, cause);
    this.name = 'DatabaseConnectionError';
  }
}

/**
 * Database query errors
 */
export class DatabaseQueryError extends TAWorkerError {
  constructor(message: string, context: Record<string, any> = {}, cause?: Error) {
    super(message, 'DB_QUERY_ERROR', context, true, cause);
    this.name = 'DatabaseQueryError';
  }
}

/**
 * Data validation errors
 */
export class DataValidationError extends TAWorkerError {
  constructor(message: string, context: Record<string, any> = {}, cause?: Error) {
    super(message, 'DATA_VALIDATION_ERROR', context, false, cause);
    this.name = 'DataValidationError';
  }
}

/**
 * Computation errors
 */
export class ComputationError extends TAWorkerError {
  constructor(message: string, context: Record<string, any> = {}, cause?: Error) {
    super(message, 'COMPUTATION_ERROR', context, true, cause);
    this.name = 'ComputationError';
  }
}

/**
 * Network/API errors
 */
export class NetworkError extends TAWorkerError {
  constructor(message: string, context: Record<string, any> = {}, cause?: Error) {
    super(message, 'NETWORK_ERROR', context, true, cause);
    this.name = 'NetworkError';
  }
}

/**
 * Configuration errors
 */
export class ConfigurationError extends TAWorkerError {
  constructor(message: string, context: Record<string, any> = {}, cause?: Error) {
    super(message, 'CONFIGURATION_ERROR', context, false, cause);
    this.name = 'ConfigurationError';
  }
}

/**
 * Worker thread errors
 */
export class WorkerError extends TAWorkerError {
  constructor(message: string, context: Record<string, any> = {}, cause?: Error) {
    super(message, 'WORKER_ERROR', context, true, cause);
    this.name = 'WorkerError';
  }
}

/**
 * Rate limiting errors
 */
export class RateLimitError extends TAWorkerError {
  public readonly retryAfter: number;

  constructor(message: string, retryAfter: number = 0, context: Record<string, any> = {}, cause?: Error) {
    super(message, 'RATE_LIMIT_ERROR', context, true, cause);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Insufficient data errors
 */
export class InsufficientDataError extends TAWorkerError {
  constructor(message: string, context: Record<string, any> = {}, cause?: Error) {
    super(message, 'INSUFFICIENT_DATA_ERROR', context, false, cause);
    this.name = 'InsufficientDataError';
  }
}

/**
 * Timeout errors
 */
export class TimeoutError extends TAWorkerError {
  public readonly timeoutMs: number;

  constructor(message: string, timeoutMs: number, context: Record<string, any> = {}, cause?: Error) {
    super(message, 'TIMEOUT_ERROR', context, true, cause);
    this.name = 'TimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Error factory for creating appropriate error types
 */
export class ErrorFactory {
  /**
   * Create error based on error code and context
   */
  static create(
    code: string,
    message: string,
    context: Record<string, any> = {},
    cause?: Error
  ): TAWorkerError {
    switch (code) {
      case 'DB_CONNECTION_ERROR':
        return new DatabaseConnectionError(message, context, cause);
      case 'DB_QUERY_ERROR':
        return new DatabaseQueryError(message, context, cause);
      case 'DATA_VALIDATION_ERROR':
        return new DataValidationError(message, context, cause);
      case 'COMPUTATION_ERROR':
        return new ComputationError(message, context, cause);
      case 'NETWORK_ERROR':
        return new NetworkError(message, context, cause);
      case 'CONFIGURATION_ERROR':
        return new ConfigurationError(message, context, cause);
      case 'WORKER_ERROR':
        return new WorkerError(message, context, cause);
      case 'RATE_LIMIT_ERROR':
        return new RateLimitError(message, 0, context, cause);
      case 'INSUFFICIENT_DATA_ERROR':
        return new InsufficientDataError(message, context, cause);
      case 'TIMEOUT_ERROR':
        return new TimeoutError(message, 0, context, cause);
      default:
        return new TAWorkerError(message, code, context, true, cause);
    }
  }

  /**
   * Create error from unknown error type
   */
  static fromUnknown(error: unknown, context: Record<string, any> = {}): TAWorkerError {
    if (error instanceof TAWorkerError) {
      return error;
    }

    if (error instanceof Error) {
      // Try to determine error type from message
      const message = error.message.toLowerCase();
      if (message.includes('connection') || message.includes('connect')) {
        return new DatabaseConnectionError(error.message, context, error);
      }
      if (message.includes('query') || message.includes('sql')) {
        return new DatabaseQueryError(error.message, context, error);
      }
      if (message.includes('timeout')) {
        return new TimeoutError(error.message, 0, context, error);
      }
      if (message.includes('rate limit') || message.includes('429')) {
        return new RateLimitError(error.message, 0, context, error);
      }
      
      return new TAWorkerError(error.message, 'UNKNOWN_ERROR', context, true, error);
    }

    return new TAWorkerError(String(error), 'UNKNOWN_ERROR', context, true);
  }
}

/**
 * Error categorization utilities
 */
export class ErrorCategorizer {
  /**
   * Check if error is retryable
   */
  static isRetryable(error: Error): boolean {
    if (error instanceof TAWorkerError) {
      return error.retryable;
    }
    
    // Default retryable errors
    const retryableMessages = [
      'timeout',
      'connection',
      'network',
      'rate limit',
      'temporary',
      'retry',
      'busy'
    ];
    
    return retryableMessages.some(msg => 
      error.message.toLowerCase().includes(msg)
    );
  }

  /**
   * Check if error is a database error
   */
  static isDatabaseError(error: Error): boolean {
    return error instanceof DatabaseConnectionError || 
           error instanceof DatabaseQueryError;
  }

  /**
   * Check if error is a computation error
   */
  static isComputationError(error: Error): boolean {
    return error instanceof ComputationError;
  }

  /**
   * Check if error is a configuration error
   */
  static isConfigurationError(error: Error): boolean {
    return error instanceof ConfigurationError;
  }

  /**
   * Get error severity level
   */
  static getSeverity(error: Error): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (error instanceof ConfigurationError) {
      return 'CRITICAL'; // Configuration errors prevent operation
    }
    
    if (error instanceof InsufficientDataError) {
      return 'LOW'; // Data issues are usually recoverable
    }
    
    if (error instanceof DatabaseConnectionError) {
      return 'HIGH'; // Connection issues are serious
    }
    
    if (error instanceof RateLimitError) {
      return 'MEDIUM'; // Rate limits are temporary
    }
    
    return 'MEDIUM'; // Default to medium severity
  }
}


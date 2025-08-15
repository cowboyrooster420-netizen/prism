import {
  TAWorkerError,
  DatabaseConnectionError,
  DatabaseQueryError,
  DataValidationError,
  ComputationError,
  NetworkError,
  ConfigurationError,
  WorkerError,
  RateLimitError,
  InsufficientDataError,
  TimeoutError,
  ErrorFactory,
  ErrorCategorizer
} from '../error-types';

import {
  retryOperation,
  retryWithCustomLogic,
  CircuitBreaker,
  retryWithTimeout,
  retryBatch,
  RetryConfig,
  RetryResult,
  RetryContext,
  DEFAULT_RETRY_CONFIG
} from '../retry-mechanism';

import {
  ErrorRecoveryManager,
  createRecoveryManager,
  withRecovery,
  RecoveryContext,
  RecoveryResult,
  RecoveryStrategy,
  DatabaseConnectionRecovery,
  DatabaseQueryRecovery,
  RateLimitRecovery,
  TimeoutRecovery,
  InsufficientDataRecovery,
  FallbackRecovery
} from '../error-recovery';

describe('Error Handling System', () => {
  describe('Error Types', () => {
    test('TAWorkerError should create base error with context', () => {
      const error = new TAWorkerError(
        'Test error',
        'TEST_ERROR',
        { test: 'context' },
        true
      );

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.context).toEqual({ test: 'context' });
      expect(error.retryable).toBe(true);
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    test('DatabaseConnectionError should be retryable', () => {
      const error = new DatabaseConnectionError('Connection failed', { host: 'localhost' });
      expect(error.retryable).toBe(true);
      expect(error.code).toBe('DB_CONNECTION_ERROR');
    });

    test('DataValidationError should not be retryable', () => {
      const error = new DataValidationError('Invalid data', { field: 'price' });
      expect(error.retryable).toBe(false);
      expect(error.code).toBe('DATA_VALIDATION_ERROR');
    });

    test('RateLimitError should include retry after time', () => {
      const error = new RateLimitError('Rate limited', 5000, { endpoint: '/api' });
      expect(error.retryAfter).toBe(5000);
      expect(error.retryable).toBe(true);
    });

    test('TimeoutError should include timeout duration', () => {
      const error = new TimeoutError('Operation timed out', 10000, { operation: 'fetch' });
      expect(error.timeoutMs).toBe(10000);
      expect(error.retryable).toBe(true);
    });
  });

  describe('Error Factory', () => {
    test('ErrorFactory.create should create correct error types', () => {
      const dbError = ErrorFactory.create('DB_CONNECTION_ERROR', 'Connection failed');
      expect(dbError).toBeInstanceOf(DatabaseConnectionError);

      const queryError = ErrorFactory.create('DB_QUERY_ERROR', 'Query failed');
      expect(queryError).toBeInstanceOf(DatabaseQueryError);

      const validationError = ErrorFactory.create('DATA_VALIDATION_ERROR', 'Invalid data');
      expect(validationError).toBeInstanceOf(DataValidationError);
    });

    test('ErrorFactory.fromUnknown should categorize unknown errors', () => {
      const connectionError = new Error('Connection timeout');
      const categorized = ErrorFactory.fromUnknown(connectionError, { operation: 'test' });
      expect(categorized).toBeInstanceOf(DatabaseConnectionError);

      const queryError = new Error('SQL query failed');
      const categorizedQuery = ErrorFactory.fromUnknown(queryError, { operation: 'test' });
      expect(categorizedQuery).toBeInstanceOf(DatabaseQueryError);

      const timeoutError = new Error('Request timeout');
      const categorizedTimeout = ErrorFactory.fromUnknown(timeoutError, { operation: 'test' });
      expect(categorizedTimeout).toBeInstanceOf(TimeoutError);
    });

    test('ErrorFactory.fromUnknown should handle TAWorkerError instances', () => {
      const originalError = new DatabaseConnectionError('Original error');
      const categorized = ErrorFactory.fromUnknown(originalError, { operation: 'test' });
      expect(categorized).toBe(originalError);
    });
  });

  describe('Error Categorization', () => {
    test('ErrorCategorizer.isRetryable should identify retryable errors', () => {
      expect(ErrorCategorizer.isRetryable(new DatabaseConnectionError('Test'))).toBe(true);
      expect(ErrorCategorizer.isRetryable(new DataValidationError('Test'))).toBe(false);
      expect(ErrorCategorizer.isRetryable(new Error('timeout'))).toBe(true);
      expect(ErrorCategorizer.isRetryable(new Error('connection failed'))).toBe(true);
    });

    test('ErrorCategorizer.isDatabaseError should identify database errors', () => {
      expect(ErrorCategorizer.isDatabaseError(new DatabaseConnectionError('Test'))).toBe(true);
      expect(ErrorCategorizer.isDatabaseError(new DatabaseQueryError('Test'))).toBe(true);
      expect(ErrorCategorizer.isDatabaseError(new NetworkError('Test'))).toBe(false);
    });

    test('ErrorCategorizer.getSeverity should return correct severity levels', () => {
      expect(ErrorCategorizer.getSeverity(new ConfigurationError('Test'))).toBe('CRITICAL');
      expect(ErrorCategorizer.getSeverity(new DatabaseConnectionError('Test'))).toBe('HIGH');
      expect(ErrorCategorizer.getSeverity(new RateLimitError('Test'))).toBe('MEDIUM');
      expect(ErrorCategorizer.getSeverity(new InsufficientDataError('Test'))).toBe('LOW');
    });
  });

  describe('Retry Mechanism', () => {
    test('retryOperation should retry failed operations', async () => {
      let attempts = 0;
      const operation = async () => {
        attempts++;
        if (attempts < 3) {
          throw new DatabaseConnectionError('Connection failed');
        }
        return 'success';
      };

      const result = await retryOperation(operation, { maxAttempts: 3 });

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.attempts).toBe(3);
    });

    test('retryOperation should respect max attempts', async () => {
      const operation = async () => {
        throw new DatabaseConnectionError('Connection failed');
      };

      const result = await retryOperation(operation, { maxAttempts: 2 });

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(2);
      expect(result.error).toBeInstanceOf(DatabaseConnectionError);
    });

    test('retryOperation should handle non-retryable errors', async () => {
      const operation = async () => {
        throw new DataValidationError('Invalid data');
      };

      const result = await retryOperation(operation, { maxAttempts: 3 });

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1);
      expect(result.error).toBeInstanceOf(DataValidationError);
    });

    test('retryOperation should use exponential backoff', async () => {
      const startTime = Date.now();
      let attempts = 0;

      const operation = async () => {
        attempts++;
        if (attempts < 3) {
          throw new DatabaseConnectionError('Connection failed');
        }
        return 'success';
      };

      await retryOperation(operation, {
        maxAttempts: 3,
        baseDelay: 100,
        backoffMultiplier: 2
      });

      const totalTime = Date.now() - startTime;
      expect(totalTime).toBeGreaterThan(300); // 100 + 200 = 300ms minimum
    });

    test('retryOperation should handle rate limiting', async () => {
      let attempts = 0;
      const operation = async () => {
        attempts++;
        if (attempts < 2) {
          throw new RateLimitError('Rate limited', 100);
        }
        return 'success';
      };

      const startTime = Date.now();
      const result = await retryOperation(operation, { maxAttempts: 3 });

      const totalTime = Date.now() - startTime;
      expect(result.success).toBe(true);
      expect(totalTime).toBeGreaterThan(100); // Should wait for rate limit
    });
  });

  describe('Circuit Breaker', () => {
    test('CircuitBreaker should open after threshold failures', async () => {
      const circuitBreaker = new CircuitBreaker(2, 1000, 1000);
      const failingOp = async () => {
        throw new Error('Operation failed');
      };

      // First failure
      try {
        await circuitBreaker.execute(failingOp);
      } catch (error) {
        // Expected
      }

      // Second failure
      try {
        await circuitBreaker.execute(failingOp);
      } catch (error) {
        // Expected
      }

      expect(circuitBreaker.getState()).toBe('OPEN');
      expect(circuitBreaker.getFailures()).toBe(2);
    });

    test('CircuitBreaker should reject operations when open', async () => {
      const circuitBreaker = new CircuitBreaker(1, 1000, 1000);
      const failingOp = async () => {
        throw new Error('Operation failed');
      };

      // Trigger failure to open circuit
      try {
        await circuitBreaker.execute(failingOp);
      } catch (error) {
        // Expected
      }

      // Try to execute when circuit is open
      try {
        await circuitBreaker.execute(async () => 'success');
        fail('Should have thrown error when circuit is open');
      } catch (error) {
        expect(error.message).toBe('Circuit breaker is OPEN');
      }
    });

    test('CircuitBreaker should recover after timeout', async () => {
      const circuitBreaker = new CircuitBreaker(1, 100, 100);
      const failingOp = async () => {
        throw new Error('Operation failed');
      };

      // Trigger failure to open circuit
      try {
        await circuitBreaker.execute(failingOp);
      } catch (error) {
        // Expected
      }

      expect(circuitBreaker.getState()).toBe('OPEN');

      // Wait for recovery timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      // Circuit should be half-open
      expect(circuitBreaker.getState()).toBe('HALF_OPEN');

      // Successful operation should close circuit
      const result = await circuitBreaker.execute(async () => 'success');
      expect(result).toBe('success');
      expect(circuitBreaker.getState()).toBe('CLOSED');
    });
  });

  describe('Error Recovery Strategies', () => {
    test('DatabaseConnectionRecovery should handle connection errors', async () => {
      const recovery = new DatabaseConnectionRecovery();
      let attempts = 0;

      const operation = async () => {
        attempts++;
        if (attempts < 3) {
          throw new DatabaseConnectionError('Connection failed');
        }
        return 'success';
      };

      const result = await recovery.recover(operation, {
        operation: 'test',
        maxRetries: 5
      });

      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    test('RateLimitRecovery should handle rate limiting', async () => {
      const recovery = new RateLimitRecovery();
      let attempts = 0;

      const operation = async () => {
        attempts++;
        if (attempts < 2) {
          throw new RateLimitError('Rate limited', 50);
        }
        return 'success';
      };

      const startTime = Date.now();
      const result = await recovery.recover(operation, {
        operation: 'test'
      });

      const totalTime = Date.now() - startTime;
      expect(result).toBe('success');
      expect(totalTime).toBeGreaterThan(50); // Should wait for rate limit
    });

    test('TimeoutRecovery should increase timeout for retry', async () => {
      const recovery = new TimeoutRecovery();
      const timeoutError = new TimeoutError('Operation timed out', 1000);

      const operation = async () => {
        // Simulate operation that takes longer than original timeout
        await new Promise(resolve => setTimeout(resolve, 1200));
        return 'success';
      };

      const result = await recovery.recover(operation, {
        operation: 'test',
        error: timeoutError
      });

      expect(result).toBe('success');
    });

    test('InsufficientDataRecovery should handle data issues', async () => {
      const recovery = new InsufficientDataRecovery();
      let attempts = 0;

      const operation = async () => {
        attempts++;
        if (attempts < 2) {
          throw new InsufficientDataError('Not enough data');
        }
        return 'success';
      };

      const result = await recovery.recover(operation, {
        operation: 'test'
      });

      expect(result).toBe('success');
      expect(attempts).toBe(2);
    });
  });

  describe('Error Recovery Manager', () => {
    test('ErrorRecoveryManager should use appropriate recovery strategy', async () => {
      const manager = createRecoveryManager();
      let attempts = 0;

      const operation = async () => {
        attempts++;
        if (attempts < 2) {
          throw new DatabaseConnectionError('Connection failed');
        }
        return 'success';
      };

      const result = await manager.recover(operation, {
        operation: 'test',
        maxRetries: 3
      });

      expect(result.success).toBe(true);
      expect(result.strategy).toBe('DatabaseConnectionRecovery');
    });

    test('ErrorRecoveryManager should handle unknown error types', async () => {
      const manager = createRecoveryManager();
      let attempts = 0;

      const operation = async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error('Unknown error type');
        }
        return 'success';
      };

      const result = await manager.recover(operation, {
        operation: 'test',
        maxRetries: 2
      });

      expect(result.success).toBe(true);
      expect(result.strategy).toBe('FallbackRecovery');
    });

    test('ErrorRecoveryManager should register custom strategies', () => {
      const manager = createRecoveryManager();
      
      class CustomRecovery implements RecoveryStrategy {
        canHandle(error: Error): boolean {
          return error.message.includes('custom');
        }
        
        async recover<T>(operation: () => Promise<T>, context: RecoveryContext): Promise<T> {
          return await operation();
        }
      }

      manager.registerStrategy(new CustomRecovery());
      const strategies = manager.getStrategies();
      
      expect(strategies).toContain('CustomRecovery');
    });
  });

  describe('With Recovery Wrapper', () => {
    test('withRecovery should automatically handle errors', async () => {
      let attempts = 0;
      const operation = async () => {
        attempts++;
        if (attempts < 3) {
          throw new DatabaseConnectionError('Connection failed');
        }
        return 'success';
      };

      const result = await withRecovery(operation, {
        operation: 'test',
        maxRetries: 3
      });

      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    test('withRecovery should propagate unrecoverable errors', async () => {
      const operation = async () => {
        throw new DataValidationError('Invalid data');
      };

      await expect(withRecovery(operation, {
        operation: 'test'
      })).rejects.toThrow(DataValidationError);
    });
  });

  describe('Performance and Edge Cases', () => {
    test('should handle large numbers of retries efficiently', async () => {
      const startTime = performance.now();
      
      const result = await retryOperation(
        async () => 'success',
        { maxAttempts: 1000 }
      );
      
      const duration = performance.now() - startTime;
      
      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(100); // Should be very fast for successful operation
    });

    test('should handle concurrent retry operations', async () => {
      const operations = Array.from({ length: 10 }, (_, i) => async () => {
        if (i < 5) {
          throw new DatabaseConnectionError('Connection failed');
        }
        return `success-${i}`;
      });

      const results = await retryBatch(operations, 3, { maxAttempts: 2 });

      expect(results).toHaveLength(10);
      expect(results.filter(r => r.success)).toHaveLength(5);
      expect(results.filter(r => !r.success)).toHaveLength(5);
    });

    test('should handle timeout operations correctly', async () => {
      const slowOperation = async () => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return 'success';
      };

      const result = await retryWithTimeout(slowOperation, 1000, { maxAttempts: 1 });

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(TimeoutError);
    });
  });
});


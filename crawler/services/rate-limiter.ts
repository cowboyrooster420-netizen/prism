/**
 * Smart Rate Limiter for API calls
 * Handles exponential backoff, batch processing, and adaptive delays
 */

export class RateLimiter {
  private lastCallTime: number = 0;
  private consecutiveFailures: number = 0;
  private baseDelay: number;
  private maxDelay: number;
  private batchSize: number;
  private batchDelay: number;

  constructor(options: {
    baseDelay?: number;      // Base delay between calls (ms)
    maxDelay?: number;       // Maximum delay (ms)
    batchSize?: number;      // Calls per batch
    batchDelay?: number;     // Delay between batches (ms)
  } = {}) {
    this.baseDelay = options.baseDelay || 200;
    this.maxDelay = options.maxDelay || 5000;
    this.batchSize = options.batchSize || 5;
    this.batchDelay = options.batchDelay || 1000;
  }

  /**
   * Wait for appropriate delay before next API call
   */
  async waitForNextCall(): Promise<void> {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCallTime;
    
    // Calculate delay based on consecutive failures
    let delay = this.baseDelay;
    if (this.consecutiveFailures > 0) {
      delay = Math.min(
        this.baseDelay * Math.pow(2, this.consecutiveFailures),
        this.maxDelay
      );
    }
    
    // Ensure minimum delay between calls
    const actualDelay = Math.max(delay - timeSinceLastCall, 0);
    
    if (actualDelay > 0) {
      await this.sleep(actualDelay);
    }
    
    this.lastCallTime = Date.now();
  }

  /**
   * Wait between batches of API calls
   */
  async waitForBatch(): Promise<void> {
    await this.sleep(this.batchDelay);
  }

  /**
   * Record a successful API call
   */
  recordSuccess(): void {
    this.consecutiveFailures = 0;
  }

  /**
   * Record a failed API call (rate limit, etc.)
   */
  recordFailure(): void {
    this.consecutiveFailures++;
  }

  /**
   * Reset failure counter (useful after long delays)
   */
  resetFailures(): void {
    this.consecutiveFailures = 0;
  }

  /**
   * Get current delay recommendation
   */
  getCurrentDelay(): number {
    if (this.consecutiveFailures === 0) {
      return this.baseDelay;
    }
    return Math.min(
      this.baseDelay * Math.pow(2, this.consecutiveFailures),
      this.maxDelay
    );
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Helius-specific rate limiter with conservative settings
 */
export class HeliusRateLimiter extends RateLimiter {
  constructor() {
    super({
      baseDelay: 300,      // 300ms between individual calls
      maxDelay: 10000,     // Max 10s delay
      batchSize: 3,        // 3 calls per batch
      batchDelay: 2000     // 2s between batches
    });
  }
}

/**
 * BirdEye-specific rate limiter
 */
export class BirdEyeRateLimiter extends RateLimiter {
  constructor() {
    super({
      baseDelay: 500,      // 500ms between calls
      maxDelay: 5000,      // Max 5s delay
      batchSize: 10,       // 10 calls per batch
      batchDelay: 1000     // 1s between batches
    });
  }
}

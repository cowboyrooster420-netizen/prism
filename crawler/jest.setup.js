// Jest setup file for global test configuration

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
process.env.TA_TOKEN_IDS = 'test-token-1,test-token-2';
process.env.TA_TIMEFRAMES = '5m,15m';

// Global test utilities
global.testUtils = {
  // Generate mock candle data
  generateMockCandles: (count = 100, basePrice = 100) => {
    const candles = [];
    let currentPrice = basePrice;
    
    for (let i = 0; i < count; i++) {
      const change = (Math.random() - 0.5) * 10;
      currentPrice = Math.max(0.01, currentPrice + change);
      
      const open = currentPrice;
      const high = currentPrice + Math.random() * 5;
      const low = Math.max(0.01, currentPrice - Math.random() * 5);
      const close = currentPrice + (Math.random() - 0.5) * 2;
      const volume = Math.random() * 1000000;
      const quoteVolumeUsd = volume * currentPrice;
      
      candles.push({
        ts: new Date(Date.now() - (count - i) * 60000).toISOString(),
        open,
        high,
        low,
        close,
        volume,
        quote_volume_usd: quoteVolumeUsd
      });
    }
    
    return candles;
  },

  // Generate mock TA features
  generateMockTAFeatures: (count = 100, tokenId = 'test-token', timeframe = '5m') => {
    const features = [];
    
    for (let i = 0; i < count; i++) {
      features.push({
        token_id: tokenId,
        timeframe,
        ts: new Date(Date.now() - (count - i) * 60000).toISOString(),
        sma_7: 100 + Math.random() * 20,
        sma_20: 100 + Math.random() * 20,
        sma_50: 100 + Math.random() * 20,
        sma_200: 100 + Math.random() * 20,
        ema_7: 100 + Math.random() * 20,
        ema_20: 100 + Math.random() * 20,
        ema_50: 100 + Math.random() * 20,
        ema_200: 100 + Math.random() * 20,
        rsi: 30 + Math.random() * 40,
        macd: (Math.random() - 0.5) * 2,
        macd_signal: (Math.random() - 0.5) * 2,
        macd_histogram: (Math.random() - 0.5) * 2,
        atr: Math.random() * 10,
        bb_upper: 110 + Math.random() * 20,
        bb_middle: 100 + Math.random() * 20,
        bb_lower: 90 + Math.random() * 20,
        bb_width: Math.random() * 0.4,
        donchian_upper: 110 + Math.random() * 20,
        donchian_lower: 90 + Math.random() * 20,
        volume_ma: Math.random() * 1000000,
        volume_zscore: (Math.random() - 0.5) * 4,
        volume_slope: (Math.random() - 0.5) * 2,
        swing_low: Math.random() > 0.8,
        swing_high: Math.random() > 0.8,
        bullish_rsi_divergence: Math.random() > 0.9,
        bearish_rsi_divergence: Math.random() > 0.9,
        stochastic_k: Math.random() * 100,
        stochastic_d: Math.random() * 100
      });
    }
    
    return features;
  },

  // Mock Supabase client
  createMockSupabaseClient: () => ({
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    rpc: jest.fn().mockReturnThis(),
    onConflict: jest.fn().mockReturnThis()
  }),

  // Wait for specified time
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  // Create test configuration
  createTestConfig: () => ({
    technicalAnalysis: {
      smaPeriods: [7, 20],
      emaPeriods: [7, 20],
      rsiPeriod: 14,
      rsiOverbought: 70,
      rsiOversold: 30,
      macdFastPeriod: 12,
      macdSlowPeriod: 26,
      macdSignalPeriod: 9,
      atrPeriod: 14,
      bbPeriod: 20,
      bbStandardDeviations: 2,
      donchianPeriod: 20,
      volumeMAPeriod: 20,
      volumeZScorePeriod: 60,
      volumeSlopePeriod: 6,
      swingDetectionWindow: 2,
      minCandlesRequired: 60,
      minDataQuality: 0.8
    },
    performance: {
      maxWorkers: 2,
      workerTimeout: 10000,
      batchSize: 100,
      maxConcurrency: 2,
      maxMemoryUsage: 100 * 1024 * 1024,
      gcThreshold: 0.8,
      enableMetrics: false,
      metricsInterval: 1000
    },
    database: {
      connectionTimeout: 5000,
      queryTimeout: 10000,
      maxConnections: 5,
      maxRetries: 2,
      retryDelay: 500,
      upsertBatchSize: 100,
      fetchBatchSize: 100,
      enableConnectionPooling: false,
      poolSize: 2
    },
    errorHandling: {
      maxRetryAttempts: 2,
      baseRetryDelay: 500,
      maxRetryDelay: 5000,
      retryBackoffMultiplier: 1.5,
      circuitBreakerThreshold: 3,
      circuitBreakerTimeout: 10000,
      circuitBreakerMonitoringWindow: 10000,
      criticalErrorThreshold: 0.1,
      highErrorThreshold: 0.2,
      enableAutomaticRecovery: true,
      maxRecoveryAttempts: 2
    },
    logging: {
      level: 'error',
      enableConsole: false,
      enableFile: false,
      logFilePath: './test-logs/test.log',
      maxLogFileSize: 1024 * 1024,
      maxLogFiles: 1,
      enableStructuredLogging: false,
      includeTimestamp: false,
      includeContext: false
    },
    monitoring: {
      enableHealthChecks: false,
      healthCheckInterval: 10000,
      enableMetrics: false,
      metricsPort: 8081,
      metricsEndpoint: '/metrics',
      enableAlerts: false,
      alertThresholds: {
        errorRate: 0.1,
        responseTime: 5000,
        memoryUsage: 0.8
      },
      enableProfiling: false,
      profileThreshold: 1000
    },
    environment: 'test',
    version: '1.0.0-test',
    lastUpdated: new Date()
  })
};

// Console mock for tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
};

// Process mock for tests
global.process = {
  ...process,
  exit: jest.fn(),
  env: process.env
};

// Mock worker threads for tests
jest.mock('worker_threads', () => ({
  Worker: jest.fn(),
  isMainThread: true,
  parentPort: null,
  workerData: null
}));

// Mock os module for tests
jest.mock('os', () => ({
  cpus: jest.fn().mockReturnValue([
    { model: 'Test CPU', speed: 1000, times: { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 } }
  ])
}));


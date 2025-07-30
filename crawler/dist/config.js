"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MIN_LIQUIDITY = exports.MIN_MARKET_CAP = exports.MIN_VOLUME_24H = exports.MIN_HOLDER_COUNT = exports.BACKOFF_MULTIPLIER = exports.MAX_BACKOFF_MS = exports.INITIAL_BACKOFF_MS = exports.BATCH_DELAY_MS = exports.BATCH_SIZE = exports.LOG_LEVEL = exports.HELIUS_RATE_LIMIT_MS = exports.TARGET_QUALITY_TOKENS = exports.MAX_TOKENS_PER_CRAWL = exports.CRAWL_INTERVAL_MS = exports.SUPABASE_KEY = exports.SUPABASE_URL = exports.HELIUS_API_KEY = void 0;
require("dotenv/config");
exports.HELIUS_API_KEY = process.env.HELIUS_API_KEY;
exports.SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
exports.SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
exports.CRAWL_INTERVAL_MS = 5 * 60 * 1000; // every 5 mins
// Enhanced configuration options
exports.MAX_TOKENS_PER_CRAWL = 500; // Increased from 100
exports.TARGET_QUALITY_TOKENS = 200; // Target number of quality tokens to store
exports.HELIUS_RATE_LIMIT_MS = 1000; // 1 second between requests
exports.LOG_LEVEL = process.env.LOG_LEVEL || 'info';
// Batch processing configuration
exports.BATCH_SIZE = 9; // Process 9 tokens in parallel per batch
exports.BATCH_DELAY_MS = 2000; // 2 second delay between batches
// Rate limiting configuration
exports.INITIAL_BACKOFF_MS = 1000; // 1 second initial backoff
exports.MAX_BACKOFF_MS = 30000; // 30 seconds max backoff
exports.BACKOFF_MULTIPLIER = 2; // Double the delay each time
// Filtering thresholds
exports.MIN_HOLDER_COUNT = 50; // Increased from 20
exports.MIN_VOLUME_24H = 5000; // $5k minimum 24h volume
exports.MIN_MARKET_CAP = 50000; // $50k minimum market cap
exports.MIN_LIQUIDITY = 10000; // $10k minimum liquidity
// Validate required environment variables
if (!exports.HELIUS_API_KEY) {
    throw new Error('HELIUS_API_KEY is required');
}
if (!exports.SUPABASE_URL) {
    throw new Error('SUPABASE_URL is required');
}
if (!exports.SUPABASE_KEY) {
    throw new Error('SUPABASE_KEY is required');
}
//# sourceMappingURL=config.js.map
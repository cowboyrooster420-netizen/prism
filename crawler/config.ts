import 'dotenv/config';

export const HELIUS_API_KEY = process.env.HELIUS_API_KEY!;
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
export const CRAWL_INTERVAL_MS = 5 * 60 * 1000; // every 5 mins

// Enhanced configuration options
export const MAX_TOKENS_PER_CRAWL = 100; // Reduced for faster debug runs
export const TARGET_QUALITY_TOKENS = 200; // Target number of quality tokens to store
export const HELIUS_RATE_LIMIT_MS = 1000; // 1 second between requests
export const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// Batch processing configuration
export const BATCH_SIZE = 9; // Process 9 tokens in parallel per batch
export const BATCH_DELAY_MS = 2000; // 2 second delay between batches

// Rate limiting configuration
export const INITIAL_BACKOFF_MS = 1000; // 1 second initial backoff
export const MAX_BACKOFF_MS = 30000; // 30 seconds max backoff
export const BACKOFF_MULTIPLIER = 2; // Double the delay each time

// Filtering thresholds
export const MIN_HOLDER_COUNT = 50; // Increased from 20
export const MIN_VOLUME_24H = 5000; // $5k minimum 24h volume
export const MIN_MARKET_CAP = 50000; // $50k minimum market cap
export const MIN_LIQUIDITY = 10000; // $10k minimum liquidity

// API Keys - Load from environment variables
export const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY!;
export const MORALIS_API_KEY = process.env.MORALIS_API_KEY!;
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

// Validate required environment variables
if (!HELIUS_API_KEY) {
  throw new Error('HELIUS_API_KEY is required');
}
if (!SUPABASE_URL) {
  throw new Error('SUPABASE_URL is required');
}
if (!SUPABASE_KEY) {
  throw new Error('SUPABASE_KEY is required');
}
if (!BIRDEYE_API_KEY) {
  throw new Error('BIRDEYE_API_KEY is required');
}
if (!MORALIS_API_KEY) {
  throw new Error('MORALIS_API_KEY is required');
}
if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is required');
} 
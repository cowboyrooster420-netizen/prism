"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LOG_LEVEL = exports.HELIUS_RATE_LIMIT_MS = exports.MAX_TOKENS_PER_CRAWL = exports.CRAWL_INTERVAL_MS = exports.SUPABASE_KEY = exports.SUPABASE_URL = exports.HELIUS_API_KEY = void 0;
exports.HELIUS_API_KEY = process.env.HELIUS_API_KEY;
exports.SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
exports.SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
exports.CRAWL_INTERVAL_MS = 5 * 60 * 1000; // every 5 mins
// Additional configuration options
exports.MAX_TOKENS_PER_CRAWL = 100;
exports.HELIUS_RATE_LIMIT_MS = 1000; // 1 second between requests
exports.LOG_LEVEL = process.env.LOG_LEVEL || 'info';
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
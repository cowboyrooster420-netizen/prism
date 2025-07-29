"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const helius_1 = require("./services/helius");
const filters_1 = require("./services/filters");
const enrich_1 = require("./services/enrich");
const supabase_1 = require("./services/supabase");
const sleep_1 = require("./utils/sleep");
const config_1 = require("./config");
let isRunning = true;
// Graceful shutdown handler
process.on('SIGINT', () => {
    console.log('\nShutting down crawler...');
    isRunning = false;
    process.exit(0);
});
process.on('SIGTERM', () => {
    console.log('\nShutting down crawler...');
    isRunning = false;
    process.exit(0);
});
async function crawl() {
    if (!isRunning)
        return;
    try {
        console.log('\n=== Starting crawl... ===');
        const startTime = Date.now();
        // Fetch tokens from Helius
        const tokens = await (0, helius_1.fetchRecentTokens)();
        console.log(`Fetched ${tokens.length} tokens from Helius`);
        // Filter tokens
        const filtered = (0, filters_1.filterTokens)(tokens);
        console.log(`Filtered to ${filtered.length} quality tokens`);
        // Enrich and store tokens
        let enrichedCount = 0;
        for (const token of filtered) {
            if (!isRunning)
                break;
            const enriched = await (0, enrich_1.enrichToken)(token);
            if (enriched) {
                const success = await (0, supabase_1.upsertToken)(enriched);
                if (success) {
                    enrichedCount++;
                }
            }
            // Small delay between tokens to avoid overwhelming APIs
            await (0, sleep_1.sleep)(100);
        }
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;
        console.log(`=== Crawl completed in ${duration.toFixed(2)}s ===`);
        console.log(`- Fetched: ${tokens.length} tokens`);
        console.log(`- Filtered: ${filtered.length} tokens`);
        console.log(`- Stored: ${enrichedCount} tokens`);
        console.log(`Sleeping ${config_1.CRAWL_INTERVAL_MS / 1000}s until next crawl...`);
    }
    catch (error) {
        console.error('Crawl failed:', error);
    }
    // Schedule next crawl
    if (isRunning) {
        await (0, sleep_1.sleep)(config_1.CRAWL_INTERVAL_MS);
        crawl();
    }
}
// Start the crawler
console.log('🚀 Starting Solana Token Crawler...');
console.log(`Crawl interval: ${config_1.CRAWL_INTERVAL_MS / 1000} seconds`);
console.log('Press Ctrl+C to stop');
crawl();
//# sourceMappingURL=index.js.map
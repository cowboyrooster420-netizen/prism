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
// Process a batch of tokens in parallel
async function processBatch(tokens, batchNumber) {
    console.log(`Processing batch ${batchNumber} (${tokens.length} tokens)...`);
    // Process all tokens in the batch concurrently
    const promises = tokens.map(async (token) => {
        try {
            const enriched = await (0, enrich_1.enrichToken)(token);
            if (enriched) {
                const success = await (0, supabase_1.upsertToken)(enriched);
                return success ? 1 : 0;
            }
            return 0;
        }
        catch (error) {
            console.error(`Error processing token ${token.mint_address}:`, error);
            return 0;
        }
    });
    // Wait for all tokens in the batch to complete
    const results = await Promise.allSettled(promises);
    // Count successful enrichments
    const successful = results
        .filter(result => result.status === 'fulfilled')
        .reduce((sum, result) => sum + result.value, 0);
    console.log(`Batch ${batchNumber} completed: ${successful}/${tokens.length} tokens stored`);
    return successful;
}
// Split array into batches
function chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}
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
        // Process tokens in batches
        const batches = chunkArray(filtered, config_1.BATCH_SIZE);
        console.log(`Processing ${filtered.length} tokens in ${batches.length} batches of ${config_1.BATCH_SIZE}`);
        let totalEnriched = 0;
        for (let i = 0; i < batches.length; i++) {
            if (!isRunning)
                break;
            const batch = batches[i];
            const enrichedCount = await processBatch(batch, i + 1);
            totalEnriched += enrichedCount;
            // Add delay between batches (but not after the last batch)
            if (i < batches.length - 1) {
                console.log(`Waiting ${config_1.BATCH_DELAY_MS}ms before next batch...`);
                await (0, sleep_1.sleep)(config_1.BATCH_DELAY_MS);
            }
        }
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;
        console.log(`=== Crawl completed in ${duration.toFixed(2)}s ===`);
        console.log(`- Fetched: ${tokens.length} tokens`);
        console.log(`- Filtered: ${filtered.length} tokens`);
        console.log(`- Stored: ${totalEnriched} tokens`);
        console.log(`- Processed ${batches.length} batches of ${config_1.BATCH_SIZE} tokens each`);
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
console.log(`Batch size: ${config_1.BATCH_SIZE} tokens`);
console.log(`Batch delay: ${config_1.BATCH_DELAY_MS}ms`);
console.log('Press Ctrl+C to stop');
crawl();
//# sourceMappingURL=index.js.map
import { fetchRecentTokens } from './services/helius';
import { filterTokens } from './services/filters';
import { enrichToken } from './services/enrich';
import { upsertToken } from './services/supabase';
import { sleep } from './utils/sleep';
import { CRAWL_INTERVAL_MS } from './config';

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
  if (!isRunning) return;
  
  try {
    console.log('\n=== Starting crawl... ===');
    const startTime = Date.now();
    
    // Fetch tokens from Helius
    const tokens = await fetchRecentTokens();
    console.log(`Fetched ${tokens.length} tokens from Helius`);
    
    // Filter tokens
    const filtered = filterTokens(tokens);
    console.log(`Filtered to ${filtered.length} quality tokens`);
    
    // Enrich and store tokens
    let enrichedCount = 0;
    for (const token of filtered) {
      if (!isRunning) break;
      
      const enriched = await enrichToken(token);
      if (enriched) {
        const success = await upsertToken(enriched);
        if (success) {
          enrichedCount++;
        }
      }
      
      // Small delay between tokens to avoid overwhelming APIs
      await sleep(100);
    }
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`=== Crawl completed in ${duration.toFixed(2)}s ===`);
    console.log(`- Fetched: ${tokens.length} tokens`);
    console.log(`- Filtered: ${filtered.length} tokens`);
    console.log(`- Stored: ${enrichedCount} tokens`);
    console.log(`Sleeping ${CRAWL_INTERVAL_MS / 1000}s until next crawl...`);
    
  } catch (error) {
    console.error('Crawl failed:', error);
  }
  
  // Schedule next crawl
  if (isRunning) {
    await sleep(CRAWL_INTERVAL_MS);
    crawl();
  }
}

// Start the crawler
console.log('🚀 Starting Solana Token Crawler...');
console.log(`Crawl interval: ${CRAWL_INTERVAL_MS / 1000} seconds`);
console.log('Press Ctrl+C to stop');

crawl(); 
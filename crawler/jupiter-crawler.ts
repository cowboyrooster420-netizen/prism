import JupiterSmartCrawler from './services/jupiter-smart-crawler';
import {
  SUPABASE_URL,
  SUPABASE_KEY,
  HELIUS_API_KEY,
  BIRDEYE_API_KEY
} from './config';

console.log('🚀 Starting Jupiter Smart Token Crawler...');
console.log('This crawler fetches all tokens from Jupiter and enriches with market data');

// Initialize the Jupiter smart crawler
const crawler = new JupiterSmartCrawler({
  supabaseUrl: SUPABASE_URL,
  supabaseKey: SUPABASE_KEY,
  heliusApiKey: HELIUS_API_KEY,
  birdeyeApiKey: BIRDEYE_API_KEY
});

// Run the crawler once
crawler.runJupiterCrawler()
  .then(() => {
    console.log('✅ Jupiter crawler completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Jupiter crawler failed:', error);
    process.exit(1);
  }); 
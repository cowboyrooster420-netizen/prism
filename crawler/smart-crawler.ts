import SmartTokenCrawler from './services/smart-token-crawler';
import { 
  SUPABASE_URL, 
  SUPABASE_KEY, 
  HELIUS_API_KEY, 
  BIRDEYE_API_KEY, 
  MORALIS_API_KEY 
} from './config';

console.log('🚀 Starting Smart Token Crawler...');
console.log('This crawler uses multiple sources and quality filtering');

// Initialize the smart crawler
const crawler = new SmartTokenCrawler({
  supabaseUrl: SUPABASE_URL,
  supabaseKey: SUPABASE_KEY,
  heliusApiKey: HELIUS_API_KEY,
  birdeyeApiKey: BIRDEYE_API_KEY,
  moralisApiKey: MORALIS_API_KEY
});

// Run the crawler once
crawler.runQualityCrawler()
  .then(() => {
    console.log('✅ Smart crawler completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Smart crawler failed:', error);
    process.exit(1);
  }); 
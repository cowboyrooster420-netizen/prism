import { BehavioralMVPCrawler } from './behavioral-mvp-crawler';

async function runBehavioralCrawler() {
  console.log('🚀 Starting Behavioral MVP Crawler...');
  console.log('Features:');
  console.log('✅ Jupiter token discovery (1,400+ verified tokens)');
  console.log('✅ BirdEye market data integration');
  console.log('✅ Behavioral intelligence (volume spikes, whale activity, holder growth)');
  console.log('✅ Cost-optimized API usage');
  console.log('✅ Database integration with behavioral schema\n');
  
  const crawler = new BehavioralMVPCrawler();
  await crawler.runCombinedCrawl();
  
  console.log('🎉 Behavioral crawler completed!');
}

runBehavioralCrawler().then(() => {
  console.log('✅ Script finished');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
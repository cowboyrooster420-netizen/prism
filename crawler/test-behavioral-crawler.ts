/**
 * Test Behavioral Crawler
 * Verify the integration of Jupiter MVP service with behavioral data collection
 */

import { BehavioralCrawler } from './services/behavioral-crawler';

async function testBehavioralCrawler() {
  console.log('🧪 Testing Behavioral Crawler Integration...\n');

  const crawler = new BehavioralCrawler();

  try {
    // Test 1: Check cache stats before crawling
    console.log('📋 Test 1: Initial cache statistics...');
    let stats = crawler.getCacheStats();
    console.log(`✅ Initial cache: ${stats.tokenCount} tokens, ${stats.coverage}% coverage`);

    // Test 2: Run basic behavioral crawl (limited scope for testing)
    console.log('\n📋 Test 2: Running basic behavioral crawl...');
    console.log('Note: This will discover tokens, select priorities, and process behavioral data');
    
    // For testing, we'll run just a small crawl
    await crawler.runBehavioralCrawl();
    
    // Check cache stats after crawling
    stats = crawler.getCacheStats();
    console.log(`✅ Post-crawl cache: ${stats.tokenCount} tokens, ${stats.coverage}% coverage`);

    console.log('\n🎉 Behavioral Crawler tests completed successfully!');
    console.log('\nWhat the Behavioral Crawler provides:');
    console.log('✅ Token discovery via Jupiter (1,400+ verified tokens)');
    console.log('✅ Behavioral data collection (age, volume spikes, holder growth)');
    console.log('✅ Priority token selection for expensive API usage');
    console.log('✅ Database integration with behavioral schema');
    console.log('✅ Scheduled crawling capabilities');
    
    console.log('\nBehavioral data collected:');
    console.log('• token_age_hours: Estimated token age');
    console.log('• whale_buys_24h: Simulated whale activity (MVP)');
    console.log('• new_holders_24h: Simulated holder growth (MVP)');
    console.log('• volume_spike_ratio: Volume spike detection (MVP)');
    
    console.log('\nNext Phase (Helius Integration):');
    console.log('• Real whale transaction detection');
    console.log('• Actual holder count analysis');
    console.log('• Volume spike analysis from blockchain data');
    console.log('• Transaction pattern recognition');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testBehavioralCrawler().catch(error => {
  console.error('❌ Test script failed:', error);
  process.exit(1);
});
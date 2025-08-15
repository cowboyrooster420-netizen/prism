import { BehavioralLaunchpadCrawler } from './behavioral-launchpad-crawler';
import { getTopBirdEyeTokens, getTrendingBirdEyeTokens } from './services/birdeye';

async function testRateLimiting() {
  console.log('🧪 Testing Rate Limiting on 10 Tokens...\n');
  
  try {
    console.log('🚀 Fetching only 10 tokens from BirdEye...');
    const startTime = Date.now();
    
    // Fetch only 10 tokens from BirdEye instead of 500
    const [topTokens, trendingTokens] = await Promise.allSettled([
      getTopBirdEyeTokens(10),      // Only fetch 10 tokens
      getTrendingBirdEyeTokens(5)   // Only fetch 5 trending tokens
    ]);

    const birdEyeTokens = [
      ...(topTokens.status === 'fulfilled' ? topTokens.value : []),
      ...(trendingTokens.status === 'fulfilled' ? trendingTokens.value : [])
    ];

    console.log(`📊 Total BirdEye tokens fetched: ${birdEyeTokens.length}`);
    
    // Filter for quality tokens
    const qualityTokens = birdEyeTokens.filter(token => {
      const hasValidData = token.v24hUSD && 
                          token.liquidity && 
                          token.mc && 
                          token.price &&
                          typeof token.v24hUSD === 'number' &&
                          typeof token.liquidity === 'number' &&
                          typeof token.mc === 'number' &&
                          typeof token.price === 'number';
      
      if (!hasValidData) return false;
      
      return token.v24hUSD > 10000 &&      // $10k+ daily volume
             token.liquidity > 50000 &&    // $50k+ liquidity
             token.mc > 100000;            // $100k+ market cap
    });

    console.log(`✅ Quality tokens after filtering: ${qualityTokens.length}`);
    
    if (qualityTokens.length === 0) {
      console.log('⚠️ No quality tokens found - test cannot proceed');
      return;
    }

    // Now run the behavioral analysis on just these tokens
    console.log('🧠 Running behavioral analysis on quality tokens...');
    const crawler = new BehavioralLaunchpadCrawler();
    
    // Override the maxTokens to process all quality tokens
    const signals = await crawler.runComprehensiveCrawl(qualityTokens.length);
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    console.log('\n🎉 Test completed!');
    console.log(`⏱️  Total time: ${totalTime}ms`);
    console.log(`📊 Tokens processed: ${signals.highQualityTokens.length + signals.volumeLeaders.length}`);
    console.log(`🏆 High quality tokens: ${signals.highQualityTokens.length}`);
    console.log(`📈 Volume leaders: ${signals.volumeLeaders.length}`);
    
    if (signals.highQualityTokens.length > 0) {
      console.log('\n🏅 Sample high quality token:');
      const sample = signals.highQualityTokens[0];
      console.log(`   Symbol: ${sample.symbol}`);
      console.log(`   Volume: $${sample.volume_24h?.toLocaleString()}`);
      console.log(`   Quality Score: ${sample.quality_score}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testRateLimiting();

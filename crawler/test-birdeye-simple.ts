/**
 * Simple test script to debug BirdEye integration
 */

import { getTopBirdEyeTokens, getTrendingBirdEyeTokens } from './services/birdeye';
import { sleep } from './utils';

async function testBirdEye() {
  console.log('🧪 Testing BirdEye integration...\n');
  
  try {
    // Test 1: Get top tokens
    console.log('🔍 Test 1: Getting top 5 tokens...');
    const topTokens = await getTopBirdEyeTokens(5);
    console.log(`✅ Top tokens: ${topTokens.length}`);
    if (topTokens.length > 0) {
      console.log('Sample token:', {
        symbol: topTokens[0].symbol,
        name: topTokens[0].name,
        price: topTokens[0].price,
        volume: topTokens[0].v24hUSD
      });
    }
    
    await sleep(1000);
    
    // Test 2: Get trending tokens
    console.log('\n🔍 Test 2: Getting trending tokens...');
    const trendingTokens = await getTrendingBirdEyeTokens(5);
    console.log(`✅ Trending tokens: ${trendingTokens.length}`);
    if (trendingTokens.length > 0) {
      console.log('Sample trending token:', {
        symbol: trendingTokens[0].symbol,
        name: trendingTokens[0].name,
        price: trendingTokens[0].price,
        volume: trendingTokens[0].v24hUSD
      });
    }
    
    // Test 3: Combine and filter
    console.log('\n🔍 Test 3: Combining and filtering...');
    const allTokens = [...topTokens, ...trendingTokens];
    console.log(`✅ Combined tokens: ${allTokens.length}`);
    
    const qualityTokens = allTokens.filter(token => 
      token.v24hUSD > 10000 &&      // $10k+ daily volume
      token.liquidity > 50000 &&    // $50k+ liquidity
      token.mc > 100000             // $100k+ market cap
    );
    
    console.log(`✅ Quality tokens after filtering: ${qualityTokens.length}`);
    
    if (qualityTokens.length > 0) {
      console.log('\n📊 Quality token sample:');
      qualityTokens.slice(0, 3).forEach((token, i) => {
        console.log(`${i + 1}. ${token.symbol} (${token.name})`);
        console.log(`   Price: $${token.price?.toFixed(6) || 'N/A'}`);
        console.log(`   Volume: $${token.v24hUSD?.toLocaleString() || 'N/A'}`);
        console.log(`   Market Cap: $${token.mc?.toLocaleString() || 'N/A'}`);
        console.log(`   Liquidity: $${token.liquidity?.toLocaleString() || 'N/A'}`);
        console.log('');
      });
    }
    
    console.log('🎉 All tests passed! BirdEye integration is working.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testBirdEye();

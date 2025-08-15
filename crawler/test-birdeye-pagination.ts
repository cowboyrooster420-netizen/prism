import { getTopBirdEyeTokens, getTrendingBirdEyeTokens } from './services/birdeye';

async function testPagination() {
  console.log('🧪 Testing BirdEye Pagination...\n');

  try {
    // Test 1: Fetch 500 tokens (full pagination)
    console.log('🔍 Test 1: Fetching 500 tokens with pagination...');
    const startTime = Date.now();
    
    const top500Tokens = await getTopBirdEyeTokens(500);
    const endTime = Date.now();
    
    console.log(`✅ Fetched ${top500Tokens.length} tokens in ${endTime - startTime}ms`);
    
    if (top500Tokens.length > 0) {
      console.log('\n📊 Sample tokens from different ranges:');
      console.log(`1. First token: ${top500Tokens[0]?.symbol} (${top500Tokens[0]?.name})`);
      console.log(`2. Middle token: ${top500Tokens[Math.floor(top500Tokens.length / 2)]?.symbol} (${top500Tokens[Math.floor(top500Tokens.length / 2)]?.name})`);
      console.log(`3. Last token: ${top500Tokens[top500Tokens.length - 1]?.symbol} (${top500Tokens[top500Tokens.length - 1]?.name})`);
      
      // Check volume distribution
      const volumes = top500Tokens.map(t => t.v24hUSD).filter(v => v && typeof v === 'number');
      if (volumes.length > 0) {
        const maxVolume = Math.max(...volumes);
        const minVolume = Math.min(...volumes);
        console.log(`\n📈 Volume range: $${minVolume.toLocaleString()} - $${maxVolume.toLocaleString()}`);
      }
    }

    // Test 2: Fetch trending tokens
    console.log('\n🔍 Test 2: Fetching trending tokens...');
    const trendingTokens = await getTrendingBirdEyeTokens(50);
    console.log(`✅ Fetched ${trendingTokens.length} trending tokens`);

    // Test 3: Quality analysis
    console.log('\n🔍 Test 3: Quality analysis of fetched tokens...');
    const qualityTokens = top500Tokens.filter(token => {
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
    console.log(`📊 Quality ratio: ${((qualityTokens.length / top500Tokens.length) * 100).toFixed(1)}%`);

    if (qualityTokens.length > 0) {
      console.log('\n🏆 Top 5 quality tokens by volume:');
      const top5 = qualityTokens
        .sort((a, b) => (b.v24hUSD || 0) - (a.v24hUSD || 0))
        .slice(0, 5);
      
      top5.forEach((token, i) => {
        console.log(`${i + 1}. ${token.symbol} (${token.name})`);
        console.log(`   Price: $${token.price?.toFixed(6)}`);
        console.log(`   Volume: $${token.v24hUSD?.toLocaleString()}`);
        console.log(`   Market Cap: $${token.mc?.toLocaleString()}`);
        console.log(`   Liquidity: $${token.liquidity?.toLocaleString()}\n`);
      });
    }

    console.log('🎉 Pagination test completed!');

  } catch (error) {
    console.error('❌ Error testing pagination:', error);
  }
}

// Run the test
testPagination();

import { getHomepageTrendingTokens } from './services/birdeye';

async function testTrendingEndpoint() {
  console.log('🧪 Testing Birdeye trending endpoint...\n');
  
  try {
    const trendingTokens = await getHomepageTrendingTokens(10);
    
    console.log(`✅ Successfully fetched ${trendingTokens.length} trending tokens:\n`);
    
    trendingTokens.forEach((token: any, index: number) => {
      console.log(`${index + 1}. ${token.name} ($${token.symbol})`);
      console.log(`   Rank: #${token.rank}`);
      console.log(`   Price: $${token.price.toFixed(6)}`);
      console.log(`   Market Cap: $${token.marketCap.toLocaleString()}`);
      console.log(`   24h Volume: $${token.volume24h.toLocaleString()}`);
      console.log(`   24h Change: ${token.priceChange24h > 0 ? '+' : ''}${token.priceChange24h.toFixed(2)}%`);
      console.log(`   Address: ${token.address}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error testing trending endpoint:', error);
  }
}

// Run the test
testTrendingEndpoint();

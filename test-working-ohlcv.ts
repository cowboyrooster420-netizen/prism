const BIRDEYE_API_KEY = '75934a93cc5f45fdb97e99901de6967b';

async function testWorkingOHLCV() {
  console.log('🔍 Testing working OHLCV endpoint with different timeframes\n');
  
  const testToken = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'; // BONK
  const workingEndpoint = 'https://public-api.birdeye.so/defi/ohlcv';
  
  // Test timeframes that might work based on the successful 1H
  const timeframes = ['5M', '15M', '1H', '4H', '1D'];
  
  for (const timeframe of timeframes) {
    console.log(`\n⏰ Testing ${timeframe}:`);
    
    const params = new URLSearchParams({
      address: testToken,
      type: timeframe,
      time_from: String(Math.floor(Date.now() / 1000) - 7 * 24 * 3600), // Last 7 days
      time_to: String(Math.floor(Date.now() / 1000)),
    });
    
    const url = `${workingEndpoint}?${params.toString()}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'X-API-KEY': BIRDEYE_API_KEY,
          'accept': 'application/json',
          'x-chain': 'solana'
        }
      });
      
      console.log(`  Status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        const items = data?.data || [];
        console.log(`  ✅ SUCCESS: ${items.length} candles found`);
        
        if (items.length > 0) {
          const sample = items[0];
          console.log(`  📊 Sample candle:`);
          console.log(`     Time: ${new Date(sample.unixTime * 1000).toISOString()}`);
          console.log(`     OHLC: $${sample.o?.toFixed(8)} / $${sample.h?.toFixed(8)} / $${sample.l?.toFixed(8)} / $${sample.c?.toFixed(8)}`);
          console.log(`     Volume: ${sample.v?.toLocaleString()}`);
          console.log(`     Structure: ${JSON.stringify(sample)}`);
        }
      } else {
        const errorText = await response.text();
        console.log(`  ❌ Error: ${errorText}`);
      }
    } catch (error) {
      console.log(`  ❌ Request failed: ${error}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  // Test a few high-volume tokens to see if they work
  console.log('\n\n🪙 Testing different tokens with 1H timeframe:');
  
  const tokens = [
    { symbol: 'SOL', address: 'So11111111111111111111111111111111111111112' },
    { symbol: 'USDC', address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
    { symbol: 'BONK', address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263' },
  ];
  
  for (const token of tokens) {
    console.log(`\n${token.symbol} (${token.address}):`);
    
    const params = new URLSearchParams({
      address: token.address,
      type: '1H',
      time_from: String(Math.floor(Date.now() / 1000) - 24 * 3600),
      time_to: String(Math.floor(Date.now() / 1000)),
    });
    
    try {
      const response = await fetch(`${workingEndpoint}?${params.toString()}`, {
        headers: {
          'X-API-KEY': BIRDEYE_API_KEY,
          'accept': 'application/json',
          'x-chain': 'solana'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const items = data?.data || [];
        console.log(`  ✅ ${items.length} candles found`);
      } else {
        const errorText = await response.text();
        console.log(`  ❌ Error: ${errorText}`);
      }
    } catch (error) {
      console.log(`  ❌ Request failed: ${error}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
  }
}

testWorkingOHLCV();
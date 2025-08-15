import 'dotenv/config';

const BIRDEYE_API_KEY = '75934a93cc5f45fdb97e99901de6967b';

async function testBirdEyeEndpoints() {
  console.log('🔍 Testing BirdEye API endpoints\n');
  
  // Test different tokens
  const testTokens = [
    { symbol: 'SOL', address: 'So11111111111111111111111111111111111111112' },
    { symbol: 'USDC', address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
    { symbol: 'BONK', address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263' },
  ];
  
  const timeframes = ['1h', '1d'];
  const endpoints = [
    'https://public-api.birdeye.so/defi/ohlcv3',
    'https://public-api.birdeye.so/defi/ohlcv',
  ];
  
  for (const token of testTokens) {
    console.log(`\n🪙 Testing ${token.symbol} (${token.address})`);
    
    for (const endpoint of endpoints) {
      console.log(`\n📡 Endpoint: ${endpoint}`);
      
      for (const timeframe of timeframes) {
        console.log(`⏰ Timeframe: ${timeframe}`);
        
        const params = new URLSearchParams({
          address: token.address,
          type: timeframe,
          time_from: String(Math.floor(Date.now() / 1000) - 24 * 3600),
          time_to: String(Math.floor(Date.now() / 1000)),
        });
        
        const url = `${endpoint}?${params.toString()}`;
        
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
            const items = data?.data?.items || data?.data?.candles || data?.data || [];
            console.log(`  ✅ Success: ${items.length} candles found`);
            
            if (items.length > 0) {
              console.log('  📊 Sample candle:');
              console.log(`     ${JSON.stringify(items[0], null, 4)}`);
            }
          } else {
            const errorText = await response.text();
            console.log(`  ❌ Error: ${errorText}`);
          }
        } catch (error) {
          console.log(`  ❌ Request failed: ${error}`);
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }
  
  // Test a simpler price endpoint
  console.log('\n🔍 Testing price endpoint');
  try {
    const response = await fetch('https://public-api.birdeye.so/defi/price?address=So11111111111111111111111111111111111111112', {
      headers: {
        'X-API-KEY': BIRDEYE_API_KEY,
        'accept': 'application/json',
        'x-chain': 'solana'
      }
    });
    
    console.log(`Price API Status: ${response.status}`);
    if (response.ok) {
      const data = await response.json();
      console.log('Price API Response:', JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log('Price API Error:', errorText);
    }
  } catch (error) {
    console.log('Price API Request Failed:', error);
  }
}

testBirdEyeEndpoints();
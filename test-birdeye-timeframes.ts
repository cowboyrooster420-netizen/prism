const BIRDEYE_API_KEY = '75934a93cc5f45fdb97e99901de6967b';

async function testTimeframeFormats() {
  console.log('🔍 Testing different timeframe formats for BirdEye API\n');
  
  const testToken = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'; // BONK
  
  // Test different timeframe formats based on common API patterns
  const timeframeFormats = [
    // Common formats
    '1H', '1h', '1hour', 
    '1D', '1d', '1day',
    '5M', '5m', '5min',
    '15M', '15m', '15min',
    // Numeric formats
    '60', '1440', '300', '900',
    // Other possible formats  
    'HOUR_1', 'DAY_1', 'MIN_5', 'MIN_15'
  ];
  
  const endpoints = [
    'https://public-api.birdeye.so/defi/ohlcv3',
    'https://public-api.birdeye.so/defi/ohlcv',
  ];
  
  for (const endpoint of endpoints) {
    console.log(`\n📡 Testing endpoint: ${endpoint}`);
    console.log('=' .repeat(50));
    
    for (const timeframe of timeframeFormats) {
      const params = new URLSearchParams({
        address: testToken,
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
        
        console.log(`${timeframe.padEnd(10)} | Status: ${response.status}`);
        
        if (response.ok) {
          const data = await response.json();
          const items = data?.data?.items || data?.data?.candles || data?.data || [];
          console.log(`${' '.repeat(10)} | ✅ SUCCESS: ${items.length} candles`);
          
          if (items.length > 0) {
            console.log(`${' '.repeat(10)} | Sample: ${JSON.stringify(items[0])}`);
            break; // Found working format, move to next endpoint
          }
        } else {
          const errorText = await response.text();
          try {
            const errorData = JSON.parse(errorText);
            console.log(`${' '.repeat(10)} | ❌ ${errorData.message || 'Error'}`);
          } catch {
            console.log(`${' '.repeat(10)} | ❌ ${errorText.substring(0, 50)}`);
          }
        }
      } catch (error) {
        console.log(`${timeframe.padEnd(10)} | ❌ Request failed: ${error}`);
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  // Test without time parameters
  console.log('\n🔍 Testing without time parameters');
  const simpleUrl = 'https://public-api.birdeye.so/defi/ohlcv3?address=' + testToken;
  
  try {
    const response = await fetch(simpleUrl, {
      headers: {
        'X-API-KEY': BIRDEYE_API_KEY,
        'accept': 'application/json',
        'x-chain': 'solana'
      }
    });
    
    console.log(`Simple request status: ${response.status}`);
    if (response.ok) {
      const data = await response.json();
      console.log('Simple request response:', JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log('Simple request error:', errorText);
    }
  } catch (error) {
    console.log('Simple request failed:', error);
  }
}

testTimeframeFormats();
import { BIRDEYE_API_KEY } from './config';

async function testBirdEyeMarketsAPI() {
  console.log('🧪 Testing BirdEye Markets API...');
  console.log('API Key:', BIRDEYE_API_KEY ? 'Set' : 'Not set');
  
  // Test different endpoints
  const endpoints = [
    'https://public-api.birdeye.so/defi/v2/markets?offset=0&limit=10',
    'https://public-api.birdeye.so/defi/v2/markets',
    'https://public-api.birdeye.so/defi/markets?offset=0&limit=10',
    'https://public-api.birdeye.so/defi/v2/tokenlist?offset=0&limit=10'
  ];
  
  for (const url of endpoints) {
    try {
      console.log(`\n🔍 Testing: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'X-API-KEY': BIRDEYE_API_KEY,
          accept: 'application/json',
        },
      });
      
      console.log(`Status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json() as any;
        console.log('Response structure:', JSON.stringify(data, null, 2).substring(0, 300) + '...');
        
        if (data.data && Array.isArray(data.data)) {
          console.log(`✅ Found ${data.data.length} items`);
          if (data.data.length > 0) {
            console.log('Sample item:', JSON.stringify(data.data[0], null, 2));
          }
        }
      } else {
        const errorText = await response.text();
        console.log('Error response:', errorText);
      }
      
    } catch (error) {
      console.error(`❌ Error testing ${url}:`, error);
    }
    
    // Add delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

testBirdEyeMarketsAPI(); 
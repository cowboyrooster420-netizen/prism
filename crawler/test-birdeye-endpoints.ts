import { BIRDEYE_API_KEY } from './config';

async function testBirdEyeEndpoints() {
  console.log('🧪 Testing BirdEye API endpoints...');
  console.log('API Key:', BIRDEYE_API_KEY ? 'Set' : 'Not set');
  
  // Test the endpoints we know work
  const endpoints = [
    'https://public-api.birdeye.so/defi/v2/tokenlist?offset=0&limit=10',
    'https://public-api.birdeye.so/defi/v2/trending?offset=0&limit=10',
    'https://public-api.birdeye.so/defi/v2/new_listings?offset=0&limit=10'
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
            console.log('Sample item keys:', Object.keys(data.data[0]));
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

testBirdEyeEndpoints(); 
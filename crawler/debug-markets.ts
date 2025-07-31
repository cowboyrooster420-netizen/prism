import { BIRDEYE_API_KEY } from './config';

async function debugMarkets() {
  console.log('🔍 Debugging BirdEye Markets API...');
  console.log('API Key:', BIRDEYE_API_KEY ? 'Set' : 'Not set');
  
  const url = 'https://public-api.birdeye.so/defi/tokenlist?sort_by=v24hUSD&sort_type=desc&offset=0&limit=10&min_liquidity=100';
  
  try {
    console.log(`🔍 Testing: ${url}`);
    console.log('Headers:', {
      'accept': 'application/json',
      'x-chain': 'solana',
      'X-API-KEY': BIRDEYE_API_KEY ? 'Set' : 'Not set',
    });
    
    const response = await fetch(url, {
      headers: {
        'accept': 'application/json',
        'x-chain': 'solana',
        'X-API-KEY': BIRDEYE_API_KEY || '',
      },
    });
    
    console.log(`Status: ${response.status}`);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json() as any;
      console.log('✅ Success! Found tokens:', data.data?.tokens?.length || 0);
    } else {
      const errorText = await response.text();
      console.log('❌ Error response:', errorText);
    }
    
  } catch (error) {
    console.error(`❌ Error:`, error);
  }
}

debugMarkets(); 
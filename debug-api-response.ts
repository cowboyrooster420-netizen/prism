const BIRDEYE_API_KEY = '75934a93cc5f45fdb97e99901de6967b';

async function debugApiResponse() {
  console.log('🔍 Debugging BirdEye API Response Structure\n');
  
  const testToken = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'; // BONK
  const workingEndpoint = 'https://public-api.birdeye.so/defi/ohlcv';
  
  const params = new URLSearchParams({
    address: testToken,
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
    
    console.log(`Response Status: ${response.status}`);
    console.log(`Response Headers:`, Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json();
      console.log('\nFull Response Structure:');
      console.log(JSON.stringify(data, null, 2));
      
      console.log('\nData Analysis:');
      console.log(`- data type: ${typeof data}`);
      console.log(`- data.data type: ${typeof data?.data}`);
      console.log(`- data.data is array: ${Array.isArray(data?.data)}`);
      console.log(`- data keys: ${Object.keys(data || {})}`);
      
      if (data?.data) {
        console.log(`- data.data keys: ${Object.keys(data.data)}`);
        console.log(`- data.data length: ${data.data.length}`);
        
        if (Array.isArray(data.data) && data.data.length > 0) {
          console.log(`- First item: ${JSON.stringify(data.data[0])}`);
        }
      }
    } else {
      const errorText = await response.text();
      console.log('\nError Response:', errorText);
    }
  } catch (error) {
    console.log(`Request failed: ${error}`);
  }
}

debugApiResponse();
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://igyzlakymfosdeepvunk.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlneXpsYWt5bWZvc2RlZXB2dW5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mzc0NjE2MiwiZXhwIjoyMDY5MzIyMTYyfQ.JJVj4TzIlAWrHJ3yn4ptzvreSEAmgGurzRXM0L-LGJI';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugIngestion() {
  console.log('🔍 Debug Candle Ingestion Issue\n');

  // Test what universe selection would return
  console.log('Testing universe selection with our schema...');
  
  // First test: see what columns actually exist
  const { data: sample, error: sampleError } = await supabase
    .from('tokens')
    .select('*')
    .limit(1);
  
  if (sampleError) {
    console.error('Error fetching sample:', sampleError);
    return;
  }
  
  console.log('Available columns:');
  console.log(Object.keys(sample[0] || {}));
  
  // Test with our actual column names
  const { data: tokens, error } = await supabase
    .from('tokens')
    .select('mint_address, volume_24h, holders')
    .gte('holders', 0)
    .gte('volume_24h', 1000)
    .order('volume_24h', { ascending: false })
    .limit(10);
  
  if (error) {
    console.error('Error with corrected query:', error);
    return;
  }
  
  console.log(`\nFound ${tokens?.length} tokens matching criteria:`);
  tokens?.forEach((token, i) => {
    console.log(`${i + 1}. ${token.mint_address} - Volume: $${token.volume_24h?.toLocaleString()}, Holders: ${token.holders}`);
  });
  
  // Test BirdEye API with one specific token
  const BIRDEYE_API_KEY = '75934a93cc5f45fdb97e99901de6967b';
  const testToken = 'So11111111111111111111111111111111111111112'; // SOL
  
  console.log(`\nTesting BirdEye API with SOL token: ${testToken}`);
  
  const params = new URLSearchParams({
    address: testToken,
    type: '1h',
    time_from: String(Math.floor(Date.now() / 1000) - 24 * 3600), // Last 24 hours
    time_to: String(Math.floor(Date.now() / 1000)),
  });

  const testUrl = `https://public-api.birdeye.so/defi/ohlcv3?${params.toString()}`;
  
  try {
    const response = await fetch(testUrl, {
      headers: { 
        'X-API-KEY': BIRDEYE_API_KEY, 
        'accept': 'application/json', 
        'x-chain': 'solana' 
      }
    });
    
    console.log(`BirdEye API Response Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('BirdEye API Response Data:');
      console.log(JSON.stringify(data, null, 2));
      
      const items = data?.data?.items || data?.data || [];
      console.log(`Found ${items.length} candle records for SOL`);
      
      if (items.length > 0) {
        console.log('Sample candle:', items[0]);
      }
    } else {
      const errorText = await response.text();
      console.log('BirdEye API Error Response:', errorText);
    }
  } catch (error) {
    console.error('BirdEye API Request Failed:', error);
  }
}

debugIngestion();
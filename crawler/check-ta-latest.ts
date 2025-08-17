import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkSpecificTokens() {
  console.log('🔍 Checking specific tokens...');
  
  // These are the token IDs we found in ta_latest
  const taTokenIds = [
    'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // BONK
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
    'So11111111111111111111111111111111111111112'   // SOL
  ];
  
  for (const tokenId of taTokenIds) {
    console.log(`\n📊 Checking token: ${tokenId}`);
    
    // Check if this token exists in the tokens table
    const { data: tokenData, error: tokenError } = await supabase
      .from('tokens')
      .select('mint_address, symbol, name, price, volume_24h')
      .eq('mint_address', tokenId)
      .single();
      
    if (tokenError) {
      console.log(`❌ Token not found in tokens table: ${tokenError.message}`);
    } else {
      console.log(`✅ Found token: ${tokenData.symbol} (${tokenData.name})`);
    }
    
    // Check TA data
    const { data: taData, error: taError } = await supabase
      .from('ta_latest')
      .select('token_id, vwap, smart_money_index, trend_alignment_score')
      .eq('token_id', tokenId)
      .single();
      
    if (taError) {
      console.log(`❌ TA data not found: ${taError.message}`);
    } else {
      console.log(`✅ Found TA data: VWAP=${taData.vwap}, SMI=${taData.smart_money_index}`);
    }
  }
}

checkSpecificTokens().then(() => process.exit(0));
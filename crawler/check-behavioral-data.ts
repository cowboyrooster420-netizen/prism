import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkBehavioralData() {
  console.log('🔍 Checking behavioral data in tokens table...');
  
  // Check for tokens with behavioral data
  const { data: behavioralTokens, error: behavioralError } = await supabase
    .from('tokens')
    .select('mint_address, symbol, whale_buys_24h, new_holders_24h, volume_spike_ratio, token_age_hours, source')
    .not('whale_buys_24h', 'is', null)
    .order('whale_buys_24h', { ascending: false })
    .limit(10);
    
  if (behavioralError) {
    console.error('❌ Error:', behavioralError);
    return;
  }
  
  console.log(`📊 Found ${behavioralTokens?.length || 0} tokens with behavioral data`);
  if (behavioralTokens && behavioralTokens.length > 0) {
    console.log('Sample behavioral tokens:');
    behavioralTokens.forEach(token => {
      console.log(`  ${token.symbol}: whales=${token.whale_buys_24h}, holders=${token.new_holders_24h}, spike=${token.volume_spike_ratio}x, age=${token.token_age_hours}h, source=${token.source}`);
    });
  }
  
  // Check how many tokens have TA data for potential overlap
  console.log('\n🔍 Checking overlap with TA data...');
  const { data: taTokens, error: taError } = await supabase
    .from('ta_latest')
    .select('token_id')
    .limit(10);
    
  if (taError) {
    console.error('❌ TA Error:', taError);
  } else {
    console.log(`📊 Found ${taTokens?.length || 0} tokens with TA data`);
    
    if (behavioralTokens && taTokens) {
      const behavioralTokenIds = new Set(behavioralTokens.map(t => t.mint_address));
      const taTokenIds = new Set(taTokens.map(t => t.token_id));
      
      const overlap = [...behavioralTokenIds].filter(id => taTokenIds.has(id));
      console.log(`🔗 Tokens with both behavioral and TA data: ${overlap.length}`);
      if (overlap.length > 0) {
        console.log('Overlapping tokens:', overlap);
      }
    }
  }
}

checkBehavioralData().then(() => process.exit(0));
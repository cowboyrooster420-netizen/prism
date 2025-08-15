/**
 * Check if behavioral metrics are now populated correctly
 */

import { SUPABASE_URL, SUPABASE_KEY } from './config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkBehavioralMetrics() {
  console.log('🔍 Checking behavioral metrics in database...');
  
  try {
    // Get the most recent tokens with behavioral data
    const { data: tokens, error } = await supabase
      .from('tokens')
      .select('name, symbol, whale_buys_24h, new_holders_24h, volume_spike_ratio, token_age_hours, created_at')
      .or('whale_buys_24h.gt.0,new_holders_24h.gt.0,volume_spike_ratio.gt.1.1')
      .order('created_at', { ascending: false })
      .limit(15);
    
    if (error) {
      console.error('❌ Error fetching tokens:', error);
      return;
    }
    
    if (!tokens || tokens.length === 0) {
      console.log('❌ No tokens found with behavioral metrics > 0');
      
      // Check for any recent tokens
      const { data: recentTokens } = await supabase
        .from('tokens')
        .select('name, symbol, whale_buys_24h, new_holders_24h, volume_spike_ratio, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
        
      console.log('\n📊 Recent tokens (any behavioral data):');
      recentTokens?.forEach(token => {
        console.log(`- ${token.symbol}: whale_buys=${token.whale_buys_24h}, new_holders=${token.new_holders_24h}, volume_spike=${token.volume_spike_ratio}`);
      });
      
      return;
    }
    
    console.log(`✅ Found ${tokens.length} tokens with behavioral metrics!`);
    console.log('\n📊 Tokens with Behavioral Metrics:');
    
    tokens.forEach((token, index) => {
      console.log(`\n${index + 1}. ${token.symbol} (${token.name})`);
      console.log(`   🐋 Whale buys: ${token.whale_buys_24h}`);
      console.log(`   📈 New holders: ${token.new_holders_24h}`);
      console.log(`   💥 Volume spike: ${token.volume_spike_ratio}x`);
      console.log(`   ⏰ Token age: ${token.token_age_hours}h`);
    });
    
    // Summary stats
    const avgWhaleButys = tokens.reduce((sum, t) => sum + t.whale_buys_24h, 0) / tokens.length;
    const avgNewHolders = tokens.reduce((sum, t) => sum + t.new_holders_24h, 0) / tokens.length;
    const avgVolumeSpike = tokens.reduce((sum, t) => sum + t.volume_spike_ratio, 0) / tokens.length;
    
    console.log('\n📈 Summary Statistics:');
    console.log(`   Average whale buys: ${avgWhaleButys.toFixed(1)}`);
    console.log(`   Average new holders: ${avgNewHolders.toFixed(1)}`);
    console.log(`   Average volume spike: ${avgVolumeSpike.toFixed(2)}x`);
    
  } catch (error) {
    console.error('❌ Script failed:', error);
  }
}

checkBehavioralMetrics();
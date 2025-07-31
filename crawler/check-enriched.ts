import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY } from './config';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkEnrichedTokens() {
  console.log('🔍 Checking enriched tokens...');
  
  try {
    // Check tokens with holder counts
    const { data: tokensWithHolders, error: holdersError } = await supabase
      .from('tokens')
      .select('id, mint_address, name, symbol, holder_count, tx_count_last_24h')
      .not('holder_count', 'is', null)
      .limit(10);

    if (holdersError) {
      console.error('❌ Database error:', holdersError);
      return;
    }

    console.log(`📊 Found ${tokensWithHolders?.length || 0} tokens with holder counts`);
    
    if (tokensWithHolders && tokensWithHolders.length > 0) {
      console.log('Tokens with holder counts:');
      tokensWithHolders.forEach((token, i) => {
        console.log(`${i + 1}. ${token.name} (${token.symbol}) - ${token.holder_count} holders, ${token.tx_count_last_24h || 0} txs`);
      });
    } else {
      console.log('No tokens found with holder counts');
    }

    // Check total tokens
    const { data: allTokens, error: allError } = await supabase
      .from('tokens')
      .select('id')
      .limit(1);

    if (allError) {
      console.error('❌ Database error:', allError);
      return;
    }

    console.log(`📊 Total tokens in database: ${allTokens?.length || 0}`);

  } catch (error) {
    console.error('❌ Error checking enriched tokens:', error);
  }
}

checkEnrichedTokens(); 
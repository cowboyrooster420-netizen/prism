import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY } from './config';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkDatabase() {
  console.log('🔍 Checking database...');
  
  try {
    const { data: tokens, error } = await supabase
      .from('tokens')
      .select('id, mint_address, name, symbol, holder_count')
      .limit(10);

    if (error) {
      console.error('❌ Database error:', error);
      return;
    }

    console.log(`📊 Found ${tokens?.length || 0} tokens in database`);
    
    if (tokens && tokens.length > 0) {
      console.log('First few tokens:');
      tokens.forEach((token, i) => {
        console.log(`${i + 1}. ${token.name} (${token.symbol}) - ${token.mint_address} - holders: ${token.holder_count || 'null'}`);
      });
    }
  } catch (error) {
    console.error('❌ Error checking database:', error);
  }
}

checkDatabase(); 
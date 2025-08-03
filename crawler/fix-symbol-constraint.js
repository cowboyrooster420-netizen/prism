import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSymbolConstraint() {
  try {
    console.log('🧪 Testing symbol constraints...');
    
    // Test tokens with various symbol formats
    const testTokens = [
      {
        address: 'TEST123456789',
        name: 'Test Token',
        symbol: '$TEST',
        price: 1.0,
        market_cap: 1000000,
        volume_24h: 1000,
        price_change_24h: 0,
        liquidity: 10000,
        holders: 100,
        source: 'test',
        is_active: true,
        is_verified: false
      },
      {
        address: 'TEST123456790',
        name: 'Test Token 2',
        symbol: 'JitoSOL',
        price: 1.0,
        market_cap: 1000000,
        volume_24h: 1000,
        price_change_24h: 0,
        liquidity: 10000,
        holders: 100,
        source: 'test',
        is_active: true,
        is_verified: false
      },
      {
        address: 'TEST123456791',
        name: 'Test Token 3',
        symbol: 'aura',
        price: 1.0,
        market_cap: 1000000,
        volume_24h: 1000,
        price_change_24h: 0,
        liquidity: 10000,
        holders: 100,
        source: 'test',
        is_active: true,
        is_verified: false
      }
    ];
    
    for (const testToken of testTokens) {
      const { error: insertError } = await supabase
        .from('tokens')
        .upsert(testToken, { onConflict: 'address' });
      
      if (insertError) {
        console.error(`❌ Failed to insert ${testToken.symbol}:`, insertError.message);
      } else {
        console.log(`✅ Successfully inserted ${testToken.symbol}`);
        
        // Clean up the test token
        await supabase
          .from('tokens')
          .delete()
          .eq('address', testToken.address);
      }
    }
    
    console.log('\n🔧 To fix all symbol issues, update the constraint to allow lowercase letters:');
    console.log('1. Go to your Supabase dashboard (https://supabase.com/dashboard)');
    console.log('2. Select your project');
    console.log('3. Go to SQL Editor');
    console.log('4. Run these commands:');
    console.log('   ALTER TABLE tokens DROP CONSTRAINT IF EXISTS tokens_symbol_check;');
    console.log('   ALTER TABLE tokens ADD CONSTRAINT tokens_symbol_check CHECK (symbol ~ \'^[A-Za-z0-9$]{2,20}$\');');
    console.log('5. Click "Run" to execute the commands');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testSymbolConstraint(); 
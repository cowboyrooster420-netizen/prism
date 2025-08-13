import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
import 'dotenv/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Please ensure .env.local has:');
  console.log('- NEXT_PUBLIC_SUPABASE_URL');
  console.log('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabaseStatus() {
  console.log('🔍 Checking database status...');
  
  try {
    // Check if mint_address column exists and has data
    console.log('📊 Checking mint_address column...');
    const { data: mintAddressData, error: mintAddressError } = await supabase
      .from('tokens')
      .select('mint_address')
      .limit(5);
    
    if (mintAddressError) {
      console.log('❌ Error checking mint_address:', mintAddressError.message);
    } else {
      console.log('✅ mint_address column exists');
      console.log('📝 Sample mint_address data:', mintAddressData?.map(t => t.mint_address));
    }
    
    // Check if address column still exists
    console.log('📊 Checking address column...');
    const { data: addressData, error: addressError } = await supabase
      .from('tokens')
      .select('address')
      .limit(5);
    
    if (addressError) {
      console.log('❌ Error checking address:', addressError.message);
    } else {
      console.log('✅ address column still exists');
      console.log('📝 Sample address data:', addressData?.map(t => t.address));
    }
    
    // Get full sample token to see the structure
    console.log('📋 Getting full token structure...');
    const { data: sampleTokens, error: sampleError } = await supabase
      .from('tokens')
      .select('*')
      .limit(3);
    
    if (sampleError) {
      console.log('❌ Error fetching sample tokens:', sampleError.message);
    } else {
      console.log('✅ Sample tokens fetched:', sampleTokens?.length || 0);
      if (sampleTokens && sampleTokens.length > 0) {
        console.log('📝 Full token structure:');
        console.log(JSON.stringify(sampleTokens[0], null, 2));
        
        // Check if mint_address has valid data
        const validMintAddresses = sampleTokens.filter(token => 
          token.mint_address && 
          token.mint_address.length >= 32 && 
          token.mint_address.length <= 44 &&
          /^[1-9A-HJ-NP-Za-km-z]+$/.test(token.mint_address)
        );
        
        console.log(`📊 mint_address validation: ${validMintAddresses.length}/${sampleTokens.length} have valid Solana addresses`);
        
        if (validMintAddresses.length > 0) {
          console.log('✅ Database has valid Solana addresses in mint_address column');
          console.log('🎉 Your charts should now work!');
        } else {
          console.log('⚠️  mint_address column exists but has no valid data');
          console.log('💡 You may need to copy data from address to mint_address');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Database check failed:', error);
  }
}

// Run the check
checkDatabaseStatus()
  .then(() => {
    console.log('✅ Database status check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Database status check failed:', error);
    process.exit(1);
  });

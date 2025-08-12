import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY } from './config';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fixDatabaseSchema() {
  console.log('🔧 Starting database schema fix...');
  
  try {
    // Check current table structure
    console.log('📊 Checking current table structure...');
    
    // Check if address column exists
    const { data: addressCheck, error: addressError } = await supabase
      .from('tokens')
      .select('address')
      .limit(1);
    
    if (addressError) {
      console.log('❌ Error checking address column:', addressError.message);
    } else {
      console.log('✅ address column check completed');
    }
    
    // Check if mint_address column exists
    const { data: mintAddressCheck, error: mintAddressError } = await supabase
      .from('tokens')
      .select('mint_address')
      .limit(1);
    
    if (mintAddressError) {
      console.log('❌ Error checking mint_address column:', mintAddressError.message);
      console.log('🔄 Adding mint_address column...');
      
      // We can't add columns via Supabase client, but we can update existing data
      // Let's try to update the address field to be accessible as mint_address
      console.log('💡 Since we can\'t add columns via client, we need to:');
      console.log('   1. Add mint_address column in Supabase dashboard');
      console.log('   2. Copy data from address to mint_address');
      console.log('   3. Remove the address column');
      
    } else {
      console.log('✅ mint_address column already exists');
    }
    
    // Get sample data to see what's actually in the database
    console.log('📋 Getting sample token data...');
    const { data: sampleTokens, error: sampleError } = await supabase
      .from('tokens')
      .select('*')
      .limit(5);
    
    if (sampleError) {
      console.log('❌ Error fetching sample tokens:', sampleError.message);
    } else {
      console.log('✅ Sample tokens fetched:', sampleTokens?.length || 0);
      if (sampleTokens && sampleTokens.length > 0) {
        console.log('📝 Sample token structure:');
        console.log(JSON.stringify(sampleTokens[0], null, 2));
        
        // Check if addresses are valid Solana addresses
        const validTokens = sampleTokens.filter(token => 
          token.address && 
          token.address.length >= 32 && 
          token.address.length <= 44 &&
          /^[1-9A-HJ-NP-Za-km-z]+$/.test(token.address)
        );
        
        console.log(`📊 Address validation: ${validTokens.length}/${sampleTokens.length} have valid Solana addresses`);
        
        if (validTokens.length > 0) {
          console.log('✅ Database has valid Solana addresses in the address column');
          console.log('💡 Next step: Add mint_address column and copy data');
        }
      }
    }
    
    console.log('\n📋 MANUAL STEPS REQUIRED:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Run this SQL:');
    console.log(`
-- Add mint_address column
ALTER TABLE tokens ADD COLUMN mint_address VARCHAR(50);

-- Copy data from address to mint_address
UPDATE tokens SET mint_address = address WHERE address IS NOT NULL;

-- Add constraint
ALTER TABLE tokens ADD CONSTRAINT tokens_mint_address_check 
    CHECK (length(mint_address) BETWEEN 32 AND 50 AND mint_address ~ '^[1-9A-HJ-NP-Za-km-z]+$');

-- Add unique index
CREATE UNIQUE INDEX idx_tokens_mint_address ON tokens USING btree(mint_address);

-- Verify the data
SELECT id, name, symbol, address, mint_address, length(mint_address) as addr_length
FROM tokens 
LIMIT 5;
    `);
    
  } catch (error) {
    console.error('❌ Database schema fix failed:', error);
  }
}

// Run the fix
fixDatabaseSchema()
  .then(() => {
    console.log('✅ Database schema check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Database schema fix failed:', error);
    process.exit(1);
  });

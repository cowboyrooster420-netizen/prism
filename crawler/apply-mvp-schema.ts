/**
 * Apply MVP Behavioral Schema Changes
 * This uses the same setup as your existing crawlers
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY } from './config';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function applyMVPSchema() {
  console.log('🚀 Applying MVP Behavioral Schema Changes...\n');

  try {
    // Step 1: Add new columns
    console.log('📋 Adding behavioral columns...');
    
    const addColumnsSQL = `
      ALTER TABLE tokens 
      ADD COLUMN IF NOT EXISTS new_holders_24h INTEGER DEFAULT 0 CHECK (new_holders_24h >= 0),
      ADD COLUMN IF NOT EXISTS whale_buys_24h INTEGER DEFAULT 0 CHECK (whale_buys_24h >= 0),
      ADD COLUMN IF NOT EXISTS volume_spike_ratio NUMERIC(5,2) DEFAULT 1.0 CHECK (volume_spike_ratio >= 0),
      ADD COLUMN IF NOT EXISTS token_age_hours INTEGER DEFAULT 0 CHECK (token_age_hours >= 0);
    `;

    const { error: addColumnsError } = await supabase.rpc('exec', { sql: addColumnsSQL });
    
    if (addColumnsError) {
      console.log('Note: Column addition may have failed if columns already exist:', addColumnsError.message);
    } else {
      console.log('✅ Behavioral columns added successfully');
    }

    // Step 2: Add indexes
    console.log('📋 Adding performance indexes...');
    
    const addIndexesSQL = `
      CREATE INDEX IF NOT EXISTS idx_tokens_behavioral 
          ON tokens(new_holders_24h DESC, whale_buys_24h DESC, volume_spike_ratio DESC);
      
      CREATE INDEX IF NOT EXISTS idx_tokens_age ON tokens(token_age_hours ASC);
      
      CREATE INDEX IF NOT EXISTS idx_tokens_behavioral_active 
          ON tokens(is_active, new_holders_24h DESC, whale_buys_24h DESC) 
          WHERE is_active = true;
    `;

    const indexStatements = addIndexesSQL.split(';').filter(stmt => stmt.trim());
    
    for (const statement of indexStatements) {
      if (statement.trim()) {
        const { error } = await supabase.rpc('exec', { sql: statement });
        if (error) {
          console.log(`Index creation note: ${error.message}`);
        }
      }
    }
    
    console.log('✅ Performance indexes created');

    // Step 3: Verify the changes
    console.log('\n🔍 Verifying schema changes...');
    
    // Check if new columns exist by trying a simple query
    const { data: testData, error: testError } = await supabase
      .from('tokens')
      .select('symbol, new_holders_24h, whale_buys_24h, volume_spike_ratio, token_age_hours')
      .eq('is_active', true)
      .limit(3);

    if (testError) {
      console.error('❌ Verification failed:', testError.message);
      console.error('This might mean the columns were not added correctly.');
    } else {
      console.log('✅ Schema verification successful!');
      console.log('Sample data with new behavioral columns:');
      testData?.forEach(token => {
        console.log(`   ${token.symbol}: holders+${token.new_holders_24h}, whales:${token.whale_buys_24h}, spike:${token.volume_spike_ratio}x, age:${token.token_age_hours}h`);
      });
    }

    console.log('\n🎉 MVP Behavioral Schema applied successfully!');
    console.log('\nNew columns added to tokens table:');
    console.log('- new_holders_24h: Count of new holders in last 24 hours');
    console.log('- whale_buys_24h: Count of whale buys (>$10k) in last 24 hours');
    console.log('- volume_spike_ratio: Current volume vs 7-day average');
    console.log('- token_age_hours: Hours since first transaction');
    
    console.log('\nNext steps:');
    console.log('1. Build Jupiter API integration');
    console.log('2. Create behavioral data collection service');
    console.log('3. Start populating the new columns with real data');

  } catch (error) {
    console.error('❌ Failed to apply MVP schema:', error);
    process.exit(1);
  }
}

// Execute the schema application
console.log('Using Supabase URL:', SUPABASE_URL?.substring(0, 30) + '...');
applyMVPSchema().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
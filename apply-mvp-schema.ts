/**
 * Apply MVP Behavioral Schema Changes
 * Run this script to safely add behavioral tracking columns to your existing database
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables (same as crawler config)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function applyMVPSchema() {
  console.log('🚀 Applying MVP Behavioral Schema Changes...\n');

  try {
    // Read the schema file
    const schemaPath = join(__dirname, 'crawler', 'mvp-behavioral-schema.sql');
    const schemaSql = readFileSync(schemaPath, 'utf-8');

    // Split the SQL into individual statements
    const statements = schemaSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--') && !stmt.startsWith('/*'));

    console.log(`📋 Executing ${statements.length} SQL statements...\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement) continue;

      console.log(`[${i + 1}/${statements.length}] Executing: ${statement.substring(0, 50)}...`);
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
        
        if (error) {
          console.error(`❌ Error in statement ${i + 1}:`, error);
        } else {
          console.log(`✅ Statement ${i + 1} completed successfully`);
        }
      } catch (err) {
        console.error(`❌ Failed to execute statement ${i + 1}:`, err);
      }
    }

    // Verify the changes
    console.log('\n🔍 Verifying schema changes...');
    
    const { data: columns, error: columnError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'tokens')
      .in('column_name', ['new_holders_24h', 'whale_buys_24h', 'volume_spike_ratio', 'token_age_hours']);

    if (columnError) {
      console.error('❌ Error verifying columns:', columnError);
    } else {
      console.log('✅ New behavioral columns:');
      columns?.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} (default: ${col.column_default})`);
      });
    }

    // Test a simple query
    console.log('\n🧪 Testing behavioral query...');
    const { data: testData, error: testError } = await supabase
      .from('tokens')
      .select('symbol, new_holders_24h, whale_buys_24h, volume_spike_ratio, token_age_hours')
      .eq('is_active', true)
      .limit(5);

    if (testError) {
      console.error('❌ Error testing query:', testError);
    } else {
      console.log('✅ Behavioral query test successful:');
      testData?.forEach(token => {
        console.log(`   ${token.symbol}: holders+${token.new_holders_24h}, whales:${token.whale_buys_24h}, spike:${token.volume_spike_ratio}x`);
      });
    }

    console.log('\n🎉 MVP Behavioral Schema applied successfully!');
    console.log('\nNext steps:');
    console.log('1. Start collecting behavioral data with Jupiter/Helius APIs');
    console.log('2. Build the behavioral data collection service');
    console.log('3. Test queries like: "tokens with whale activity"');

  } catch (error) {
    console.error('❌ Failed to apply MVP schema:', error);
    process.exit(1);
  }
}

// Execute the schema application
applyMVPSchema().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
import { createClient } from '@supabase/supabase-js';

// Use the provided connection details
const SUPABASE_URL = 'https://igyzlakymfosdeepvunk.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlneXpsYWt5bWZvc2RlZXB2dW5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mzc0NjE2MiwiZXhwIjoyMDY5MzIyMTYyfQ.JJVj4TzIlAWrHJ3yn4ptzvreSEAmgGurzRXM0L-LGJI';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testConnection() {
  try {
    console.log('🔄 Testing database connection...');
    
    // Test with a column we know exists from the ta_worker.ts output
    const { data, error } = await supabase
      .from('ta_features')
      .select('token_id')
      .limit(1);
    
    if (error) {
      console.error('❌ Connection failed:', error);
      return false;
    }
    
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Connection test error:', error);
    return false;
  }
}

async function executeSQL(sql: string, description: string) {
  try {
    console.log(`⚙️  ${description}...`);
    
    // Use a PostgreSQL direct connection approach since RPC might not work
    // For now, let's use SQL through Supabase's query functionality
    const result = await supabase.rpc('execute_sql', { sql_query: sql });
    
    if (result.error) {
      // If the RPC doesn't work, let's check if it's a permissions issue
      console.log(`⚠️  RPC failed for: ${description}`, result.error.message);
      
      // Try to continue with the next statement
      return false;
    }
    
    console.log(`✅ Success: ${description}`);
    return true;
  } catch (error) {
    console.log(`⚠️  Error: ${description}`, error);
    return false;
  }
}

async function manualMigrationInstructions() {
  console.log(`
🔧 MANUAL MIGRATION REQUIRED
================================

Since the automated migration is hitting permission restrictions, please run the following SQL statements manually in your Supabase SQL Editor:

📋 Copy and paste this SQL into your Supabase Dashboard > SQL Editor:

-- Add Elite TA Features (Phase 1) to ta_features table
-- VWAP Features
ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS vwap DOUBLE PRECISION;
ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS vwap_distance DOUBLE PRECISION;
ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS vwap_upper_band DOUBLE PRECISION;
ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS vwap_lower_band DOUBLE PRECISION;
ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS vwap_band_position DOUBLE PRECISION;

-- Support/Resistance Features
ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS support_level DOUBLE PRECISION;
ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS resistance_level DOUBLE PRECISION;
ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS support_distance DOUBLE PRECISION;
ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS resistance_distance DOUBLE PRECISION;

-- Smart Money Flow Features
ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS smart_money_index DOUBLE PRECISION;

-- Multi-timeframe Analysis
ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS trend_alignment_score DOUBLE PRECISION;

-- Volume Profile
ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS volume_profile_score DOUBLE PRECISION;

-- Enhanced Boolean Signals
ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS vwap_breakout_bullish BOOLEAN DEFAULT FALSE;
ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS vwap_breakout_bearish BOOLEAN DEFAULT FALSE;
ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS near_support BOOLEAN DEFAULT FALSE;
ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS near_resistance BOOLEAN DEFAULT FALSE;
ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS smart_money_bullish BOOLEAN DEFAULT FALSE;
ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS trend_alignment_strong BOOLEAN DEFAULT FALSE;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_ta_features_vwap ON ta_features(vwap);
CREATE INDEX IF NOT EXISTS idx_ta_features_smart_money ON ta_features(smart_money_index);
CREATE INDEX IF NOT EXISTS idx_ta_features_trend_alignment ON ta_features(trend_alignment_score);
CREATE INDEX IF NOT EXISTS idx_ta_features_vwap_breakout_bullish ON ta_features(vwap_breakout_bullish);
CREATE INDEX IF NOT EXISTS idx_ta_features_near_support ON ta_features(near_support);
CREATE INDEX IF NOT EXISTS idx_ta_features_near_resistance ON ta_features(near_resistance);

-- Update the ta_latest view to include new columns
DROP VIEW IF EXISTS ta_latest;
CREATE VIEW ta_latest AS
SELECT DISTINCT ON (token_id, timeframe) *
FROM ta_features
ORDER BY token_id, timeframe, ts DESC;

📋 After running the above SQL, come back and run this script again to verify the migration worked.
`);
}

async function testNewColumns() {
  console.log('\n🔍 Testing new Elite TA columns...');
  
  try {
    const { data, error } = await supabase
      .from('ta_features')
      .select('vwap, smart_money_index, trend_alignment_score, vwap_breakout_bullish')
      .limit(1);
    
    if (error) {
      console.log('⚠️  New columns not accessible yet:', error.message);
      if (error.message.includes('does not exist')) {
        console.log('❌ Elite TA columns have not been created yet');
        return false;
      }
      return false;
    }
    
    console.log('✅ Elite TA columns are accessible!');
    console.log('📊 New columns verified:');
    if (data && data.length > 0) {
      const cols = Object.keys(data[0]);
      cols.forEach(col => console.log(`   - ${col}`));
    }
    return true;
    
  } catch (error) {
    console.log('⚠️  Error testing new columns:', error);
    return false;
  }
}

async function checkCurrentSchema() {
  console.log('\n🔍 Checking current ta_features schema...');
  
  try {
    const { data, error } = await supabase
      .from('ta_features')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('❌ Could not fetch schema:', error.message);
      return false;
    }
    
    if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      console.log('📋 Current ta_features columns:');
      columns.forEach(col => console.log(`   - ${col}`));
      
      // Check if any elite TA columns already exist
      const eliteColumns = ['vwap', 'smart_money_index', 'trend_alignment_score', 'vwap_breakout_bullish'];
      const existingEliteColumns = columns.filter(col => eliteColumns.includes(col));
      
      if (existingEliteColumns.length > 0) {
        console.log(`✅ Found ${existingEliteColumns.length} Elite TA columns already exist:`);
        existingEliteColumns.forEach(col => console.log(`   - ${col}`));
        return true;
      } else {
        console.log('⚠️  No Elite TA columns found in current schema');
        return false;
      }
    }
    
    console.log('⚠️  No data found in ta_features table');
    return false;
    
  } catch (error) {
    console.log('❌ Error checking schema:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Elite TA Features Migration Tool');
  console.log('====================================');
  
  // Test connection first
  if (!await testConnection()) {
    console.log('❌ Migration aborted - cannot connect to database');
    return;
  }
  
  // Check current schema
  const hasEliteColumns = await checkCurrentSchema();
  
  if (hasEliteColumns) {
    console.log('\n🎉 Elite TA columns already exist! Migration appears to be complete.');
    await testNewColumns();
    return;
  }
  
  // Show manual migration instructions
  await manualMigrationInstructions();
  
  console.log('\n⏳ Waiting 10 seconds, then checking if migration was completed...');
  
  // Wait 10 seconds then check again
  setTimeout(async () => {
    console.log('\n🔄 Checking migration status...');
    const success = await testNewColumns();
    
    if (success) {
      console.log('\n🎉 Migration successful! Elite TA columns are now available.');
    } else {
      console.log('\n⚠️  Migration not yet complete. Please run the SQL statements manually and try again.');
    }
  }, 10000);
}

// Run the migration checker
main().catch(console.error);
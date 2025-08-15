import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

// Extract connection details from Supabase URL
const SUPABASE_URL = 'https://igyzlakymfosdeepvunk.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlneXpsYWt5bWZvc2RlZXB2dW5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mzc0NjE2MiwiZXhwIjoyMDY5MzIyMTYyfQ.JJVj4TzIlAWrHJ3yn4ptzvreSEAmgGurzRXM0L-LGJI';

// Convert Supabase URL to PostgreSQL connection string
const dbHost = 'db.igyzlakymfosdeepvunk.supabase.co';
const dbName = 'postgres';
const dbPort = 5432;

const connectionConfig = {
  host: dbHost,
  port: dbPort,
  database: dbName,
  user: 'postgres',
  password: SUPABASE_SERVICE_KEY.split('.')[1], // This won't work, we need the actual password
  ssl: {
    rejectUnauthorized: false
  }
};

async function runDirectPostgresMigration() {
  console.log('🚀 Attempting direct PostgreSQL connection migration...');
  
  // Since we don't have the actual PostgreSQL password, let's show a connection string
  // that the user can use with psql or other tools
  
  console.log('⚠️  Direct PostgreSQL connection requires database password.');
  console.log('💡 Alternative approaches:');
  console.log('');
  console.log('1. 📋 Copy the SQL to Supabase Dashboard > SQL Editor:');
  console.log('   https://supabase.com/dashboard/project/igyzlakymfosdeepvunk/sql');
  console.log('');
  console.log('2. 🔧 Use psql command line (if you have the database password):');
  console.log('   psql "postgresql://postgres:[PASSWORD]@db.igyzlakymfosdeepvunk.supabase.co:5432/postgres"');
  console.log('');
  
  // Read and display the SQL
  try {
    const sqlPath = path.join(__dirname, 'add-elite-ta-columns.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
    
    console.log('📋 SQL Migration Script:');
    console.log('========================');
    console.log(sqlContent);
    console.log('========================');
    
  } catch (error) {
    console.error('❌ Could not read SQL file:', error);
  }
}

async function testSupabaseRPC() {
  console.log('🔄 Testing alternative: Supabase RPC approach...');
  
  // Let's try a different approach using curl to hit Supabase REST API directly
  const statements = [
    'ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS vwap DOUBLE PRECISION',
    'ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS vwap_distance DOUBLE PRECISION',
    'ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS vwap_upper_band DOUBLE PRECISION',
    'ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS vwap_lower_band DOUBLE PRECISION',
    'ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS vwap_band_position DOUBLE PRECISION',
    'ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS support_level DOUBLE PRECISION',
    'ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS resistance_level DOUBLE PRECISION',
    'ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS support_distance DOUBLE PRECISION',
    'ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS resistance_distance DOUBLE PRECISION',
    'ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS smart_money_index DOUBLE PRECISION',
    'ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS trend_alignment_score DOUBLE PRECISION',
    'ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS volume_profile_score DOUBLE PRECISION',
    'ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS vwap_breakout_bullish BOOLEAN DEFAULT FALSE',
    'ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS vwap_breakout_bearish BOOLEAN DEFAULT FALSE',
    'ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS near_support BOOLEAN DEFAULT FALSE',
    'ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS near_resistance BOOLEAN DEFAULT FALSE',
    'ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS smart_money_bullish BOOLEAN DEFAULT FALSE',
    'ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS trend_alignment_strong BOOLEAN DEFAULT FALSE'
  ];
  
  console.log('🔧 Generating curl commands for direct API execution:');
  console.log('');
  
  statements.forEach((sql, index) => {
    console.log(`# Statement ${index + 1}`);
    console.log(`curl -X POST 'https://igyzlakymfosdeepvunk.supabase.co/rest/v1/rpc/execute_sql' \\`);
    console.log(`  -H "apikey: ${SUPABASE_SERVICE_KEY}" \\`);
    console.log(`  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -d '{"sql_query": "${sql}"}'`);
    console.log('');
  });
}

async function createSimpleMigrationScript() {
  console.log('📄 Creating simple SQL file for manual execution...');
  
  const simpleSql = `
-- Elite TA Features Migration
-- Run this in Supabase Dashboard > SQL Editor

-- Add VWAP Features
ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS vwap DOUBLE PRECISION;
ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS vwap_distance DOUBLE PRECISION;
ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS vwap_upper_band DOUBLE PRECISION;
ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS vwap_lower_band DOUBLE PRECISION;
ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS vwap_band_position DOUBLE PRECISION;

-- Add Support/Resistance Features
ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS support_level DOUBLE PRECISION;
ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS resistance_level DOUBLE PRECISION;
ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS support_distance DOUBLE PRECISION;
ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS resistance_distance DOUBLE PRECISION;

-- Add Smart Money Flow Features
ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS smart_money_index DOUBLE PRECISION;

-- Add Multi-timeframe Analysis
ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS trend_alignment_score DOUBLE PRECISION;

-- Add Volume Profile
ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS volume_profile_score DOUBLE PRECISION;

-- Add Boolean Signals
ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS vwap_breakout_bullish BOOLEAN DEFAULT FALSE;
ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS vwap_breakout_bearish BOOLEAN DEFAULT FALSE;
ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS near_support BOOLEAN DEFAULT FALSE;
ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS near_resistance BOOLEAN DEFAULT FALSE;
ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS smart_money_bullish BOOLEAN DEFAULT FALSE;
ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS trend_alignment_strong BOOLEAN DEFAULT FALSE;

-- Create Performance Indexes
CREATE INDEX IF NOT EXISTS idx_ta_features_vwap ON ta_features(vwap);
CREATE INDEX IF NOT EXISTS idx_ta_features_smart_money ON ta_features(smart_money_index);
CREATE INDEX IF NOT EXISTS idx_ta_features_trend_alignment ON ta_features(trend_alignment_score);
CREATE INDEX IF NOT EXISTS idx_ta_features_vwap_breakout_bullish ON ta_features(vwap_breakout_bullish);
CREATE INDEX IF NOT EXISTS idx_ta_features_near_support ON ta_features(near_support);
CREATE INDEX IF NOT EXISTS idx_ta_features_near_resistance ON ta_features(near_resistance);

-- Update the ta_latest view
DROP VIEW IF EXISTS ta_latest;
CREATE VIEW ta_latest AS
SELECT DISTINCT ON (token_id, timeframe) *
FROM ta_features
ORDER BY token_id, timeframe, ts DESC;

-- Verify the migration
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ta_features' 
AND column_name IN ('vwap', 'smart_money_index', 'trend_alignment_score')
ORDER BY column_name;
`;

  fs.writeFileSync(path.join(__dirname, 'elite-ta-migration-simple.sql'), simpleSql);
  console.log('✅ Created elite-ta-migration-simple.sql');
  console.log('📋 Copy the contents of this file to Supabase SQL Editor to run the migration.');
}

async function main() {
  console.log('🎯 Elite TA Migration - Alternative Execution Methods');
  console.log('====================================================');
  
  await runDirectPostgresMigration();
  console.log('\n' + '='.repeat(60) + '\n');
  
  await createSimpleMigrationScript();
  console.log('\n' + '='.repeat(60) + '\n');
  
  console.log('📋 RECOMMENDED STEPS:');
  console.log('1. Go to https://supabase.com/dashboard/project/igyzlakymfosdeepvunk/sql');
  console.log('2. Copy the SQL from elite-ta-migration-simple.sql');
  console.log('3. Paste it into the SQL Editor');
  console.log('4. Click "Run" to execute the migration');
  console.log('5. Run the final-ta-migration.ts script again to verify');
}

main().catch(console.error);
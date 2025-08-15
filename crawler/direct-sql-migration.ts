import { createClient } from '@supabase/supabase-js';

// Use the provided connection details
const SUPABASE_URL = 'https://igyzlakymfosdeepvunk.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlneXpsYWt5bWZvc2RlZXB2dW5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mzc0NjE2MiwiZXhwIjoyMDY5MzIyMTYyfQ.JJVj4TzIlAWrHJ3yn4ptzvreSEAmgGurzRXM0L-LGJI';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testConnection() {
  try {
    console.log('🔄 Testing database connection...');
    
    const { data, error } = await supabase
      .from('ta_features')
      .select('id')
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

async function runSingleStatement(sql: string, description: string) {
  try {
    console.log(`⚙️  ${description}...`);
    
    const { data, error } = await supabase.rpc('exec', { sql });
    
    if (error) {
      console.error(`❌ Failed: ${description}`, error);
      return false;
    }
    
    console.log(`✅ Success: ${description}`);
    return true;
  } catch (error) {
    console.error(`❌ Error: ${description}`, error);
    return false;
  }
}

async function runMigration() {
  console.log('🚀 Starting Elite TA Migration');
  console.log('===============================');
  
  // Test connection first
  if (!await testConnection()) {
    console.log('❌ Migration aborted - cannot connect to database');
    return;
  }
  
  // Define all SQL statements with descriptions
  const statements = [
    // VWAP Features
    {
      sql: 'ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS vwap DOUBLE PRECISION',
      desc: 'Adding vwap column'
    },
    {
      sql: 'ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS vwap_distance DOUBLE PRECISION',
      desc: 'Adding vwap_distance column'
    },
    {
      sql: 'ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS vwap_upper_band DOUBLE PRECISION',
      desc: 'Adding vwap_upper_band column'
    },
    {
      sql: 'ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS vwap_lower_band DOUBLE PRECISION',
      desc: 'Adding vwap_lower_band column'
    },
    {
      sql: 'ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS vwap_band_position DOUBLE PRECISION',
      desc: 'Adding vwap_band_position column'
    },
    // Support/Resistance Features
    {
      sql: 'ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS support_level DOUBLE PRECISION',
      desc: 'Adding support_level column'
    },
    {
      sql: 'ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS resistance_level DOUBLE PRECISION',
      desc: 'Adding resistance_level column'
    },
    {
      sql: 'ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS support_distance DOUBLE PRECISION',
      desc: 'Adding support_distance column'
    },
    {
      sql: 'ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS resistance_distance DOUBLE PRECISION',
      desc: 'Adding resistance_distance column'
    },
    // Smart Money Flow Features
    {
      sql: 'ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS smart_money_index DOUBLE PRECISION',
      desc: 'Adding smart_money_index column'
    },
    // Multi-timeframe Analysis
    {
      sql: 'ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS trend_alignment_score DOUBLE PRECISION',
      desc: 'Adding trend_alignment_score column'
    },
    // Volume Profile
    {
      sql: 'ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS volume_profile_score DOUBLE PRECISION',
      desc: 'Adding volume_profile_score column'
    },
    // Boolean Signals
    {
      sql: 'ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS vwap_breakout_bullish BOOLEAN DEFAULT FALSE',
      desc: 'Adding vwap_breakout_bullish column'
    },
    {
      sql: 'ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS vwap_breakout_bearish BOOLEAN DEFAULT FALSE',
      desc: 'Adding vwap_breakout_bearish column'
    },
    {
      sql: 'ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS near_support BOOLEAN DEFAULT FALSE',
      desc: 'Adding near_support column'
    },
    {
      sql: 'ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS near_resistance BOOLEAN DEFAULT FALSE',
      desc: 'Adding near_resistance column'
    },
    {
      sql: 'ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS smart_money_bullish BOOLEAN DEFAULT FALSE',
      desc: 'Adding smart_money_bullish column'
    },
    {
      sql: 'ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS trend_alignment_strong BOOLEAN DEFAULT FALSE',
      desc: 'Adding trend_alignment_strong column'
    }
  ];
  
  let successCount = 0;
  
  // Execute each statement
  for (const statement of statements) {
    const success = await runSingleStatement(statement.sql, statement.desc);
    if (success) successCount++;
  }
  
  console.log(`\n📊 Migration Summary: ${successCount}/${statements.length} statements executed successfully`);
  
  // Test if we can query the new columns
  await testNewColumns();
  
  console.log('\n🎉 Migration process completed!');
}

async function testNewColumns() {
  console.log('\n🔍 Testing new columns...');
  
  try {
    const { data, error } = await supabase
      .from('ta_features')
      .select('vwap, smart_money_index, trend_alignment_score, vwap_breakout_bullish')
      .limit(1);
    
    if (error) {
      console.log('⚠️  Cannot query new columns yet:', error.message);
      return;
    }
    
    console.log('✅ New Elite TA columns are accessible!');
    console.log('📋 Sample column names verified:', Object.keys(data?.[0] || {}));
    
  } catch (error) {
    console.log('⚠️  Error testing new columns:', error);
  }
}

// Run the migration
runMigration().catch(console.error);
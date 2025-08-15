import { createClient } from '@supabase/supabase-js';

// Use the provided connection details
const SUPABASE_URL = 'https://igyzlakymfosdeepvunk.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlneXpsYWt5bWZvc2RlZXB2dW5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mzc0NjE2MiwiZXhwIjoyMDY5MzIyMTYyfQ.JJVj4TzIlAWrHJ3yn4ptzvreSEAmgGurzRXM0L-LGJI';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const ELITE_TA_COLUMNS = [
  'vwap',
  'vwap_distance',
  'vwap_upper_band',
  'vwap_lower_band',
  'vwap_band_position',
  'support_level',
  'resistance_level',
  'support_distance',
  'resistance_distance',
  'smart_money_index',
  'trend_alignment_score',
  'volume_profile_score',
  'vwap_breakout_bullish',
  'vwap_breakout_bearish',
  'near_support',
  'near_resistance',
  'smart_money_bullish',
  'trend_alignment_strong'
];

async function checkMigrationStatus(): Promise<void> {
  console.log('🔍 Checking Elite TA Migration Status');
  console.log('=====================================');
  
  try {
    // First, verify we can connect and get current schema
    const { data, error } = await supabase
      .from('ta_features')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Failed to connect to ta_features table:', error.message);
      return;
    }
    
    if (!data || data.length === 0) {
      console.log('⚠️  ta_features table is empty, cannot check schema');
      return;
    }
    
    const currentColumns = Object.keys(data[0]);
    console.log(`📊 Current ta_features has ${currentColumns.length} columns`);
    
    // Check which Elite TA columns exist
    const existingEliteColumns = ELITE_TA_COLUMNS.filter(col => currentColumns.includes(col));
    const missingEliteColumns = ELITE_TA_COLUMNS.filter(col => !currentColumns.includes(col));
    
    console.log('\n✅ Elite TA Columns Found:');
    if (existingEliteColumns.length > 0) {
      existingEliteColumns.forEach(col => console.log(`   ✓ ${col}`));
    } else {
      console.log('   None found');
    }
    
    console.log('\n❌ Elite TA Columns Missing:');
    if (missingEliteColumns.length > 0) {
      missingEliteColumns.forEach(col => console.log(`   ✗ ${col}`));
    } else {
      console.log('   None missing - Migration Complete! 🎉');
    }
    
    // Migration status
    const migrationProgress = (existingEliteColumns.length / ELITE_TA_COLUMNS.length) * 100;
    console.log(`\n📈 Migration Progress: ${migrationProgress.toFixed(1)}% (${existingEliteColumns.length}/${ELITE_TA_COLUMNS.length})`);
    
    if (migrationProgress === 100) {
      console.log('\n🎉 MIGRATION COMPLETE! All Elite TA columns are present.');
      console.log('🚀 You can now proceed with testing the Elite TA worker.');
      
      // Test that we can actually use the new columns
      await testEliteColumns();
    } else {
      console.log('\n⏳ MIGRATION INCOMPLETE');
      console.log('\n📋 To complete the migration, please:');
      console.log('1. Go to: https://supabase.com/dashboard/project/igyzlakymfosdeepvunk/sql');
      console.log('2. Copy the SQL from: elite-ta-migration-simple.sql');
      console.log('3. Paste and run it in the SQL Editor');
      console.log('4. Run this script again to verify');
    }
    
  } catch (error) {
    console.error('❌ Error checking migration status:', error);
  }
}

async function testEliteColumns(): Promise<void> {
  console.log('\n🧪 Testing Elite TA Columns...');
  
  try {
    // Test inserting a sample row with Elite TA data
    const testRow = {
      token_id: 'test_migration_token',
      timeframe: '1H',
      ts: new Date().toISOString(),
      vwap: 1.5,
      smart_money_index: 0.7,
      trend_alignment_score: 0.8,
      vwap_breakout_bullish: true,
      near_support: false
    };
    
    const { error: insertError } = await supabase
      .from('ta_features')
      .insert([testRow]);
    
    if (insertError) {
      console.log('⚠️  Cannot insert test data:', insertError.message);
      return;
    }
    
    console.log('✅ Successfully inserted test data with Elite TA columns');
    
    // Clean up test data
    await supabase
      .from('ta_features')
      .delete()
      .eq('token_id', 'test_migration_token');
    
    console.log('✅ Test data cleaned up');
    console.log('🎯 Elite TA columns are ready for use!');
    
  } catch (error) {
    console.log('⚠️  Error testing Elite TA columns:', error);
  }
}

async function showNextSteps(): Promise<void> {
  console.log('\n🎯 NEXT STEPS');
  console.log('=============');
  console.log('1. ✅ Elite TA migration verification complete');
  console.log('2. 🔄 Run the Elite TA worker to populate data:');
  console.log('   npm run ta-elite');
  console.log('3. 📊 Monitor the Elite TA dashboard:');
  console.log('   npm run ta-dashboard');
  console.log('4. 🧪 Test the Elite TA features in your application');
}

// Main execution
async function main(): Promise<void> {
  await checkMigrationStatus();
  await showNextSteps();
}

main().catch(console.error);
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://igyzlakymfosdeepvunk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlneXpsYWt5bWZvc2RlZXB2dW5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mzc0NjE2MiwiZXhwIjoyMDY5MzIyMTYyfQ.JJVj4TzIlAWrHJ3yn4ptzvreSEAmgGurzRXM0L-LGJI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTASchema() {
  console.log('🔍 Checking ta_latest table schema...\n');
  
  try {
    // First, let's see what tables exist
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .like('table_name', '%ta%');
    
    if (tablesError) {
      console.error('❌ Error querying tables:', tablesError);
    } else {
      console.log('📋 Tables with "ta" in name:', tables?.map(t => t.table_name));
    }

    // Now let's check the schema of ta_latest specifically
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_schema', 'public')
      .eq('table_name', 'ta_latest')
      .order('ordinal_position');

    if (columnsError) {
      console.error('❌ Error querying ta_latest schema:', columnsError);
    } else if (!columns || columns.length === 0) {
      console.log('❌ ta_latest table not found or has no columns');
    } else {
      console.log('\n📊 ta_latest table schema:');
      console.log('Column Name                  | Data Type       | Nullable');
      console.log('-'.repeat(60));
      columns.forEach(col => {
        const name = col.column_name.padEnd(28);
        const type = col.data_type.padEnd(15);
        const nullable = col.is_nullable;
        console.log(`${name} | ${type} | ${nullable}`);
      });
    }

    // Let's also try to get a sample record to see the actual data
    console.log('\n🔍 Fetching sample records...');
    const { data: sampleData, error: sampleError } = await supabase
      .from('ta_latest')
      .select('*')
      .limit(1);

    if (sampleError) {
      console.error('❌ Error fetching sample data:', sampleError);
    } else if (!sampleData || sampleData.length === 0) {
      console.log('📭 No data found in ta_latest table');
    } else {
      console.log('\n📋 Sample record structure:');
      const sample = sampleData[0];
      Object.keys(sample).forEach(key => {
        const value = sample[key];
        const type = typeof value;
        console.log(`  ${key}: ${value} (${type})`);
      });
    }

  } catch (err) {
    console.error('💥 Unexpected error:', err);
  }
}

// Run the schema check
checkTASchema().then(() => {
  console.log('\n✅ Schema check completed!');
  process.exit(0);
}).catch(err => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
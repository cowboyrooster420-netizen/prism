import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Use the provided connection details
const SUPABASE_URL = 'https://igyzlakymfosdeepvunk.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlneXpsYWt5bWZvc2RlZXB2dW5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mzc0NjE2MiwiZXhwIjoyMDY5MzIyMTYyfQ.JJVj4TzIlAWrHJ3yn4ptzvreSEAmgGurzRXM0L-LGJI';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function runMigration() {
  try {
    console.log('🔄 Starting Elite TA Features migration...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'add-elite-ta-columns.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
    
    console.log('📖 Read SQL migration file');
    
    // Split the SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`⚙️  Executing statement ${i + 1}/${statements.length}...`);
      
      const { error } = await supabase.rpc('execute_sql', { 
        sql_query: statement 
      });
      
      if (error) {
        // Try direct query execution as fallback
        console.log('🔄 Trying direct query execution...');
        const { error: directError } = await supabase
          .from('ta_features') // Use a known table to test connection
          .select('count(*)', { count: 'exact', head: true });
        
        if (directError) {
          console.error('❌ Database connection failed:', directError);
          return;
        }
        
        // For DDL operations, we'll need to use a different approach
        console.log('⚠️  DDL operations require database admin access');
        console.log('📋 SQL to execute manually:');
        console.log('=' * 50);
        console.log(sqlContent);
        console.log('=' * 50);
        break;
      }
      
      console.log(`✅ Statement ${i + 1} executed successfully`);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

async function testConnection() {
  try {
    console.log('🔄 Testing Supabase connection...');
    
    // Test basic connection
    const { data, error } = await supabase
      .from('ta_features')
      .select('count(*)', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Connection test failed:', error);
      return false;
    }
    
    console.log('✅ Successfully connected to Supabase');
    console.log(`📊 ta_features table has ${data} rows`);
    return true;
    
  } catch (error) {
    console.error('❌ Connection test failed:', error);
    return false;
  }
}

async function checkNewColumns() {
  try {
    console.log('🔍 Checking if new columns exist...');
    
    // Try to select one of the new columns
    const { data, error } = await supabase
      .from('ta_features')
      .select('vwap, smart_money_index, trend_alignment_score')
      .limit(1);
    
    if (error) {
      console.log('⚠️  New columns not found yet:', error.message);
      return false;
    }
    
    console.log('✅ New Elite TA columns are available!');
    return true;
    
  } catch (error) {
    console.log('⚠️  New columns not found yet:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Elite TA Features Migration Tool');
  console.log('================================');
  
  // Test connection first
  const connected = await testConnection();
  if (!connected) {
    console.log('❌ Cannot proceed without database connection');
    return;
  }
  
  // Check if columns already exist
  const columnsExist = await checkNewColumns();
  if (columnsExist) {
    console.log('✅ Elite TA columns already exist - migration may have already been run');
    return;
  }
  
  // Run the migration
  await runMigration();
  
  // Test the new columns
  console.log('\n🔍 Testing migration results...');
  await checkNewColumns();
  
  console.log('\n🎉 Migration process completed!');
}

// Run the migration
main().catch(console.error);
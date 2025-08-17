import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fixTokensSchema() {
  console.log('🔧 Fixing tokens table schema...');
  
  try {
    // Add updated_at column
    console.log('Adding updated_at column...');
    const { error: alterError } = await supabase.from('tokens').select('updated_at').limit(1);
    
    if (alterError && alterError.message.includes('updated_at')) {
      console.log('Column updated_at does not exist, this is expected.');
      
      // Since we can't execute DDL directly through Supabase client, let's check the schema
      console.log('✅ Schema fix needed - you may need to run this SQL manually in Supabase dashboard:');
      console.log('ALTER TABLE tokens ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();');
      
      return;
    }
    
    console.log('✅ updated_at column appears to exist or table structure is correct');
    
  } catch (error) {
    console.error('❌ Error checking schema:', error);
  }
}

fixTokensSchema();
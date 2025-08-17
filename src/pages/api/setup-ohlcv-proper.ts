import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔧 Setting up OHLCV database schema properly...');

    const results: any[] = [];

    // First, let's create the tables using direct table operations instead of SQL execution
    
    // Step 1: Test if we can create a simple table to understand the approach
    console.log('📊 Testing table creation approach...');
    
    try {
      // Check if table exists by trying to query it
      const { error: tableCheckError } = await supabase
        .from('token_ohlcv_history')
        .select('id')
        .limit(1);

      if (tableCheckError && tableCheckError.code === 'PGRST116') {
        console.log('🆕 Table does not exist. Since Supabase requires SQL DDL to be run via dashboard, we need an alternative approach.');
        
        // Since we can't execute raw DDL via API, let's manually create the necessary data using available operations
        results.push({ 
          step: 'check_table', 
          success: false, 
          note: 'Table does not exist and cannot be created via API. Requires manual SQL execution.',
          recommendation: 'Execute the SQL schema manually in Supabase SQL editor'
        });
      } else if (tableCheckError) {
        results.push({ 
          step: 'check_table', 
          success: false, 
          error: tableCheckError.message,
          note: 'Unexpected error checking table existence'
        });
      } else {
        console.log('✅ Table exists, proceeding with function verification...');
        results.push({ step: 'check_table', success: true, note: 'Table exists' });

        // Step 2: Test if database functions exist by calling them
        console.log('⚙️ Testing database functions...');
        
        try {
          const { data: latestTimestamp, error: functionError } = await supabase
            .rpc('get_latest_ohlcv_timestamp', {
              token_addr: 'So11111111111111111111111111111111111111112',
              timeframe_param: '1h'
            });

          if (functionError) {
            results.push({ 
              step: 'test_functions', 
              success: false, 
              error: functionError.message,
              note: 'Database functions do not exist or are not accessible'
            });
          } else {
            results.push({ step: 'test_functions', success: true, result: latestTimestamp });
            console.log('✅ Database functions are working');
          }
        } catch (error) {
          results.push({ 
            step: 'test_functions', 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }

        // Step 3: Test basic insert operation
        console.log('💾 Testing insert operation...');
        
        try {
          const testRecord = {
            token_address: 'test_token_' + Date.now(),
            timestamp_unix: Math.floor(Date.now() / 1000),
            timestamp_utc: new Date().toISOString(),
            timeframe: '1h',
            open_price: 100.0,
            high_price: 105.0,
            low_price: 98.0,
            close_price: 102.0,
            volume: 1000.0,
            data_source: 'test',
            confidence_score: 1.0
          };

          const { data: insertResult, error: insertError } = await supabase
            .from('token_ohlcv_history')
            .insert(testRecord)
            .select();

          if (insertError) {
            results.push({ 
              step: 'test_insert', 
              success: false, 
              error: insertError.message,
              note: 'Cannot insert data into table'
            });
          } else {
            console.log('✅ Insert operation successful');
            results.push({ step: 'test_insert', success: true });

            // Clean up test record
            if (insertResult && insertResult.length > 0) {
              await supabase
                .from('token_ohlcv_history')
                .delete()
                .eq('id', insertResult[0].id);
              console.log('🧹 Test record cleaned up');
            }
          }
        } catch (error) {
          results.push({ 
            step: 'test_insert', 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    } catch (error) {
      results.push({ 
        step: 'check_table', 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    const successCount = results.filter(r => r.success).length;
    const totalSteps = results.length;

    // Provide recommendations based on results
    const recommendations = [];
    
    if (results.some(r => r.step === 'check_table' && !r.success && r.note?.includes('Table does not exist'))) {
      recommendations.push('Execute the complete SQL schema from setup-historical-ohlcv.sql in Supabase SQL editor');
    }
    
    if (results.some(r => r.step === 'test_functions' && !r.success)) {
      recommendations.push('Database functions need to be created manually via SQL editor');
    }

    console.log(`📋 Database verification completed: ${successCount}/${totalSteps} checks passed`);

    res.status(200).json({ 
      success: successCount === totalSteps,
      message: `Database verification completed: ${successCount}/${totalSteps} checks passed`,
      results,
      recommendations,
      nextSteps: recommendations.length > 0 ? 
        'Manual SQL execution required in Supabase dashboard' : 
        'Database is properly configured and ready for OHLCV collection'
    });

  } catch (error) {
    console.error('❌ Error verifying database setup:', error);
    res.status(500).json({ 
      error: 'Failed to verify database setup', 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
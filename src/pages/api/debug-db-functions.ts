import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔍 Checking database functions and schema...');

    // Check if tables exist
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['token_ohlcv_history', 'ohlcv_collection_status']);

    console.log('📊 Tables found:', tables);

    // Check if functions exist
    const { data: functions, error: functionsError } = await supabase
      .from('information_schema.routines')
      .select('routine_name, routine_type')
      .eq('routine_schema', 'public')
      .in('routine_name', [
        'get_latest_ohlcv_timestamp',
        'get_token_ohlcv_history',
        'get_ohlcv_data_summary'
      ]);

    console.log('⚙️ Functions found:', functions);

    // Test token_ohlcv_history table structure
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_schema', 'public')
      .eq('table_name', 'token_ohlcv_history')
      .order('ordinal_position');

    console.log('🏗️ Table structure:', columns);

    // Try to insert a test record directly
    const testRecord = {
      token_address: 'So11111111111111111111111111111111111111112',
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

    console.log('💾 Test insert result:', insertResult);
    console.log('❌ Insert error (if any):', insertError);

    // If insert succeeded, clean up the test record
    if (insertResult && insertResult.length > 0) {
      await supabase
        .from('token_ohlcv_history')
        .delete()
        .eq('id', insertResult[0].id);
      console.log('🧹 Cleaned up test record');
    }

    // Test function call
    let functionTestResult = null;
    let functionTestError = null;
    
    try {
      const { data: funcResult, error: funcError } = await supabase
        .rpc('get_latest_ohlcv_timestamp', {
          token_addr: 'So11111111111111111111111111111111111111112',
          timeframe_param: '1h'
        });
      
      functionTestResult = funcResult;
      functionTestError = funcError;
      console.log('🔧 Function test result:', funcResult);
      console.log('❌ Function error (if any):', funcError);
    } catch (error) {
      functionTestError = error;
      console.log('❌ Function call exception:', error);
    }

    res.status(200).json({
      success: true,
      checks: {
        tables: {
          found: tables || [],
          error: tablesError
        },
        functions: {
          found: functions || [],
          error: functionsError
        },
        tableStructure: {
          columns: columns || [],
          error: columnsError
        },
        testInsert: {
          success: !!insertResult,
          result: insertResult,
          error: insertError
        },
        functionTest: {
          result: functionTestResult,
          error: functionTestError
        }
      }
    });

  } catch (error) {
    console.error('❌ Error debugging database:', error);
    res.status(500).json({
      error: 'Failed to debug database',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
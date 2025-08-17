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
    console.log('🔧 Setting up OHLCV database schema...');

    const results: any[] = [];

    // Step 1: Create main OHLCV table
    console.log('📊 Creating token_ohlcv_history table...');
    
    try {
      // First check if table exists by trying to select from it
      const { error: tableCheckError } = await supabase
        .from('token_ohlcv_history')
        .select('id')
        .limit(1);

      if (tableCheckError && tableCheckError.code === 'PGRST116') {
        // Table doesn't exist, create it
        console.log('🆕 Table does not exist, creating...');
        
        const createTableResult = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey
          },
          body: JSON.stringify({
            sql: `
              CREATE TABLE token_ohlcv_history (
                  id BIGSERIAL PRIMARY KEY,
                  token_address VARCHAR(50) NOT NULL,
                  timestamp_unix BIGINT NOT NULL,
                  timestamp_utc TIMESTAMP WITH TIME ZONE NOT NULL,
                  timeframe VARCHAR(10) NOT NULL CHECK (timeframe IN ('1m', '5m', '15m', '1h', '4h', '1d', '1w')),
                  open_price NUMERIC(30, 15) NOT NULL CHECK (open_price >= 0),
                  high_price NUMERIC(30, 15) NOT NULL CHECK (high_price >= 0),
                  low_price NUMERIC(30, 15) NOT NULL CHECK (low_price >= 0),
                  close_price NUMERIC(30, 15) NOT NULL CHECK (close_price >= 0),
                  volume NUMERIC(20, 2) DEFAULT 0 CHECK (volume >= 0),
                  volume_usd NUMERIC(20, 2) DEFAULT 0 CHECK (volume_usd >= 0),
                  data_source VARCHAR(20) NOT NULL DEFAULT 'birdeye',
                  confidence_score NUMERIC(3, 2) DEFAULT 1.0 CHECK (confidence_score BETWEEN 0 AND 1),
                  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                  UNIQUE(token_address, timeframe, timestamp_unix)
              );
            `
          })
        });

        if (!createTableResult.ok) {
          const errorText = await createTableResult.text();
          throw new Error(`Table creation failed: ${errorText}`);
        }

        results.push({ step: 'create_table', success: true });
        console.log('✅ Table created successfully');
      } else {
        results.push({ step: 'create_table', success: true, note: 'Table already exists' });
        console.log('✅ Table already exists');
      }
    } catch (error) {
      results.push({ step: 'create_table', success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      console.error('❌ Table creation error:', error);
    }

    // Step 2: Create indexes
    console.log('🔗 Creating indexes...');
    
    try {
      const createIndexResult = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey
        },
        body: JSON.stringify({
          sql: `
            CREATE INDEX IF NOT EXISTS idx_ohlcv_token_timeframe ON token_ohlcv_history(token_address, timeframe);
            CREATE INDEX IF NOT EXISTS idx_ohlcv_token_time ON token_ohlcv_history(token_address, timestamp_utc DESC);
            CREATE INDEX IF NOT EXISTS idx_ohlcv_timestamp ON token_ohlcv_history(timestamp_utc DESC);
            CREATE INDEX IF NOT EXISTS idx_ohlcv_timeframe ON token_ohlcv_history(timeframe);
            CREATE INDEX IF NOT EXISTS idx_ohlcv_source ON token_ohlcv_history(data_source);
            CREATE INDEX IF NOT EXISTS idx_ohlcv_token_timeframe_time ON token_ohlcv_history(token_address, timeframe, timestamp_utc DESC);
          `
        })
      });

      if (!createIndexResult.ok) {
        const errorText = await createIndexResult.text();
        console.warn('Index creation warning:', errorText);
        results.push({ step: 'create_indexes', success: false, warning: errorText });
      } else {
        results.push({ step: 'create_indexes', success: true });
        console.log('✅ Indexes created successfully');
      }
    } catch (error) {
      results.push({ step: 'create_indexes', success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      console.warn('❌ Index creation error:', error);
    }

    // Step 3: Create collection status table
    console.log('📋 Creating collection status table...');
    
    try {
      const createStatusTableResult = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey
        },
        body: JSON.stringify({
          sql: `
            CREATE TABLE IF NOT EXISTS ohlcv_collection_status (
                id BIGSERIAL PRIMARY KEY,
                token_address VARCHAR(50) NOT NULL,
                timeframe VARCHAR(10) NOT NULL,
                last_collection_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                last_successful_timestamp TIMESTAMP WITH TIME ZONE,
                collection_errors INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(token_address, timeframe)
            );
          `
        })
      });

      if (!createStatusTableResult.ok) {
        const errorText = await createStatusTableResult.text();
        results.push({ step: 'create_status_table', success: false, error: errorText });
        console.warn('❌ Status table creation error:', errorText);
      } else {
        results.push({ step: 'create_status_table', success: true });
        console.log('✅ Status table created successfully');
      }
    } catch (error) {
      results.push({ step: 'create_status_table', success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      console.warn('❌ Status table creation error:', error);
    }

    // Step 4: Create database functions
    console.log('⚙️ Creating database functions...');
    
    try {
      const createFunctionsResult = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey
        },
        body: JSON.stringify({
          sql: `
            -- Function to get the latest timestamp for a token/timeframe
            CREATE OR REPLACE FUNCTION get_latest_ohlcv_timestamp(
                token_addr VARCHAR(50),
                timeframe_param VARCHAR(10) DEFAULT '1h'
            )
            RETURNS TIMESTAMP WITH TIME ZONE AS $$
            DECLARE
                latest_timestamp TIMESTAMP WITH TIME ZONE;
            BEGIN
                SELECT MAX(timestamp_utc) INTO latest_timestamp
                FROM token_ohlcv_history
                WHERE token_address = token_addr
                    AND timeframe = timeframe_param;
                
                RETURN latest_timestamp;
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;

            -- Function to get historical OHLCV data for TA analysis
            CREATE OR REPLACE FUNCTION get_token_ohlcv_history(
                token_addr VARCHAR(50),
                timeframe_param VARCHAR(10) DEFAULT '1h',
                days_back INTEGER DEFAULT 30,
                limit_rows INTEGER DEFAULT 1000
            )
            RETURNS TABLE(
                timestamp_unix BIGINT,
                timestamp_utc TIMESTAMP WITH TIME ZONE,
                open_price NUMERIC(30, 15),
                high_price NUMERIC(30, 15),
                low_price NUMERIC(30, 15),
                close_price NUMERIC(30, 15),
                volume NUMERIC(20, 2),
                volume_usd NUMERIC(20, 2)
            ) AS $$
            BEGIN
                RETURN QUERY
                SELECT 
                    h.timestamp_unix,
                    h.timestamp_utc,
                    h.open_price,
                    h.high_price,
                    h.low_price,
                    h.close_price,
                    h.volume,
                    h.volume_usd
                FROM token_ohlcv_history h
                WHERE h.token_address = token_addr
                    AND h.timeframe = timeframe_param
                    AND h.timestamp_utc >= NOW() - INTERVAL '1 day' * days_back
                ORDER BY h.timestamp_utc DESC
                LIMIT limit_rows;
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;

            -- Function to get data availability summary
            CREATE OR REPLACE FUNCTION get_ohlcv_data_summary()
            RETURNS TABLE(
                token_address VARCHAR(50),
                timeframes TEXT[],
                earliest_data TIMESTAMP WITH TIME ZONE,
                latest_data TIMESTAMP WITH TIME ZONE,
                total_candles BIGINT,
                days_of_data INTEGER
            ) AS $$
            BEGIN
                RETURN QUERY
                SELECT 
                    h.token_address,
                    ARRAY_AGG(DISTINCT h.timeframe ORDER BY h.timeframe) as timeframes,
                    MIN(h.timestamp_utc) as earliest_data,
                    MAX(h.timestamp_utc) as latest_data,
                    COUNT(*) as total_candles,
                    EXTRACT(days FROM (MAX(h.timestamp_utc) - MIN(h.timestamp_utc)))::INTEGER as days_of_data
                FROM token_ohlcv_history h
                GROUP BY h.token_address
                ORDER BY total_candles DESC;
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;
          `
        })
      });

      if (!createFunctionsResult.ok) {
        const errorText = await createFunctionsResult.text();
        results.push({ step: 'create_functions', success: false, error: errorText });
        console.warn('❌ Functions creation error:', errorText);
      } else {
        results.push({ step: 'create_functions', success: true });
        console.log('✅ Functions created successfully');
      }
    } catch (error) {
      results.push({ step: 'create_functions', success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      console.warn('❌ Functions creation error:', error);
    }

    const successCount = results.filter(r => r.success).length;
    const totalSteps = results.length;

    console.log(`✅ OHLCV database schema setup completed: ${successCount}/${totalSteps} steps successful`);

    res.status(200).json({ 
      success: successCount === totalSteps,
      message: `OHLCV database schema setup completed: ${successCount}/${totalSteps} steps successful`,
      results
    });

  } catch (error) {
    console.error('❌ Error setting up OHLCV schema:', error);
    res.status(500).json({ 
      error: 'Failed to setup OHLCV schema', 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
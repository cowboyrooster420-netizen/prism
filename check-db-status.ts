import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://igyzlakymfosdeepvunk.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlneXpsYWt5bWZvc2RlZXB2dW5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mzc0NjE2MiwiZXhwIjoyMDY5MzIyMTYyfQ.JJVj4TzIlAWrHJ3yn4ptzvreSEAmgGurzRXM0L-LGJI';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Schema creation functions
async function ensureCandlesTable() {
  const createCandlesSQL = `
    CREATE TABLE IF NOT EXISTS candles (
      token_id VARCHAR(50) NOT NULL,
      timeframe VARCHAR(5) NOT NULL,
      ts TIMESTAMPTZ NOT NULL,
      open NUMERIC(30,15) NOT NULL,
      high NUMERIC(30,15) NOT NULL,
      low NUMERIC(30,15) NOT NULL,
      close NUMERIC(30,15) NOT NULL,
      volume NUMERIC(30,15) DEFAULT 0,
      quote_volume_usd NUMERIC(20,2) DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (token_id, timeframe, ts)
    );
    
    CREATE INDEX IF NOT EXISTS idx_candles_token_timeframe ON candles (token_id, timeframe);
    CREATE INDEX IF NOT EXISTS idx_candles_ts ON candles (ts DESC);
    CREATE INDEX IF NOT EXISTS idx_candles_volume ON candles (quote_volume_usd DESC);
  `;
  
  const { error } = await supabase.rpc('exec_sql', { sql: createCandlesSQL });
  if (error) {
    console.log('Note: Could not create candles table via RPC, it may already exist');
  }
}

async function ensureTAFeaturesTable() {
  const createTAFeaturesSQL = `
    CREATE TABLE IF NOT EXISTS ta_features (
      token_id VARCHAR(50) NOT NULL,
      timeframe VARCHAR(5) NOT NULL,
      ts TIMESTAMPTZ NOT NULL,
      sma_5 NUMERIC(30,15),
      sma_10 NUMERIC(30,15),
      sma_20 NUMERIC(30,15),
      ema_12 NUMERIC(30,15),
      ema_26 NUMERIC(30,15),
      rsi_14 NUMERIC(10,4),
      macd NUMERIC(30,15),
      macd_signal NUMERIC(30,15),
      macd_histogram NUMERIC(30,15),
      bb_upper NUMERIC(30,15),
      bb_lower NUMERIC(30,15),
      bb_width NUMERIC(10,6),
      atr_14 NUMERIC(30,15),
      volume_sma_20 NUMERIC(30,15),
      price_change_pct NUMERIC(10,4),
      volume_ratio NUMERIC(10,4),
      volatility_7d NUMERIC(10,6),
      momentum_5d NUMERIC(10,4),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (token_id, timeframe, ts)
    );
    
    CREATE INDEX IF NOT EXISTS idx_ta_features_token_timeframe ON ta_features (token_id, timeframe);
    CREATE INDEX IF NOT EXISTS idx_ta_features_ts ON ta_features (ts DESC);
    CREATE INDEX IF NOT EXISTS idx_ta_features_rsi ON ta_features (rsi_14);
  `;
  
  const { error } = await supabase.rpc('exec_sql', { sql: createTAFeaturesSQL });
  if (error) {
    console.log('Note: Could not create ta_features table via RPC, it may already exist');
  }
}

async function checkDatabaseStatus() {
  console.log('🔍 Comprehensive Database Analysis for TA Worker Configuration\n');

  try {
    // 0. Ensure required tables exist
    console.log('🔧 0. Ensuring Required Schema:');
    console.log('===============================');
    
    console.log('Creating candles table if needed...');
    await ensureCandlesTable();
    
    console.log('Creating ta_features table if needed...');
    await ensureTAFeaturesTable();
    
    console.log('✅ Schema setup complete\n');

    // 1. Check all available tables
    console.log('📋 1. Available Tables:');
    console.log('======================');
    
    const tableNames = ['tokens', 'candles', 'ta_features', 'ohlcv_data', 'price_data', 'birdeye_candles'];
    
    for (const tableName of tableNames) {
      const { data, error } = await supabase.from(tableName).select('*').limit(1);
      if (!error) {
        console.log(`✅ ${tableName}`);
      } else {
        console.log(`❌ ${tableName} - ${error.message}`);
      }
    }

    console.log('\n');

    // 2. Analyze tokens table
    console.log('🪙 2. Tokens Analysis:');
    console.log('=====================');
    
    const { data: tokens, error: tokensError } = await supabase
      .from('tokens')
      .select('*')
      .limit(10);

    if (tokensError) {
      console.log('❌ Error accessing tokens table:', tokensError.message);
    } else {
      console.log(`Total sample tokens: ${tokens?.length || 0}`);
      
      if (tokens && tokens.length > 0) {
        console.log('\nToken structure (first token):');
        console.log(JSON.stringify(tokens[0], null, 2));
        
        // Count total tokens
        const { count: totalTokens } = await supabase
          .from('tokens')
          .select('*', { count: 'exact', head: true });
        
        console.log(`\nTotal tokens in database: ${totalTokens}`);
        
        // Get valid mint addresses for TA worker
        const validTokens = tokens.filter(token => 
          (token.mint_address || token.address) && 
          token.symbol
        );
        
        console.log(`\nTokens with valid addresses: ${validTokens.length}`);
        console.log('Sample token IDs for TA worker:');
        validTokens.slice(0, 5).forEach(token => {
          const address = token.mint_address || token.address;
          console.log(`  - ${token.symbol}: ${address}`);
        });
      }
    }

    console.log('\n');

    // 3. Check for candle data tables
    console.log('📊 3. Candle Data Analysis:');
    console.log('===========================');
    
    const candleTables = ['candles', 'ohlcv_data', 'price_data', 'birdeye_candles'];
    let foundCandleTable = null;
    
    for (const tableName of candleTables) {
      console.log(`\nChecking ${tableName}...`);
      
      const { data: candles, error: candlesError } = await supabase
        .from(tableName)
        .select('*')
        .limit(5);

      if (candlesError) {
        console.log(`❌ ${tableName} not accessible: ${candlesError.message}`);
        continue;
      } else {
        const { count: totalCandles } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });
        
        console.log(`✅ ${tableName} table exists with ${totalCandles || 0} total records (showing ${candles?.length || 0} samples)`);
        foundCandleTable = tableName;
        
        if (candles && candles.length > 0) {
          console.log('Sample record structure:');
          console.log(JSON.stringify(candles[0], null, 2));
          
          // Check available timeframes
          const timeframeColumns = ['timeframe', 'interval', 'period', 'time_frame'];
          let timeframeColumn = null;
          
          for (const col of timeframeColumns) {
            if (candles[0][col] !== undefined) {
              timeframeColumn = col;
              break;
            }
          }
          
          if (timeframeColumn) {
            const { data: timeframeData } = await supabase
              .from(tableName)
              .select(timeframeColumn)
              .not(timeframeColumn, 'is', null);
            
            const uniqueTimeframes = [...new Set(timeframeData?.map(d => d[timeframeColumn]))];
            console.log(`Available timeframes: ${uniqueTimeframes.join(', ')}`);
          }
          
          // Check unique tokens with candle data
          const addressColumns = ['token_id', 'mint_address', 'address', 'token_address'];
          let addressColumn = null;
          
          for (const col of addressColumns) {
            if (candles[0][col] !== undefined) {
              addressColumn = col;
              break;
            }
          }
          
          if (addressColumn) {
            const { data: tokenData } = await supabase
              .from(tableName)
              .select(addressColumn)
              .not(addressColumn, 'is', null)
              .limit(1000); // Limit to avoid memory issues
            
            const uniqueTokens = [...new Set(tokenData?.map(d => d[addressColumn]) || [])];
            console.log(`Unique tokens with candle data: ${uniqueTokens.length}`);
            console.log('Sample token addresses:', uniqueTokens.slice(0, 5).join(', '));
            
            // Show candle count per token (top 10)
            console.log('\nCandle count per token (top 10):');
            const tokenCounts: { [key: string]: number } = {};
            tokenData?.forEach(d => {
              const addr = d[addressColumn];
              if (addr) {
                tokenCounts[addr] = (tokenCounts[addr] || 0) + 1;
              }
            });
            
            Object.entries(tokenCounts)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 10)
              .forEach(([token, count]) => {
                console.log(`  ${token}: ${count} candles`);
              });
          }
        } else if (totalCandles === 0) {
          console.log('⚠️  Table exists but is empty. You may need to run the candle ingestion script.');
        }
        break; // Use the first working candle table
      }
    }

    console.log('\n');

    // 4. Check TA Features table
    console.log('🔧 4. TA Features Analysis:');
    console.log('===========================');
    
    const { data: taFeatures, error: taError } = await supabase
      .from('ta_features')
      .select('*')
      .limit(5);

    if (taError) {
      console.log('❌ ta_features table not found:', taError.message);
      console.log('💡 You may need to create this table for storing TA analysis results');
    } else {
      console.log(`✅ ta_features table found with ${taFeatures?.length || 0} sample records`);
      
      if (taFeatures && taFeatures.length > 0) {
        console.log('TA Features structure:');
        console.log(JSON.stringify(taFeatures[0], null, 2));
        
        const { count: totalFeatures } = await supabase
          .from('ta_features')
          .select('*', { count: 'exact', head: true });
        
        console.log(`Total TA features records: ${totalFeatures}`);
      }
    }

    console.log('\n');

    // 5. Configuration recommendations for TA worker
    console.log('⚙️  5. TA Worker Configuration Recommendations:');
    console.log('===============================================');
    
    if (foundCandleTable) {
      console.log(`✅ Use candle data from: ${foundCandleTable}`);
      
      // Get a few specific tokens with good candle data
      const { data: sampleCandles } = await supabase
        .from(foundCandleTable)
        .select('*')
        .limit(100);
      
      if (sampleCandles && sampleCandles.length > 0) {
        const addressColumns = ['token_id', 'mint_address', 'address', 'token_address'];
        let addressColumn = null;
        
        for (const col of addressColumns) {
          if (sampleCandles[0][col] !== undefined) {
            addressColumn = col;
            break;
          }
        }
        
        if (addressColumn) {
          const tokenCounts: { [key: string]: number } = {};
          sampleCandles.forEach(candle => {
            const addr = candle[addressColumn];
            if (addr) {
              tokenCounts[addr] = (tokenCounts[addr] || 0) + 1;
            }
          });
          
          const topTokens = Object.entries(tokenCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10);
          
          if (topTokens.length > 0) {
            console.log('\nRecommended token addresses for TA worker (tokens with most candle data):');
            topTokens.forEach(([token, count]) => {
              console.log(`  "${token}" // ${count} candles`);
            });
            
            console.log('\nSample TA worker configuration:');
            console.log('const TOKEN_ADDRESSES = [');
            topTokens.slice(0, 5).forEach(([token]) => {
              console.log(`  "${token}",`);
            });
            console.log('];');
          }
        }
      } else {
        console.log('⚠️  Candle table exists but has no data. You need to run candle ingestion first.');
        
        // Recommend some tokens from the tokens table
        const { data: topTokens } = await supabase
          .from('tokens')
          .select('mint_address, symbol, volume_24h')
          .not('mint_address', 'is', null)
          .order('volume_24h', { ascending: false })
          .limit(10);
        
        if (topTokens && topTokens.length > 0) {
          console.log('\nRecommended tokens to ingest candle data for (highest volume):');
          topTokens.forEach(token => {
            console.log(`  "${token.mint_address}" // ${token.symbol} - $${token.volume_24h?.toLocaleString() || 0} 24h vol`);
          });
          
          console.log('\nTo get candle data for these tokens, run:');
          console.log('cd crawler && npx tsx scripts/ingest_candles.ts');
        }
      }
    } else {
      console.log('❌ No candle data tables found. Creating candles table...');
      
      // Since we ensured the table exists above, this shouldn't happen
      console.log('Run the script again to see the candles table.');
    }
    
  } catch (error) {
    console.error('❌ Database analysis failed:', error);
  }
}

// Run the check
checkDatabaseStatus()
  .then(() => {
    console.log('✅ Database status check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Database status check failed:', error);
    process.exit(1);
  });


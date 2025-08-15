import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://igyzlakymfosdeepvunk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlneXpsYWt5bWZvc2RlZXB2dW5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mzc0NjE2MiwiZXhwIjoyMDY5MzIyMTYyfQ.JJVj4TzIlAWrHJ3yn4ptzvreSEAmgGurzRXM0L-LGJI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function queryEliteTAFeatures() {
  console.log('🚀 Querying Elite TA Features from ta_latest table...\n');
  
  try {
    const { data, error } = await supabase
      .from('ta_latest')
      .select(`
        symbol,
        address,
        created_at,
        price,
        market_cap,
        volume_24h,
        price_change_24h,
        rsi,
        macd_signal,
        bb_position,
        sma_20,
        sma_50,
        ema_12,
        ema_26,
        vwap,
        vwap_distance,
        vwap_band_position,
        support_level,
        resistance_level,
        support_distance,
        resistance_distance,
        smart_money_index,
        trend_alignment_score,
        volume_profile_score,
        vwap_breakout_bullish,
        near_support,
        near_resistance,
        smart_money_bullish,
        trend_alignment_strong
      `)
      .in('symbol', ['BONK', 'SOL', 'USDC'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error querying ta_latest:', error);
      return;
    }

    if (!data || data.length === 0) {
      console.log('📭 No data found in ta_latest table for BONK, SOL, USDC');
      return;
    }

    console.log(`✅ Found ${data.length} records with Elite TA features!\n`);

    // Group by symbol for better display
    const groupedData = data.reduce((acc, record) => {
      if (!acc[record.symbol]) {
        acc[record.symbol] = [];
      }
      acc[record.symbol].push(record);
      return acc;
    }, {} as Record<string, any[]>);

    // Display data for each token
    for (const [symbol, records] of Object.entries(groupedData)) {
      console.log(`🪙 === ${symbol} Token Analysis ===`);
      const latest = records[0]; // Most recent record
      
      console.log(`📊 Basic Metrics:`);
      console.log(`   Price: $${latest.price}`);
      console.log(`   Market Cap: $${latest.market_cap?.toLocaleString()}`);
      console.log(`   24h Volume: $${latest.volume_24h?.toLocaleString()}`);
      console.log(`   24h Change: ${latest.price_change_24h}%`);
      console.log(`   Created: ${new Date(latest.created_at).toLocaleString()}`);
      
      console.log(`\n🎯 Elite VWAP Features:`);
      console.log(`   VWAP: $${latest.vwap}`);
      console.log(`   VWAP Distance: ${latest.vwap_distance}%`);
      console.log(`   VWAP Band Position: ${latest.vwap_band_position}`);
      console.log(`   VWAP Breakout Bullish: ${latest.vwap_breakout_bullish ? '✅ YES' : '❌ NO'}`);
      
      console.log(`\n🎯 Elite Support/Resistance:`);
      console.log(`   Support Level: $${latest.support_level}`);
      console.log(`   Resistance Level: $${latest.resistance_level}`);
      console.log(`   Support Distance: ${latest.support_distance}%`);
      console.log(`   Resistance Distance: ${latest.resistance_distance}%`);
      console.log(`   Near Support: ${latest.near_support ? '✅ YES' : '❌ NO'}`);
      console.log(`   Near Resistance: ${latest.near_resistance ? '✅ YES' : '❌ NO'}`);
      
      console.log(`\n🎯 Elite Scoring System:`);
      console.log(`   Smart Money Index: ${latest.smart_money_index}`);
      console.log(`   Trend Alignment Score: ${latest.trend_alignment_score}`);
      console.log(`   Volume Profile Score: ${latest.volume_profile_score}`);
      console.log(`   Smart Money Bullish: ${latest.smart_money_bullish ? '✅ YES' : '❌ NO'}`);
      console.log(`   Trend Alignment Strong: ${latest.trend_alignment_strong ? '✅ YES' : '❌ NO'}`);
      
      console.log(`\n🎯 Traditional TA Indicators:`);
      console.log(`   RSI: ${latest.rsi}`);
      console.log(`   MACD Signal: ${latest.macd_signal}`);
      console.log(`   BB Position: ${latest.bb_position}`);
      console.log(`   SMA 20: $${latest.sma_20}`);
      console.log(`   SMA 50: $${latest.sma_50}`);
      console.log(`   EMA 12: $${latest.ema_12}`);
      console.log(`   EMA 26: $${latest.ema_26}`);
      
      console.log(`\n${'='.repeat(50)}\n`);
    }

    // Summary of Elite Features
    console.log(`🌟 === Elite Features Summary ===`);
    console.log(`Total tokens analyzed: ${Object.keys(groupedData).length}`);
    
    const bullishVWAP = data.filter(r => r.vwap_breakout_bullish).length;
    const nearSupport = data.filter(r => r.near_support).length;
    const nearResistance = data.filter(r => r.near_resistance).length;
    const smartMoneyBullish = data.filter(r => r.smart_money_bullish).length;
    const trendAlignmentStrong = data.filter(r => r.trend_alignment_strong).length;
    
    console.log(`VWAP Breakout Bullish: ${bullishVWAP}/${data.length} tokens`);
    console.log(`Near Support: ${nearSupport}/${data.length} tokens`);
    console.log(`Near Resistance: ${nearResistance}/${data.length} tokens`);
    console.log(`Smart Money Bullish: ${smartMoneyBullish}/${data.length} tokens`);
    console.log(`Trend Alignment Strong: ${trendAlignmentStrong}/${data.length} tokens`);

  } catch (err) {
    console.error('💥 Unexpected error:', err);
  }
}

// Run the query
queryEliteTAFeatures().then(() => {
  console.log('\n🎉 Elite TA Features query completed!');
  process.exit(0);
}).catch(err => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
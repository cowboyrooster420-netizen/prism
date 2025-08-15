import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://igyzlakymfosdeepvunk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlneXpsYWt5bWZvc2RlZXB2dW5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mzc0NjE2MiwiZXhwIjoyMDY5MzIyMTYyfQ.JJVj4TzIlAWrHJ3yn4ptzvreSEAmgGurzRXM0L-LGJI';

const supabase = createClient(supabaseUrl, supabaseKey);

// Token addresses for BONK, SOL, USDC
const TOKEN_ADDRESSES = {
  'BONK': 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  'SOL': 'So11111111111111111111111111111111111111112', 
  'USDC': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
};

async function queryEliteTAFeatures() {
  console.log('🚀 Querying Elite TA Features from ta_latest table...\n');
  
  try {
    // First get the token info to map addresses to symbols
    const { data: tokenData, error: tokenError } = await supabase
      .from('tokens')
      .select('address, symbol, name')
      .in('address', Object.values(TOKEN_ADDRESSES));

    if (tokenError) {
      console.log('⚠️  Could not fetch token info:', tokenError.message);
    }

    // Create address to symbol mapping
    const addressToSymbol: Record<string, string> = {};
    if (tokenData) {
      tokenData.forEach(token => {
        addressToSymbol[token.address] = token.symbol || 'UNKNOWN';
      });
    }

    // Query the ta_latest table
    const { data, error } = await supabase
      .from('ta_latest')
      .select(`
        token_id,
        timeframe,
        ts,
        created_at,
        sma7,
        sma20,
        sma50,
        ema7,
        ema20,
        ema50,
        rsi14,
        macd,
        macd_signal,
        atr14,
        bb_width,
        vol_ma20,
        vol_z60,
        vwap,
        vwap_distance,
        vwap_band_position,
        vwap_upper_band,
        vwap_lower_band,
        support_level,
        resistance_level,
        support_distance,
        resistance_distance,
        smart_money_index,
        trend_alignment_score,
        volume_profile_score,
        vwap_breakout_bullish,
        vwap_breakout_bearish,
        near_support,
        near_resistance,
        smart_money_bullish,
        trend_alignment_strong,
        cross_ema7_over_ema20,
        breakout_high_20,
        bullish_rsi_div
      `)
      .in('token_id', Object.values(TOKEN_ADDRESSES))
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ Error querying ta_latest:', error);
      return;
    }

    if (!data || data.length === 0) {
      console.log('📭 No data found in ta_latest table for the specified tokens');
      console.log('🔍 Looking for tokens with addresses:', Object.values(TOKEN_ADDRESSES));
      return;
    }

    console.log(`✅ Found ${data.length} records with Elite TA features!\n`);

    // Group by token_id for better display
    const groupedData = data.reduce((acc, record) => {
      if (!acc[record.token_id]) {
        acc[record.token_id] = [];
      }
      acc[record.token_id].push(record);
      return acc;
    }, {} as Record<string, any[]>);

    // Display data for each token
    for (const [tokenId, records] of Object.entries(groupedData)) {
      const symbol = addressToSymbol[tokenId] || 
                    Object.keys(TOKEN_ADDRESSES).find(key => TOKEN_ADDRESSES[key] === tokenId) || 
                    'UNKNOWN';
      
      console.log(`🪙 === ${symbol} Token Elite TA Analysis ===`);
      console.log(`📍 Address: ${tokenId}`);
      
      const latest = records[0]; // Most recent record
      
      console.log(`📊 Latest Analysis:`);
      console.log(`   Timeframe: ${latest.timeframe}`);
      console.log(`   Timestamp: ${new Date(latest.ts).toLocaleString()}`);
      console.log(`   Created: ${new Date(latest.created_at).toLocaleString()}`);
      
      console.log(`\n🎯 Elite VWAP Features:`);
      console.log(`   VWAP: $${latest.vwap?.toFixed(8) || 'N/A'}`);
      console.log(`   VWAP Distance: ${(latest.vwap_distance * 100)?.toFixed(4) || 'N/A'}%`);
      console.log(`   VWAP Band Position: ${latest.vwap_band_position?.toFixed(4) || 'N/A'}`);
      console.log(`   VWAP Upper Band: $${latest.vwap_upper_band?.toFixed(8) || 'N/A'}`);
      console.log(`   VWAP Lower Band: $${latest.vwap_lower_band?.toFixed(8) || 'N/A'}`);
      console.log(`   VWAP Breakout Bullish: ${latest.vwap_breakout_bullish ? '🚀 YES' : '❌ NO'}`);
      console.log(`   VWAP Breakout Bearish: ${latest.vwap_breakout_bearish ? '🔻 YES' : '❌ NO'}`);
      
      console.log(`\n🎯 Elite Support/Resistance:`);
      console.log(`   Support Level: $${latest.support_level?.toFixed(8) || 'N/A'}`);
      console.log(`   Resistance Level: $${latest.resistance_level?.toFixed(8) || 'N/A'}`);
      console.log(`   Support Distance: ${(latest.support_distance * 100)?.toFixed(4) || 'N/A'}%`);
      console.log(`   Resistance Distance: ${(latest.resistance_distance * 100)?.toFixed(4) || 'N/A'}%`);
      console.log(`   Near Support: ${latest.near_support ? '🎯 YES' : '❌ NO'}`);
      console.log(`   Near Resistance: ${latest.near_resistance ? '⚠️  YES' : '❌ NO'}`);
      
      console.log(`\n🎯 Elite Scoring System:`);
      console.log(`   Smart Money Index: ${latest.smart_money_index?.toFixed(4) || 'N/A'}`);
      console.log(`   Trend Alignment Score: ${latest.trend_alignment_score?.toFixed(4) || 'N/A'}`);
      console.log(`   Volume Profile Score: ${latest.volume_profile_score?.toFixed(4) || 'N/A'}`);
      console.log(`   Smart Money Bullish: ${latest.smart_money_bullish ? '💰 YES' : '❌ NO'}`);
      console.log(`   Trend Alignment Strong: ${latest.trend_alignment_strong ? '📈 YES' : '❌ NO'}`);
      
      console.log(`\n🎯 Traditional TA Indicators:`);
      console.log(`   RSI (14): ${latest.rsi14?.toFixed(2) || 'N/A'}`);
      console.log(`   MACD: ${latest.macd?.toFixed(8) || 'N/A'}`);
      console.log(`   MACD Signal: ${latest.macd_signal?.toFixed(8) || 'N/A'}`);
      console.log(`   SMA 7: $${latest.sma7?.toFixed(8) || 'N/A'}`);
      console.log(`   SMA 20: $${latest.sma20?.toFixed(8) || 'N/A'}`);
      console.log(`   SMA 50: $${latest.sma50?.toFixed(8) || 'N/A'}`);
      console.log(`   EMA 7: $${latest.ema7?.toFixed(8) || 'N/A'}`);
      console.log(`   EMA 20: $${latest.ema20?.toFixed(8) || 'N/A'}`);
      console.log(`   EMA 50: $${latest.ema50?.toFixed(8) || 'N/A'}`);
      console.log(`   ATR (14): ${latest.atr14?.toFixed(8) || 'N/A'}`);
      console.log(`   Volume MA20: ${latest.vol_ma20?.toLocaleString() || 'N/A'}`);
      
      console.log(`\n🎯 Signal Flags:`);
      console.log(`   EMA7 over EMA20: ${latest.cross_ema7_over_ema20 ? '✅ YES' : '❌ NO'}`);
      console.log(`   Breakout High 20: ${latest.breakout_high_20 ? '🚀 YES' : '❌ NO'}`);
      console.log(`   Bullish RSI Divergence: ${latest.bullish_rsi_div ? '📈 YES' : '❌ NO'}`);
      
      console.log(`\n${'='.repeat(60)}\n`);
    }

    // Summary of Elite Features across all tokens
    console.log(`🌟 === Elite Features Summary Across All Tokens ===`);
    console.log(`Total records analyzed: ${data.length}`);
    console.log(`Unique tokens: ${Object.keys(groupedData).length}`);
    
    const bullishVWAP = data.filter(r => r.vwap_breakout_bullish).length;
    const bearishVWAP = data.filter(r => r.vwap_breakout_bearish).length;
    const nearSupport = data.filter(r => r.near_support).length;
    const nearResistance = data.filter(r => r.near_resistance).length;
    const smartMoneyBullish = data.filter(r => r.smart_money_bullish).length;
    const trendAlignmentStrong = data.filter(r => r.trend_alignment_strong).length;
    
    console.log(`\n🎯 Elite Signal Distribution:`);
    console.log(`   VWAP Breakout Bullish: ${bullishVWAP}/${data.length} records (${((bullishVWAP/data.length)*100).toFixed(1)}%)`);
    console.log(`   VWAP Breakout Bearish: ${bearishVWAP}/${data.length} records (${((bearishVWAP/data.length)*100).toFixed(1)}%)`);
    console.log(`   Near Support: ${nearSupport}/${data.length} records (${((nearSupport/data.length)*100).toFixed(1)}%)`);
    console.log(`   Near Resistance: ${nearResistance}/${data.length} records (${((nearResistance/data.length)*100).toFixed(1)}%)`);
    console.log(`   Smart Money Bullish: ${smartMoneyBullish}/${data.length} records (${((smartMoneyBullish/data.length)*100).toFixed(1)}%)`);
    console.log(`   Trend Alignment Strong: ${trendAlignmentStrong}/${data.length} records (${((trendAlignmentStrong/data.length)*100).toFixed(1)}%)`);

    // Average scores
    const avgSmartMoney = data.reduce((sum, r) => sum + (r.smart_money_index || 0), 0) / data.length;
    const avgTrendAlign = data.reduce((sum, r) => sum + (r.trend_alignment_score || 0), 0) / data.length;
    const avgVolumeProfile = data.reduce((sum, r) => sum + (r.volume_profile_score || 0), 0) / data.length;
    
    console.log(`\n📊 Average Elite Scores:`);
    console.log(`   Smart Money Index: ${avgSmartMoney.toFixed(4)}`);
    console.log(`   Trend Alignment Score: ${avgTrendAlign.toFixed(4)}`);
    console.log(`   Volume Profile Score: ${avgVolumeProfile.toFixed(4)}`);

  } catch (err) {
    console.error('💥 Unexpected error:', err);
  }
}

// Run the query
queryEliteTAFeatures().then(() => {
  console.log('\n🎉 Elite TA Features query completed! These features are amazing! 🚀');
  process.exit(0);
}).catch(err => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
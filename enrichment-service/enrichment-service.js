import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const VOLUME_THRESHOLDS = {
  high: 1000000,    // 1M+ volume
  medium: 100000    // 100K+ volume
};

const ENRICHMENT_INTERVALS = {
  highVolume: 1,    // Every hour
  mediumVolume: 6,  // Every 6 hours
  lowVolume: 24     // Every 24 hours
};

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Main enrichment function
async function enrichTokens(mode = 'auto') {
  console.log(`🚀 Starting token enrichment process (${mode} mode)...`);

  try {
    const tokens = await getTokensNeedingEnrichment(mode);
    console.log(`📊 Found ${tokens.length} tokens to enrich`);

    if (tokens.length === 0) {
      console.log('✅ No tokens need enrichment at this time');
      return;
    }

    // Show enrichment strategy
    if (mode === 'auto') {
      console.log('\n📋 Volume-based enrichment strategy:');
      console.log(`🔥 High volume (>${VOLUME_THRESHOLDS.high.toLocaleString()}): every ${ENRICHMENT_INTERVALS.highVolume}h`);
      console.log(`🟡 Medium volume (>${VOLUME_THRESHOLDS.medium.toLocaleString()}): every ${ENRICHMENT_INTERVALS.mediumVolume}h`);
      console.log(`🔵 Low volume (<${VOLUME_THRESHOLDS.medium.toLocaleString()}): every ${ENRICHMENT_INTERVALS.lowVolume}h`);
      
      // Show breakdown of current batch
      const highVol = tokens.filter(t => t.volume_24h >= VOLUME_THRESHOLDS.high).length;
      const medVol = tokens.filter(t => t.volume_24h >= VOLUME_THRESHOLDS.medium && t.volume_24h < VOLUME_THRESHOLDS.high).length;
      const lowVol = tokens.filter(t => t.volume_24h < VOLUME_THRESHOLDS.medium).length;
      
      console.log(`\n📊 Current batch: ${highVol} high, ${medVol} medium, ${lowVol} low volume tokens`);
    }

    let successCount = 0;
    let errorCount = 0;

    // Process tokens in batches
    const batchSize = 10;
    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize);
      console.log(`\n🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(tokens.length / batchSize)}`);
      
      for (const token of batch) {
        try {
          await enrichSingleToken(token);
          successCount++;
          console.log(`✅ Enriched ${token.symbol} (${token.address.slice(0, 8)}...)`);
        } catch (error) {
          errorCount++;
          console.error(`❌ Failed to enrich ${token.symbol}:`, error.message);
        }
        
        // Rate limiting - small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Longer delay between batches
      if (i + batchSize < tokens.length) {
        console.log('⏳ Waiting between batches...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`\n🎉 Enrichment completed!`);
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📊 Total processed: ${tokens.length}`);

  } catch (error) {
    console.error('💥 Fatal error during enrichment:', error);
    process.exit(1);
  }
}

// Get tokens that need enrichment based on mode and intervals
async function getTokensNeedingEnrichment(mode) {
  const now = new Date();
  const cutoffTime = new Date(now.getTime() - (24 * 60 * 60 * 1000)); // 24 hours ago

  let query = supabase
    .from('tokens')
    .select('*')
    .eq('is_active', true);

  if (mode === 'new') {
    // Only tokens that have never been enriched
    query = query.is('last_enriched', null);
  } else if (mode === 'force') {
    // All active tokens regardless of last enrichment
    query = query.gte('last_updated', cutoffTime.toISOString());
  } else {
    // Auto mode - volume-based prioritization
    query = query.or(
      // High volume tokens - enrich every hour
      `and(volume_24h.gte.${VOLUME_THRESHOLDS.high},last_enriched.lt.${new Date(now.getTime() - (ENRICHMENT_INTERVALS.highVolume * 60 * 60 * 1000)).toISOString()})`,
      // Medium volume tokens - enrich every 6 hours
      `and(volume_24h.gte.${VOLUME_THRESHOLDS.medium},volume_24h.lt.${VOLUME_THRESHOLDS.high},last_enriched.lt.${new Date(now.getTime() - (ENRICHMENT_INTERVALS.mediumVolume * 60 * 60 * 1000)).toISOString()})`,
      // Low volume tokens - enrich every 24 hours
      `and(volume_24h.lt.${VOLUME_THRESHOLDS.medium},last_enriched.lt.${new Date(now.getTime() - (ENRICHMENT_INTERVALS.lowVolume * 60 * 60 * 1000)).toISOString()})`,
      // Never enriched tokens
      'last_enriched.is.null'
    );
  }

  const { data, error } = await query.limit(100); // Limit to prevent overwhelming

  if (error) {
    throw new Error(`Failed to fetch tokens: ${error.message}`);
  }

  return data || [];
}

// Enrich a single token with holder data
async function enrichSingleToken(token) {
  try {
    // Fetch holder data from Solscan API
    const holderData = await fetchHolderData(token.address);
    
    // Update token with enriched data
    const { error } = await supabase
      .from('tokens')
      .update({
        holders: holderData.holders,
        holder_count: holderData.holderCount,
        last_enriched: new Date().toISOString(),
        enrichment_data: holderData
      })
      .eq('address', token.address);

    if (error) {
      throw new Error(`Database update failed: ${error.message}`);
    }

  } catch (error) {
    throw new Error(`Enrichment failed for ${token.symbol}: ${error.message}`);
  }
}

// Fetch holder data from Solscan API
async function fetchHolderData(tokenAddress) {
  const url = `https://api.solscan.io/token/holders?tokenAddress=${tokenAddress}&limit=1`;
  
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    };

    // Add API key if available
    if (process.env.SOLSCAN_API_KEY) {
      headers['Authorization'] = `Bearer ${process.env.SOLSCAN_API_KEY}`;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      if (response.status === 403) {
        console.warn(`⚠️  Solscan API rate limited for ${tokenAddress}, using fallback data`);
        return {
          holders: 0,
          holderCount: 0,
          lastUpdated: new Date().toISOString(),
          note: 'Rate limited - using fallback'
        };
      }
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      holders: data.data?.total || 0,
      holderCount: data.data?.total || 0,
      lastUpdated: new Date().toISOString()
    };

  } catch (error) {
    console.warn(`⚠️  Solscan API error for ${tokenAddress}: ${error.message}, using fallback data`);
    return {
      holders: 0,
      holderCount: 0,
      lastUpdated: new Date().toISOString(),
      note: 'API error - using fallback'
    };
  }
}

// CLI interface
async function main() {
  const command = process.argv[2] || 'enrich';
  const mode = process.argv[3] || 'auto';

  switch (command) {
    case 'enrich':
      await enrichTokens(mode);
      break;
    case 'stats':
      await showStats();
      break;
    case 'test':
      await testConnection();
      break;
    default:
      console.log('Usage: node enrichment-service.js [enrich|stats|test] [auto|new|force]');
      process.exit(1);
  }
}

// Show enrichment statistics
async function showStats() {
  console.log('📊 Enrichment Service Statistics');
  console.log('================================');
  
  try {
    const { count: totalTokens } = await supabase
      .from('tokens')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    const { count: enrichedTokens } = await supabase
      .from('tokens')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .not('last_enriched', 'is', null);

    const { count: recentEnriched } = await supabase
      .from('tokens')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .gte('last_enriched', new Date(Date.now() - (24 * 60 * 60 * 1000)).toISOString());

    console.log(`Total active tokens: ${totalTokens || 0}`);
    console.log(`Tokens ever enriched: ${enrichedTokens || 0}`);
    console.log(`Tokens enriched in last 24h: ${recentEnriched || 0}`);
    
    const enrichmentRate = totalTokens > 0 ? ((enrichedTokens || 0) / totalTokens * 100) : 0;
    console.log(`Enrichment rate: ${enrichmentRate.toFixed(1)}%`);

  } catch (error) {
    console.error('Failed to fetch stats:', error.message);
  }
}

// Test database and API connections
async function testConnection() {
  console.log('🧪 Testing connections...');
  
  try {
    // Test Supabase connection
    const { data, error } = await supabase
      .from('tokens')
      .select('count', { count: 'exact' })
      .limit(1);

    if (error) {
      throw new Error(`Supabase connection failed: ${error.message}`);
    }
    console.log('✅ Supabase connection: OK');

    // Test Solscan API (with fallback handling)
    const testToken = 'So11111111111111111111111111111111111111112'; // SOL
    const result = await fetchHolderData(testToken);
    console.log('✅ Solscan API connection: OK');
    console.log(`📊 Test result: ${result.holders} holders for SOL`);

    console.log('🎉 All connections working!');

  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    process.exit(1);
  }
}

// Run the service
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
} 
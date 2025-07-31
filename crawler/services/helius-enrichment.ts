import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY, HELIUS_API_KEY } from '../config';
import { sleep } from '../utils';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Utility functions ---

async function getHolderCount(mint: string): Promise<number> {
  try {
    const res = await fetch(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getTokenAccountsByMint',
        params: [mint, { encoding: 'jsonParsed' }]
      })
    });

    if (!res.ok) {
      throw new Error(`Helius RPC error: ${res.status}`);
    }

    const json = await res.json() as any;
    const accounts = json.result?.value || [];

    return accounts.filter((acc: any) => {
      const bal = parseFloat(acc.account.data.parsed.info.tokenAmount.uiAmount || 0);
      return bal > 0;
    }).length;
  } catch (error) {
    console.error(`Error getting holder count for ${mint}:`, error);
    return 0;
  }
}

async function getTxCount(mint: string): Promise<number> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const oneDayAgo = now - 86400;

    const url = `https://api.helius.xyz/v0/tokens/${mint}/transfers?api-key=${HELIUS_API_KEY}&start=${oneDayAgo}&limit=1000`;
    const res = await fetch(url);
    
    if (!res.ok) {
      throw new Error(`Helius API error: ${res.status}`);
    }

    const json = await res.json() as any;
    return Array.isArray(json) ? json.length : 0;
  } catch (error) {
    console.error(`Error getting tx count for ${mint}:`, error);
    return 0;
  }
}

async function getTokenMetadata(mint: string): Promise<{ name?: string; symbol?: string; description?: string; image?: string } | null> {
  try {
    const res = await fetch(`https://api.helius.xyz/v0/token-metadata/by-mint/${mint}?api-key=${HELIUS_API_KEY}`);
    
    if (!res.ok) {
      throw new Error(`Helius metadata error: ${res.status}`);
    }

    const json = await res.json() as any;
    
    return {
      name: json.onChainMetadata?.metadata?.data?.name || json.offChainMetadata?.name,
      symbol: json.onChainMetadata?.metadata?.data?.symbol || json.offChainMetadata?.symbol,
      description: json.offChainMetadata?.description,
      image: json.offChainMetadata?.image
    };
  } catch (error) {
    console.error(`Error getting metadata for ${mint}:`, error);
    return null;
  }
}

async function logError(mint: string, message: string) {
  try {
    await supabase.from('token_errors').insert({
      mint_address: mint,
      error_message: message,
      source: 'helius_enrichment',
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to log error:', error);
  }
}

async function processToken(token: any) {
  try {
    console.log(`🔄 Processing ${token.mint_address}...`);
    
    const [holders, txs, metadata] = await Promise.all([
      getHolderCount(token.mint_address),
      getTxCount(token.mint_address),
      getTokenMetadata(token.mint_address)
    ]);

    const updateData: any = {
      holder_count: holders,
      tx_count_last_24h: txs,
      updated_at: new Date().toISOString()
    };

    // Add metadata if available
    if (metadata) {
      if (metadata.name && !token.name?.startsWith('token-')) {
        updateData.name = metadata.name;
      }
      if (metadata.symbol && !token.symbol?.startsWith('TKN')) {
        updateData.symbol = metadata.symbol;
      }
      if (metadata.description) {
        updateData.description = metadata.description;
      }
      if (metadata.image) {
        updateData.logo_uri = metadata.image;
      }
    }

    await supabase.from('tokens')
      .update(updateData)
      .eq('mint_address', token.mint_address);

    console.log(`✅ Updated ${token.mint_address}: ${holders} holders, ${txs} txs`);
    
    // Rate limiting
    await sleep(200);
  } catch (err: any) {
    console.error(`❌ Error with ${token.mint_address}:`, err.message);
    await logError(token.mint_address, err.message);
  }
}

export async function runHeliusEnrichment(batchSize = 5) {
  console.log('🚀 Starting Helius enrichment crawler...');
  
  try {
    const { data: tokens, error } = await supabase
      .from('tokens')
      .select('id, mint_address, name, symbol')
      .order('updated_at', { ascending: true })
      .limit(100); // Process 100 tokens at a time

    if (error) {
      console.error('Failed to fetch tokens:', error.message);
      return;
    }

    console.log(`📊 Found ${tokens.length} tokens to enrich`);

    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize);
      console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(tokens.length / batchSize)}`);
      
      await Promise.all(batch.map(processToken));
      
      // Delay between batches to respect rate limits
      if (i + batchSize < tokens.length) {
        console.log('⏳ Waiting 2 seconds before next batch...');
        await sleep(2000);
      }
    }

    console.log('🎉 Helius enrichment complete.');
  } catch (error) {
    console.error('❌ Helius enrichment failed:', error);
  }
}

// Run if called directly
if (require.main === module) {
  runHeliusEnrichment().then(() => {
    console.log('✅ Helius enrichment finished');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Helius enrichment failed:', error);
    process.exit(1);
  });
} 
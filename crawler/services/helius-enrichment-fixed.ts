import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY, HELIUS_API_KEY } from '../config';
import { sleep } from '../utils';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Utility functions ---

async function getTokenMetadata(mint: string): Promise<{ name?: string; symbol?: string; description?: string; image?: string } | null> {
  try {
    const res = await fetch(`https://api.helius.xyz/v0/token-metadata?api-key=${HELIUS_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mintAccounts: [mint],
        includeOffChain: true,
        disableCache: false
      })
    });

    if (!res.ok) {
      throw new Error(`Helius metadata error: ${res.status}`);
    }

    const json = await res.json() as any;
    const tokenData = json[0];
    
    if (!tokenData) return null;
    
    return {
      name: tokenData.onChainMetadata?.metadata?.data?.name || tokenData.offChainMetadata?.name,
      symbol: tokenData.onChainMetadata?.metadata?.data?.symbol || tokenData.offChainMetadata?.symbol,
      description: tokenData.offChainMetadata?.description,
      image: tokenData.offChainMetadata?.image
    };
  } catch (error) {
    console.error(`Helius metadata error for ${mint}:`, error);
    return null;
  }
}

async function getTokenSupply(mint: string): Promise<number> {
  try {
    const res = await fetch(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getTokenSupply',
        params: [mint]
      })
    });

    if (!res.ok) {
      throw new Error(`Helius supply error: ${res.status}`);
    }

    const json = await res.json() as any;
    return parseInt(json.result?.value?.amount || '0');
  } catch (error) {
    console.error(`Helius supply error for ${mint}:`, error);
    return 0;
  }
}

async function logError(mint: string, message: string) {
  try {
    await supabase.from('token_errors').insert({
      mint_address: mint,
      error_message: message,
      source: 'helius_crawler'
    });
  } catch (error) {
    console.error('Failed to log error:', error);
  }
}

async function processToken(token: any) {
  try {
    console.log(`🔄 Processing ${token.mint_address}...`);
    
    // Get metadata and supply info
    const [metadata, supply] = await Promise.all([
      getTokenMetadata(token.mint_address),
      getTokenSupply(token.mint_address)
    ]);

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    // Add metadata if available
    if (metadata?.name && metadata.name !== token.name) {
      updateData.name = metadata.name;
    }
    if (metadata?.symbol && metadata.symbol !== token.symbol) {
      updateData.symbol = metadata.symbol;
    }
    if (metadata?.description) {
      updateData.description = metadata.description;
    }
    if (metadata?.image) {
      updateData.logo_uri = metadata.image;
    }

    // Add supply info as a proxy for holder activity
    if (supply > 0) {
      updateData.token_supply = supply;
    }

    // Only update if we have new data
    if (Object.keys(updateData).length > 1) { // More than just updated_at
      await supabase.from('tokens')
        .update(updateData)
        .eq('id', token.id);

      console.log(`✅ Updated ${token.mint_address}: ${Object.keys(updateData).length - 1} fields updated`);
    } else {
      console.log(`⏭️  Skipped ${token.mint_address}: no new data`);
    }
  } catch (err: any) {
    console.error(`❌ Error with ${token.mint_address}:`, err.message);
    await logError(token.mint_address, err.message);
  }
}

export async function runHeliusEnrichment(limit = 100) {
  console.log('🚀 Starting Helius Token Enrichment...');
  console.log(`Processing up to ${limit} tokens...`);

  try {
    const { data: tokens, error } = await supabase
      .from('tokens')
      .select('id, mint_address, name, symbol')
      .limit(limit);

    if (error) {
      console.error('Failed to fetch tokens:', error.message);
      return;
    }

    if (!tokens || tokens.length === 0) {
      console.log('No tokens found to enrich');
      return;
    }

    console.log(`📊 Found ${tokens.length} tokens to enrich`);

    let processed = 0;
    for (const token of tokens) {
      await processToken(token);
      processed++;
      
      // Add delay to respect rate limits
      if (processed % 10 === 0) {
        console.log(`⏳ Processed ${processed}/${tokens.length} tokens, pausing...`);
        await sleep(1000);
      } else {
        await sleep(200);
      }
    }

    console.log(`🎉 Helius enrichment complete. Processed ${processed} tokens.`);
  } catch (error) {
    console.error('❌ Helius enrichment failed:', error);
  }
} 
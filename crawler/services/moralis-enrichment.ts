import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY, MORALIS_API_KEY } from '../config';
import { sleep } from '../utils';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Utility functions ---

async function getHolderCount(mint: string): Promise<number> {
  try {
    const options = {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'X-API-Key': MORALIS_API_KEY
      },
    };

    const response = await fetch(`https://solana-gateway.moralis.io/token/mainnet/holders/${mint}`, options);
    
    if (!response.ok) {
      throw new Error(`Moralis API error: ${response.status}`);
    }

    const data = await response.json() as any;
    
    // The response should contain holder information
    if (data && typeof data === 'object') {
      // Check for totalHolders field (this is what Moralis returns)
      if (typeof data.totalHolders === 'number') {
        return data.totalHolders;
      } else if (Array.isArray(data.result)) {
        return data.result.length;
      } else if (data.result && Array.isArray(data.result)) {
        return data.result.length;
      } else if (typeof data.count === 'number') {
        return data.count;
      } else if (typeof data.total === 'number') {
        return data.total;
      }
    }
    
    return 0;
  } catch (error) {
    console.error(`Moralis holder count error for ${mint}:`, error);
    return 0;
  }
}

async function getTokenMetadata(mint: string): Promise<{ name?: string; symbol?: string; description?: string; image?: string } | null> {
  try {
    const options = {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'X-API-Key': MORALIS_API_KEY
      },
    };

    const response = await fetch(`https://solana-gateway.moralis.io/token/mainnet/metadata/${mint}`, options);
    
    if (!response.ok) {
      throw new Error(`Moralis metadata error: ${response.status}`);
    }

    const data = await response.json() as any;
    
    return {
      name: data.name,
      symbol: data.symbol,
      description: data.description,
      image: data.logo
    };
  } catch (error) {
    console.error(`Moralis metadata error for ${mint}:`, error);
    return null;
  }
}

async function logError(mint: string, message: string) {
  try {
    await supabase.from('token_errors').insert({
      mint_address: mint,
      error_message: message,
      source: 'moralis_crawler'
    });
  } catch (error) {
    console.error('Failed to log error:', error);
  }
}

async function processToken(token: any) {
  try {
    console.log(`🔄 Processing ${token.mint_address}...`);
    
    // Get holder count and metadata
    const [holderCount, metadata] = await Promise.all([
      getHolderCount(token.mint_address),
      getTokenMetadata(token.mint_address)
    ]);

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    // Add holder count
    if (holderCount > 0) {
      updateData.holder_count = holderCount;
    }

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

    // Only update if we have new data
    if (Object.keys(updateData).length > 1) { // More than just updated_at
      await supabase.from('tokens')
        .update(updateData)
        .eq('id', token.id);

      console.log(`✅ Updated ${token.mint_address}: ${holderCount} holders, ${Object.keys(updateData).length - 1} fields updated`);
    } else {
      console.log(`⏭️  Skipped ${token.mint_address}: no new data`);
    }
  } catch (err: any) {
    console.error(`❌ Error with ${token.mint_address}:`, err.message);
    await logError(token.mint_address, err.message);
  }
}

export async function runMoralisEnrichment(limit = 100) {
  console.log('🚀 Starting Moralis Token Enrichment...');
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

    console.log(`🎉 Moralis enrichment complete. Processed ${processed} tokens.`);
  } catch (error) {
    console.error('❌ Moralis enrichment failed:', error);
  }
} 
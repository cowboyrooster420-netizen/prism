import { HELIUS_API_KEY, HELIUS_RATE_LIMIT_MS, MAX_TOKENS_PER_CRAWL } from '../config';
import { sleep } from '../utils/sleep';
import { HeliusToken, Token } from '../types';

// For now, we'll use some example addresses to fetch tokens from
// In production, you'd want to get these from trending addresses, new mints, etc.
const EXAMPLE_ADDRESSES = [
  'So11111111111111111111111111111111111111112', // Wrapped SOL
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // Bonk
  // Add more addresses as needed
];

export async function fetchRecentTokens(): Promise<Token[]> {
  try {
    console.log('Fetching recent tokens from Helius...');
    
    // Get trending addresses (for now, use example addresses)
    const addresses = await getTrendingAddresses();
    
    // Fetch token metadata for each address using Helius API
    const tokens: Token[] = [];
    
    for (const address of addresses) {
      try {
        console.log(`Fetching token metadata for ${address}...`);
        const tokenData = await getTokenMetadata(address);
        if (tokenData) {
          tokens.push(tokenData);
          console.log(`Successfully fetched: ${tokenData.name} (${tokenData.symbol})`);
        }
        await sleep(HELIUS_RATE_LIMIT_MS); // Rate limiting
      } catch (error) {
        console.error(`Failed to fetch tokens for ${address}:`, error);
        continue;
      }
    }
    
    console.log(`Total tokens fetched: ${tokens.length}`);
    console.log(`Fetched ${tokens.length} tokens from Helius`);
    return tokens;
    
  } catch (error) {
    console.error('Error fetching recent tokens:', error);
    return [];
  }
}

async function getTokenMetadata(mintAddress: string): Promise<Token | null> {
  try {
    // Use Helius token metadata API
    const res = await fetch(
      `https://api.helius.xyz/v0/token-metadata?api-key=${HELIUS_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mintAccounts: [mintAddress],
          includeOffChain: true,
          disableCache: false,
        }),
      }
    );
    
    if (!res.ok) {
      console.error(`Helius API error for ${mintAddress}:`, res.status, res.statusText);
      return null;
    }
    
    const json = await res.json() as any;
    const metadata = json[0]; // First (and only) token in the response
    
    if (!metadata || metadata.error) {
      console.error(`No metadata found for ${mintAddress}:`, metadata?.error);
      return null;
    }
    
    // Get holder count using RPC
    const holderCount = await getHolderCount(mintAddress);
    
    // Create token with real data from Helius
    const token: Token = {
      mint_address: mintAddress,
      name: metadata.onChainMetadata?.metadata?.data?.name || 
            metadata.offChainMetadata?.name || 
            `Token-${mintAddress.slice(0, 8)}`,
      symbol: metadata.onChainMetadata?.metadata?.data?.symbol || 
              metadata.offChainMetadata?.symbol || 
              `TKN${mintAddress.slice(0, 4)}`,
      market_cap: Math.random() * 10000000, // TODO: Fetch from price API
      volume_1h: Math.random() * 100000, // TODO: Fetch from DEX API
      volume_24h: Math.random() * 1000000, // TODO: Fetch from DEX API
      holder_count: holderCount,
      holder_growth_1h: Math.floor(Math.random() * 100), // TODO: Calculate from historical data
      whale_buys_1h: Math.floor(Math.random() * 10), // TODO: Analyze transactions
      liquidity: Math.random() * 100000, // TODO: Fetch from DEX API
      price: Math.random() * 10, // TODO: Fetch from price API
      price_change_1h: (Math.random() - 0.5) * 20, // TODO: Calculate from price data
      price_change_24h: (Math.random() - 0.5) * 50, // TODO: Calculate from price data
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    return token;
  } catch (error) {
    console.error(`Error getting metadata for ${mintAddress}:`, error);
    return null;
  }
}

async function getHolderCount(mintAddress: string): Promise<number> {
  try {
    // Get token account holders using RPC
    const res = await fetch(
      `https://rpc.helius.xyz/?api-key=${HELIUS_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getTokenAccountsByMint',
          params: [mintAddress],
        }),
      }
    );
    
    if (!res.ok) {
      return 0;
    }
    
    const json = await res.json() as any;
    const accounts = json.result?.value || [];
    
    return accounts.length;
  } catch (error) {
    console.error(`Error getting holder count for ${mintAddress}:`, error);
    return 0;
  }
}



// Helper function to get trending addresses (placeholder for future implementation)
async function getTrendingAddresses(): Promise<string[]> {
  // This could fetch from:
  // - Recent token mints
  // - Trending addresses
  // - New token launches
  // For now, return example addresses
  return EXAMPLE_ADDRESSES;
} 
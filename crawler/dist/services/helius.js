"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchRecentTokens = fetchRecentTokens;
const config_1 = require("../config");
const sleep_1 = require("../utils/sleep");
// For now, we'll use some example addresses to fetch tokens from
// In production, you'd want to get these from trending addresses, new mints, etc.
const EXAMPLE_ADDRESSES = [
    'So11111111111111111111111111111111111111112', // Wrapped SOL
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
    // Add more addresses as needed
];
async function fetchRecentTokens() {
    try {
        console.log('Fetching recent tokens from Helius...');
        const allTokens = [];
        for (const address of EXAMPLE_ADDRESSES) {
            try {
                const res = await fetch(`https://api.helius.xyz/v0/addresses/${address}/tokens?api-key=${config_1.HELIUS_API_KEY}`);
                if (!res.ok) {
                    console.error(`Failed to fetch tokens for ${address}:`, res.status);
                    continue;
                }
                const json = await res.json();
                const heliusTokens = json.tokens || [];
                // Convert Helius tokens to our Token format
                const convertedTokens = heliusTokens.map(convertHeliusToToken);
                allTokens.push(...convertedTokens);
                console.log(`Fetched ${heliusTokens.length} tokens from ${address}`);
                // Rate limiting
                await (0, sleep_1.sleep)(config_1.HELIUS_RATE_LIMIT_MS);
            }
            catch (error) {
                console.error(`Error fetching tokens for ${address}:`, error);
                continue;
            }
        }
        // Limit the number of tokens returned
        const limitedTokens = allTokens.slice(0, config_1.MAX_TOKENS_PER_CRAWL);
        console.log(`Total tokens fetched: ${limitedTokens.length}`);
        return limitedTokens;
    }
    catch (error) {
        console.error('Error fetching recent tokens:', error);
        return [];
    }
}
function convertHeliusToToken(heliusToken) {
    return {
        mint_address: heliusToken.mint,
        // For now, we'll add some mock data since Helius doesn't provide all fields
        name: `Token-${heliusToken.mint.slice(0, 8)}`,
        symbol: `TKN${heliusToken.mint.slice(0, 4)}`,
        market_cap: Math.random() * 10000000, // Mock market cap
        volume_1h: Math.random() * 100000, // Mock 1h volume
        volume_24h: Math.random() * 1000000, // Mock 24h volume
        holder_count: Math.floor(Math.random() * 1000) + 10, // Mock holder count
        holder_growth_1h: Math.floor(Math.random() * 100), // Mock holder growth
        whale_buys_1h: Math.floor(Math.random() * 10), // Mock whale buys
        liquidity: Math.random() * 100000, // Mock liquidity
        price: Math.random() * 10, // Mock price
        price_change_1h: (Math.random() - 0.5) * 20, // Mock price change
        price_change_24h: (Math.random() - 0.5) * 50, // Mock price change
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
}
// Helper function to get trending addresses (placeholder for future implementation)
async function getTrendingAddresses() {
    // This could fetch from:
    // - Recent token mints
    // - Trending addresses
    // - New token launches
    // For now, return example addresses
    return EXAMPLE_ADDRESSES;
}
//# sourceMappingURL=helius.js.map
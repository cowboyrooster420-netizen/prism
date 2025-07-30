"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertToken = upsertToken;
exports.getTokenByMint = getTokenByMint;
exports.getRecentTokens = getRecentTokens;
exports.deleteOldTokens = deleteOldTokens;
exports.getTokenCount = getTokenCount;
const supabase_js_1 = require("@supabase/supabase-js");
const config_1 = require("../config");
const supabase = (0, supabase_js_1.createClient)(config_1.SUPABASE_URL, config_1.SUPABASE_KEY);
async function upsertToken(token) {
    try {
        // Prepare the token data for Supabase - only include fields that exist in the database
        const tokenData = {
            mint_address: token.mint_address,
            name: token.name,
            symbol: token.symbol,
            market_cap: token.market_cap,
            volume_1h: token.volume_1h,
            volume_24h: token.volume_24h,
            holder_count: token.holder_count,
            holder_growth_1h: token.holder_growth_1h,
            whale_buys_1h: token.whale_buys_1h,
            liquidity: token.liquidity,
            price: token.price,
            price_change_1h: token.price_change_1h,
            price_change_24h: token.price_change_24h,
            created_at: token.created_at,
            updated_at: token.updated_at,
        };
        const { error } = await supabase
            .from('tokens')
            .upsert(tokenData, { onConflict: 'mint_address' });
        if (error) {
            console.error('Supabase upsert error:', error);
            return false;
        }
        console.log(`Successfully upserted token: ${token.symbol || token.mint_address}`);
        return true;
    }
    catch (error) {
        console.error('Unexpected error during upsert:', error);
        return false;
    }
}
// Additional helper functions
async function getTokenByMint(mintAddress) {
    const { data, error } = await supabase
        .from('tokens')
        .select('*')
        .eq('mint_address', mintAddress)
        .single();
    if (error) {
        console.error('Error fetching token:', error);
        return null;
    }
    return data;
}
async function getRecentTokens(limit = 100) {
    const { data, error } = await supabase
        .from('tokens')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(limit);
    if (error) {
        console.error('Error fetching recent tokens:', error);
        return [];
    }
    return data || [];
}
async function deleteOldTokens(olderThanDays = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    const { error, count } = await supabase
        .from('tokens')
        .delete()
        .lt('updated_at', cutoffDate.toISOString());
    if (error) {
        console.error('Error deleting old tokens:', error);
        return 0;
    }
    console.log(`Deleted ${count} old tokens`);
    return count || 0;
}
async function getTokenCount() {
    const { count, error } = await supabase
        .from('tokens')
        .select('*', { count: 'exact', head: true });
    if (error) {
        console.error('Error getting token count:', error);
        return 0;
    }
    return count || 0;
}
//# sourceMappingURL=supabase.js.map
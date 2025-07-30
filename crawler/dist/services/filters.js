"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterTokens = filterTokens;
const config_1 = require("../config");
function filterTokens(tokens) {
    console.log(`Filtering ${tokens.length} tokens...`);
    // Step 1: Basic filtering
    const basicFiltered = tokens.filter(token => {
        const name = token.name?.toLowerCase() || '';
        const symbol = token.symbol?.toLowerCase() || '';
        // Name-based filters
        const suspiciousTerms = ['rug', 'scam', 'fake', 'test', 'moon', 'safe'];
        const hasSuspiciousName = suspiciousTerms.some(term => name.includes(term) || symbol.includes(term));
        if (hasSuspiciousName) {
            console.log(`Filtered out suspicious token: ${token.name} (${token.symbol})`);
            return false;
        }
        // Basic quality filters
        if (token.holder_count && token.holder_count < config_1.MIN_HOLDER_COUNT) {
            console.log(`Filtered out low holder count: ${token.name} (${token.holder_count} holders)`);
            return false;
        }
        if (token.volume_24h && token.volume_24h < config_1.MIN_VOLUME_24H) {
            console.log(`Filtered out low volume: ${token.name} ($${token.volume_24h} volume)`);
            return false;
        }
        if (token.market_cap && token.market_cap < config_1.MIN_MARKET_CAP) {
            console.log(`Filtered out low market cap: ${token.name} ($${token.market_cap} MC)`);
            return false;
        }
        if (token.liquidity && token.liquidity < config_1.MIN_LIQUIDITY) {
            console.log(`Filtered out low liquidity: ${token.name} ($${token.liquidity} liquidity)`);
            return false;
        }
        return true;
    });
    console.log(`Basic filtering: ${basicFiltered.length} tokens passed`);
    // Step 2: Quality scoring
    const scoredTokens = basicFiltered.map(token => {
        const score = calculateTokenScore(token);
        return { token, score: score.total, reasons: score.reasons };
    });
    // Step 3: Sort by score and take top tokens
    scoredTokens.sort((a, b) => b.score - a.score);
    // Step 4: Dynamic threshold adjustment
    const targetCount = Math.min(config_1.TARGET_QUALITY_TOKENS, scoredTokens.length);
    const selectedTokens = scoredTokens.slice(0, targetCount);
    console.log(`Quality scoring: Selected ${selectedTokens.length} top-scoring tokens`);
    // Log some top performers
    selectedTokens.slice(0, 5).forEach(({ token, score, reasons }) => {
        console.log(`Top token: ${token.name} (${token.symbol}) - Score: ${score.toFixed(2)} - Reasons: ${reasons.join(', ')}`);
    });
    return selectedTokens.map(item => item.token);
}
function calculateTokenScore(token) {
    let score = 0;
    const reasons = [];
    // Holder count scoring (0-25 points)
    if (token.holder_count) {
        if (token.holder_count >= 10000) {
            score += 25;
            reasons.push('massive_community');
        }
        else if (token.holder_count >= 5000) {
            score += 20;
            reasons.push('large_community');
        }
        else if (token.holder_count >= 1000) {
            score += 15;
            reasons.push('medium_community');
        }
        else if (token.holder_count >= 500) {
            score += 10;
            reasons.push('growing_community');
        }
        else if (token.holder_count >= 100) {
            score += 5;
            reasons.push('active_community');
        }
    }
    // Volume scoring (0-25 points)
    if (token.volume_24h) {
        if (token.volume_24h >= 1000000) {
            score += 25;
            reasons.push('high_volume');
        }
        else if (token.volume_24h >= 500000) {
            score += 20;
            reasons.push('good_volume');
        }
        else if (token.volume_24h >= 100000) {
            score += 15;
            reasons.push('decent_volume');
        }
        else if (token.volume_24h >= 50000) {
            score += 10;
            reasons.push('moderate_volume');
        }
        else if (token.volume_24h >= 10000) {
            score += 5;
            reasons.push('low_volume');
        }
    }
    // Market cap scoring (0-20 points)
    if (token.market_cap) {
        if (token.market_cap >= 10000000) {
            score += 20;
            reasons.push('large_mc');
        }
        else if (token.market_cap >= 5000000) {
            score += 15;
            reasons.push('medium_mc');
        }
        else if (token.market_cap >= 1000000) {
            score += 10;
            reasons.push('small_mc');
        }
        else if (token.market_cap >= 500000) {
            score += 5;
            reasons.push('micro_mc');
        }
    }
    // Liquidity scoring (0-15 points)
    if (token.liquidity) {
        if (token.liquidity >= 100000) {
            score += 15;
            reasons.push('high_liquidity');
        }
        else if (token.liquidity >= 50000) {
            score += 12;
            reasons.push('good_liquidity');
        }
        else if (token.liquidity >= 10000) {
            score += 8;
            reasons.push('decent_liquidity');
        }
        else if (token.liquidity >= 5000) {
            score += 4;
            reasons.push('low_liquidity');
        }
    }
    // Growth indicators (0-15 points)
    if (token.holder_growth_1h && token.holder_growth_1h > 0) {
        score += Math.min(15, token.holder_growth_1h * 2);
        reasons.push('growing_holders');
    }
    if (token.whale_buys_1h && token.whale_buys_1h > 0) {
        score += Math.min(10, token.whale_buys_1h * 2);
        reasons.push('whale_activity');
    }
    // Brand recognition bonus (0-10 points)
    const name = token.name?.toLowerCase() || '';
    const symbol = token.symbol?.toLowerCase() || '';
    if (name.includes('sol') || symbol.includes('sol')) {
        score += 5;
        reasons.push('sol_brand');
    }
    if (name.includes('ai') || name.includes('artificial') || symbol.includes('ai')) {
        score += 3;
        reasons.push('ai_trend');
    }
    if (name.includes('meme') || name.includes('dog') || name.includes('cat')) {
        score += 2;
        reasons.push('meme_potential');
    }
    return { total: score, reasons };
}
//# sourceMappingURL=filters.js.map
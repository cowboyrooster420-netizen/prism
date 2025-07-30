export interface Token {
    mint_address: string;
    name?: string;
    symbol?: string;
    market_cap?: number;
    volume_1h?: number;
    volume_24h?: number;
    holder_count?: number;
    holder_growth_1h?: number;
    whale_buys_1h?: number;
    liquidity?: number;
    price?: number;
    price_change_1h?: number;
    price_change_24h?: number;
    created_at?: string;
    updated_at?: string;
}
export interface EnrichedToken extends Token {
    aiScore: number;
    updatedAt: string;
    marketMetrics?: {
        volatility24h: number;
        priceChange1h: number;
        priceChange24h: number;
    };
    socialMetrics?: {
        twitterMentions: number;
        telegramMembers: number;
        discordMembers: number;
    };
    technicalMetrics?: {
        rsi: number;
        macd: number;
        volumeSpike: boolean;
    };
}
export interface HeliusToken {
    mint: string;
    amount: string;
    decimals: number;
    owner: string;
    name?: string;
    symbol?: string;
}
export interface TokenFilter {
    column: string;
    operator: 'eq' | 'lt' | 'lte' | 'gt' | 'gte' | 'like';
    value: string | number;
}
//# sourceMappingURL=types.d.ts.map
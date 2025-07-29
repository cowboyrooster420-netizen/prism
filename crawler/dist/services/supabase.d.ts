import { Token, EnrichedToken } from '../types';
export declare function upsertToken(token: EnrichedToken): Promise<boolean>;
export declare function getTokenByMint(mintAddress: string): Promise<Token | null>;
export declare function getRecentTokens(limit?: number): Promise<Token[]>;
export declare function deleteOldTokens(olderThanDays?: number): Promise<number>;
export declare function getTokenCount(): Promise<number>;
//# sourceMappingURL=supabase.d.ts.map
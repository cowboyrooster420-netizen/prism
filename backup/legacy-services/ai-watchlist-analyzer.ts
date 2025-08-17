import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

interface TokenAnalysis {
  address: string;
  name: string;
  symbol: string;
  price: number;
  volume24h: number;
  priceChange24h: number;
  liquidity: number;
  holders: number;
  marketCap: number;
  tier: number;
  source: string;
}

interface AIAnalysisResult {
  bullish_score: number;
  bearish_score: number;
  confidence_score: number;
  reasoning: string;
  recommendation: 'add' | 'remove' | 'hold' | 'monitor';
  factors: Record<string, any>;
}

interface WatchlistConfig {
  min_volume_24h: number;
  min_market_cap: number;
  min_holders: number;
  min_liquidity: number;
  max_tokens: number;
  bullish_threshold: number;
  bearish_threshold: number;
}

class AIWatchlistAnalyzer {
  private supabase: any;
  private openai: OpenAI;
  private watchlistId: number;

  constructor(config: {
    supabaseUrl: string;
    supabaseKey: string;
    openaiApiKey: string;
    watchlistId: number;
  }) {
    this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
    this.openai = new OpenAI({ apiKey: config.openaiApiKey });
    this.watchlistId = config.watchlistId;
  }

  private async getWatchlistConfig(): Promise<WatchlistConfig> {
    const { data, error } = await this.supabase
      .from('ai_watchlist_config')
      .select('*')
      .eq('watchlist_id', this.watchlistId)
      .single();

    if (error || !data) {
      // Return default config if not found
      return {
        min_volume_24h: 10000,
        min_market_cap: 100000,
        min_holders: 100,
        min_liquidity: 50000,
        max_tokens: 25,
        bullish_threshold: 0.7,
        bearish_threshold: 0.6
      };
    }

    return data;
  }

  private async getCurrentWatchlistTokens(): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('watchlist_tokens')
      .select('token_address')
      .eq('watchlist_id', this.watchlistId)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching current watchlist tokens:', error);
      return [];
    }

    return data.map((item: any) => item.token_address);
  }

  private async getCandidateTokens(): Promise<TokenAnalysis[]> {
    const config = await this.getWatchlistConfig();
    
    // Relaxed filters: require only volume and liquidity; allow missing holders/market_cap
    const { data, error } = await this.supabase
      .from('tokens')
      .select('address,name,symbol,price,volume_24h,price_change_24h,market_cap,liquidity,holders,tier,source')
      .eq('is_active', true)
      .gte('volume_24h', config.min_volume_24h)
      .gte('liquidity', config.min_liquidity)
      .order('volume_24h', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching candidate tokens:', error);
      return [];
    }

    return (data || []).map((token: any) => ({
      address: token.address,
      name: token.name,
      symbol: token.symbol,
      price: token.price ?? 0,
      volume24h: token.volume_24h ?? 0,
      priceChange24h: token.price_change_24h ?? 0,
      liquidity: token.liquidity ?? 0,
      holders: token.holders ?? 0,
      marketCap: token.market_cap ?? 0,
      tier: token.tier ?? 3,
      source: token.source ?? 'unknown'
    }));
  }

  private async analyzeTokenWithAI(token: TokenAnalysis): Promise<AIAnalysisResult> {
    const prompt = `
You are an expert cryptocurrency analyst specializing in Solana tokens. Analyze the following token data and provide a comprehensive assessment.

Token Data:
- Name: ${token.name} (${token.symbol})
- Price: $${token.price}
- 24h Volume: $${token.volume24h.toLocaleString()}
- 24h Price Change: ${token.priceChange24h}%
- Market Cap: $${token.marketCap.toLocaleString()}
- Liquidity: $${token.liquidity.toLocaleString()}
- Holders: ${token.holders}
- Tier: ${token.tier}
- Source: ${token.source}

Please analyze this token and provide:
1. Bullish score (0.0-1.0): How bullish are you on this token?
2. Bearish score (0.0-1.0): How bearish are you on this token?
3. Confidence score (0.0-1.0): How confident are you in your analysis?
4. Detailed reasoning: Explain your analysis
5. Recommendation: "add", "remove", "hold", or "monitor"
6. Key factors: JSON object with specific metrics that influenced your decision

Consider factors like:
- Volume trends and liquidity
- Price momentum and volatility
- Holder distribution and growth
- Market cap relative to volume
- Token age and development activity
- Overall market conditions

Respond with a valid JSON object only:
{
  "bullish_score": 0.85,
  "bearish_score": 0.15,
  "confidence_score": 0.78,
  "reasoning": "Strong volume growth with increasing holder count...",
  "recommendation": "add",
  "factors": {
    "volume_growth": "positive",
    "holder_trend": "increasing",
    "liquidity_ratio": 0.8
  }
}
`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a professional cryptocurrency analyst. Provide accurate, data-driven analysis in JSON format only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      });

      const response = completion.choices[0].message.content;
      if (!response) {
        throw new Error('No response from AI');
      }

      // Parse the JSON response
      const analysis = JSON.parse(response.trim());
      
      // Validate the response
      if (typeof analysis.bullish_score !== 'number' || 
          typeof analysis.bearish_score !== 'number' ||
          typeof analysis.confidence_score !== 'number') {
        throw new Error('Invalid AI response format');
      }

      return {
        bullish_score: Math.max(0, Math.min(1, analysis.bullish_score)),
        bearish_score: Math.max(0, Math.min(1, analysis.bearish_score)),
        confidence_score: Math.max(0, Math.min(1, analysis.confidence_score)),
        reasoning: analysis.reasoning || '',
        recommendation: analysis.recommendation || 'monitor',
        factors: analysis.factors || {}
      };

    } catch (error) {
      console.error(`Error analyzing token ${token.symbol}:`, error);
      
      // Heuristic fallback when AI is unavailable
      const liquidityScore = Math.min(1, (token.liquidity || 0) / 200000);
      const volumeScore = Math.min(1, (token.volume24h || 0) / 1000000);
      const rawMomentum = typeof token.priceChange24h === 'number' ? token.priceChange24h : 0;
      // Map price change from [-10%, +50%] to [0,1]
      const momentumClamped = Math.max(-10, Math.min(50, rawMomentum));
      const momentumScore = (momentumClamped + 10) / 60; // -10 => 0, +50 => 1
      const confidence = Math.max(0, Math.min(1, (0.4 * volumeScore) + (0.4 * liquidityScore) + (0.2 * momentumScore)));

      return {
        bullish_score: confidence,
        bearish_score: 1 - confidence,
        confidence_score: confidence,
        reasoning: 'Heuristic analysis used due to AI unavailability (based on volume, liquidity, momentum).',
        recommendation: confidence >= 0.6 ? 'add' : 'monitor',
        factors: {
          heuristic: true,
          liquidityScore,
          volumeScore,
          momentumScore,
          priceChange24h: rawMomentum,
          liquidity: token.liquidity,
          volume24h: token.volume24h
        }
      };
    }
  }

  private async saveAnalysis(tokenAddress: string, analysis: AIAnalysisResult): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('ai_analysis')
        .insert({
          token_address: tokenAddress,
          bullish_score: analysis.bullish_score,
          bearish_score: analysis.bearish_score,
          confidence_score: analysis.confidence_score,
          reasoning: analysis.reasoning,
          factors: analysis.factors,
          recommendation: analysis.recommendation,
          watchlist_id: this.watchlistId
        });

      if (error) {
        console.error('Error saving AI analysis:', error);
      }
    } catch (error) {
      console.error('Error saving analysis:', error);
    }
  }

  private async addTokenToWatchlist(tokenAddress: string, analysis: AIAnalysisResult): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('watchlist_tokens')
        .insert({
          watchlist_id: this.watchlistId,
          token_address: tokenAddress,
          ai_confidence_score: analysis.confidence_score,
          ai_reasoning: analysis.reasoning,
          is_active: true
        });

      if (error) {
        console.error('Error adding token to watchlist:', error);
      } else {
        console.log(`✅ Added ${tokenAddress} to watchlist (confidence: ${analysis.confidence_score})`);
      }
    } catch (error) {
      console.error('Error adding token to watchlist:', error);
    }
  }

  private async removeTokenFromWatchlist(tokenAddress: string, analysis: AIAnalysisResult): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('watchlist_tokens')
        .update({
          is_active: false,
          removed_at: new Date().toISOString()
        })
        .eq('watchlist_id', this.watchlistId)
        .eq('token_address', tokenAddress);

      if (error) {
        console.error('Error removing token from watchlist:', error);
      } else {
        console.log(`❌ Removed ${tokenAddress} from watchlist (reason: ${analysis.reasoning.substring(0, 50)}...)`);
      }
    } catch (error) {
      console.error('Error removing token from watchlist:', error);
    }
  }

  private async manageWatchlistSize(): Promise<void> {
    const config = await this.getWatchlistConfig();
    
    // Get current active tokens count
    const { data: currentTokens, error } = await this.supabase
      .from('watchlist_tokens')
      .select('id, ai_confidence_score')
      .eq('watchlist_id', this.watchlistId)
      .eq('is_active', true)
      .order('ai_confidence_score', { ascending: false });

    if (error || !currentTokens) {
      console.error('Error checking watchlist size:', error);
      return;
    }

    // If we're over the limit, remove the lowest confidence tokens
    if (currentTokens.length > config.max_tokens) {
      const tokensToRemove = currentTokens.slice(config.max_tokens);
      
      for (const token of tokensToRemove) {
        await this.supabase
          .from('watchlist_tokens')
          .update({
            is_active: false,
            removed_at: new Date().toISOString()
          })
          .eq('id', token.id);
      }

      console.log(`📊 Removed ${tokensToRemove.length} tokens to maintain watchlist size limit`);
    }
  }

  public async runAnalysis(): Promise<void> {
    console.log('🤖 Starting AI watchlist analysis...');

    try {
      const config = await this.getWatchlistConfig();
      const currentTokens = await this.getCurrentWatchlistTokens();
      const candidateTokens = await this.getCandidateTokens();

      console.log(`📊 Analyzing ${candidateTokens.length} candidate tokens`);
      console.log(`📋 Current watchlist has ${currentTokens.length} tokens`);

      // Analyze all candidate tokens
      for (const token of candidateTokens) {
        console.log(`🔍 Analyzing ${token.symbol} (${token.name})...`);
        
        const analysis = await this.analyzeTokenWithAI(token);
        await this.saveAnalysis(token.address, analysis);

        const isCurrentlyInWatchlist = currentTokens.includes(token.address);

        // Decision logic
        if (analysis.recommendation === 'add' && !isCurrentlyInWatchlist) {
          if (analysis.confidence_score >= config.bullish_threshold) {
            await this.addTokenToWatchlist(token.address, analysis);
          }
        } else if (analysis.recommendation === 'remove' && isCurrentlyInWatchlist) {
          if (analysis.confidence_score >= config.bearish_threshold) {
            await this.removeTokenFromWatchlist(token.address, analysis);
          }
        }

        // Rate limiting to avoid API limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Manage watchlist size
      await this.manageWatchlistSize();

      console.log('✅ AI watchlist analysis completed');

    } catch (error) {
      console.error('❌ Error in AI watchlist analysis:', error);
    }
  }

  public async getWatchlistStats(): Promise<any> {
    try {
      const { data: tokens, error } = await this.supabase
        .rpc('get_ai_watchlist_tokens', { watchlist_id_param: this.watchlistId });

      if (error) {
        console.error('Error getting watchlist stats:', error);
        return null;
      }

      const stats = {
        total_tokens: tokens.length,
        avg_confidence: tokens.reduce((sum: number, t: any) => sum + t.ai_confidence_score, 0) / tokens.length,
        avg_volume: tokens.reduce((sum: number, t: any) => sum + t.volume_24h, 0) / tokens.length,
        avg_market_cap: tokens.reduce((sum: number, t: any) => sum + t.market_cap, 0) / tokens.length,
        tokens: tokens
      };

      return stats;
    } catch (error) {
      console.error('Error getting watchlist stats:', error);
      return null;
    }
  }
}

export default AIWatchlistAnalyzer;

/**
 * Enhanced AI API - Database-driven data integration with intelligent routing
 * Replaces the basic ai-prompt.ts with comprehensive database data integration
 */

import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import DatabaseDataManager from '../../services/unified-crawler-manager';
import QueryRouter from '../../services/query-router';

// Environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const databaseManager = new DatabaseDataManager({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  heliusApiKey: process.env.HELIUS_API_KEY!,
  birdeyeApiKey: process.env.BIRDEYE_API_KEY!,
  moralisApiKey: process.env.MORALIS_API_KEY!,
  openaiApiKey: process.env.OPENAI_API_KEY!
});

const queryRouter = new QueryRouter();

interface UnifiedAIRequest {
  prompt: string;
  userId?: string;
  sessionId?: string;
  context?: {
    previousQueries?: string[];
    userPreferences?: any;
    marketCondition?: string;
  };
  options?: {
    includeRealTime?: boolean;
    maxTokens?: number;
    temperature?: number;
    responseFormat?: 'detailed' | 'concise' | 'technical';
  };
}

interface UnifiedAIResponse {
  response: string;
  metadata: {
    intent: any;
    databaseData: any;
    processingTime: number;
    dataFreshness: string;
    confidence: number;
    cost: number;
    method: 'ai' | 'template' | 'hybrid';
  };
  insights?: {
    keyFindings: string[];
    recommendations: string[];
    alerts?: any[];
  };
  relatedQueries?: string[];
  debugInfo?: any;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UnifiedAIResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();
  
  try {
    const {
      prompt,
      userId = 'anonymous',
      sessionId = Date.now().toString(),
      context = {},
      options = {}
    }: UnifiedAIRequest = req.body;

    if (!prompt || prompt.trim().length === 0) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log(`🚀 Processing unified AI query: "${prompt.substring(0, 50)}..."`);

    // Step 1: Route the query and detect intent
    const routingDecision = await queryRouter.routeQuery(prompt, {
      userId,
      sessionHistory: context.previousQueries,
      userPreferences: context.userPreferences,
      currentMarketCondition: context.marketCondition as any
    });

    console.log(`🎯 Query routed to: ${routingDecision.intent.primary} (confidence: ${routingDecision.intent.confidence})`);

    // Step 2: Fetch data from database
    const databaseData = await databaseManager.getDatabaseData({
      type: routingDecision.intent.primary,
      limit: routingDecision.dataRequirements.limit,
      filters: routingDecision.dataRequirements.filters,
      realTime: routingDecision.realTimeRequired || options.includeRealTime
    });

    console.log(`📊 Retrieved ${databaseData.data.length} tokens from database`);

    // Step 3: Generate AI response based on routing strategy
    let aiResponse: string;
    let method: 'ai' | 'template' | 'hybrid' = 'ai';
    let cost = 0;

    if (routingDecision.responseStrategy === 'immediate' && routingDecision.intent.confidence > 0.8) {
      // Use template-based response for high-confidence, simple queries
      aiResponse = generateTemplateResponse(routingDecision.intent, databaseData);
      method = 'template';
    } else if (routingDecision.responseStrategy === 'progressive') {
      // Use hybrid approach: template + AI enhancement
      const baseResponse = generateTemplateResponse(routingDecision.intent, databaseData);
      aiResponse = await enhanceWithAI(baseResponse, prompt, databaseData, options);
      method = 'hybrid';
      cost = 0.01; // Estimate
    } else {
      // Full AI analysis for complex queries
      aiResponse = await generateComprehensiveAIResponse(prompt, routingDecision.intent, databaseData, options);
      method = 'ai';
      cost = 0.03; // Estimate
    }

    // Step 4: Extract insights and generate related queries
          const insights = extractInsights(databaseData, routingDecision.intent);
      const relatedQueries = generateRelatedQueries(routingDecision.intent, databaseData);

    // Step 5: Build response
    const response: UnifiedAIResponse = {
      response: aiResponse,
      metadata: {
        intent: routingDecision.intent,
        databaseData: {
          sources: databaseData.metadata.dataSource,
          totalTokens: databaseData.data.length,
          freshness: databaseData.metadata.lastUpdated,
          cached: databaseData.metadata.cached
        },
        processingTime: Date.now() - startTime,
        dataFreshness: databaseData.metadata.cached ? 'cached' : 'live',
        confidence: Math.min(routingDecision.intent.confidence, databaseData.metadata.confidence),
        cost,
        method
      },
      insights,
      relatedQueries,
      debugInfo: process.env.NODE_ENV === 'development' ? {
        routingDecision,
        databaseStats: databaseData.insights
      } : undefined
    };

    console.log(`✅ Response generated in ${Date.now() - startTime}ms using ${method} method`);

    res.status(200).json(response);

  } catch (error) {
    console.error('❌ Error in unified AI chat:', error);
    
    const fallbackResponse: UnifiedAIResponse = {
      response: "I apologize, but I'm experiencing technical difficulties accessing the latest market data. Please try again in a moment, or rephrase your question.",
      metadata: {
        intent: { primary: 'general', confidence: 0, extractedTokens: [], extractedMetrics: [], urgency: 'low', complexity: 'simple' },
        databaseData: { sources: ['fallback'], totalTokens: 0, freshness: 'unknown', cached: false },
        processingTime: Date.now() - startTime,
        dataFreshness: 'stale',
        confidence: 0.1,
        cost: 0,
        method: 'template'
      }
    };

    res.status(500).json(fallbackResponse);
  }
}

/**
 * Generate template-based response for simple, high-confidence queries
 */
function generateTemplateResponse(intent: any, databaseData: any): string {
  const { primary, extractedTokens } = intent;
  const tokens = databaseData.data.slice(0, 10);

  if (extractedTokens.length > 0) {
    // Specific token query
    const token = tokens.find((t: any) => extractedTokens.includes(t.address));
    if (token) {
      return formatTokenResponse(token, primary);
    }
  }

  // General category response
  switch (primary) {
    case 'behavioral':
      return formatBehavioralResponse(tokens);
    case 'volume':
      return formatVolumeResponse(tokens);
    case 'launchpad':
      return formatLaunchpadResponse(tokens);
    case 'technical':
      return formatTechnicalResponse(tokens);
    case 'ai_recommendations':
      return formatAIRecommendationResponse(tokens);
    default:
      return formatGeneralResponse(tokens);
  }
}

/**
 * Enhance template response with AI for hybrid approach
 */
async function enhanceWithAI(
  baseResponse: string, 
  prompt: string, 
  databaseData: any, 
  options: any
): Promise<string> {
  const enhancementPrompt = `
Enhance this market analysis response with additional insights and context:

Base Response: ${baseResponse}

Original Query: ${prompt}

Market Data Summary: 
- Total tokens analyzed: ${databaseData.data.length}
- Data sources: ${databaseData.metadata.dataSource.join(', ')}
- Average confidence: ${databaseData.insights.averageConfidence}

Please enhance the response by:
1. Adding market context and implications
2. Providing actionable insights
3. Highlighting any notable patterns or anomalies
4. Maintaining a professional, informative tone

Keep the enhancement concise but valuable.
`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a cryptocurrency market analyst. Enhance the provided analysis with additional insights while maintaining accuracy and professionalism.'
        },
        {
          role: 'user',
          content: enhancementPrompt
        }
      ],
      temperature: options.temperature || 0.3,
      max_tokens: options.maxTokens || 500
    });

    return completion.choices[0].message.content || baseResponse;
  } catch (error) {
    console.error('Error enhancing with AI:', error);
    return baseResponse;
  }
}

/**
 * Generate comprehensive AI response for complex queries
 */
async function generateComprehensiveAIResponse(
  prompt: string,
  intent: any,
  databaseData: any,
  options: any
): Promise<string> {
  const { primary, extractedTokens, extractedMetrics } = intent;
  const tokens = databaseData.data.slice(0, 20);

  // Build comprehensive context
  const contextData = tokens.map((token: any) => ({
    name: token.name,
    symbol: token.symbol,
    price: token.price,
    volume24h: token.volume24h,
    priceChange24h: token.priceChange24h,
    marketCap: token.marketCap,
    behavioralMetrics: token.behavioralMetrics,
    launchpadData: token.launchpadData,
    aiAnalysis: token.aiAnalysis
  }));

  const analysisPrompt = `
You are an expert Solana cryptocurrency analyst with access to real-time market data and behavioral analytics.

User Query: "${prompt}"

Query Intent: ${primary}
Extracted Tokens: ${extractedTokens.join(', ') || 'None'}
Extracted Metrics: ${extractedMetrics.join(', ') || 'None'}

Market Data (Top ${tokens.length} tokens):
${JSON.stringify(contextData, null, 2)}

Data Metadata:
- Sources: ${databaseData.metadata.dataSource.join(', ')}
- Last Updated: ${databaseData.metadata.lastUpdated}
- Confidence: ${databaseData.metadata.confidence}
- Processing Time: ${databaseData.metadata.processingTime}ms

Provide a comprehensive analysis that:
1. Directly answers the user's question
2. Leverages the behavioral, volume, and market data provided
3. Highlights key insights and patterns
4. Provides actionable recommendations where appropriate
5. Explains the significance of any notable findings
6. Maintains professional, informative tone

${options.responseFormat === 'technical' ? 'Focus on technical metrics and detailed analysis.' : ''}
${options.responseFormat === 'concise' ? 'Keep the response concise and to the point.' : ''}
${options.responseFormat === 'detailed' ? 'Provide detailed explanations and context.' : ''}
`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a professional cryptocurrency market analyst specializing in Solana tokens. Provide accurate, data-driven analysis based on the provided market data.'
        },
        {
          role: 'user',
          content: analysisPrompt
        }
      ],
      temperature: options.temperature || 0.2,
      max_tokens: options.maxTokens || 1000
    });

    return completion.choices[0].message.content || 'Unable to generate analysis at this time.';
  } catch (error) {
    console.error('Error generating AI response:', error);
    return 'I apologize, but I encountered an error while analyzing the market data. Please try again.';
  }
}

/**
 * Template response generators
 */
function formatTokenResponse(token: any, category: string): string {
  const metrics = [
    `💰 Price: $${token.price?.toFixed(6) || 'N/A'}`,
    `📊 24h Volume: $${token.volume24h?.toLocaleString() || 'N/A'}`,
    `📈 24h Change: ${token.priceChange24h?.toFixed(2) || 'N/A'}%`,
    `💧 Liquidity: $${token.liquidity?.toLocaleString() || 'N/A'}`,
    `👥 Holders: ${token.holders?.toLocaleString() || 'N/A'}`
  ].join('\n');

  let specialMetrics = '';
  if (token.behavioralMetrics) {
    specialMetrics += `\n🐋 Whale Activity: ${token.behavioralMetrics.whaleTransactions24h} transactions`;
  }
  if (token.aiAnalysis) {
    specialMetrics += `\n🤖 AI Score: ${(token.aiAnalysis.confidence * 100).toFixed(1)}% confidence`;
  }

  return `## ${token.name} (${token.symbol})\n\n${metrics}${specialMetrics}`;
}

function formatBehavioralResponse(tokens: any[]): string {
  const whaleTokens = tokens
    .filter(t => t.behavioralMetrics?.whaleTransactions24h > 0)
    .slice(0, 5);

  if (whaleTokens.length === 0) {
    return "🔍 **Behavioral Analysis**\n\nNo significant whale activity detected in the current token set. Consider expanding the search criteria or checking back later.";
  }

  const formatted = whaleTokens.map(token => 
    `• **${token.symbol}**: ${token.behavioralMetrics.whaleTransactions24h} whale transactions, ${token.behavioralMetrics.newHolders24h || 0} new holders`
  ).join('\n');

  return `🐋 **Whale Activity Summary**\n\n${formatted}\n\n*Analysis based on transactions >$10k in the last 24 hours.*`;
}

function formatVolumeResponse(tokens: any[]): string {
  const topTokens = tokens.slice(0, 5);
  
  const formatted = topTokens.map((token, i) => 
    `${i + 1}. **${token.symbol}**: $${token.volume24h?.toLocaleString() || 'N/A'} (${token.priceChange24h?.toFixed(2) || 'N/A'}%)`
  ).join('\n');

  return `📊 **Volume Leaders (24h)**\n\n${formatted}`;
}

function formatLaunchpadResponse(tokens: any[]): string {
  const newLaunches = tokens
    .filter(t => t.launchpadData?.isNewLaunch)
    .slice(0, 5);

  if (newLaunches.length === 0) {
    return "🚀 **New Launches**\n\nNo new token launches detected in the last 24 hours.";
  }

  const formatted = newLaunches.map(token => 
    `• **${token.symbol}**: Launched on ${token.launchpadData.launchPlatform}, Volume: $${token.volume24h?.toLocaleString() || 'N/A'}`
  ).join('\n');

  return `🚀 **Recent Launches (24h)**\n\n${formatted}`;
}

function formatTechnicalResponse(tokens: any[]): string {
  const technicalTokens = tokens
    .filter(t => t.technicalAnalysis)
    .slice(0, 5);

  if (technicalTokens.length === 0) {
    return "📈 **Technical Analysis**\n\nNo technical analysis data available for the selected tokens.";
  }

  const formatted = technicalTokens.map(token => {
    const ta = token.technicalAnalysis;
    const signals = ta.active_signals?.slice(0, 3).join(', ') || 'None';
    return `• **${token.symbol}**: ${ta.trend} trend, ${ta.momentum} momentum (Score: ${ta.technical_score?.toFixed(0) || 'N/A'}/100)\n  Signals: ${signals}`;
  }).join('\n\n');

  return `📈 **Technical Analysis Results**\n\n${formatted}`;
}

function formatAIRecommendationResponse(tokens: any[]): string {
  const recommendedTokens = tokens
    .filter(t => t.aiAnalysis?.recommendation === 'add')
    .slice(0, 5);

  if (recommendedTokens.length === 0) {
    return "🤖 **AI Recommendations**\n\nNo tokens currently meet the AI recommendation criteria.";
  }

  const formatted = recommendedTokens.map(token => 
    `• **${token.symbol}**: ${(token.aiAnalysis.confidence * 100).toFixed(1)}% confidence - ${token.aiAnalysis.reasoning?.substring(0, 80) || 'Positive outlook'}...`
  ).join('\n');

  return `🤖 **AI Recommendations**\n\n${formatted}`;
}

function formatGeneralResponse(tokens: any[]): string {
  const topTokens = tokens.slice(0, 5);
  
  const formatted = topTokens.map((token, i) => 
    `${i + 1}. **${token.symbol}**: $${token.volume24h?.toLocaleString() || 'N/A'} volume, ${token.priceChange24h?.toFixed(2) || 'N/A'}% (24h)`
  ).join('\n');

  return `📋 **Market Overview**\n\n${formatted}`;
}

/**
 * Extract actionable insights from database data
 */
function extractInsights(databaseData: any, intent: any): any {
  const insights = {
    keyFindings: [],
    recommendations: [],
    alerts: []
  };

  const tokens = databaseData.data;
  
  // Key findings based on intent
  if (intent.primary === 'behavioral') {
    const whaleActivity = tokens.filter(t => t.behavioralMetrics?.whaleTransactions24h > 0).length;
    insights.keyFindings.push(`${whaleActivity} tokens showing whale activity`);
  }

  if (intent.primary === 'volume') {
    const avgVolume = tokens.reduce((sum: number, t: any) => sum + (t.volume24h || 0), 0) / tokens.length;
    insights.keyFindings.push(`Average 24h volume: $${avgVolume.toLocaleString()}`);
  }

  // General recommendations
  const highConfidenceTokens = tokens.filter(t => t.aiAnalysis?.confidence > 0.8).length;
  if (highConfidenceTokens > 0) {
    insights.recommendations.push(`${highConfidenceTokens} tokens have high AI confidence scores`);
  }

  return insights;
}

/**
 * Generate related queries based on intent and data
 */
function generateRelatedQueries(intent: any, databaseData: any): string[] {
  const queries = [];
  
  if (intent.primary === 'behavioral') {
    queries.push(
      "Show me volume spikes in the last hour",
      "What new tokens have early whale activity?",
      "Which tokens have the fastest holder growth?"
    );
  } else if (intent.primary === 'volume') {
    queries.push(
      "What's driving the volume in these tokens?",
      "Show me behavioral analysis for top volume tokens",
      "Any new launches with high volume?"
    );
  } else if (intent.primary === 'launchpad') {
    queries.push(
      "Which new launches have whale interest?",
      "Risk assessment for recent launches",
      "Volume trends for tokens launched today"
    );
  }

  return queries.slice(0, 3);
}
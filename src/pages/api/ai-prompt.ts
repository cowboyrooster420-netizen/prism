import { NextApiRequest, NextApiResponse } from "next";
import { promptToFilters } from "@/lib/promptToFilters";
import { fetchTokensFromFilters } from "@/lib/fetchTokensFromFilters";

// Input validation schema
const validatePrompt = (prompt: any): string | null => {
  if (!prompt || typeof prompt !== 'string') {
    return 'Prompt is required and must be a string';
  }
  
  if (prompt.trim().length === 0) {
    return 'Prompt cannot be empty';
  }
  
  if (prompt.length > 1000) {
    return 'Prompt is too long (max 1000 characters)';
  }
  
  // Basic security check - prevent potential injection
  if (/[<>{}]/.test(prompt)) {
    return 'Prompt contains invalid characters';
  }
  
  return null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { prompt, originalPrompt, behavioralContext } = req.body;
    
    // Validate input
    const validationError = validatePrompt(prompt);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    console.log('Processing enhanced prompt:', prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''));
    if (originalPrompt) {
      console.log('Original prompt:', originalPrompt);
    }
    if (behavioralContext) {
      console.log('Behavioral context:', behavioralContext);
    }

    // Convert enhanced prompt to filters using AI
    let filters = await promptToFilters(prompt);
    console.log('AI generated filters:', JSON.stringify(filters));
    
    // If no filters generated, create intelligent behavioral fallbacks
    if (!filters || filters.length === 0) {
      const lowerPrompt = prompt.toLowerCase();
      console.log('No filters generated, creating intelligent behavioral fallbacks');
      
      // 🐋 Whale Activity Queries
      if (lowerPrompt.includes('whale') || lowerPrompt.includes('big buy') || lowerPrompt.includes('institutional')) {
        filters = [
          { column: 'whale_buys_24h', operator: 'gt', value: 3 },
          { column: 'new_holders_24h', operator: 'gt', value: 25 }
        ];
      } 
      // 🚀 New Launch Queries
      else if (lowerPrompt.includes('new') || lowerPrompt.includes('launch') || lowerPrompt.includes('fresh') || lowerPrompt.includes('pump.fun')) {
        if (lowerPrompt.includes('pump.fun') || lowerPrompt.includes('very new')) {
          filters = [
            { column: 'token_age_hours', operator: 'lt', value: 12 },
            { column: 'new_holders_24h', operator: 'gt', value: 5 }
          ];
        } else {
          filters = [
            { column: 'token_age_hours', operator: 'lt', value: 48 },
            { column: 'new_holders_24h', operator: 'gt', value: 10 }
          ];
        }
      } 
      // 📈 Volume Spike Queries
      else if (lowerPrompt.includes('volume') || lowerPrompt.includes('spike') || lowerPrompt.includes('surge') || lowerPrompt.includes('explosion')) {
        filters = [
          { column: 'volume_spike_ratio', operator: 'gt', value: 2.0 },
          { column: 'volume_24h', operator: 'gt', value: 200000 }
        ];
      } 
      // 🔥 Trending/Hot Queries  
      else if (lowerPrompt.includes('trending') || lowerPrompt.includes('hot') || lowerPrompt.includes('popular') || lowerPrompt.includes('momentum')) {
        filters = [
          { column: 'volume_24h', operator: 'gt', value: 500000 },
          { column: 'price_change_24h', operator: 'gt', value: 10 },
          { column: 'volume_spike_ratio', operator: 'gt', value: 1.3 }
        ];
      }
      // 💰 Market Cap Queries
      else if (lowerPrompt.includes('small cap') || lowerPrompt.includes('micro cap') || lowerPrompt.includes('under')) {
        if (lowerPrompt.includes('under $1m') || lowerPrompt.includes('micro')) {
          filters = [
            { column: 'market_cap', operator: 'lt', value: 1000000 },
            { column: 'volume_24h', operator: 'gt', value: 50000 }
          ];
        } else {
          filters = [
            { column: 'market_cap', operator: 'lt', value: 10000000 },
            { column: 'volume_24h', operator: 'gt', value: 100000 }
          ];
        }
      }
      // 🎯 Combined Behavioral Queries
      else if (lowerPrompt.includes('alpha') || lowerPrompt.includes('opportunity') || lowerPrompt.includes('gem')) {
        filters = [
          { column: 'whale_buys_24h', operator: 'gt', value: 2 },
          { column: 'volume_spike_ratio', operator: 'gt', value: 1.5 },
          { column: 'market_cap', operator: 'lt', value: 50000000 }
        ];
      }
      // Default: Active tokens with some behavioral signals
      else {
        filters = [
          { column: 'volume_24h', operator: 'gt', value: 50000 },
          { column: 'new_holders_24h', operator: 'gt', value: 5 }
        ];
      }
      console.log('Intelligent behavioral fallback filters created:', JSON.stringify(filters));
    }
    
    // Fetch tokens based on filters
    const tokens = await fetchTokensFromFilters(filters);
    console.log('Found tokens:', tokens.length);
    
    // Get behavioral insights for the found tokens
    let behavioralInsights = null;
    if (behavioralContext && tokens.length > 0) {
      try {
        // Import the behavioral service to get insights for specific tokens
        const { behavioralDataService } = await import('../../../src/services/behavioral-data-service');
        
        // Get behavioral insights for the first few tokens
        const tokenInsights = await Promise.all(
          tokens.slice(0, 5).map(async (token: any) => {
            const insights = await behavioralDataService.getTokenBehavioralInsights(token.mint_address || token.address);
            return {
              token_id: token.id,
              symbol: token.symbol,
              insights
            };
          })
        );
        
        behavioralInsights = {
          message: `Enhanced with ${behavioralContext.hasWhaleActivity ? 'whale activity' : ''}${behavioralContext.hasNewLaunches ? ', new launches' : ''}${behavioralContext.hasVolumeSpikes ? ', volume spikes' : ''} data`,
          context: behavioralContext,
          tokenInsights: tokenInsights.filter(t => t.insights.whaleActivity || t.insights.newLaunch || t.insights.volumeSpike)
        };
      } catch (error) {
        console.error('Failed to get behavioral insights:', error);
        behavioralInsights = {
          message: `Enhanced with behavioral context`,
          context: behavioralContext
        };
      }
    }
    
    // Add behavioral insights to response
    const response = { 
      tokens, 
      filters,
      behavioralInsights
    };
    
    res.status(200).json(response);
  } catch (err) {
    console.error('AI Prompt API Error:', err);
    res.status(500).json({ error: "Failed to process prompt" });
  }
} 
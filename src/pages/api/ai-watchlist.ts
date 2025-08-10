import { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabaseClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // TODO: Implement proper premium access control
    // For now, we'll allow access to demonstrate the feature
    const isPremium = true; // This would check user subscription status

    if (!isPremium) {
      return res.status(403).json({ 
        error: "Premium access required",
        message: "Upgrade to premium to access the AI watchlist"
      });
    }

    // Get a public AI watchlist deterministically (first created)
    const { data: watchlists, error: watchlistsError } = await supabase
      .from('watchlists')
      .select('id')
      .eq('type', 'ai')
      .eq('is_public', true)
      .order('created_at', { ascending: true })
      .limit(1);

    if (watchlistsError) {
      console.error('Error fetching AI watchlist:', watchlistsError);
      return res.status(500).json({ error: "Failed to fetch AI watchlist" });
    }

    const watchlist = watchlists && watchlists.length > 0 ? watchlists[0] : null;
    if (!watchlist) {
      return res.status(200).json({
        total_tokens: 0,
        avg_confidence: 0,
        avg_volume: 0,
        avg_market_cap: 0,
        tokens: []
      });
    }

    // Get AI watchlist tokens using the database function
    const { data: tokens, error: tokensError } = await supabase
      .rpc('get_ai_watchlist_tokens', { 
        watchlist_id_param: watchlist.id 
      });

    if (tokensError) {
      console.error('Error fetching AI watchlist tokens:', tokensError);
      return res.status(500).json({ error: "Failed to fetch watchlist tokens" });
    }

    // Calculate stats
    const totalTokens = tokens.length;
    const avgConfidence = totalTokens > 0 
      ? tokens.reduce((sum: number, t: any) => sum + (t.ai_confidence_score || 0), 0) / totalTokens 
      : 0;
    const avgVolume = totalTokens > 0 
      ? tokens.reduce((sum: number, t: any) => sum + (t.volume_24h || 0), 0) / totalTokens 
      : 0;
    const avgMarketCap = totalTokens > 0 
      ? tokens.reduce((sum: number, t: any) => sum + (t.market_cap || 0), 0) / totalTokens 
      : 0;

    const stats = {
      total_tokens: totalTokens,
      avg_confidence: avgConfidence,
      avg_volume: avgVolume,
      avg_market_cap: avgMarketCap,
      tokens: tokens
    };

    res.status(200).json(stats);

  } catch (error) {
    console.error('AI Watchlist API Error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
}

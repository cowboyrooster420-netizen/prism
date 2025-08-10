import { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabaseClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Check tokens table
    const { data: tokens, error: tokensError } = await supabase
      .from('tokens')
      .select('address, name, symbol')
      .limit(5);

    // Check watchlist_tokens table
    const { data: watchlistTokens, error: watchlistTokensError } = await supabase
      .from('watchlist_tokens')
      .select('*')
      .limit(5);

    // Check AI analysis table
    const { data: aiAnalysis, error: aiAnalysisError } = await supabase
      .from('ai_analysis')
      .select('*')
      .limit(5);

    res.status(200).json({
      tokens: {
        count: tokens?.length || 0,
        sample: tokens,
        error: tokensError?.message
      },
      watchlistTokens: {
        count: watchlistTokens?.length || 0,
        sample: watchlistTokens,
        error: watchlistTokensError?.message
      },
      aiAnalysis: {
        count: aiAnalysis?.length || 0,
        sample: aiAnalysis,
        error: aiAnalysisError?.message
      }
    });

  } catch (error) {
    console.error('Data check error:', error);
    res.status(500).json({ 
      error: "Exception occurred",
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

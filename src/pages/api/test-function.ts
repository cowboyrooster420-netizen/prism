import { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabaseClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // First, check if we have any AI watchlists
    const { data: watchlists, error: watchlistError } = await supabase
      .from('watchlists')
      .select('*')
      .eq('type', 'ai');

    if (watchlistError) {
      return res.status(500).json({ 
        error: "Failed to fetch watchlists", 
        details: watchlistError.message 
      });
    }

    // If no AI watchlists exist, that's the issue
    if (!watchlists || watchlists.length === 0) {
      return res.status(200).json({
        message: "No AI watchlists found",
        watchlists: [],
        suggestion: "You need to run the schema-watchlist.sql file in your Supabase database"
      });
    }

    // Try to call the function with the first AI watchlist
    const { data: functionResult, error: functionError } = await supabase
      .rpc('get_ai_watchlist_tokens', { 
        watchlist_id_param: watchlists[0].id 
      });

    if (functionError) {
      return res.status(500).json({ 
        error: "Database function failed", 
        details: functionError.message,
        watchlists: watchlists
      });
    }

    res.status(200).json({
      success: true,
      watchlists: watchlists,
      functionResult: functionResult
    });

  } catch (error) {
    console.error('Function test error:', error);
    res.status(500).json({ 
      error: "Exception occurred",
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

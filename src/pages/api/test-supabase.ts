import { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabaseClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Test basic connection
    const { data: testData, error: testError } = await supabase
      .from('watchlists')
      .select('*')
      .limit(1);

    if (testError) {
      console.error('Supabase connection error:', testError);
      return res.status(500).json({ 
        error: "Supabase connection failed", 
        details: testError.message 
      });
    }

    // Check if we have any AI watchlists
    const { data: aiWatchlists, error: aiError } = await supabase
      .from('watchlists')
      .select('*')
      .eq('type', 'ai');

    if (aiError) {
      console.error('Error fetching AI watchlists:', aiError);
      return res.status(500).json({ 
        error: "Failed to fetch AI watchlists", 
        details: aiError.message 
      });
    }

    res.status(200).json({
      connection: "success",
      totalWatchlists: testData?.length || 0,
      aiWatchlists: aiWatchlists,
      aiWatchlistsCount: aiWatchlists?.length || 0
    });

  } catch (error) {
    console.error('Test API Error:', error);
    res.status(500).json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 
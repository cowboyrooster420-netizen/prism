import { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabaseClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Try a simple query to any table
    const { data, error } = await supabase
      .from('tokens')
      .select('address')
      .limit(1);

    if (error) {
      return res.status(500).json({ 
        error: "Supabase query failed", 
        details: error.message,
        code: error.code
      });
    }

    res.status(200).json({
      success: true,
      message: "Basic Supabase connection works",
      data: data
    });

  } catch (error) {
    console.error('Simple test error:', error);
    res.status(500).json({ 
      error: "Exception occurred",
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

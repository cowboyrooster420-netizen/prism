import { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabaseClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { data, error } = await supabase
      .from('tokens')
      .select('*')
      .lte('market_cap', 5000000)
      .order('market_cap', { ascending: true });

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: "Failed to fetch tokens" });
    }

    res.status(200).json({ tokens: data || [] });
  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({ error: "Failed to fetch tokens" });
  }
} 
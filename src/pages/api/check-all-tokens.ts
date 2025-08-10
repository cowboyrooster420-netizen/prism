import { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabaseClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Check all tokens (active and inactive)
    const { data: allTokens, error: allTokensError } = await supabase
      .from('tokens')
      .select('address, name, symbol, is_active, tier, volume_24h, last_updated')
      .order('last_updated', { ascending: false });

    // Check active tokens only
    const { data: activeTokens, error: activeTokensError } = await supabase
      .from('tokens')
      .select('address, name, symbol, tier, volume_24h')
      .eq('is_active', true);

    // Check tokens by tier
    const { data: tier1Tokens, error: tier1Error } = await supabase
      .from('tokens')
      .select('address, name, symbol')
      .eq('tier', 1)
      .eq('is_active', true);

    const { data: tier2Tokens, error: tier2Error } = await supabase
      .from('tokens')
      .select('address, name, symbol')
      .eq('tier', 2)
      .eq('is_active', true);

    const { data: tier3Tokens, error: tier3Error } = await supabase
      .from('tokens')
      .select('address, name, symbol')
      .eq('tier', 3)
      .eq('is_active', true);

    res.status(200).json({
      totalTokens: allTokens?.length || 0,
      activeTokens: activeTokens?.length || 0,
      inactiveTokens: (allTokens?.length || 0) - (activeTokens?.length || 0),
      tier1Tokens: tier1Tokens?.length || 0,
      tier2Tokens: tier2Tokens?.length || 0,
      tier3Tokens: tier3Tokens?.length || 0,
      recentTokens: allTokens?.slice(0, 10) || [],
      errors: {
        allTokens: allTokensError?.message,
        activeTokens: activeTokensError?.message,
        tier1: tier1Error?.message,
        tier2: tier2Error?.message,
        tier3: tier3Error?.message
      }
    });

  } catch (error) {
    console.error('Token check error:', error);
    res.status(500).json({ 
      error: "Exception occurred",
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

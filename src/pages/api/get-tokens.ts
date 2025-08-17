import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { data: tokens, error } = await supabase
      .from('tokens')
      .select('mint_address, symbol, name, volume_24h, tier, is_active')
      .eq('is_active', true)
      .gte('volume_24h', 1000)
      .order('volume_24h', { ascending: false })
      .limit(20);

    if (error) {
      throw new Error(`Failed to fetch tokens: ${error.message}`);
    }

    res.status(200).json({
      success: true,
      tokens: tokens || [],
      count: tokens?.length || 0
    });

  } catch (error) {
    console.error('Error fetching tokens:', error);
    res.status(500).json({
      error: 'Failed to fetch tokens',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
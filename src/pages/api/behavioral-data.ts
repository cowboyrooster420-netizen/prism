import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log('🪄 Fetching behavioral data from database...');

    // Fetch tokens with behavioral data using your MVP schema
    const { data: tokens, error } = await supabase
      .from('tokens')
      .select(`
        id,
        name,
        symbol,
        mint_address,
        price,
        price_change_24h,
        volume_24h,
        market_cap,
        liquidity,
        new_holders_24h,
        whale_buys_24h,
        volume_spike_ratio,
        token_age_hours,
        created_at,
        is_active
      `)
      .not('new_holders_24h', 'is', null)
      .not('whale_buys_24h', 'is', null)
      .not('volume_spike_ratio', 'is', null)
      .not('token_age_hours', 'is', null)
                  .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Database query error:', error);
      return res.status(500).json({ error: "Failed to fetch behavioral data" });
    }

    if (!tokens || tokens.length === 0) {
      console.log('No behavioral data found in database');
      return res.status(200).json({
        whaleActivity: [],
        newLaunches: [],
        volumeSpikes: [],
        lastUpdated: new Date().toISOString(),
        totalTokens: 0,
        activeTokens: 0
      });
    }

    console.log(`✅ Found ${tokens.length} tokens with behavioral data`);

    // Transform database data to our behavioral format
    const whaleActivity = tokens
      .filter(token => token.whale_buys_24h > 0)
      .map(token => ({
        token_id: token.id,
        token_symbol: token.symbol,
        mint_address: token.mint_address,
        whale_buys_24h: token.whale_buys_24h,
        new_holders_24h: token.new_holders_24h,
        volume_spike_ratio: token.volume_spike_ratio,
        last_updated: token.created_at,
        price: token.price,
        price_change_24h: token.price_change_24h
      }))
      .sort((a, b) => b.whale_buys_24h - a.whale_buys_24h)
      .slice(0, 20);

    const newLaunches = tokens
      .filter(token => token.token_age_hours < 168) // Less than 1 week old
      .map(token => ({
        token_id: token.id,
        token_symbol: token.symbol,
        mint_address: token.mint_address,
        token_age_hours: token.token_age_hours,
        initial_holders: Math.max(1, token.new_holders_24h || 1),
        launch_volume: token.volume_24h || 0,
        launch_price: token.price || 0,
        current_price: token.price || 0,
        price_change_24h: token.price_change_24h || 0,
        last_updated: token.created_at
      }))
      .sort((a, b) => a.token_age_hours - b.token_age_hours)
      .slice(0, 20);

    const volumeSpikes = tokens
      .filter(token => token.volume_spike_ratio > 1.5) // 50%+ volume increase
      .map(token => ({
        token_id: token.id,
        token_symbol: token.symbol,
        mint_address: token.mint_address,
        volume_spike_ratio: token.volume_spike_ratio,
        previous_volume: (token.volume_24h || 0) / token.volume_spike_ratio,
        current_volume: token.volume_24h || 0,
        spike_timestamp: token.created_at,
        market_cap: token.market_cap || 0,
        last_updated: token.created_at
      }))
      .sort((a, b) => b.volume_spike_ratio - a.volume_spike_ratio)
      .slice(0, 20);

    const response = {
      whaleActivity,
      newLaunches,
      volumeSpikes,
      lastUpdated: new Date().toISOString(),
      totalTokens: tokens.length,
      activeTokens: tokens.filter(t => t.is_active).length
    };

    console.log(`📊 Behavioral data summary:`);
    console.log(`  🐋 Whale Activity: ${whaleActivity.length} tokens`);
    console.log(`  🚀 New Launches: ${newLaunches.length} tokens`);
    console.log(`  📈 Volume Spikes: ${volumeSpikes.length} tokens`);
    console.log(`  📊 Total Tokens: ${response.totalTokens}`);
    console.log(`  ✅ Active Tokens: ${response.activeTokens}`);

    res.status(200).json(response);
  } catch (err) {
    console.error('Behavioral data API error:', err);
    res.status(500).json({ error: "Failed to fetch behavioral data" });
  }
}

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: watchlists, error } = await supabase
    .from('watchlists')
    .select('id')
    .eq('type', 'ai')
    .eq('is_public', true)
    .order('created_at', { ascending: true })
    .limit(1);

  if (error || !watchlists || watchlists.length === 0) {
    console.error('No AI watchlist found:', error);
    process.exit(1);
  }

  const watchlistId = watchlists[0].id;

  const configRow = {
    watchlist_id: watchlistId,
    min_volume_24h: 1000,
    min_market_cap: 10000,
    min_holders: 0,
    min_liquidity: 5000,
    max_tokens: 25,
    update_frequency_minutes: 30,
    bullish_threshold: 0.6,
    bearish_threshold: 0.5,
    enabled: true,
    updated_at: new Date().toISOString()
  } as const;

  const { data: existing, error: getErr } = await supabase
    .from('ai_watchlist_config')
    .select('id')
    .eq('watchlist_id', watchlistId)
    .limit(1);

  if (getErr) {
    console.error('Failed to read ai_watchlist_config:', getErr);
    process.exit(1);
  }

  if (existing && existing.length > 0) {
    const { error: updateErr } = await supabase
      .from('ai_watchlist_config')
      .update(configRow)
      .eq('watchlist_id', watchlistId);
    if (updateErr) {
      console.error('Failed to update ai_watchlist_config:', updateErr);
      process.exit(1);
    }
    console.log('✅ ai_watchlist_config updated for watchlist', watchlistId);
  } else {
    const { error: insertErr } = await supabase
      .from('ai_watchlist_config')
      .insert({
        ...configRow,
        created_at: new Date().toISOString()
      });
    if (insertErr) {
      console.error('Failed to insert ai_watchlist_config:', insertErr);
      process.exit(1);
    }
    console.log('✅ ai_watchlist_config inserted for watchlist', watchlistId);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

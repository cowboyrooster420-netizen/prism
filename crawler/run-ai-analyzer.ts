import { createClient } from '@supabase/supabase-js';
import AIWatchlistAnalyzer from './services/ai-watchlist-analyzer';
import 'dotenv/config';

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const openaiKey = process.env.OPENAI_API_KEY!;

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

  const analyzer = new AIWatchlistAnalyzer({
    supabaseUrl,
    supabaseKey,
    openaiApiKey: openaiKey,
    watchlistId: watchlists[0].id,
  });

  await analyzer.runAnalysis();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

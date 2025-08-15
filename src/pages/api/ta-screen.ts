import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';

// Minimal runtime types
type CompOp = '>=' | '<=' | '>' | '<' | '==' | 'between';

type TAFilter =
  | { metric: string; op: CompOp; value: number | [number, number]; timeframe?: string }
  | { op: 'cross'; a: string; b: string; timeframe?: string }
  | { op: 'event'; name: string; within?: number; timeframe?: string };

type TAScreenRequest = {
  timeframe?: '1m'|'5m'|'15m'|'1h'|'4h'|'1d';
  filters: TAFilter[];
  sort?: { by: string; dir: 'asc'|'desc' };
  limit?: number;
  min_usd_liquidity?: number;
};

const ALLOWED_METRICS = new Set([
  'sma7','sma20','sma50','sma200',
  'ema7','ema20','ema50','ema200',
  'rsi14','macd','macd_signal','macd_hist','atr14',
  'donchian_high_20','donchian_low_20',
  'bb_width','bb_width_pctl60',
  'vol_ma20','vol_z60','vol_z60_slope',
  // boolean events
  'cross_ema7_over_ema20','cross_ema50_over_ema200',
  'breakout_high_20','breakout_low_20','near_breakout_high_20','bullish_rsi_div',
  // optionally denormalized liquidity if present
  'quote_volume_usd',
  'ts' // for sorting
]);

const ALLOWED_TIMEFRAMES = new Set(['1m', '5m', '15m', '1h', '4h', '1d']);

const ALLOWED_CROSS_INDICATORS = new Set(['ema7', 'ema20', 'ema50', 'ema200', 'sma7', 'sma20', 'sma50', 'sma200']);

function isCompFilter(f: TAFilter): f is Extract<TAFilter, { metric: string }> {
  return (f as any).metric !== undefined;
}

function isValidNumber(value: any): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

function isValidNumberArray(value: any): value is [number, number] {
  return Array.isArray(value) && value.length === 2 && 
         isValidNumber(value[0]) && isValidNumber(value[1]);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = req.body as TAScreenRequest;
  if (!body || !Array.isArray(body.filters)) {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  const timeframe = body.timeframe;
  let limit = Math.min(Math.max(body.limit ?? 50, 1), 500);

  // Validate timeframe
  if (timeframe && !ALLOWED_TIMEFRAMES.has(timeframe)) {
    return res.status(400).json({ error: `Invalid timeframe: ${timeframe}` });
  }

  // Validate sort parameters early
  if (body.sort?.by && !ALLOWED_METRICS.has(body.sort.by)) {
    return res.status(400).json({ error: `Unsupported sort field: ${body.sort.by}` });
  }

  // Validate min_usd_liquidity parameter
  if (body.min_usd_liquidity !== undefined && !isValidNumber(body.min_usd_liquidity)) {
    return res.status(400).json({ error: 'Invalid min_usd_liquidity value' });
  }

  // Build base query against latest snapshot
  let query = supabase.from('ta_latest').select('*');
  if (timeframe) query = query.eq('timeframe', timeframe);

  // Apply filters
  for (const f of body.filters) {
    // timeframe-specific filter (override per filter)
    if ((f as any).timeframe) {
      const filterTimeframe = (f as any).timeframe;
      if (!ALLOWED_TIMEFRAMES.has(filterTimeframe)) {
        return res.status(400).json({ error: `Invalid filter timeframe: ${filterTimeframe}` });
      }
      query = query.eq('timeframe', filterTimeframe);
    }

    if (isCompFilter(f)) {
      const col = f.metric;
      if (!ALLOWED_METRICS.has(col)) return res.status(400).json({ error: `Unsupported metric: ${col}` });
      const op = f.op;
      const val = f.value;
      
      switch (op) {
        case '>=':
        case '<=':
        case '>':
        case '<':
        case '==': {
          if (!isValidNumber(val)) {
            return res.status(400).json({ error: `Invalid numeric value for ${op} operation` });
          }
          switch (op) {
            case '>=': query = query.gte(col, val); break;
            case '<=': query = query.lte(col, val); break;
            case '>':  query = query.gt(col, val); break;
            case '<':  query = query.lt(col, val); break;
            case '==': query = query.eq(col, val); break;
          }
          break;
        }
        case 'between': {
          if (!isValidNumberArray(val)) {
            return res.status(400).json({ error: `Invalid range value for between operation` });
          }
          const [a, b] = val;
          query = query.gte(col, a).lte(col, b);
          break;
        }
        default:
          return res.status(400).json({ error: `Unsupported op: ${op}` });
      }
    } else if (f.op === 'cross') {
      // Validate cross parameters before constructing column name
      if (!ALLOWED_CROSS_INDICATORS.has(f.a) || !ALLOWED_CROSS_INDICATORS.has(f.b)) {
        return res.status(400).json({ error: `Invalid cross indicators: ${f.a}, ${f.b}` });
      }
      const col = `cross_${f.a}_over_${f.b}`;
      if (!ALLOWED_METRICS.has(col)) return res.status(400).json({ error: `Unsupported cross: ${col}` });
      query = query.eq(col, true);
    } else if (f.op === 'event') {
      const col = f.name;
      if (!ALLOWED_METRICS.has(col)) return res.status(400).json({ error: `Unsupported event: ${col}` });
      // Latest-only event; within window requires scanning ta_features (future enhancement)
      query = query.eq(col, true);
    }
  }

  // min liquidity (if denormalized column exists)
  const applyLiquidity = typeof body.min_usd_liquidity === 'number';
  let data, error;

  async function run(tryLiquidity: boolean) {
    let q = query;
    if (body.sort?.by) {
      const by = body.sort.by;
      const asc = body.sort.dir === 'asc';
      // Sort validation already done above, safe to use
      q = q.order(by, { ascending: asc, nullsFirst: false });
    } else {
      q = q.order('ts', { ascending: false });
    }
    if (tryLiquidity && applyLiquidity) {
      q = q.gte('quote_volume_usd', body.min_usd_liquidity as number);
    }
    q = q.limit(limit);
    return await q;
  }

  ({ data, error } = await run(true));

  // Retry without liquidity filter if column is missing
  if (error && String(error.message || '').toLowerCase().includes('column') && String(error.message).includes('quote_volume_usd')) {
    ({ data, error } = await run(false));
  }

  if (error) return res.status(500).json({ error: error.message || 'Query failed' });
  return res.status(200).json({ results: data ?? [] });
}




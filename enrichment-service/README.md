# Prism Token Enrichment Service

A dedicated service for enriching token data with holder information using the Solscan API.

## Features

- **Volume-based prioritization**: High-volume tokens get enriched more frequently
- **Intelligent scheduling**: Different enrichment intervals based on token activity
- **Batch processing**: Efficient processing with rate limiting
- **Multiple modes**: Auto, new, and force enrichment modes
- **Statistics tracking**: Monitor enrichment progress and success rates

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp env.example .env
   # Edit .env with your Supabase credentials
   ```

3. **Database schema**: Ensure your `tokens` table has these columns:
   - `last_enriched` (timestamp)
   - `holder_count` (integer)
   - `enrichment_data` (jsonb)

## Usage

### Basic Commands

```bash
# Auto enrichment (volume-based prioritization)
npm run enrich

# Enrich only new tokens (never enriched before)
npm run enrich:new

# Force enrich all active tokens
npm run enrich:force

# Show enrichment statistics
npm run stats

# Test connections
npm run test
```

### Enrichment Modes

- **Auto** (default): Volume-based prioritization
  - High volume (>1M): Every hour
  - Medium volume (>100K): Every 6 hours
  - Low volume (<100K): Every 24 hours

- **New**: Only tokens that have never been enriched

- **Force**: All active tokens regardless of last enrichment time

### Cron Jobs

```bash
# Hourly enrichment (recommended for production)
npm run cron:hourly

# Force enrichment (use sparingly)
npm run cron:force
```

## Configuration

### Volume Thresholds

```javascript
const VOLUME_THRESHOLDS = {
  high: 1000000,    // 1M+ volume
  medium: 100000    // 100K+ volume
};
```

### Enrichment Intervals

```javascript
const ENRICHMENT_INTERVALS = {
  highVolume: 1,    // Every hour
  mediumVolume: 6,  // Every 6 hours
  lowVolume: 24     // Every 24 hours
};
```

## API Integration

The service uses the Solscan API to fetch holder data:

- **Endpoint**: `https://api.solscan.io/token/holders`
- **Rate limiting**: 100ms between requests
- **Batch processing**: 10 tokens per batch with 1s delays

## Database Schema

The service expects these columns in your `tokens` table:

```sql
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS last_enriched TIMESTAMP;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS holder_count INTEGER;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS enrichment_data JSONB;
```

## Monitoring

Use the stats command to monitor enrichment progress:

```bash
npm run stats
```

This shows:
- Total active tokens
- Tokens ever enriched
- Tokens enriched in last 24h
- Enrichment success rate

## Error Handling

- Failed enrichments are logged but don't stop the process
- Rate limiting prevents API overload
- Database connection errors cause graceful shutdown
- Individual token failures are tracked separately

## Production Deployment

1. Set up environment variables
2. Configure cron jobs for regular enrichment
3. Monitor logs for errors
4. Use `npm run stats` to track progress
5. Consider using PM2 or similar for process management 
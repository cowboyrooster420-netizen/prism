# Solana Token Crawler

A TypeScript-based crawler that fetches, filters, enriches, and stores Solana tokens for the Prism AI system.

## Features

- **Helius Integration**: Fetches token data from Solana blockchain
- **Smart Filtering**: Filters out suspicious and low-quality tokens
- **AI Enrichment**: Adds AI scoring and additional metrics
- **Supabase Storage**: Stores tokens in your existing database
- **Continuous Operation**: Runs continuously with configurable intervals
- **Error Resilience**: Handles failures gracefully

## Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Environment Variables**:
   Add to your `.env.local` file:
   ```
   HELIUS_API_KEY=your_helius_api_key_here
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```

3. **Get Helius API Key**:
   - Sign up at [Helius](https://helius.xyz/)
   - Get your API key from the dashboard

## Usage

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### Build
```bash
npm run build
```

## Configuration

Edit `config.ts` to customize:
- Crawl interval (default: 5 minutes)
- Rate limiting (default: 1 second between requests)
- Maximum tokens per crawl (default: 100)

## Architecture

```
crawler/
├── index.ts                 # Entry point
├── config.ts               # Configuration
├── types.ts                # TypeScript interfaces
├── services/
│   ├── helius.ts           # Helius API integration
│   ├── filters.ts          # Token filtering logic
│   ├── enrich.ts           # Token enrichment
│   └── supabase.ts         # Database operations
└── utils/
    └── sleep.ts            # Rate limiting utility
```

## Data Flow

1. **Fetch**: Get tokens from Helius API
2. **Filter**: Remove suspicious/low-quality tokens
3. **Enrich**: Add AI scoring and metrics
4. **Store**: Upsert to Supabase database

## Integration

This crawler populates the same `tokens` table that your Prism AI system queries, providing real-time token data for AI-powered discovery.

## Monitoring

The crawler provides detailed logging:
- Number of tokens fetched
- Filtering results
- Enrichment progress
- Storage success/failure
- Performance metrics

## Error Handling

- Individual token failures don't stop the crawl
- API rate limits are respected
- Database errors are logged but don't crash
- Graceful shutdown on Ctrl+C 
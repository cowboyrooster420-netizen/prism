# Prism - AI-Powered Solana Token Analyzer

An intelligent web application for discovering and analyzing Solana tokens using AI-powered search, real-time data from multiple APIs, and comprehensive token analytics.

## Features

- 🤖 **AI-Powered Search**: Natural language queries for token discovery
- 📊 **Real-time Data**: Live token prices, volumes, and market caps from BirdEye
- 🔍 **Multiple Data Sources**: BirdEye, Moralis, and Helius APIs
- 🎯 **Interactive UI**: Clickable token cards with detailed modals
- 🤖 **Automated Crawling**: Scheduled data collection and updates
- 📈 **Token Analytics**: Holder counts, transaction data, and market metrics

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL)
- **APIs**: BirdEye, Moralis, Helius
- **AI**: OpenAI GPT for natural language processing

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- API keys for BirdEye, Moralis, and Helius
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/cowboyrooster420-netizen/prism.git
   cd prism
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd crawler && npm install
   ```

3. **Set up environment variables**
   
   Copy the example environment file:
   ```bash
   cp crawler/env.example crawler/.env
   ```
   
   Edit `crawler/.env` and add your API keys:
   ```env
   HELIUS_API_KEY=your_helius_api_key_here
   BIRDEYE_API_KEY=your_birdeye_api_key_here
   MORALIS_API_KEY=your_moralis_api_key_here
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
   ```

4. **Run the crawler**
   ```bash
   cd crawler
   npm start
   ```

5. **Start the web application**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## API Keys Required

- **BirdEye**: Get your API key from [BirdEye](https://birdeye.so/)
- **Moralis**: Get your API key from [Moralis](https://moralis.io/)
- **Helius**: Get your API key from [Helius](https://helius.xyz/)
- **Supabase**: Create a project at [Supabase](https://supabase.com/)

## Usage

1. **Search Tokens**: Use natural language queries like "show me tokens with high volume" or "find trending tokens"
2. **View Details**: Click on any token card to see detailed information
3. **Monitor Data**: The crawler automatically updates token data every 5 minutes

## Project Structure

```
prism/
├── src/                    # Next.js web application
│   ├── app/               # App router pages
│   ├── components/        # React components
│   └── lib/              # Utility functions
├── crawler/               # Data collection service
│   ├── services/         # API integrations
│   ├── config.ts         # Configuration
│   └── index.ts          # Main crawler
└── README.md
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details

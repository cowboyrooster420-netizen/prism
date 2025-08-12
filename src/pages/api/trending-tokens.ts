import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.NEXT_PUBLIC_BIRDEYE_API_KEY;
    
    if (!apiKey) {
      throw new Error('NEXT_PUBLIC_BIRDEYE_API_KEY environment variable is required');
    }

    // Fetch trending tokens directly from Birdeye
    const response = await fetch('https://public-api.birdeye.so/defi/token_trending?sort_by=rank&sort_type=asc&offset=0&limit=20', {
      headers: {
        'accept': 'application/json',
        'x-chain': 'solana',
        'X-API-KEY': apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Birdeye API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const tokens = data.data?.tokens || [];

    // Transform the data to match your frontend format
    const trendingTokens = tokens.map((token: any) => ({
      symbol: token.symbol || 'UNKNOWN',
      priceChange: token.price24hChangePercent || 0,
      price: token.price || 0,
      volume: token.volume24hUSD || 0,
      marketCap: token.marketcap || 0,
      address: token.address,
      name: token.name || token.symbol,
      rank: token.rank || 0,
      logoURI: token.logoURI || '',
      liquidity: token.liquidity || 0,
      volumeChange: token.volume24hChangePercent || 0,
      fdv: token.fdv || 0
    }));

    res.status(200).json({
      success: true,
      tokens: trendingTokens,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching trending tokens:', error);
    
    // Enhanced fallback data if API fails
    const fallbackTokens = [
      { symbol: 'SOL', priceChange: 5.2, price: 98.45, volume: 1250000, marketCap: 45000000000, address: '', name: 'Solana', rank: 1, logoURI: '', liquidity: 1000000, volumeChange: 15.3, fdv: 45000000000 },
      { symbol: 'BONK', priceChange: 12.8, price: 0.000023, volume: 890000, marketCap: 150000000, address: '', name: 'Bonk', rank: 2, logoURI: '', liquidity: 500000, volumeChange: 8.7, fdv: 150000000 },
      { symbol: 'JUP', priceChange: -2.1, price: 0.85, volume: 450000, marketCap: 1200000000, address: '', name: 'Jupiter', rank: 3, logoURI: '', liquidity: 800000, volumeChange: -5.2, fdv: 1200000000 },
      { symbol: 'RAY', priceChange: 8.7, price: 2.34, volume: 320000, marketCap: 580000000, address: '', name: 'Raydium', rank: 4, logoURI: '', liquidity: 400000, volumeChange: 12.1, fdv: 580000000 },
      { symbol: 'SRM', priceChange: 3.4, price: 0.067, volume: 180000, marketCap: 180000000, address: '', name: 'Serum', rank: 5, logoURI: '', liquidity: 200000, volumeChange: 6.8, fdv: 180000000 }
    ];

    res.status(200).json({
      success: false,
      error: 'Using fallback data',
      tokens: fallbackTokens,
      timestamp: new Date().toISOString()
    });
  }
}

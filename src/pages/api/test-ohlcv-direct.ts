import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const tokenAddress = 'So11111111111111111111111111111111111111112';
  const apiKey = process.env.NEXT_PUBLIC_BIRDEYE_API_KEY;

  try {
    console.log('🔍 Testing Birdeye v3 API directly...');

    // Calculate time range (last 24 hours)
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    const fromTime = Math.floor(oneDayAgo / 1000);
    const toTime = Math.floor(now / 1000);

    const baseUrl = 'https://public-api.birdeye.so/defi/v3/ohlcv';
    const params = new URLSearchParams({
      address: tokenAddress,
      type: '1H',
      time_from: fromTime.toString(),
      time_to: toTime.toString()
    });

    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    
    if (apiKey) {
      headers['X-API-KEY'] = apiKey;
    }

    console.log(`📊 Fetching: ${baseUrl}?${params}`);
    console.log(`🔑 API Key: ${apiKey ? 'Present' : 'Missing'}`);
    console.log(`⏰ Time range: ${new Date(fromTime * 1000).toISOString()} to ${new Date(toTime * 1000).toISOString()}`);

    const response = await fetch(`${baseUrl}?${params}`, { headers });
    
    console.log(`📈 Response status: ${response.status}`);
    
    const data = await response.json();
    
    console.log(`✅ API Response:`, {
      success: data.success,
      itemCount: data?.data?.items?.length || 0,
      hasData: !!data?.data?.items?.length
    });

    if (data?.data?.items?.length > 0) {
      const sample = data.data.items[0];
      console.log(`📄 Sample item:`, sample);
    }

    res.status(200).json({
      success: true,
      apiEndpoint: `${baseUrl}?${params}`,
      hasApiKey: !!apiKey,
      timeRange: {
        from: new Date(fromTime * 1000).toISOString(),
        to: new Date(toTime * 1000).toISOString()
      },
      response: {
        status: response.status,
        success: data.success,
        itemCount: data?.data?.items?.length || 0,
        sample: data?.data?.items?.[0] || null
      },
      fullData: data
    });

  } catch (error) {
    console.error('❌ Error testing API:', error);
    res.status(500).json({
      error: 'Failed to test API',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const envVars = {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      // Show first few characters of keys for debugging (don't show full keys for security)
      anonKeyPreview: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 10) + '...',
      serviceKeyPreview: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 10) + '...'
    };

    res.status(200).json({
      message: "Environment variables loaded",
      envVars
    });

  } catch (error) {
    console.error('Test ENV Error:', error);
    res.status(500).json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

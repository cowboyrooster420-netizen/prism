import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Check if environment variables exist
    const envCheck = {
      url: supabaseUrl ? 'SET' : 'NOT SET',
      anonKey: supabaseAnonKey ? 'SET' : 'NOT SET',
      serviceKey: supabaseServiceRoleKey ? 'SET' : 'NOT SET',
      urlValue: supabaseUrl,
      anonKeyPreview: supabaseAnonKey?.substring(0, 20) + '...',
      serviceKeyPreview: supabaseServiceRoleKey?.substring(0, 20) + '...'
    };

    // Try to create a client
    let clientCreation = 'SUCCESS';
    let client;
    try {
      client = createClient(supabaseUrl!, supabaseAnonKey!);
      clientCreation = 'SUCCESS';
    } catch (error) {
      clientCreation = `FAILED: ${error}`;
    }

    // Try a simple query
    let queryResult = 'NOT TESTED';
    if (client) {
      try {
        const { data, error } = await client.from('watchlists').select('count').limit(1);
        if (error) {
          queryResult = `QUERY ERROR: ${error.message}`;
        } else {
          queryResult = 'QUERY SUCCESS';
        }
      } catch (error) {
        queryResult = `EXCEPTION: ${error}`;
      }
    }

    res.status(200).json({
      debug: {
        envCheck,
        clientCreation,
        queryResult
      }
    });

  } catch (error) {
    console.error('Debug API Error:', error);
    res.status(500).json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

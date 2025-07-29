import { NextApiRequest, NextApiResponse } from "next";
import { testSupabaseConnection } from "@/lib/test-supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const isConnected = await testSupabaseConnection();
    
    if (isConnected) {
      res.status(200).json({ 
        success: true, 
        message: "Supabase connection successful!" 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: "Supabase connection failed" 
      });
    }
  } catch (err) {
    console.error('Test API Error:', err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to test Supabase connection" 
    });
  }
} 
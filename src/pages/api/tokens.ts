import { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabaseClient";

// Input validation for query parameters
const validateQueryParams = (query: any) => {
  const errors: string[] = [];
  
  // Validate limit
  if (query.limit) {
    const limit = parseInt(query.limit as string);
    if (isNaN(limit) || limit < 1 || limit > 1000) {
      errors.push('Limit must be a number between 1 and 1000');
    }
  }
  
  // Validate market cap filter
  if (query.maxMarketCap) {
    const maxMarketCap = parseFloat(query.maxMarketCap as string);
    if (isNaN(maxMarketCap) || maxMarketCap < 0) {
      errors.push('maxMarketCap must be a positive number');
    }
  }
  
  return errors;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Validate query parameters
    const validationErrors = validateQueryParams(req.query);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: validationErrors.join(', ') });
    }

    // Build query with validated parameters
    let query = supabase.from('tokens').select('*');
    
    // Apply market cap filter if provided
    if (req.query.maxMarketCap) {
      const maxMarketCap = parseFloat(req.query.maxMarketCap as string);
      query = query.lte('market_cap', maxMarketCap);
    } else {
      // Default filter for tokens under $5M
      query = query.lte('market_cap', 5000000);
    }
    
    // Apply limit
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 500;
    query = query.limit(limit);
    
    // Order by market cap
    query = query.order('market_cap', { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: "Failed to fetch tokens" });
    }

    res.status(200).json({ tokens: data || [] });
  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({ error: "Failed to fetch tokens" });
  }
} 
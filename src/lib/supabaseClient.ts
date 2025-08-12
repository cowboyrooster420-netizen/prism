import { createClient } from "@supabase/supabase-js";

// Security Note: This file only uses ANON key, never the service role key
// Admin operations are handled in supabase-admin.ts (server-side only)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing required Supabase environment variables');
}

// Client for user operations (uses anon key with RLS enabled)
export const supabase = createClient(supabaseUrl, supabaseAnonKey); 
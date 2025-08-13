-- Fix Watchlists Schema (Simplified - No Auth Dependencies)
-- This will drop existing tables and recreate them properly

-- Drop existing tables if they exist (this will also drop dependent objects)
DROP TABLE IF EXISTS public.watchlist_tokens CASCADE;
DROP TABLE IF EXISTS public.watchlists CASCADE;

-- Drop the function if it exists
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Create watchlists table with simple schema (no auth dependencies)
CREATE TABLE public.watchlists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL, -- Simple text field instead of UUID reference
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create watchlist_tokens table
CREATE TABLE public.watchlist_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  watchlist_id UUID REFERENCES public.watchlists(id) ON DELETE CASCADE,
  token_address TEXT NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  UNIQUE(watchlist_id, token_address)
);

-- Create indexes for performance
CREATE INDEX idx_watchlists_user_id ON public.watchlists(user_id);
CREATE INDEX idx_watchlist_tokens_watchlist_id ON public.watchlist_tokens(watchlist_id);
CREATE INDEX idx_watchlist_tokens_token_address ON public.watchlist_tokens(token_address);

-- Enable RLS (Row Level Security)
ALTER TABLE public.watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for watchlists (using simple text comparison)
CREATE POLICY "Users can view their own watchlists" ON public.watchlists
  FOR SELECT USING (user_id = 'temp-user-id'); -- Match the placeholder in our API

CREATE POLICY "Users can insert their own watchlists" ON public.watchlists
  FOR INSERT WITH CHECK (user_id = 'temp-user-id');

CREATE POLICY "Users can update their own watchlists" ON public.watchlists
  FOR UPDATE USING (user_id = 'temp-user-id');

CREATE POLICY "Users can delete their own watchlists" ON public.watchlists
  FOR DELETE USING (user_id = 'temp-user-id');

-- RLS Policies for watchlist_tokens
CREATE POLICY "Users can view tokens in their watchlists" ON public.watchlist_tokens
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.watchlists 
      WHERE id = watchlist_id AND user_id = 'temp-user-id'
    )
  );

CREATE POLICY "Users can insert tokens in their watchlists" ON public.watchlist_tokens
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.watchlists 
      WHERE id = watchlist_id AND user_id = 'temp-user-id'
    )
  );

CREATE POLICY "Users can update tokens in their watchlists" ON public.watchlist_tokens
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.watchlists 
      WHERE id = watchlist_id AND user_id = 'temp-user-id'
    )
  );

CREATE POLICY "Users can delete tokens in their watchlists" ON public.watchlist_tokens
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.watchlists 
      WHERE id = watchlist_id AND user_id = 'temp-user-id'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_watchlists_updated_at 
  BEFORE UPDATE ON public.watchlists 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Verify the tables were created correctly
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('watchlists', 'watchlist_tokens')
ORDER BY table_name, ordinal_position;

-- Insert a test watchlist to verify everything works
INSERT INTO public.watchlists (user_id, name, description, is_public) 
VALUES ('temp-user-id', 'Test Watchlist', 'This is a test watchlist', false);

-- Verify the insert worked
SELECT * FROM public.watchlists;

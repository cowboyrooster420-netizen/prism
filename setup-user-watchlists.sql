-- Setup for User Watchlists System
-- Run this in your Supabase SQL editor

-- Create watchlists table
CREATE TABLE IF NOT EXISTS public.watchlists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create watchlist_tokens table
CREATE TABLE IF NOT EXISTS public.watchlist_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  watchlist_id UUID REFERENCES public.watchlists(id) ON DELETE CASCADE,
  token_address TEXT NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  UNIQUE(watchlist_id, token_address)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_watchlists_user_id ON public.watchlists(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_tokens_watchlist_id ON public.watchlist_tokens(watchlist_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_tokens_token_address ON public.watchlist_tokens(token_address);

-- Enable RLS (Row Level Security)
ALTER TABLE public.watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for watchlists
CREATE POLICY "Users can view their own watchlists" ON public.watchlists
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own watchlists" ON public.watchlists
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own watchlists" ON public.watchlists
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own watchlists" ON public.watchlists
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for watchlist_tokens
CREATE POLICY "Users can view tokens in their watchlists" ON public.watchlist_tokens
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.watchlists 
      WHERE id = watchlist_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert tokens in their watchlists" ON public.watchlist_tokens
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.watchlists 
      WHERE id = watchlist_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update tokens in their watchlists" ON public.watchlist_tokens
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.watchlists 
      WHERE id = watchlist_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete tokens in their watchlists" ON public.watchlist_tokens
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.watchlists 
      WHERE id = watchlist_id AND user_id = auth.uid()
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

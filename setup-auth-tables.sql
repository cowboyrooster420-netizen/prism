-- Setup Authentication Tables
-- This creates the users table and updates watchlists to use proper user references

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  username TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on email for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS policies for users
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Update watchlists table to use proper user references
-- First, let's check if we need to migrate existing data
DO $$
BEGIN
  -- If watchlists table exists and has data with 'temp-user-id', migrate it
  IF EXISTS (SELECT 1 FROM watchlists WHERE user_id = 'temp-user-id') THEN
    -- Create a default user for existing data
    INSERT INTO users (email, password_hash, username) 
    VALUES ('temp@example.com', 'temp-hash', 'temp-user')
    ON CONFLICT (email) DO NOTHING;
    
    -- Get the user ID
    UPDATE watchlists 
    SET user_id = (SELECT id::text FROM users WHERE email = 'temp@example.com')
    WHERE user_id = 'temp-user-id';
  END IF;
END $$;

-- Update RLS policies for watchlists to use proper user authentication
DROP POLICY IF EXISTS "Users can view their own watchlists" ON watchlists;
DROP POLICY IF EXISTS "Users can insert their own watchlists" ON watchlists;
DROP POLICY IF EXISTS "Users can update their own watchlists" ON watchlists;
DROP POLICY IF EXISTS "Users can delete their own watchlists" ON watchlists;

-- New RLS policies using proper user authentication
CREATE POLICY "Users can view their own watchlists" ON watchlists
  FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert their own watchlists" ON watchlists
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update their own watchlists" ON watchlists
  FOR UPDATE USING (user_id = auth.uid()::text);

CREATE POLICY "Users can delete their own watchlists" ON watchlists
  FOR DELETE USING (user_id = auth.uid()::text);

-- Update RLS policies for watchlist_tokens
DROP POLICY IF EXISTS "Users can view tokens in their watchlists" ON watchlist_tokens;
DROP POLICY IF EXISTS "Users can insert tokens in their watchlists" ON watchlist_tokens;
DROP POLICY IF EXISTS "Users can update tokens in their watchlists" ON watchlist_tokens;
DROP POLICY IF EXISTS "Users can delete tokens in their watchlists" ON watchlist_tokens;

-- New RLS policies for watchlist_tokens
CREATE POLICY "Users can view tokens in their watchlists" ON watchlist_tokens
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM watchlists 
      WHERE id = watchlist_id AND user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can insert tokens in their watchlists" ON watchlist_tokens
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM watchlists 
      WHERE id = watchlist_id AND user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can update tokens in their watchlists" ON watchlist_tokens
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM watchlists 
      WHERE id = watchlist_id AND user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can delete tokens in their watchlists" ON watchlist_tokens
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM watchlists 
      WHERE id = watchlist_id AND user_id = auth.uid()::text
    )
  );

-- Verify the setup
SELECT 'Authentication tables created successfully!' as status;

-- Show table structure
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name IN ('users', 'watchlists', 'watchlist_tokens')
ORDER BY table_name, ordinal_position;

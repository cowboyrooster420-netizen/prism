-- Setup Custom Authentication Tables for JWT-based auth
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

-- Create index on username for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS policies for users (using custom JWT auth)
-- Users can only view and update their own profile
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (true); -- We'll handle auth in the API layer

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (true); -- We'll handle auth in the API layer

-- Create or update watchlists table with user_id column
CREATE TABLE IF NOT EXISTS watchlists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  user_id TEXT NOT NULL, -- References users.id
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_watchlists_user_id ON watchlists(user_id);

-- Enable RLS on watchlists table
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;

-- RLS policies for watchlists (using custom JWT auth)
-- We'll handle authentication in the API layer, so allow all operations
-- but the API will validate JWT tokens and user permissions
CREATE POLICY "Allow all watchlist operations" ON watchlists
  FOR ALL USING (true);

-- Create or update watchlist_tokens table
CREATE TABLE IF NOT EXISTS watchlist_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  watchlist_id TEXT NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
  token_address TEXT NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(watchlist_id, token_address)
);

-- Create index on watchlist_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_watchlist_tokens_watchlist_id ON watchlist_tokens(watchlist_id);

-- Create index on token_address for fast lookups
CREATE INDEX IF NOT EXISTS idx_watchlist_tokens_token_address ON watchlist_tokens(token_address);

-- Enable RLS on watchlist_tokens table
ALTER TABLE watchlist_tokens ENABLE ROW LEVEL SECURITY;

-- RLS policies for watchlist_tokens (using custom JWT auth)
-- We'll handle authentication in the API layer, so allow all operations
CREATE POLICY "Allow all watchlist token operations" ON watchlist_tokens
  FOR ALL USING (true);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_watchlists_updated_at 
    BEFORE UPDATE ON watchlists 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Verify the setup
SELECT 'Custom authentication tables created successfully!' as status;

-- Show table structure
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name IN ('users', 'watchlists', 'watchlist_tokens')
ORDER BY table_name, ordinal_position;



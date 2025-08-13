-- Create Watchlists Tables - Super Simple Version
-- This avoids all potential issues by being as basic as possible

-- Drop tables if they exist
DROP TABLE IF EXISTS watchlist_tokens;
DROP TABLE IF EXISTS watchlists;

-- Create basic watchlists table
CREATE TABLE watchlists (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create basic watchlist_tokens table
CREATE TABLE watchlist_tokens (
  id SERIAL PRIMARY KEY,
  watchlist_id INTEGER REFERENCES watchlists(id) ON DELETE CASCADE,
  token_address TEXT NOT NULL,
  added_at TIMESTAMP DEFAULT NOW(),
  notes TEXT
);

-- Create simple indexes
CREATE INDEX idx_watchlists_user_id ON watchlists(user_id);
CREATE INDEX idx_watchlist_tokens_watchlist_id ON watchlist_tokens(watchlist_id);

-- Insert test data
INSERT INTO watchlists (user_id, name, description, is_public) 
VALUES ('temp-user-id', 'Test Watchlist', 'This is a test watchlist', false);

-- Show what we created
SELECT 'Tables created successfully!' as status;

-- Show table structure
SELECT 
  table_name, 
  column_name, 
  data_type
FROM information_schema.columns 
WHERE table_name IN ('watchlists', 'watchlist_tokens')
ORDER BY table_name, ordinal_position;

-- Show test data
SELECT * FROM watchlists;

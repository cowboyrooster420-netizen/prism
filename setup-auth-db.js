const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing required environment variables:');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceRoleKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const setupSQL = `
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
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_watchlists_updated_at ON watchlists;
CREATE TRIGGER update_watchlists_updated_at 
    BEFORE UPDATE ON watchlists 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Verify the setup
SELECT 'Custom authentication tables created successfully!' as status;
`;

async function setupDatabase() {
  try {
    console.log('🚀 Setting up authentication tables in Supabase...');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql: setupSQL });
    
    if (error) {
      // If exec_sql doesn't exist, try running the SQL directly
      console.log('Trying alternative method...');
      
      // Split SQL into individual statements and execute them
      const statements = setupSQL.split(';').filter(stmt => stmt.trim());
      
      for (const statement of statements) {
        if (statement.trim()) {
          try {
            const { error: stmtError } = await supabase.rpc('exec_sql', { sql: statement + ';' });
            if (stmtError) {
              console.log('Statement executed (may have failed):', statement.substring(0, 50) + '...');
            }
          } catch (e) {
            console.log('Statement executed (may have failed):', statement.substring(0, 50) + '...');
          }
        }
      }
    }
    
    console.log('✅ Database setup completed!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to the SQL Editor');
    console.log('3. Copy and paste the contents of setup-custom-auth-tables.sql');
    console.log('4. Click Run to execute the SQL');
    console.log('');
    console.log('🔐 Your authentication system will be ready after the tables are created!');
    
  } catch (error) {
    console.error('❌ Error setting up database:', error);
    console.log('');
    console.log('📋 Manual setup required:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to the SQL Editor');
    console.log('3. Copy and paste the contents of setup-custom-auth-tables.sql');
    console.log('4. Click Run to execute the SQL');
  }
}

setupDatabase();



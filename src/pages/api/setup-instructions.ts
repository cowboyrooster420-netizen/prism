import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const instructions = {
    title: "OHLCV Database Setup Instructions",
    status: "Manual setup required",
    steps: [
      {
        step: 1,
        title: "Access Supabase SQL Editor",
        description: "Go to your Supabase dashboard and open the SQL Editor",
        action: "Navigate to https://supabase.com/dashboard/project/[your-project-id]/sql"
      },
      {
        step: 2,
        title: "Execute Schema Creation",
        description: "Copy and execute the SQL schema file",
        action: "Copy the contents of /Users/aaronburke/prism/supabase-ohlcv-schema.sql and paste it into the SQL Editor, then click 'Run'"
      },
      {
        step: 3,
        title: "Verify Schema Creation",
        description: "Confirm tables and functions were created successfully",
        action: "Run: SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%ohlcv%';"
      },
      {
        step: 4,
        title: "Test OHLCV Collection",
        description: "Once schema is created, test the collection system",
        action: "Call the API endpoint: POST /api/collect-ohlcv with a sample token address"
      }
    ],
    files: {
      schema: "/Users/aaronburke/prism/supabase-ohlcv-schema.sql",
      collector: "/Users/aaronburke/prism/src/lib/ohlcvCollector.ts",
      api_endpoint: "/Users/aaronburke/prism/src/pages/api/collect-ohlcv.ts"
    },
    why_manual: [
      "Supabase requires DDL (Data Definition Language) statements to be executed via the SQL Editor for security",
      "CREATE TABLE, CREATE FUNCTION, and other schema changes cannot be done via the REST API",
      "This ensures database integrity and prevents accidental schema modifications"
    ],
    next_steps: [
      "Execute the schema SQL in Supabase dashboard",
      "Test the collection system with a sample token",
      "Set up automated collection for active tokens",
      "Integrate historical data with the TA worker"
    ]
  };

  res.status(200).json(instructions);
}
import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin as supabase } from '@/lib/supabase-admin'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { tokens } = req.body

      if (!tokens || !Array.isArray(tokens)) {
        return res.status(400).json({ error: 'Invalid tokens data' })
      }

      // Get user ID from auth header
      const authHeader = req.headers.authorization
      if (!authHeader) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      // Get user ID from middleware headers
      const userId = req.headers['x-user-id'] as string
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }

      // Verify ownership of all watchlists before adding tokens
      const watchlistIds = [...new Set(tokens.map(t => t.watchlist_id))]
      
      const { data: watchlists, error: fetchError } = await supabase
        .from('watchlists')
        .select('id')
        .eq('user_id', userId)
        .in('id', watchlistIds)

      if (fetchError) {
        console.error('Error fetching watchlists:', fetchError)
        return res.status(500).json({ error: 'Failed to verify watchlist ownership' })
      }

      const validWatchlistIds = new Set(watchlists?.map(w => w.id) || [])
      const validTokens = tokens.filter(t => validWatchlistIds.has(t.watchlist_id))

      if (validTokens.length === 0) {
        return res.status(400).json({ error: 'No valid watchlists found' })
      }

      // Add tokens to watchlists
      const { data: addedTokens, error: insertError } = await supabase
        .from('watchlist_tokens')
        .insert(validTokens)
        .select()

      if (insertError) {
        console.error('Error adding tokens to watchlists:', insertError)
        return res.status(500).json({ error: 'Failed to add tokens to watchlists' })
      }

      res.status(201).json({ 
        message: `Added ${addedTokens?.length || 0} tokens to watchlists`,
        tokens: addedTokens 
      })
    } catch (error) {
      console.error('Error in POST /api/watchlists/tokens:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  } else {
    res.setHeader('Allow', ['POST'])
    res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }
}

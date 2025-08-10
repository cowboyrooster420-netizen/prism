import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // Get user ID from auth header (you'll need to implement proper auth)
      const authHeader = req.headers.authorization
      if (!authHeader) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      // Get user ID from middleware headers
      const userId = req.headers['x-user-id'] as string
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }

      const { data: watchlists, error } = await supabase
        .from('watchlists')
        .select(`
          *,
          token_count:watchlist_tokens(count)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching watchlists:', error)
        return res.status(500).json({ error: 'Failed to fetch watchlists' })
      }

      // Transform the data to include token count
      const transformedWatchlists = watchlists?.map(watchlist => ({
        ...watchlist,
        token_count: Array.isArray(watchlist.token_count) ? watchlist.token_count.length : 0
      })) || []

      res.status(200).json({ watchlists: transformedWatchlists })
    } catch (error) {
      console.error('Error in GET /api/watchlists:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  } else if (req.method === 'POST') {
    try {
      const { name, description, is_public } = req.body

      if (!name) {
        return res.status(400).json({ error: 'Name is required' })
      }

      // Get user ID from auth header
      const authHeader = req.headers.authorization
      if (!authHeader) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      // Get user ID from middleware headers
      const userId = req.headers['x-user-id'] as string
      
      if (!userId) {
        return res.status(400).json({ error: 'User not authenticated' })
      }

      const { data: watchlist, error } = await supabase
        .from('watchlists')
        .insert({
          user_id: userId,
          name,
          description: description || '',
          is_public: is_public || false
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating watchlist:', error)
        return res.status(500).json({ error: 'Failed to create watchlist' })
      }

      res.status(201).json({ watchlist })
    } catch (error) {
      console.error('Error in POST /api/watchlists:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST'])
    res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }
}

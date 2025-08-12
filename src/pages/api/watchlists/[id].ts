import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin as supabase } from '@/lib/supabase-admin'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query

  if (req.method === 'DELETE') {
    try {
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Invalid watchlist ID' })
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

      // Verify ownership before deletion
      const { data: watchlist, error: fetchError } = await supabase
        .from('watchlists')
        .select('user_id')
        .eq('id', id)
        .single()

      if (fetchError || !watchlist) {
        return res.status(404).json({ error: 'Watchlist not found' })
      }

      if (watchlist.user_id !== userId) {
        return res.status(403).json({ error: 'Forbidden' })
      }

      // Delete the watchlist (cascade will handle watchlist_tokens)
      const { error: deleteError } = await supabase
        .from('watchlists')
        .delete()
        .eq('id', id)

      if (deleteError) {
        console.error('Error deleting watchlist:', deleteError)
        return res.status(500).json({ error: 'Failed to delete watchlist' })
      }

      res.status(200).json({ message: 'Watchlist deleted successfully' })
    } catch (error) {
      console.error('Error in DELETE /api/watchlists/[id]:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  } else {
    res.setHeader('Allow', ['DELETE'])
    res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }
}

import { supabase } from './supabase'

export async function testSupabaseConnection() {
  try {
    // Test the connection by querying the auth schema
    const { data, error } = await supabase.from('_dummy_table_').select('*').limit(1)
    
    if (error && error.code === 'PGRST116') {
      // This error means the table doesn't exist, but the connection works
      console.log('✅ Supabase connection successful!')
      return true
    } else if (error) {
      console.error('❌ Supabase connection failed:', error)
      return false
    }
    
    return true
  } catch (err) {
    console.error('❌ Supabase connection error:', err)
    return false
  }
} 
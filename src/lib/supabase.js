import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Variabel lingkungan Supabase belum dikonfigurasi.\n' +
    'Tambahkan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di pengaturan Environment Variables Vercel.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

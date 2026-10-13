import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// Supabase client — will work once VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY
// are set in your .env file (copy from .env.example).
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

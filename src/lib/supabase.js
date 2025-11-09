import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Check for missing environment variables
export function checkEnvVars() {
  const missing = []
  if (!supabaseUrl) missing.push('VITE_SUPABASE_URL')
  if (!supabaseAnonKey) missing.push('VITE_SUPABASE_ANON_KEY')
  if (!import.meta.env.VITE_MAPBOX_TOKEN) missing.push('VITE_MAPBOX_TOKEN')
  
  if (missing.length > 0) {
    return {
      error: true,
      missing,
      message: `Missing environment variables: ${missing.join(', ')}. Please check your .env file.`
    }
  }
  return { error: false }
}

// Only create client if env vars are available
let supabase = null
if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})
} else {
  // Create a dummy client that will fail gracefully
  supabase = createClient('https://placeholder.supabase.co', 'placeholder-key', {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export { supabase }


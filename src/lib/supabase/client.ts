import { createBrowserClient } from '@supabase/ssr'

// Clear any stale Supabase auth data from previous projects
// This runs once when the module loads (client-side only)
if (typeof window !== 'undefined') {
  const currentUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const currentRef = currentUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]

  // Remove localStorage keys that belong to a different Supabase project
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('sb-') && currentRef && !key.includes(currentRef)) {
      localStorage.removeItem(key)
    }
  })

  // Clear all cookies that look like old Supabase session cookies
  document.cookie.split(';').forEach(cookie => {
    const name = cookie.split('=')[0].trim()
    if (name.startsWith('sb-') && currentRef && !name.includes(currentRef)) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
    }
  })
}

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    // During build time or when env vars are missing, return a mock client
    console.warn('Supabase environment variables are missing. Using mock client.')
    return {
      auth: {
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error: new Error('Supabase not configured') }),
        signOut: () => Promise.resolve({ error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
      },
      from: () => ({
        select: () => ({ data: [], error: null }),
        insert: () => ({ data: [], error: null }),
        update: () => ({ data: [], error: null }),
        delete: () => ({ data: [], error: null })
      }),
      channel: () => ({
        on: () => ({}),
        subscribe: () => ({})
      }),
      removeChannel: () => {}
    } as any
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
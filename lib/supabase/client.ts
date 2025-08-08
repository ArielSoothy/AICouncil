import { createBrowserClient } from '@supabase/ssr'

// Create a resilient client that doesn't crash when env vars are missing (e.g., preview builds)
export const createClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (url && anon) {
    return createBrowserClient(url, anon)
  }

  // Minimal no-op stub to avoid runtime/build-time crashes on environments without Supabase
  const noop = () => {}
  const rejection = (msg = 'Supabase not configured') => ({ error: new Error(msg) })

  const chain = () => ({
    select: () => ({ data: null, error: new Error('Supabase not configured') }),
    single: function () { return this },
    eq: function () { return this },
    update: () => ({ error: new Error('Supabase not configured') }),
    insert: () => ({ error: new Error('Supabase not configured') })
  })

  return {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: (_cb: any) => ({ data: { subscription: { unsubscribe: noop } } }),
      signUp: async () => rejection(),
      signInWithPassword: async () => ({ data: { user: null, session: null }, error: new Error('Supabase not configured') }),
      signOut: async () => {}
    },
    from: (_table: string) => chain()
  } as any
}
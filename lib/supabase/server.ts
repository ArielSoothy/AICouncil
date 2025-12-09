import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const createClient = async () => {
  const cookieStore = await cookies()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (url && anon) {
    return createServerClient(
      url,
      anon,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options)
              })
            } catch (error) {
              // The `set` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    )
  }

  // Return a minimal no-op client on environments without Supabase config
  const noop = () => {}
  const chain = () => ({
    select: () => ({ data: null, error: new Error('Supabase not configured') }),
    single: function () { return this },
    eq: function () { return this },
    update: () => ({ error: new Error('Supabase not configured') }),
    insert: () => ({ error: new Error('Supabase not configured') })
  })

  return {
    auth: {
      getUser: async () => ({ data: { user: null } }),
    },
    from: (_table: string) => chain()
  } as any
}
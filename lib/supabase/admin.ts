/**
 * Singleton Supabase Admin Client (service-role)
 *
 * Use this for all server-side operations that need elevated permissions.
 * The client is cached as a module-level singleton so only one instance
 * is created per process lifetime.
 *
 * Usage:
 *   import { getSupabaseAdmin } from '@/lib/supabase/admin'
 *   const supabase = getSupabaseAdmin()
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

let adminClient: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient {
  if (!adminClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
    if (!url || !key) {
      throw new Error('Missing Supabase admin credentials (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)')
    }
    adminClient = createClient(url, key, {
      auth: {
        persistSession: false, // Server-side, no session needed
      },
    })
  }
  return adminClient
}

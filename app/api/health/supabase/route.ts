import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const srv = process.env.SUPABASE_SERVICE_ROLE_KEY
  return NextResponse.json({
    nextPublicUrlPresent: Boolean(url),
    nextPublicAnonPresent: Boolean(anon),
    serviceRolePresent: Boolean(srv),
    // lengths only for sanity; do not leak actual values
    urlLen: url ? url.length : 0,
    anonLen: anon ? anon.length : 0,
    srvLen: srv ? srv.length : 0,
  })
}



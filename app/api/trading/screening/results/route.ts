import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const password = searchParams.get('key') || request.headers.get('x-screening-key')
  const expectedPassword = process.env.SCREENING_ACCESS_KEY

  if (expectedPassword && password !== expectedPassword) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('screening_scans')
      .select('*')
      .order('scanned_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      return NextResponse.json({ error: 'No screening results found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch results' }, { status: 500 })
  }
}

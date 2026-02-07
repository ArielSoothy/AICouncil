import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const password = searchParams.get('key') || request.headers.get('x-screening-key')
  const expectedPassword = process.env.SCREENING_ACCESS_KEY

  if (expectedPassword && password !== expectedPassword) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const limit = parseInt(searchParams.get('limit') || '20')

  try {
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('screening_scans')
      .select('*')
      .order('scanned_at', { ascending: false })
      .limit(Math.min(limit, 100))

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
  }
}

/**
 * Screening Debate Results Endpoint
 *
 * GET /api/trading/screening/debate/results
 *
 * Fetch latest or historical debate results from screening_debates table.
 * Query params:
 *   - limit: number (default 10)
 *   - id: specific debate ID
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  // Auth check
  const { searchParams } = new URL(request.url)
  const password = searchParams.get('key') || request.headers.get('x-screening-key')
  const expectedPassword = process.env.SCREENING_ACCESS_KEY

  if (expectedPassword && password !== expectedPassword) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = getSupabaseAdmin()
    const debateId = searchParams.get('id')
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)

    if (debateId) {
      // Fetch specific debate
      const { data, error } = await supabase
        .from('screening_debates')
        .select('*')
        .eq('id', debateId)
        .single()

      if (error || !data) {
        return NextResponse.json({ error: 'Debate not found' }, { status: 404 })
      }

      return NextResponse.json(data)
    }

    // Fetch latest debates
    const { data, error } = await supabase
      .from('screening_debates')
      .select('id, scan_id, config, stocks_selected, summary, status, error_message, started_at, completed_at')
      .order('started_at', { ascending: false })
      .limit(limit)

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch debates' }, { status: 500 })
    }

    return NextResponse.json({ debates: data || [] })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

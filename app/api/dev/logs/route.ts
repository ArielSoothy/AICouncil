import { NextRequest, NextResponse } from 'next/server'
import { backendLogger } from '@/lib/dev/backend-logger'

// Only allow in development
const isDev = process.env.NODE_ENV === 'development'

export async function GET(request: NextRequest) {
  if (!isDev) {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const searchParams = request.nextUrl.searchParams
  const limit = parseInt(searchParams.get('limit') || '100')
  const category = searchParams.get('category') as any
  const level = searchParams.get('level') as any
  const since = searchParams.get('since') || undefined

  const logs = backendLogger.getLogs({ limit, category, level, since })
  const stats = backendLogger.getStats()

  return NextResponse.json({
    logs,
    stats,
    timestamp: new Date().toISOString()
  })
}

export async function DELETE() {
  if (!isDev) {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  backendLogger.clear()
  return NextResponse.json({ success: true, message: 'Logs cleared' })
}

// SSE endpoint for real-time logs
export async function POST(request: NextRequest) {
  if (!isDev) {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  // Manual log entry (for testing)
  const body = await request.json()
  const { category, message, data, level } = body

  if (!category || !message) {
    return NextResponse.json({ error: 'category and message required' }, { status: 400 })
  }

  const entry = backendLogger.log(category, message, data, level || 'info')
  return NextResponse.json({ success: true, entry })
}

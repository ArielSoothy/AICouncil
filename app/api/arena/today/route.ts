import { NextResponse } from 'next/server'
import { getTodaysTrades, formatTodaysActivitySummary } from '@/lib/arena/trade-guards'

/**
 * GET /api/arena/today
 *
 * Returns today's trading activity for Arena mode
 * Used for UI indicators showing which models/stocks have traded
 */
export async function GET() {
  try {
    const trades = await getTodaysTrades()
    const summary = formatTodaysActivitySummary(trades)

    return NextResponse.json({
      success: true,
      ...trades,
      summary
    })
  } catch (error) {
    console.error('Error fetching today\'s trades:', error)
    return NextResponse.json(
      { error: 'Failed to fetch today\'s trades' },
      { status: 500 }
    )
  }
}

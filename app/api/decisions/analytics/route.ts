/**
 * Decision Analytics API
 *
 * GET /api/decisions/analytics - Get model performance and user summary
 *
 * This powers the Model Leaderboard - showing which models perform best.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDecisionService } from '@/lib/decisions/decision-service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const type = searchParams.get('type') || 'summary' // 'summary' | 'models' | 'pending'

    const service = getDecisionService()

    switch (type) {
      case 'models': {
        // Model performance leaderboard
        const performance = await service.getModelPerformance(userId || undefined)
        return NextResponse.json({
          success: true,
          type: 'models',
          performance,
        })
      }

      case 'pending': {
        // Decisions needing outcome feedback
        if (!userId) {
          return NextResponse.json(
            { success: false, error: 'user_id required for pending outcomes' },
            { status: 400 }
          )
        }
        const daysOld = parseInt(searchParams.get('days_old') || '7')
        const pending = await service.getPendingOutcomes(userId, daysOld)
        return NextResponse.json({
          success: true,
          type: 'pending',
          decisions: pending,
          count: pending.length,
        })
      }

      case 'summary':
      default: {
        // User decision summary
        if (!userId) {
          return NextResponse.json(
            { success: false, error: 'user_id required for summary' },
            { status: 400 }
          )
        }
        const summary = await service.getUserSummary(userId)
        return NextResponse.json({
          success: true,
          type: 'summary',
          summary,
        })
      }
    }
  } catch (error) {
    console.error('[API] Error getting analytics:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get analytics',
      },
      { status: 500 }
    )
  }
}

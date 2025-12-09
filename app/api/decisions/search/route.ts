/**
 * Decision Search API
 *
 * POST /api/decisions/search - Search decisions by text
 *
 * Uses PostgreSQL full-text search for efficient querying.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDecisionService } from '@/lib/decisions/decision-service'

interface SearchBody {
  user_id: string
  query: string
  limit?: number
}

export async function POST(request: NextRequest) {
  try {
    const body: SearchBody = await request.json()

    if (!body.user_id) {
      return NextResponse.json(
        { success: false, error: 'Missing user_id' },
        { status: 400 }
      )
    }

    if (!body.query || body.query.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: 'Search query must be at least 2 characters' },
        { status: 400 }
      )
    }

    const service = getDecisionService()
    const decisions = await service.searchDecisions(
      body.user_id,
      body.query.trim(),
      body.limit || 20
    )

    return NextResponse.json({
      success: true,
      query: body.query,
      decisions,
      count: decisions.length,
    })
  } catch (error) {
    console.error('[API] Error searching decisions:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search decisions',
      },
      { status: 500 }
    )
  }
}

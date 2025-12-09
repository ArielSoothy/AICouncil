/**
 * Decision Memory API - Main Route
 *
 * POST /api/decisions - Save a new decision
 * GET /api/decisions - List decisions with filters
 *
 * This API enables the Decision Memory System - the data moat of Verdict AI.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDecisionService } from '@/lib/decisions/decision-service'
import { DecisionFilters, PaginationOptions, CreateDecisionInput } from '@/lib/decisions/decision-types'
import { DebateSession } from '@/lib/agents/types'

// ============================================================================
// POST - Save a new decision
// ============================================================================

interface SaveDecisionBody {
  debate_session: DebateSession
  user_id?: string
  domain?: string
  tags?: string[]
  title?: string
  client_info?: Record<string, unknown>
}

export async function POST(request: NextRequest) {
  try {
    const body: SaveDecisionBody = await request.json()

    // Validate required fields
    if (!body.debate_session) {
      return NextResponse.json(
        { success: false, error: 'Missing debate_session' },
        { status: 400 }
      )
    }

    if (!body.debate_session.query) {
      return NextResponse.json(
        { success: false, error: 'Debate session must have a query' },
        { status: 400 }
      )
    }

    const service = getDecisionService()

    // Prepare metadata
    const metadata: Partial<CreateDecisionInput> = {}
    if (body.domain) metadata.domain = body.domain as any
    if (body.tags) metadata.tags = body.tags
    if (body.title) metadata.title = body.title
    if (body.client_info) metadata.client_info = body.client_info

    // Save the decision
    const decision = await service.saveDecision(
      body.debate_session,
      body.user_id || null,
      metadata
    )

    console.log(`[API] Decision saved: ${decision.id}`)

    return NextResponse.json({
      success: true,
      decision,
    })
  } catch (error) {
    console.error('[API] Error saving decision:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save decision',
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// GET - List decisions with filters
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Get user ID (required for listing)
    const userId = searchParams.get('user_id')
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Missing user_id parameter' },
        { status: 400 }
      )
    }

    // Build filters
    const filters: DecisionFilters = {}
    const domain = searchParams.get('domain')
    if (domain) filters.domain = domain as any

    const outcomeStatus = searchParams.get('outcome_status')
    if (outcomeStatus) filters.outcome_status = outcomeStatus as any

    const tags = searchParams.get('tags')
    if (tags) filters.tags = tags.split(',')

    const modelsUsed = searchParams.get('models_used')
    if (modelsUsed) filters.models_used = modelsUsed.split(',')

    const dateFrom = searchParams.get('date_from')
    if (dateFrom) filters.date_from = dateFrom

    const dateTo = searchParams.get('date_to')
    if (dateTo) filters.date_to = dateTo

    const searchQuery = searchParams.get('search')
    if (searchQuery) filters.search_query = searchQuery

    // Build pagination
    const pagination: PaginationOptions = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      order_by: (searchParams.get('order_by') as any) || 'created_at',
      order_direction: (searchParams.get('order_dir') as any) || 'desc',
    }

    const service = getDecisionService()
    const result = await service.listDecisions(userId, filters, pagination)

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('[API] Error listing decisions:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list decisions',
      },
      { status: 500 }
    )
  }
}

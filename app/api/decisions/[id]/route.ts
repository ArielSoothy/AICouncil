/**
 * Decision Memory API - Single Decision Route
 *
 * GET /api/decisions/[id] - Get a single decision
 * PATCH /api/decisions/[id] - Update outcome
 * DELETE /api/decisions/[id] - Delete a decision
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDecisionService } from '@/lib/decisions/decision-service'
import { UpdateOutcomeInput, OutcomeStatus } from '@/lib/decisions/decision-types'

// ============================================================================
// GET - Get a single decision by ID
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing decision ID' },
        { status: 400 }
      )
    }

    const service = getDecisionService()
    const decision = await service.getDecision(id, userId)

    if (!decision) {
      return NextResponse.json(
        { success: false, error: 'Decision not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      decision,
    })
  } catch (error) {
    console.error('[API] Error getting decision:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get decision',
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// PATCH - Update decision (outcome, tags, title)
// ============================================================================

interface PatchDecisionBody {
  user_id: string
  // Outcome update
  outcome_status?: OutcomeStatus
  outcome_notes?: string
  outcome_rating?: number
  // Other updates
  tags?: string[]
  title?: string
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body: PatchDecisionBody = await request.json()

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing decision ID' },
        { status: 400 }
      )
    }

    if (!body.user_id) {
      return NextResponse.json(
        { success: false, error: 'Missing user_id' },
        { status: 400 }
      )
    }

    const service = getDecisionService()
    let decision

    // Update outcome if provided
    if (body.outcome_status) {
      const outcomeUpdate: UpdateOutcomeInput = {
        outcome_status: body.outcome_status,
        outcome_notes: body.outcome_notes,
        outcome_rating: body.outcome_rating,
      }
      decision = await service.updateOutcome(id, body.user_id, outcomeUpdate)
      console.log(`[API] Outcome updated for decision ${id}: ${body.outcome_status}`)
    }

    // Update tags if provided
    if (body.tags !== undefined) {
      decision = await service.updateTags(id, body.user_id, body.tags)
    }

    // Update title if provided
    if (body.title !== undefined) {
      decision = await service.updateTitle(id, body.user_id, body.title)
    }

    if (!decision) {
      // Nothing to update
      decision = await service.getDecision(id, body.user_id)
    }

    return NextResponse.json({
      success: true,
      decision,
    })
  } catch (error) {
    console.error('[API] Error updating decision:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update decision',
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// DELETE - Delete a decision
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing decision ID' },
        { status: 400 }
      )
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Missing user_id parameter' },
        { status: 400 }
      )
    }

    const service = getDecisionService()
    await service.deleteDecision(id, userId)

    console.log(`[API] Decision deleted: ${id}`)

    return NextResponse.json({
      success: true,
      message: 'Decision deleted successfully',
    })
  } catch (error) {
    console.error('[API] Error deleting decision:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete decision',
      },
      { status: 500 }
    )
  }
}

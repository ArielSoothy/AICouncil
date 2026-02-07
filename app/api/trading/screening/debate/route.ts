/**
 * Screening Debate SSE Endpoint
 *
 * POST /api/trading/screening/debate
 *
 * Streams debate progress for top screened stocks via Server-Sent Events.
 * Requires SCREENING_ACCESS_KEY auth.
 */

import { NextRequest } from 'next/server'
import { runScreeningDebatePipeline } from '@/lib/trading/screening-debate/pipeline'
import { DEFAULT_SCREENING_DEBATE_CONFIG } from '@/lib/trading/screening-debate/types'
import type { ScreeningDebateConfig, ScreeningDebateEvent } from '@/lib/trading/screening-debate/types'

export const maxDuration = 300 // 5 minutes for long debates

export async function POST(request: NextRequest) {
  // Auth check
  const password =
    request.headers.get('x-screening-key') ||
    new URL(request.url).searchParams.get('key')
  const expectedPassword = process.env.SCREENING_ACCESS_KEY

  if (expectedPassword && password !== expectedPassword) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Parse config from body
  let body: Partial<ScreeningDebateConfig> & { scanId?: string } = {}
  try {
    body = await request.json()
  } catch {
    // Use defaults
  }

  const config: ScreeningDebateConfig = {
    ...DEFAULT_SCREENING_DEBATE_CONFIG,
    ...body,
  }

  // Validate topN
  config.topN = Math.min(Math.max(config.topN, 1), 10)

  // Create SSE stream
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: ScreeningDebateEvent) => {
        try {
          const data = JSON.stringify(event)
          controller.enqueue(encoder.encode(`data: ${data}\n\n`))
        } catch {
          // Stream may be closed
        }
      }

      try {
        await runScreeningDebatePipeline(config, emit, body.scanId)
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        emit({
          type: 'error',
          timestamp: new Date().toISOString(),
          data: { error: errorMsg },
        })
      } finally {
        try {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch {
          // Already closed
        }
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

import { NextRequest, NextResponse } from 'next/server'
import { providerRegistry } from '@/lib/ai-providers'
import { QueryRequest, ConsensusResult, ModelResponse } from '@/types/consensus'
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit'
import { calculateConsensusScore, generateConsensusId } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
    
    // Check rate limit
    const rateLimitResult = checkRateLimit(ip)
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { 
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult)
        }
      )
    }

    const body: QueryRequest = await request.json()
    const { prompt, models } = body

    if (!prompt?.trim()) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    if (!models?.length) {
      return NextResponse.json(
        { error: 'At least one model must be selected' },
        { status: 400 }
      )
    }

    // Query all models in parallel
    const startTime = Date.now()
    const responses = await Promise.allSettled(
      models.map(async (config) => {
        const provider = providerRegistry.getProvider(config.provider)
        if (!provider) {
          throw new Error(`Provider ${config.provider} not found`)
        }
        return provider.query(prompt, config)
      })
    )

    // Process responses
    const modelResponses: ModelResponse[] = responses.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value
      } else {
        return {
          id: `error-${Date.now()}-${index}`,
          provider: models[index].provider,
          model: models[index].model,
          response: '',
          confidence: 0,
          responseTime: Date.now() - startTime,
          tokens: { prompt: 0, completion: 0, total: 0 },
          timestamp: new Date(),
          error: result.reason?.message || 'Unknown error',
        }
      }
    })

    // Calculate consensus
    const successfulResponses = modelResponses.filter(r => !r.error)
    const responseTexts = successfulResponses.map(r => r.response)
    const agreementScore = calculateConsensusScore(responseTexts)

    // Generate consensus summary (simplified for MVP)
    const avgConfidence = successfulResponses.length > 0
      ? successfulResponses.reduce((sum, r) => sum + r.confidence, 0) / successfulResponses.length
      : 0

    const consensusResult: ConsensusResult = {
      id: generateConsensusId(),
      prompt,
      responses: modelResponses,
      consensus: {
        agreement: agreementScore,
        summary: successfulResponses.length > 0 
          ? `${successfulResponses.length} models provided responses with ${Math.round(agreementScore * 100)}% agreement.`
          : 'No successful responses received.',
        disagreements: [], // TODO: Implement disagreement detection
        confidence: avgConfidence,
      },
      performance: {
        avgResponseTime: modelResponses.reduce((sum, r) => sum + r.responseTime, 0) / modelResponses.length,
        successRate: successfulResponses.length / modelResponses.length,
        totalTokens: modelResponses.reduce((sum, r) => sum + r.tokens.total, 0),
      },
      timestamp: new Date(),
    }

    return NextResponse.json(consensusResult, {
      headers: getRateLimitHeaders(rateLimitResult)
    })

  } catch (error) {
    console.error('Consensus API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

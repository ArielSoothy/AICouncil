/**
 * Portfolio Analysis API
 *
 * POST /api/trading/portfolio-analysis
 *
 * Runs AI analysis on the user's entire portfolio, providing:
 * - Overall portfolio health assessment
 * - Risk/diversification analysis
 * - Rebalancing recommendations
 * - Individual position analysis
 */

import { NextRequest, NextResponse } from 'next/server'
import { BrokerFactory } from '@/lib/brokers/broker-factory'
import { AnthropicProvider } from '@/lib/ai-providers/anthropic'
import { OpenAIProvider } from '@/lib/ai-providers/openai'
import { GoogleProvider } from '@/lib/ai-providers/google'
import { GroqProvider } from '@/lib/ai-providers/groq'
import { getModelDisplayName, getProviderForModel as getProviderType } from '@/lib/trading/models-config'

// Initialize providers
const PROVIDERS = {
  anthropic: new AnthropicProvider(),
  openai: new OpenAIProvider(),
  google: new GoogleProvider(),
  groq: new GroqProvider(),
}

interface PortfolioAnalysisRequest {
  models: Array<{
    provider: string
    model: string
    enabled: boolean
  }>
  timeframe?: string
}

interface Position {
  symbol: string
  quantity: number
  marketValue: number
  unrealizedPL: number
  unrealizedPLPercent: number
  avgCost: number
  currentPrice: number
  side: string
}

function generatePortfolioPrompt(
  positions: Position[],
  totalValue: number,
  cashBalance: number,
  timeframe: string
): string {
  const positionsSummary = positions.map(p =>
    `${p.symbol}: ${p.quantity} shares @ $${p.avgCost.toFixed(2)} avg cost, current $${p.currentPrice.toFixed(2)}, P/L: ${p.unrealizedPL >= 0 ? '+' : ''}$${p.unrealizedPL.toFixed(2)} (${p.unrealizedPLPercent >= 0 ? '+' : ''}${p.unrealizedPLPercent.toFixed(1)}%), ${((p.marketValue / totalValue) * 100).toFixed(1)}% of portfolio`
  ).join('\n')

  return `You are an expert portfolio analyst. Analyze this portfolio and provide actionable recommendations.

═══════════════════════════════════════════════════════════════════════════════
📊 PORTFOLIO OVERVIEW
═══════════════════════════════════════════════════════════════════════════════

Total Portfolio Value: $${totalValue.toFixed(2)}
Cash Available: $${cashBalance.toFixed(2)} (${((cashBalance / totalValue) * 100).toFixed(1)}% of portfolio)
Number of Positions: ${positions.length}
Investment Timeframe: ${timeframe}

═══════════════════════════════════════════════════════════════════════════════
📈 CURRENT POSITIONS
═══════════════════════════════════════════════════════════════════════════════

${positionsSummary}

═══════════════════════════════════════════════════════════════════════════════
📋 ANALYSIS REQUIRED
═══════════════════════════════════════════════════════════════════════════════

Provide your analysis in the following JSON format ONLY (no other text):

{
  "portfolioHealth": {
    "score": <1-10>,
    "summary": "<2-3 sentence overall assessment>"
  },
  "diversification": {
    "score": <1-10>,
    "sectorConcentration": "<assessment of sector exposure>",
    "recommendation": "<specific diversification advice>"
  },
  "riskAssessment": {
    "level": "LOW" | "MEDIUM" | "HIGH",
    "factors": ["<risk factor 1>", "<risk factor 2>"],
    "mitigations": ["<suggestion 1>", "<suggestion 2>"]
  },
  "positionAnalysis": [
    {
      "symbol": "<ticker>",
      "action": "HOLD" | "ADD" | "REDUCE" | "SELL",
      "reasoning": "<brief reasoning>",
      "targetAllocation": "<recommended % of portfolio>"
    }
  ],
  "recommendations": {
    "immediate": ["<action 1>", "<action 2>"],
    "shortTerm": ["<action 1>", "<action 2>"],
    "consideration": ["<optional action 1>"]
  },
  "cashDeployment": {
    "recommendation": "<how to deploy available cash>",
    "priority": "DEPLOY" | "HOLD" | "DCA"
  }
}

Be specific and actionable. Consider the ${timeframe} timeframe for all recommendations.`
}

function extractJSON(text: string): string {
  let cleaned = text.trim()

  // Remove markdown code blocks
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7)
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3)
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3)
  }
  cleaned = cleaned.trim()

  // Extract JSON object
  const firstBrace = cleaned.indexOf('{')
  const lastBrace = cleaned.lastIndexOf('}')

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1)
  }

  // Fix common JSON issues from LLMs
  cleaned = cleaned
    // Remove trailing commas before closing brackets
    .replace(/,(\s*[}\]])/g, '$1')
    // Replace single quotes with double quotes
    .replace(/'/g, '"')
    // Fix unescaped newlines in strings (replace with space)
    .replace(/(?<!\\)\\n/g, ' ')
    // Remove control characters that break JSON
    .replace(/[\x00-\x1F\x7F]/g, ' ')
    // Fix double quotes inside strings (common LLM mistake)
    .replace(/"([^"]*)"([^,:}\]]*)"([^"]*)"/g, '"$1\'$2\'$3"')
    // Remove any text after closing brace
    .replace(/}[^}]*$/, '}')
    .trim()

  return cleaned
}

export async function POST(request: NextRequest) {
  try {
    const body: PortfolioAnalysisRequest = await request.json()
    const { models, timeframe = 'swing' } = body

    // Validate models
    const enabledModels = models.filter(m => m.enabled)
    if (enabledModels.length === 0) {
      return NextResponse.json(
        { error: 'At least one model must be enabled' },
        { status: 400 }
      )
    }

    // Get portfolio data
    const broker = BrokerFactory.getActiveBroker()
    const [account, positions] = await Promise.all([
      broker.getAccount(),
      broker.getPositions()
    ])

    if (positions.length === 0) {
      return NextResponse.json({
        error: 'No positions in portfolio',
        message: 'You need to have at least one position to analyze your portfolio'
      }, { status: 400 })
    }

    // Format positions
    const formattedPositions: Position[] = positions.map(p => ({
      symbol: p.symbol,
      quantity: p.quantity,
      marketValue: p.marketValue,
      unrealizedPL: p.unrealizedPL,
      unrealizedPLPercent: p.unrealizedPLPercent,
      avgCost: p.avgEntryPrice,
      currentPrice: p.currentPrice,
      side: p.side
    }))

    const totalValue = account.portfolioValue
    const cashBalance = account.cash

    // Generate prompt
    const prompt = generatePortfolioPrompt(
      formattedPositions,
      totalValue,
      cashBalance,
      timeframe
    )

    // Run analysis with selected models
    const analyses = await Promise.all(
      enabledModels.map(async (modelConfig) => {
        const providerType = getProviderType(modelConfig.model)
        const provider = PROVIDERS[providerType as keyof typeof PROVIDERS]

        if (!provider) {
          return {
            model: modelConfig.model,
            modelName: getModelDisplayName(modelConfig.model),
            error: `Provider ${providerType} not available`
          }
        }

        try {
          const startTime = Date.now()
          const response = await provider.query(prompt, {
            provider: providerType as any,
            model: modelConfig.model,
            enabled: true,
            temperature: 0.3
          })
          const duration = Date.now() - startTime

          // Parse JSON response from model response
          const jsonStr = extractJSON(response.response)
          const analysis = JSON.parse(jsonStr)

          return {
            model: modelConfig.model,
            modelName: getModelDisplayName(modelConfig.model),
            analysis,
            duration
          }
        } catch (error) {
          console.error(`Model ${modelConfig.model} error:`, error)
          return {
            model: modelConfig.model,
            modelName: getModelDisplayName(modelConfig.model),
            error: error instanceof Error ? error.message : 'Analysis failed'
          }
        }
      })
    )

    // Filter successful analyses
    const successfulAnalyses = analyses.filter(a => !a.error && a.analysis)

    // Aggregate results if multiple models
    let aggregatedAnalysis = null
    if (successfulAnalyses.length > 1) {
      // Simple aggregation: average scores and collect all recommendations
      const avgHealthScore = successfulAnalyses.reduce((sum, a) =>
        sum + (a.analysis?.portfolioHealth?.score || 0), 0) / successfulAnalyses.length

      const avgDiversificationScore = successfulAnalyses.reduce((sum, a) =>
        sum + (a.analysis?.diversification?.score || 0), 0) / successfulAnalyses.length

      // Collect all unique recommendations
      const allImmediateRecs = new Set<string>()
      const allShortTermRecs = new Set<string>()

      successfulAnalyses.forEach(a => {
        a.analysis?.recommendations?.immediate?.forEach((r: string) => allImmediateRecs.add(r))
        a.analysis?.recommendations?.shortTerm?.forEach((r: string) => allShortTermRecs.add(r))
      })

      aggregatedAnalysis = {
        portfolioHealth: {
          score: Math.round(avgHealthScore * 10) / 10,
          modelAgreement: successfulAnalyses.length
        },
        diversification: {
          score: Math.round(avgDiversificationScore * 10) / 10
        },
        recommendations: {
          immediate: Array.from(allImmediateRecs).slice(0, 5),
          shortTerm: Array.from(allShortTermRecs).slice(0, 5)
        }
      }
    }

    return NextResponse.json({
      success: true,
      portfolio: {
        totalValue,
        cashBalance,
        positionCount: positions.length,
        positions: formattedPositions
      },
      analyses,
      aggregatedAnalysis,
      broker: {
        id: broker.id,
        name: broker.name,
        environment: broker.environment
      }
    })
  } catch (error) {
    console.error('Portfolio analysis error:', error)
    return NextResponse.json(
      { error: 'Portfolio analysis failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

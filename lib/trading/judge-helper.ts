/**
 * Trading Consensus Judge Helper
 *
 * Lightweight judge system for trading consensus analysis.
 * Synthesizes multiple trading decisions into unified consensus.
 *
 * Based on heuristic judge pattern from /app/api/consensus/route.ts
 * Can be upgraded to full LLM judge system in future.
 *
 * @module trading/judge-helper
 */

import { MODEL_POWER } from '@/lib/model-metadata'
import type { TradeDecision } from '@/lib/alpaca/types'

export interface TradingJudgeResult {
  unifiedReasoning: string
  confidence: number
  agreements: string[]
  disagreements: string[]
}

/**
 * Analyze trading decisions and synthesize consensus
 * Uses model power weighting and intelligent pattern detection
 *
 * @param decisions - Array of trading decisions from models
 * @param votes - Vote breakdown (BUY/SELL/HOLD counts)
 * @param consensusAction - The consensus action determined by voting
 * @returns Synthesized judge analysis
 */
export function analyzeTradingConsensus(
  decisions: TradeDecision[],
  votes: { BUY: number; SELL: number; HOLD: number },
  consensusAction: 'BUY' | 'SELL' | 'HOLD'
): TradingJudgeResult {
  const validDecisions = decisions.filter(d => d.action && d.reasoning)
  const totalModels = validDecisions.length

  if (totalModels === 0) {
    return {
      unifiedReasoning: 'No valid trading decisions to analyze.',
      confidence: 0,
      agreements: [],
      disagreements: []
    }
  }

  // Calculate weighted confidence using model power
  const { weightedConfidence, totalWeight } = calculateWeightedConfidence(validDecisions)

  // Extract common themes for agreements
  const agreements = detectAgreements(validDecisions, votes, totalModels)

  // Identify disagreements and risks
  const disagreements = detectDisagreements(votes, totalModels, consensusAction)

  // Generate unified reasoning
  const unifiedReasoning = generateUnifiedReasoning(
    consensusAction,
    validDecisions,
    votes,
    totalModels,
    agreements
  )

  return {
    unifiedReasoning,
    confidence: weightedConfidence,
    agreements,
    disagreements
  }
}

/**
 * Calculate weighted confidence based on model power scores
 * Higher-capability models have more influence on final confidence
 */
function calculateWeightedConfidence(decisions: TradeDecision[]): {
  weightedConfidence: number
  totalWeight: number
} {
  const { totalWeight, weightedSum } = decisions.reduce(
    (acc, d) => {
      // Get model power weight (default to 0.7 if not found)
      const modelKey = d.model || 'unknown'
      const weight = MODEL_POWER[modelKey] || 0.7
      const confidence = d.confidence || 0.5

      acc.totalWeight += weight
      acc.weightedSum += weight * confidence
      return acc
    },
    { totalWeight: 0, weightedSum: 0 }
  )

  // Calculate weighted average, cap at 80% to maintain conservatism
  const weightedAvg = totalWeight > 0 ? weightedSum / totalWeight : 0.5
  return {
    weightedConfidence: Math.min(weightedAvg, 0.8),
    totalWeight
  }
}

/**
 * Detect common themes and agreements across models
 * Looks for shared reasoning patterns, symbols, and bullish/bearish cases
 */
function detectAgreements(
  decisions: TradeDecision[],
  votes: { BUY: number; SELL: number; HOLD: number },
  totalModels: number
): string[] {
  const agreements: string[] = []

  // Strong majority agreement
  const maxVotes = Math.max(votes.BUY, votes.SELL, votes.HOLD)
  const agreementPct = Math.round((maxVotes / totalModels) * 100)

  if (maxVotes >= totalModels * 0.75) {
    agreements.push(`Strong ${agreementPct}% agreement on action`)
  } else if (maxVotes >= totalModels * 0.6) {
    agreements.push(`${agreementPct}% majority agreement on action`)
  }

  // Symbol agreement for BUY/SELL
  const symbolCounts: Record<string, number> = {}
  decisions.forEach(d => {
    if (d.symbol && d.action !== 'HOLD') {
      symbolCounts[d.symbol] = (symbolCounts[d.symbol] || 0) + 1
    }
  })

  if (Object.keys(symbolCounts).length > 0) {
    const topSymbol = Object.keys(symbolCounts).sort((a, b) =>
      symbolCounts[b] - symbolCounts[a]
    )[0]
    const symbolCount = symbolCounts[topSymbol]

    if (symbolCount >= 2) {
      agreements.push(`${symbolCount} models recommend ${topSymbol}`)
    }
  }

  // Common reasoning themes
  const reasoningTexts = decisions.map(d => d.reasoning?.toString().toLowerCase() || '')
  const commonThemes = ['bullish', 'bearish', 'support', 'resistance', 'momentum', 'breakout', 'earnings']

  commonThemes.forEach(theme => {
    const mentionCount = reasoningTexts.filter(r => r.includes(theme)).length
    if (mentionCount >= Math.ceil(totalModels * 0.5)) {
      agreements.push(`Multiple models mention ${theme}`)
    }
  })

  return agreements.length > 0 ? agreements : [`${totalModels} models analyzed market conditions`]
}

/**
 * Identify disagreements, splits, and risk factors
 * Alerts to contradictory signals and uncertainty
 */
function detectDisagreements(
  votes: { BUY: number; SELL: number; HOLD: number },
  totalModels: number,
  consensusAction: 'BUY' | 'SELL' | 'HOLD'
): string[] {
  const disagreements: string[] = []

  // Dangerous split: BUY vs SELL (contradictory signals)
  if (votes.BUY > 0 && votes.SELL > 0) {
    disagreements.push(`⚠️ Split signals: ${votes.BUY} BUY vs ${votes.SELL} SELL - conflicting views`)
  }

  // High HOLD count suggests uncertainty
  if (votes.HOLD >= totalModels * 0.3) {
    disagreements.push(`${votes.HOLD} models recommend HOLD, indicating caution or uncertainty`)
  }

  // No clear majority (weak consensus)
  if (consensusAction === 'HOLD' && votes.HOLD < totalModels * 0.5) {
    disagreements.push('No clear majority for any action - market conditions unclear')
  }

  // Weak consensus warning
  const maxVotes = Math.max(votes.BUY, votes.SELL, votes.HOLD)
  if (maxVotes < totalModels * 0.5) {
    disagreements.push(`Weak consensus: only ${maxVotes}/${totalModels} agree on ${consensusAction}`)
  }

  return disagreements
}

/**
 * Generate unified reasoning that synthesizes all model inputs
 * Creates human-readable summary of consensus with key insights
 */
function generateUnifiedReasoning(
  consensusAction: 'BUY' | 'SELL' | 'HOLD',
  decisions: TradeDecision[],
  votes: { BUY: number; SELL: number; HOLD: number },
  totalModels: number,
  agreements: string[]
): string {
  const actionModels = decisions.filter(d => d.action === consensusAction)
  const voteCount = votes[consensusAction]
  const votePct = Math.round((voteCount / totalModels) * 100)

  // Get top symbol if BUY/SELL
  let symbol = ''
  if (consensusAction !== 'HOLD' && actionModels.length > 0) {
    const symbolCounts: Record<string, number> = {}
    actionModels.forEach(d => {
      if (d.symbol) {
        symbolCounts[d.symbol] = (symbolCounts[d.symbol] || 0) + 1
      }
    })
    symbol = Object.keys(symbolCounts).sort((a, b) =>
      symbolCounts[b] - symbolCounts[a]
    )[0] || ''
  }

  // Build reasoning
  const parts: string[] = []

  // Opening summary
  if (consensusAction !== 'HOLD') {
    parts.push(`${voteCount} out of ${totalModels} models (${votePct}%) recommend ${consensusAction}${symbol ? ' ' + symbol : ''}.`)
  } else {
    parts.push(`No clear consensus: ${votes.BUY} BUY, ${votes.SELL} SELL, ${votes.HOLD} HOLD. Recommend holding positions.`)
  }

  // Key agreements
  if (agreements.length > 0) {
    parts.push(`Key agreements: ${agreements.slice(0, 2).join(', ')}.`)
  }

  // Sample reasoning from action models
  if (actionModels.length > 0) {
    const sampleReasoning = actionModels[0].reasoning
    if (sampleReasoning && typeof sampleReasoning === 'string') {
      // Extract first sentence or 150 chars
      const preview = sampleReasoning.substring(0, 150).trim()
      const endIdx = preview.lastIndexOf('.')
      const snippet = endIdx > 50 ? preview.substring(0, endIdx + 1) : preview + '...'
      parts.push(`Representative analysis: "${snippet}"`)
    }
  }

  return parts.join(' ')
}

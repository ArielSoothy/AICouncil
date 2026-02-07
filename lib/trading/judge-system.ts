import { TradeDecision } from '@/lib/alpaca/types'
import { MODEL_POWER, MODEL_BENCHMARKS } from '@/lib/model-metadata'
import type { ScreeningJudgeResult, ScreeningVerdict } from '@/lib/trading/screening-debate/types'

export interface TradingJudgeResult {
  consensusScore: number
  bestAction: 'BUY' | 'SELL' | 'HOLD'
  symbol?: string
  quantity?: number
  confidence: number
  unifiedReasoning: string
  disagreements: string[]
  riskLevel: 'None' | 'Low' | 'Medium' | 'High' | 'Critical'
  tokenUsage: number
}

/**
 * Generate judge prompt for trading consensus analysis
 * Adapted from normal consensus but focused on trading decisions
 */
export function generateTradingJudgePrompt(
  decisions: TradeDecision[],
  votes: { BUY: number; SELL: number; HOLD: number },
  consensusAction: 'BUY' | 'SELL' | 'HOLD'
): string {
  const validDecisions = decisions.filter(d => d.action && d.reasoning)

  // If no valid decisions, still return JSON-forcing prompt
  const decisionsSection = validDecisions.length > 0
    ? validDecisions.map((d) => {
        const weight = d.model ? MODEL_POWER[d.model] : 0.5
        const tier = d.model ? (MODEL_BENCHMARKS[d.model]?.arenaTier) || 'A' : 'Unknown'
        return `
[${d.model || 'Unknown'}] (Confidence: ${d.confidence || 0}%; PowerWeight: ${weight}; Tier: ${tier}):
Action: ${d.action}${d.symbol ? ' ' + d.symbol : ''}${d.quantity ? ' (' + d.quantity + ' shares)' : ''}
Reasoning: ${d.reasoning}
---`
      }).join('\n')
    : '[No valid model decisions - all models failed to parse or returned errors]'

  return `You are the Chief Trading Synthesizer for Verdict AI, analyzing multi-model trading consensus. Your analysis impacts real trading decisions.

CONSENSUS VOTE: ${consensusAction} (${votes.BUY} BUY, ${votes.SELL} SELL, ${votes.HOLD} HOLD)

MODEL TRADING DECISIONS (weighted by benchmark power):
${decisionsSection}

WEIGHTING RULES:
- Weight recommendations by PowerWeight (0.5–1.0). Prefer high-weight analysis when conflicts arise.
- For trading, prioritize risk management and capital preservation.
- If no valid decisions, default to HOLD with low confidence.

Provide ONLY a JSON response with this exact structure (NO other text):
{
  "consensusScore": 0,
  "bestAction": "HOLD",
  "symbol": null,
  "quantity": null,
  "confidence": 30,
  "unifiedReasoning": "Unable to reach consensus - insufficient valid model decisions",
  "disagreements": ["All models failed to provide valid decisions"],
  "riskLevel": "Critical",
  "keyRisks": ["Model parsing errors", "Unable to analyze market conditions"]
}

CRITICAL RULES:
- Output ONLY valid JSON. NO markdown code blocks, NO explanations, NO conversational text.
- If you see valid decisions above, analyze them and override the default values.
- If "[No valid model decisions]" appears, use the default JSON structure exactly as shown.
- Start your response with { and end with }
- Do NOT write anything before or after the JSON object`
}

/**
 * Parse LLM judge response for trading analysis
 */
export function parseTradingJudgeResponse(response: string): TradingJudgeResult {
  try {
    // Clean and parse JSON response
    let cleanText = response.trim()

    // Check for empty response
    if (!cleanText) {
      console.error('Empty response from trading judge model')
      return {
        consensusScore: 50,
        bestAction: 'HOLD',
        confidence: 30,
        unifiedReasoning: 'Unable to analyze - empty response from judge model',
        disagreements: [],
        riskLevel: 'High',
        tokenUsage: 0
      }
    }

    // Remove markdown code blocks
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }

    // Extract JSON from text if it's embedded in other content
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      cleanText = jsonMatch[0]
    }

    // Remove any trailing text after JSON
    const jsonEnd = cleanText.lastIndexOf('}')
    if (jsonEnd !== -1) {
      cleanText = cleanText.substring(0, jsonEnd + 1)
    }


    const parsed = JSON.parse(cleanText)

    // Validate and return result
    const result: TradingJudgeResult = {
      consensusScore: Math.min(Math.max(parsed.consensusScore || 50, 0), 100),
      bestAction: ['BUY', 'SELL', 'HOLD'].includes(parsed.bestAction) ? parsed.bestAction : 'HOLD',
      symbol: parsed.symbol || undefined,
      quantity: parsed.quantity || undefined,
      confidence: Math.min(Math.max(parsed.confidence || 50, 0), 100),
      unifiedReasoning: parsed.unifiedReasoning || 'Unable to synthesize response',
      disagreements: Array.isArray(parsed.disagreements) ? parsed.disagreements : [],
      riskLevel: ['None', 'Low', 'Medium', 'High', 'Critical'].includes(parsed.riskLevel) ? parsed.riskLevel : 'Medium',
      tokenUsage: 0 // Will be filled by caller
    }

    return result

  } catch (error) {
    console.error('Failed to parse trading judge response:', error)
    console.error('Raw response was:', response)
    return {
      consensusScore: 50,
      bestAction: 'HOLD',
      confidence: 30,
      unifiedReasoning: 'Unable to parse judge analysis',
      disagreements: [],
      riskLevel: 'High',
      tokenUsage: 0
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Screening Judge - BUY/WATCH/SKIP verdicts for pre-market screening debate
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate judge prompt for screening debate
 * Produces BUY/WATCH/SKIP (not BUY/SELL/HOLD) with specific trade parameters
 */
export function generateScreeningJudgePrompt(
  symbol: string,
  screeningContext: string,
  debateTranscript: {
    round1: { analyst: string; critic: string; synthesizer: string }
    round2: { analyst: string; critic: string; synthesizer: string }
  }
): string {
  return `You are the JUDGE for a pre-market screening debate on ${symbol}.

You have reviewed a 2-round debate between three AI agents analyzing this stock for a potential pre-market/opening trade.

${screeningContext}

═══ ROUND 1 DEBATE ═══

ANALYST (Round 1):
${debateTranscript.round1.analyst}

CRITIC (Round 1):
${debateTranscript.round1.critic}

SYNTHESIZER (Round 1):
${debateTranscript.round1.synthesizer}

═══ ROUND 2 DEBATE (REFINED) ═══

ANALYST (Round 2):
${debateTranscript.round2.analyst}

CRITIC (Round 2):
${debateTranscript.round2.critic}

SYNTHESIZER (Round 2):
${debateTranscript.round2.synthesizer}

═══ YOUR TASK ═══

As the Judge, evaluate ALL arguments and produce a FINAL VERDICT:

- BUY: Strong setup with favorable risk/reward. Specify exact entry, stop, target.
- WATCH: Interesting but needs confirmation. Specify what trigger would make it a BUY.
- SKIP: Risk outweighs reward. Explain why.

CRITICAL RULES:
- Output ONLY valid JSON. No markdown, no explanations.
- Start with { and end with }
- Confidence must reflect the consensus quality (low if agents disagreed strongly)

Provide ONLY this JSON:
{
  "verdict": "BUY" | "WATCH" | "SKIP",
  "confidence": 0-100,
  "reasoning": "Your complete judge reasoning (2-3 sentences)",
  "entryPrice": number or null,
  "stopLoss": number or null,
  "takeProfit": number or null,
  "positionSize": number or null,
  "riskLevel": "Low" | "Medium" | "High" | "Critical",
  "riskRewardRatio": number or null,
  "keyBullPoints": ["point1", "point2"],
  "keyBearPoints": ["point1", "point2"],
  "timeHorizon": "Intraday" | "1-3 days" | "1 week"
}`
}

/**
 * Parse screening judge response into ScreeningJudgeResult
 */
export function parseScreeningJudgeResponse(response: string): ScreeningJudgeResult {
  try {
    let cleanText = response.trim()

    if (!cleanText) {
      return getDefaultScreeningJudgeResult('Empty response from judge')
    }

    // Remove markdown code blocks
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }

    // Extract JSON
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      cleanText = jsonMatch[0]
    }

    const jsonEnd = cleanText.lastIndexOf('}')
    if (jsonEnd !== -1) {
      cleanText = cleanText.substring(0, jsonEnd + 1)
    }

    const parsed = JSON.parse(cleanText)

    const validVerdicts: ScreeningVerdict[] = ['BUY', 'WATCH', 'SKIP']
    const validRiskLevels = ['Low', 'Medium', 'High', 'Critical'] as const

    return {
      verdict: validVerdicts.includes(parsed.verdict) ? parsed.verdict : 'SKIP',
      confidence: Math.min(Math.max(parsed.confidence || 30, 0), 100),
      reasoning: parsed.reasoning || 'Unable to produce reasoning',
      entryPrice: typeof parsed.entryPrice === 'number' ? parsed.entryPrice : null,
      stopLoss: typeof parsed.stopLoss === 'number' ? parsed.stopLoss : null,
      takeProfit: typeof parsed.takeProfit === 'number' ? parsed.takeProfit : null,
      positionSize: typeof parsed.positionSize === 'number' ? parsed.positionSize : null,
      riskLevel: validRiskLevels.includes(parsed.riskLevel) ? parsed.riskLevel : 'High',
      riskRewardRatio: typeof parsed.riskRewardRatio === 'number' ? parsed.riskRewardRatio : null,
      keyBullPoints: Array.isArray(parsed.keyBullPoints) ? parsed.keyBullPoints : [],
      keyBearPoints: Array.isArray(parsed.keyBearPoints) ? parsed.keyBearPoints : [],
      timeHorizon: parsed.timeHorizon || 'Intraday',
    }
  } catch (error) {
    console.error('Failed to parse screening judge response:', error)
    console.error('Raw response was:', response)
    return getDefaultScreeningJudgeResult('Failed to parse judge response')
  }
}

function getDefaultScreeningJudgeResult(reason: string): ScreeningJudgeResult {
  return {
    verdict: 'SKIP',
    confidence: 10,
    reasoning: reason,
    entryPrice: null,
    stopLoss: null,
    takeProfit: null,
    positionSize: null,
    riskLevel: 'Critical',
    riskRewardRatio: null,
    keyBullPoints: [],
    keyBearPoints: [],
    timeHorizon: 'Intraday',
  }
}

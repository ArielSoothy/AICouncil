import { TradeDecision } from '@/lib/alpaca/types'
import { MODEL_POWER, MODEL_BENCHMARKS } from '@/lib/model-metadata'

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

  if (validDecisions.length === 0) {
    return "No valid trading decisions to analyze."
  }

  return `You are the Chief Trading Synthesizer for Verdict AI, analyzing multi-model trading consensus. Your analysis impacts real trading decisions.

CONSENSUS VOTE: ${consensusAction} (${votes.BUY} BUY, ${votes.SELL} SELL, ${votes.HOLD} HOLD)

MODEL TRADING DECISIONS (weighted by benchmark power):
${validDecisions.map((d) => {
  const weight = d.model ? MODEL_POWER[d.model] : 0.5
  const tier = d.model ? (MODEL_BENCHMARKS[d.model]?.arenaTier) || 'A' : 'Unknown'
  return `
[${d.model || 'Unknown'}] (Confidence: ${d.confidence || 0}%; PowerWeight: ${weight}; Tier: ${tier}):
Action: ${d.action}${d.symbol ? ' ' + d.symbol : ''}${d.quantity ? ' (' + d.quantity + ' shares)' : ''}
Reasoning: ${d.reasoning}
---`
}).join('\n')}

WEIGHTING RULES:
- Weight recommendations by PowerWeight (0.5–1.0). Prefer high-weight analysis when conflicts arise.
- For trading, prioritize risk management and capital preservation.

Provide ONLY a JSON response with this structure:
{
  "consensusScore": [0-100 number based on actual agreement],
  "bestAction": "BUY|SELL|HOLD",
  "symbol": "TICKER if BUY/SELL, null if HOLD",
  "quantity": [number of shares if BUY/SELL, null if HOLD],
  "confidence": [0-100 number based on analysis quality and agreement],
  "unifiedReasoning": "Synthesized analysis incorporating strongest insights from all models. Format: [Model count] out of [total] models (XX%) recommend [ACTION] [SYMBOL]. Key agreements: [list]. Key disagreements: [list if any].",
  "disagreements": ["List key disagreements between models", "Format: X models vs Y models on [specific issue]"],
  "riskLevel": "None|Low|Medium|High|Critical",
  "keyRisks": ["Trading risk 1", "Trading risk 2"]
}

CRITICAL:
- Output ONLY valid JSON. No markdown, no explanations.
- For unifiedReasoning, start with vote summary like: "4 out of 6 models (67%) recommend BUY NVDA"
- List key agreements like common technical patterns, fundamental factors
- List disagreements like conflicting timeframes, risk assessments
- Consider risk-reward ratios and capital preservation`
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

    console.log('Attempting to parse trading judge JSON:', cleanText.substring(0, 200) + '...')

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

    console.log('Successfully parsed trading judge response:', result)
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

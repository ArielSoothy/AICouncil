import { MODEL_COSTS_PER_1K } from '@/lib/model-metadata'
import { AgentConfig } from './types'

// Token estimates for different response modes
const TOKEN_ESTIMATES = {
  concise: {
    prompt: 150,
    response: 100
  },
  normal: {
    prompt: 200,
    response: 300
  },
  detailed: {
    prompt: 250,
    response: 500
  }
}

// Agent mode adds extra tokens for system prompts
const AGENT_PROMPT_OVERHEAD = 200

export function estimateDebateCost(
  agents: AgentConfig[],
  rounds: number,
  responseMode: 'concise' | 'normal' | 'detailed',
  round1Mode: 'llm' | 'agents'
): {
  estimated: {
    total: number
    round1: number
    round2: number
    synthesis: number
    breakdown: Array<{
      agent: string
      model: string
      rounds: number
      tokens: number
      cost: number
    }>
  }
  minimum: number
  maximum: number
} {
  const mode = TOKEN_ESTIMATES[responseMode]
  const breakdown: Array<any> = []
  
  let round1Cost = 0
  let round2Cost = 0
  let synthesisCost = 0
  
  // Calculate per-agent costs
  agents.forEach(agent => {
    const modelCosts = MODEL_COSTS_PER_1K[agent.model] || { input: 0.001, output: 0.003 }
    
    // Round 1 cost
    const round1Tokens = round1Mode === 'agents' 
      ? {
          prompt: mode.prompt + AGENT_PROMPT_OVERHEAD,
          response: mode.response
        }
      : {
          prompt: mode.prompt,
          response: mode.response
        }
    
    const round1AgentCost = (
      (round1Tokens.prompt / 1000 * modelCosts.input) +
      (round1Tokens.response / 1000 * modelCosts.output)
    )
    round1Cost += round1AgentCost
    
    // Round 2 cost (if applicable)
    let round2AgentCost = 0
    if (rounds > 1) {
      // Round 2 includes context from round 1
      const round2Tokens = {
        prompt: mode.prompt + mode.response + AGENT_PROMPT_OVERHEAD,
        response: mode.response
      }
      round2AgentCost = (
        (round2Tokens.prompt / 1000 * modelCosts.input) +
        (round2Tokens.response / 1000 * modelCosts.output)
      )
      round2Cost += round2AgentCost
    }
    
    breakdown.push({
      agent: agent.persona.name,
      model: agent.model,
      rounds: rounds,
      tokens: round1Tokens.prompt + round1Tokens.response + 
              (rounds > 1 ? round1Tokens.response + mode.response : 0),
      cost: round1AgentCost + round2AgentCost
    })
  })
  
  // Synthesis cost (using best available model)
  const synthesisTokens = {
    prompt: agents.length * mode.response + 300, // All responses + prompt
    response: 400 // Synthesis response
  }
  
  // Assume Claude Opus or GPT-4o for synthesis
  const synthesisCosts = MODEL_COSTS_PER_1K['claude-opus-4-1-20250514'] || 
                         MODEL_COSTS_PER_1K['gpt-4o'] || 
                         { input: 0.01, output: 0.03 }
  
  synthesisCost = (
    (synthesisTokens.prompt / 1000 * synthesisCosts.input) +
    (synthesisTokens.response / 1000 * synthesisCosts.output)
  )
  
  const total = round1Cost + round2Cost + synthesisCost
  
  return {
    estimated: {
      total,
      round1: round1Cost,
      round2: round2Cost,
      synthesis: synthesisCost,
      breakdown
    },
    minimum: total * 0.7,  // 30% variance
    maximum: total * 1.3   // 30% variance
  }
}

export function calculateDisagreementScore(messages: any[]): number {
  if (messages.length < 2) return 0
  
  // Simple disagreement detection based on response similarity
  // In production, use semantic similarity or more sophisticated metrics
  
  const responses = messages.map(m => m.content.toLowerCase())
  
  // Check for binary oppositions
  const hasYes = responses.some(r => r.includes('yes') || r.includes('agree'))
  const hasNo = responses.some(r => r.includes('no') || r.includes('disagree'))
  if (hasYes && hasNo) return 0.8
  
  // Check for conflicting numbers
  const numbers = responses.flatMap(r => {
    const matches = r.match(/\d+/g)
    return matches ? matches.map(n => parseInt(n)) : []
  })
  if (numbers.length > 1) {
    const variance = Math.max(...numbers) - Math.min(...numbers)
    if (variance > 100) return 0.7
  }
  
  // Check confidence variance
  const confidences = messages
    .map(m => m.confidence)
    .filter(c => c !== undefined)
  
  if (confidences.length > 1) {
    const avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length
    const variance = confidences.reduce((sum, c) => sum + Math.abs(c - avgConfidence), 0) / confidences.length
    if (variance > 20) return 0.6
  }
  
  // Default low disagreement
  return 0.2
}

export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${(cost * 100).toFixed(3)}¢`
  }
  return `$${cost.toFixed(4)}`
}
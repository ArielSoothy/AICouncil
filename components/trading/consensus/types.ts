export interface ReasoningDetails {
  bullishCase?: string
  bearishCase?: string
  technicalAnalysis?: string
  fundamentalAnalysis?: string
  sentiment?: string
  timing?: string
}

export interface TradingDecision {
  action: 'BUY' | 'SELL' | 'HOLD'
  symbol?: string
  quantity?: number
  reasoning: string | ReasoningDetails
  confidence: number
  model?: string
  // Tool usage tracking (Hybrid Research Mode)
  toolsUsed?: boolean
  toolCallCount?: number
  toolNames?: string[]
  // Provider billing proof (CLI = subscription, API = per-call)
  providerType?: 'CLI' | 'API'
}

export interface ConsensusResultData {
  action: 'BUY' | 'SELL' | 'HOLD'
  symbol?: string
  quantity?: number
  reasoning: string | ReasoningDetails
  confidence: number
  agreement: number
  agreementText: string
  summary: string
  disagreements: string[]
  votes: {
    BUY: number
    SELL: number
    HOLD: number
  }
  modelCount: number
}

export interface FallbackMessage {
  from: string
  to: string
  reason: string
  category: string
}

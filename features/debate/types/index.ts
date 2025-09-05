// Centralized type definitions for the debate feature
// This ensures consistency across all modules

export type DebateMode = 'llm' | 'agents'
export type ResponseMode = 'concise' | 'normal' | 'detailed'
export type DebateStatus = 'idle' | 'configuring' | 'debating' | 'completed' | 'error'

export interface DebateConfig {
  query: string
  mode: DebateMode
  responseMode: ResponseMode
  rounds: number
  autoRound2: boolean
  disagreementThreshold: number
  agents: AgentConfig[]
  comparison?: {
    enabled: boolean
    model?: ModelConfig
  }
  consensus?: {
    enabled: boolean
    models?: ModelConfig[]
  }
}

export interface AgentConfig {
  agentId: string
  provider: string
  model: string
  enabled: boolean
  persona?: AgentPersona
}

export interface AgentPersona {
  id: string
  name: string
  role: 'analyst' | 'critic' | 'synthesizer'
  description: string
  traits: string[]
  focusAreas: string[]
  systemPrompt: string
  color: string
}

export interface ModelConfig {
  provider: string
  model: string
  enabled: boolean
}

export interface DebateSession {
  id: string
  config: DebateConfig
  status: DebateStatus
  rounds: DebateRound[]
  synthesis?: SynthesisResult
  comparison?: ComparisonResult
  consensus?: ConsensusResult
  startTime: number
  endTime?: number
  error?: string
}

export interface DebateRound {
  roundNumber: number
  responses: AgentResponse[]
  disagreementScore?: number
  timestamp: number
}

export interface AgentResponse {
  agentId: string
  agentName: string
  role: string
  response: string
  tokensUsed: number
  duration: number
  model: string
  provider: string
}

export interface SynthesisResult {
  agreements: string[]
  disagreements: string[]
  conclusion: string
  confidence: number
  followUpQuestions?: string[]
  tokensUsed: number
  model: string
}

export interface ComparisonResult {
  singleModel: {
    response: string
    tokensUsed: number
    duration: number
    cost: number
  }
  multiModel: {
    response: string
    tokensUsed: number
    duration: number
    cost: number
  }
  improvement: {
    confidence: number
    costIncrease: number
    recommendation: string
  }
}

export interface ConsensusResult {
  responses: Array<{
    model: string
    response: string
    tokensUsed: number
  }>
  unifiedAnswer: string
  confidence: number
  tokensUsed: number
  cost: number
  duration: number
}

export interface StreamEvent {
  type: 'round_started' | 'model_started' | 'model_completed' | 
        'synthesis_started' | 'synthesis_completed' | 
        'comparison_started' | 'comparison_completed' |
        'consensus_started' | 'consensus_completed' |
        'debate_completed' | 'error'
  data?: any
  timestamp: number
}
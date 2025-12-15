/**
 * Type definitions for real-time research progress streaming
 * Used for Server-Sent Events (SSE) progress updates
 */

export type ResearchAgentRole = 'technical' | 'fundamental' | 'sentiment' | 'risk'

/**
 * Progress callback function type for SSE streaming
 */
export type ProgressCallback = (event: ResearchProgressEvent) => void

/**
 * SSE Progress Event Types
 * Sent from backend to frontend via Server-Sent Events
 */
export type ResearchProgressEvent =
  | PhaseStartEvent
  | AgentStartEvent
  | ToolCallEvent
  | AgentCompleteEvent
  | DecisionStartEvent
  | DecisionCompleteEvent
  | JudgeStartEvent
  | JudgeCompleteEvent
  | CacheHitEvent
  | ErrorEvent
  | FinalResultEvent
  | ModelWarningEvent
  | ModelFallbackEvent

/**
 * Phase 1/2/3 Start Events
 */
export interface PhaseStartEvent {
  type: 'phase_start'
  phase: 1 | 2 | 3
  message: string
  timestamp: number
}

/**
 * Research Agent Start Event (Phase 1)
 */
export interface AgentStartEvent {
  type: 'agent_start'
  agent: ResearchAgentRole
  model: string
  provider: string
  timestamp: number
}

/**
 * Individual Tool Call Event
 */
export interface ToolCallEvent {
  type: 'tool_call'
  agent: ResearchAgentRole
  toolName: string
  args: Record<string, any>
  timestamp: number
  duration?: number // ms (if available)
}

/**
 * Agent Completion Event
 */
export interface AgentCompleteEvent {
  type: 'agent_complete'
  agent: ResearchAgentRole
  toolCount: number
  duration: number // ms
  tokensUsed: number
  model?: string // Research model used (for cost tracking)
  provider?: string // Provider used (for cost tracking)
  inputTokens?: number // Input/prompt tokens (for precise cost calculation)
  outputTokens?: number // Output/completion tokens (for precise cost calculation)
  timestamp: number
  error?: string
}

/**
 * Decision Model Start Event (Phase 2)
 */
export interface DecisionStartEvent {
  type: 'decision_start'
  modelName: string
  modelId: string
  timestamp: number
}

/**
 * Decision Model Complete Event
 */
export interface DecisionCompleteEvent {
  type: 'decision_complete'
  modelName: string
  modelId: string
  action: 'BUY' | 'SELL' | 'HOLD'
  symbol?: string // Stock symbol selected (for Arena mode)
  confidence: number
  duration: number // ms
  tokensUsed?: number // Total tokens (for cost tracking)
  inputTokens?: number // Input/prompt tokens
  outputTokens?: number // Output/completion tokens
  timestamp: number
}

/**
 * Judge Analysis Start Event (Phase 3)
 */
export interface JudgeStartEvent {
  type: 'judge_start'
  message: string
  timestamp: number
}

/**
 * Judge Analysis Complete Event
 */
export interface JudgeCompleteEvent {
  type: 'judge_complete'
  consensusAction: 'BUY' | 'SELL' | 'HOLD'
  agreement: number
  duration: number // ms
  tokensUsed?: number // Total tokens (for cost tracking)
  inputTokens?: number // Input/prompt tokens
  outputTokens?: number // Output/completion tokens
  timestamp: number
}

/**
 * Cache Hit Event (instant completion)
 */
export interface CacheHitEvent {
  type: 'cache_hit'
  message: string
  symbol: string
  timeframe: string
  timestamp: number
}

/**
 * Error Event
 */
export interface ErrorEvent {
  type: 'error'
  phase: 1 | 2 | 3
  agent?: ResearchAgentRole
  model?: string
  message: string
  errorCategory?: string  // QUOTA_LIMIT, AUTH_ERROR, etc.
  timestamp: number
}

/**
 * Final Result Event (end of stream)
 */
export interface FinalResultEvent {
  type: 'final_result'
  consensus: any
  decisions: any[]
  research: any
  timestamp: number
}

/**
 * Model Warning Event - Sent when a model is unstable but still attempted
 */
export interface ModelWarningEvent {
  type: 'warning'
  model: string
  modelName: string
  message: string
  timestamp: number
}

/**
 * Model Fallback Event - Sent when a model fails and another is substituted
 */
export interface ModelFallbackEvent {
  type: 'fallback'
  originalModel: string
  originalModelName: string
  fallbackModel: string
  fallbackModelName: string
  reason: string           // Raw error message
  errorCategory: string    // QUOTA_LIMIT, AUTH_ERROR, etc.
  userMessage: string      // Friendly UI message (e.g., "rate limit")
  timestamp: number
}

/**
 * Progress State for UI
 * Aggregates all events into displayable state
 */
export interface ResearchProgressState {
  phase: 1 | 2 | 3 | 'complete'
  agents: AgentProgress[]
  decisions: DecisionProgress[]
  judgeStatus: 'pending' | 'running' | 'complete'
  totalDuration: number // ms
  isCached: boolean
  error?: string
}

/**
 * Individual Agent Progress
 */
export interface AgentProgress {
  agent: ResearchAgentRole
  model: string
  provider: string
  status: 'pending' | 'running' | 'complete' | 'error'
  toolCalls: ToolCall[]
  toolCount: number
  duration: number // ms
  tokensUsed: number
  error?: string
  startTime?: number
}

/**
 * Individual Tool Call
 */
export interface ToolCall {
  toolName: string
  args: Record<string, any>
  duration?: number // ms
  timestamp: number
}

/**
 * Individual Decision Model Progress
 */
export interface DecisionProgress {
  modelName: string
  modelId: string
  status: 'pending' | 'running' | 'complete' | 'error'
  action?: 'BUY' | 'SELL' | 'HOLD'
  symbol?: string // Stock symbol selected (for Arena mode)
  confidence?: number
  duration: number // ms
  tokensUsed?: number // Total tokens (for cost tracking)
  inputTokens?: number // Input/prompt tokens
  outputTokens?: number // Output/completion tokens
  startTime?: number
}

/**
 * Helper: Convert SSE event string to typed event
 */
export function parseProgressEvent(eventData: string): ResearchProgressEvent | null {
  try {
    return JSON.parse(eventData) as ResearchProgressEvent
  } catch (error) {
    console.error('Failed to parse progress event:', error)
    return null
  }
}

/**
 * Helper: Format duration for display
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

/**
 * Helper: Get agent display name
 */
export function getAgentDisplayName(agent: ResearchAgentRole): string {
  const names: Record<ResearchAgentRole, string> = {
    technical: 'Technical Analyst',
    fundamental: 'Fundamental Analyst',
    sentiment: 'Sentiment Analyst',
    risk: 'Risk Manager'
  }
  return names[agent]
}

/**
 * Helper: Get agent icon
 */
export function getAgentIcon(agent: ResearchAgentRole): string {
  const icons: Record<ResearchAgentRole, string> = {
    technical: '📈',
    fundamental: '📊',
    sentiment: '💭',
    risk: '⚖️'
  }
  return icons[agent]
}

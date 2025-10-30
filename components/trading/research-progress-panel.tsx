'use client'

import { useEffect, useState, forwardRef, useImperativeHandle } from 'react'
import { CheckCircle, Clock, Loader2, AlertCircle, TrendingUp, Scale, Brain } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import {
  ResearchProgressEvent,
  ResearchProgressState,
  AgentProgress,
  DecisionProgress,
  formatDuration,
  getAgentDisplayName,
  getAgentIcon,
  type ResearchAgentRole
} from '@/types/research-progress'

interface ResearchProgressPanelProps {
  /** Optional: Pre-initialize with existing state (for testing) */
  initialState?: Partial<ResearchProgressState>
  /** Callback when progress updates */
  onProgressUpdate?: (state: ResearchProgressState) => void
  /** Callback when complete with final results */
  onComplete?: (data: { consensus: any; decisions: any[]; research: any }) => void
  /** Callback when error occurs */
  onError?: (error: string) => void
}

/**
 * Imperative handle to send events to the panel
 */
export interface ResearchProgressPanelHandle {
  processEvent: (event: ResearchProgressEvent) => void
}

/**
 * Real-Time Research Progress Panel
 *
 * Displays live progress updates from the SSE streaming endpoint.
 * Shows:
 * - Phase indicators (1/2/3)
 * - 4 research agents with status, tool calls, timing
 * - Decision models with status and timing
 * - Judge consensus analysis
 *
 * Modular design: Can be used standalone or integrated into existing UI.
 *
 * Usage with ref:
 * ```tsx
 * const panelRef = useRef<ResearchProgressPanelHandle>(null)
 * panelRef.current?.processEvent(event) // Send SSE events to panel
 * ```
 */
export const ResearchProgressPanel = forwardRef<ResearchProgressPanelHandle, ResearchProgressPanelProps>(function ResearchProgressPanel({
  initialState,
  onProgressUpdate,
  onComplete,
  onError
}, ref) {
  const [state, setState] = useState<ResearchProgressState>(() => ({
    phase: 1,
    agents: [
      { agent: 'technical', model: '', provider: '', status: 'pending', toolCalls: [], toolCount: 0, duration: 0, tokensUsed: 0 },
      { agent: 'fundamental', model: '', provider: '', status: 'pending', toolCalls: [], toolCount: 0, duration: 0, tokensUsed: 0 },
      { agent: 'sentiment', model: '', provider: '', status: 'pending', toolCalls: [], toolCount: 0, duration: 0, tokensUsed: 0 },
      { agent: 'risk', model: '', provider: '', status: 'pending', toolCalls: [], toolCount: 0, duration: 0, tokensUsed: 0 },
    ],
    decisions: [],
    judgeStatus: 'pending',
    totalDuration: 0,
    isCached: false,
    ...initialState
  }))

  const [startTime] = useState(Date.now())

  /**
   * Process SSE event and update state
   * This is the core logic for handling all event types
   */
  const processEvent = (event: ResearchProgressEvent) => {
    setState(prev => {
      const updated = { ...prev }

      switch (event.type) {
        case 'phase_start':
          updated.phase = event.phase as 1 | 2 | 3
          break

        case 'agent_start': {
          const agentIndex = updated.agents.findIndex(a => a.agent === event.agent)
          if (agentIndex !== -1) {
            updated.agents[agentIndex] = {
              ...updated.agents[agentIndex],
              status: 'running',
              model: event.model,
              provider: event.provider,
              startTime: event.timestamp
            }
          }
          break
        }

        case 'tool_call': {
          const agentIndex = updated.agents.findIndex(a => a.agent === event.agent)
          if (agentIndex !== -1) {
            updated.agents[agentIndex].toolCalls.push({
              toolName: event.toolName,
              args: event.args,
              duration: event.duration,
              timestamp: event.timestamp
            })
          }
          break
        }

        case 'agent_complete': {
          const agentIndex = updated.agents.findIndex(a => a.agent === event.agent)
          if (agentIndex !== -1) {
            updated.agents[agentIndex] = {
              ...updated.agents[agentIndex],
              status: 'complete',
              toolCount: event.toolCount,
              duration: event.duration,
              tokensUsed: event.tokensUsed,
              error: event.error
            }
          }
          break
        }

        case 'decision_start': {
          const existingIndex = updated.decisions.findIndex(d => d.modelId === event.modelId)
          if (existingIndex === -1) {
            updated.decisions.push({
              modelName: event.modelName,
              modelId: event.modelId,
              status: 'running',
              duration: 0,
              startTime: event.timestamp
            })
          }
          break
        }

        case 'decision_complete': {
          const decisionIndex = updated.decisions.findIndex(d => d.modelId === event.modelId)
          if (decisionIndex !== -1) {
            updated.decisions[decisionIndex] = {
              ...updated.decisions[decisionIndex],
              status: 'complete',
              action: event.action,
              confidence: event.confidence,
              duration: event.duration
            }
          }
          break
        }

        case 'judge_start':
          updated.judgeStatus = 'running'
          break

        case 'judge_complete':
          updated.judgeStatus = 'complete'
          break

        case 'cache_hit':
          updated.isCached = true
          updated.phase = 'complete'
          break

        case 'error':
          updated.error = event.message
          if (event.agent) {
            const agentIndex = updated.agents.findIndex(a => a.agent === event.agent)
            if (agentIndex !== -1) {
              updated.agents[agentIndex].status = 'error'
              updated.agents[agentIndex].error = event.message
            }
          }
          onError?.(event.message)
          break

        case 'final_result':
          updated.phase = 'complete'
          updated.totalDuration = Date.now() - startTime
          onComplete?.(event)
          break
      }

      // Callback for state updates
      onProgressUpdate?.(updated)
      return updated
    })
  }

  // Expose processEvent to parent via ref
  useImperativeHandle(ref, () => ({
    processEvent
  }))

  return (
    <div className="bg-card rounded-lg border p-6 space-y-6">
      {/* Header with Phase Indicator */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Research Progress</h3>
          <p className="text-sm text-muted-foreground">
            {state.isCached ? '⚡ Cache Hit - Instant Results' : 'Live analysis in progress'}
          </p>
        </div>
        <PhaseIndicator phase={state.phase} />
      </div>

      {/* Phase 1: Research Agents */}
      {(state.phase === 1 || state.phase === 2 || state.phase === 3 || state.phase === 'complete') && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <span className="text-blue-600 dark:text-blue-300 font-semibold text-sm">1</span>
            </div>
            <h4 className="font-medium">Exhaustive Research (4 Specialized Agents)</h4>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {state.agents.map((agent) => (
              <AgentCard key={agent.agent} agent={agent} />
            ))}
          </div>
        </div>
      )}

      {/* Phase 2: Decision Models */}
      {(state.phase === 2 || state.phase === 3 || state.phase === 'complete') && state.decisions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
              <span className="text-purple-600 dark:text-purple-300 font-semibold text-sm">2</span>
            </div>
            <h4 className="font-medium">Decision Models ({state.decisions.length})</h4>
          </div>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {state.decisions.map((decision) => (
              <DecisionCard key={decision.modelId} decision={decision} />
            ))}
          </div>
        </div>
      )}

      {/* Phase 3: Judge Consensus */}
      {(state.phase === 3 || state.phase === 'complete') && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <span className="text-green-600 dark:text-green-300 font-semibold text-sm">3</span>
            </div>
            <h4 className="font-medium">Judge Consensus</h4>
          </div>
          <JudgeCard status={state.judgeStatus} />
        </div>
      )}

      {/* Error Display */}
      {state.error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <div className="font-medium text-red-600">Error</div>
              <div className="text-sm text-red-600/80">{state.error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Total Duration (when complete) */}
      {state.phase === 'complete' && !state.isCached && (
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total Duration:</span>
            <span className="font-medium">{formatDuration(state.totalDuration)}</span>
          </div>
        </div>
      )}
    </div>
  )
})

/** Phase Indicator Component */
function PhaseIndicator({ phase }: { phase: 1 | 2 | 3 | 'complete' }) {
  if (phase === 'complete') {
    return (
      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 dark:bg-green-950">
        <CheckCircle className="w-4 h-4 text-green-600" />
        <span className="text-sm font-medium text-green-600">Complete</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950">
      <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
      <span className="text-sm font-medium text-blue-600">Phase {phase} of 3</span>
    </div>
  )
}

/** Individual Research Agent Card */
function AgentCard({ agent }: { agent: AgentProgress }) {
  const icon = getAgentIcon(agent.agent)
  const name = getAgentDisplayName(agent.agent)

  return (
    <div className="p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow">
      {/* Header with status */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <div>
            <div className="font-medium text-sm">{name}</div>
            {agent.model && (
              <div className="text-xs text-muted-foreground">{agent.model}</div>
            )}
          </div>
        </div>
        <StatusBadge status={agent.status} />
      </div>

      {/* Progress metrics */}
      {agent.status !== 'pending' && (
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tool Calls:</span>
            <span className="font-medium">{agent.toolCount}</span>
          </div>
          {agent.status === 'complete' && (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duration:</span>
                <span className="font-medium">{formatDuration(agent.duration)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tokens:</span>
                <span className="font-medium">{agent.tokensUsed.toLocaleString()}</span>
              </div>
            </>
          )}
          {agent.error && (
            <div className="text-red-600 text-xs mt-2">{agent.error}</div>
          )}
        </div>
      )}
    </div>
  )
}

/** Individual Decision Model Card */
function DecisionCard({ decision }: { decision: DecisionProgress }) {
  return (
    <div className="p-3 rounded-lg border bg-card">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{decision.modelName}</div>
        </div>
        <StatusBadge status={decision.status} size="sm" />
      </div>

      {decision.status === 'complete' && (
        <div className="space-y-1 text-xs">
          {decision.action && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Action:</span>
              <span className="font-semibold">{decision.action}</span>
            </div>
          )}
          {decision.confidence !== undefined && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Confidence:</span>
              <span className="font-medium">{Math.round(decision.confidence * 100)}%</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Time:</span>
            <span className="font-medium">{formatDuration(decision.duration)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

/** Judge Consensus Card */
function JudgeCard({ status }: { status: 'pending' | 'running' | 'complete' }) {
  return (
    <div className="p-4 rounded-lg border bg-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-green-600" />
          <span className="font-medium">Analyzing Consensus</span>
        </div>
        <StatusBadge status={status} />
      </div>
      <p className="text-sm text-muted-foreground mt-2">
        Synthesizing decisions from all models into final consensus
      </p>
    </div>
  )
}

/** Reusable Status Badge */
function StatusBadge({ status, size = 'md' }: { status: string; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2 py-1 text-xs'

  const config: Record<string, { icon: any; color: string; bg: string; spin?: boolean }> = {
    pending: { icon: Clock, color: 'text-gray-600', bg: 'bg-gray-100 dark:bg-gray-900' },
    running: { icon: Loader2, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-950', spin: true },
    complete: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-950' },
    error: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-950' },
  }

  const { icon: Icon, color, bg, spin } = config[status] || config.pending

  return (
    <div className={`flex items-center gap-1 rounded-full ${bg} ${sizeClass}`}>
      <Icon className={`w-3 h-3 ${color} ${spin ? 'animate-spin' : ''}`} />
      <span className={`font-medium ${color} capitalize`}>{status}</span>
    </div>
  )
}

/**
 * Export helper hook for SSE connection
 * This can be used by parent components to manage the EventSource connection
 */
export function useResearchProgress(
  endpoint: string,
  options: {
    enabled: boolean
    onEvent?: (event: ResearchProgressEvent) => void
    onComplete?: (data: any) => void
    onError?: (error: string) => void
  }
) {
  useEffect(() => {
    if (!options.enabled) return

    let eventSource: EventSource | null = null

    try {
      eventSource = new EventSource(endpoint)

      eventSource.onmessage = (e) => {
        try {
          const event: ResearchProgressEvent = JSON.parse(e.data)
          options.onEvent?.(event)

          if (event.type === 'final_result') {
            options.onComplete?.(event)
            eventSource?.close()
          }
        } catch (error) {
          console.error('Failed to parse SSE event:', error)
        }
      }

      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error)
        options.onError?.('Connection lost')
        eventSource?.close()
      }
    } catch (error) {
      console.error('Failed to create EventSource:', error)
      options.onError?.('Failed to connect')
    }

    return () => {
      eventSource?.close()
    }
  }, [endpoint, options.enabled])
}

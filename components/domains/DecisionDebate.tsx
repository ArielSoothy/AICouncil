'use client'

// Decision Debate Component
// Simplified AI debate for decision framework results
// Auto-starts with preset 3-agent configuration

import { useState, useEffect } from 'react'
import { Loader2, Brain, AlertCircle, CheckCircle2, MessageSquare } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Agent {
  id: string
  name: string
  role: 'analyst' | 'critic' | 'synthesizer'
  provider: string
  model: string
  color: string
  response?: string
  status: 'waiting' | 'thinking' | 'completed' | 'error'
  error?: string
}

interface Synthesis {
  content: string
  conclusion: string
  agreements: string[]
  disagreements: string[]
  confidence: number
}

interface DecisionDebateProps {
  query: string // Enhanced query with score context
  onDebateComplete?: (synthesis: Synthesis) => void
}

// Preset 3-agent configuration (Pro tier)
const DEFAULT_AGENTS: Omit<Agent, 'response' | 'status'>[] = [
  {
    id: 'analyst-001',
    name: 'The Analyst',
    role: 'analyst',
    provider: 'anthropic',
    model: 'claude-sonnet-4-5-20250929',
    color: 'text-blue-600 dark:text-blue-400'
  },
  {
    id: 'critic-001',
    name: 'The Critic',
    role: 'critic',
    provider: 'openai',
    model: 'gpt-4o',
    color: 'text-orange-600 dark:text-orange-400'
  },
  {
    id: 'synthesizer-001',
    name: 'The Synthesizer',
    role: 'synthesizer',
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    color: 'text-purple-600 dark:text-purple-400'
  }
]

export function DecisionDebate({ query, onDebateComplete }: DecisionDebateProps) {
  const [agents, setAgents] = useState<Agent[]>(
    DEFAULT_AGENTS.map(agent => ({ ...agent, status: 'waiting' as const }))
  )
  const [synthesis, setSynthesis] = useState<Synthesis | null>(null)
  const [isDebating, setIsDebating] = useState(false)
  const [isSynthesizing, setIsSynthesizing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-start debate on mount
  useEffect(() => {
    startDebate()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const startDebate = async () => {
    setIsDebating(true)
    setError(null)

    try {
      // Prepare agent configurations for API
      const agentConfigs = DEFAULT_AGENTS.map(agent => ({
        agentId: agent.id,
        provider: agent.provider,
        model: agent.model,
        enabled: true,
        persona: {
          id: agent.id,
          role: agent.role,
          name: agent.name,
          description: `${agent.role.charAt(0).toUpperCase() + agent.role.slice(1)} role`,
          traits: [],
          focusAreas: [],
          systemPrompt: getSystemPrompt(agent.role),
          color: agent.color
        }
      }))

      // Call debate API with streaming
      const response = await fetch('/api/agents/debate-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          agents: agentConfigs,
          rounds: 1,
          round1Mode: 'agents',
          responseMode: 'normal',
          enableWebSearch: false,
          includeComparison: false,
          includeConsensusComparison: false
        })
      })

      if (!response.ok) {
        throw new Error(`Debate API failed: ${response.statusText}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response body reader available')
      }

      // Process streaming events
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              handleDebateEvent(data)
            } catch (parseError) {
              console.warn('Failed to parse SSE data:', parseError)
            }
          }
        }
      }
    } catch (err) {
      console.error('Debate error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setIsDebating(false)
    }
  }

  const handleDebateEvent = (event: any) => {
    const { type } = event

    if (type === 'model_started') {
      // Mark agent as thinking
      setAgents(prev =>
        prev.map(agent =>
          agent.id === event.agentId || agent.name === event.agentName
            ? { ...agent, status: 'thinking' as const }
            : agent
        )
      )
    } else if (type === 'model_completed') {
      // Update agent with response
      setAgents(prev =>
        prev.map(agent =>
          agent.id === event.modelId || agent.name === event.agentName
            ? {
                ...agent,
                response: event.fullResponse,
                status: 'completed' as const
              }
            : agent
        )
      )
    } else if (type === 'model_error') {
      // Mark agent as error
      setAgents(prev =>
        prev.map(agent =>
          agent.id === event.modelId
            ? {
                ...agent,
                status: 'error' as const,
                error: event.error
              }
            : agent
        )
      )
    } else if (type === 'synthesis_started') {
      setIsSynthesizing(true)
    } else if (type === 'synthesis_completed') {
      setSynthesis(event.synthesis)
      setIsSynthesizing(false)
      setIsDebating(false)
      if (onDebateComplete) {
        onDebateComplete(event.synthesis)
      }
    } else if (type === 'error') {
      setError(event.message)
      setIsDebating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Multi-Model AI Analysis
          </h3>
        </div>
        {isDebating && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            {isSynthesizing ? 'Synthesizing...' : 'Debating...'}
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Agent Responses */}
      <div className="space-y-4">
        {agents.map(agent => (
          <Card key={agent.id} className="p-6">
            <div className="flex items-start gap-4">
              {/* Agent Avatar */}
              <div className={`flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br ${getAgentGradient(agent.role)} flex items-center justify-center`}>
                <MessageSquare className={`h-5 w-5 ${agent.color}`} />
              </div>

              {/* Agent Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className={`font-semibold ${agent.color}`}>
                    {agent.name}
                  </h4>
                  {agent.status === 'thinking' && (
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  )}
                  {agent.status === 'completed' && (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                  {agent.status === 'error' && (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>

                {agent.status === 'waiting' && (
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    Waiting to respond...
                  </p>
                )}

                {agent.status === 'thinking' && (
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    Analyzing decision...
                  </p>
                )}

                {agent.status === 'error' && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {agent.error || 'Failed to respond'}
                  </p>
                )}

                {agent.status === 'completed' && agent.response && (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {agent.response}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Synthesis Section */}
      {isSynthesizing && (
        <Card className="p-6 bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-purple-600 dark:text-purple-400" />
            <p className="text-purple-900 dark:text-purple-100 font-medium">
              Synthesizing expert opinions...
            </p>
          </div>
        </Card>
      )}

      {synthesis && (
        <Card className="p-6 bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <h4 className="font-bold text-purple-900 dark:text-purple-100">
                Synthesis & Recommendation
              </h4>
              <span className="ml-auto text-sm font-medium text-purple-700 dark:text-purple-300">
                {Math.round(synthesis.confidence * 100)}% confidence
              </span>
            </div>

            {/* Agreements */}
            {synthesis.agreements.length > 0 && (
              <div>
                <h5 className="font-semibold text-green-800 dark:text-green-300 mb-2">
                  ✓ Key Agreements
                </h5>
                <ul className="space-y-1">
                  {synthesis.agreements.map((agreement, idx) => (
                    <li key={idx} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                      <span className="text-green-600 dark:text-green-400 mt-0.5">•</span>
                      <span>{agreement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Disagreements */}
            {synthesis.disagreements.length > 0 && (
              <div>
                <h5 className="font-semibold text-orange-800 dark:text-orange-300 mb-2">
                  ⚠ Points of Debate
                </h5>
                <ul className="space-y-1">
                  {synthesis.disagreements.map((disagreement, idx) => (
                    <li key={idx} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                      <span className="text-orange-600 dark:text-orange-400 mt-0.5">•</span>
                      <span>{disagreement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Conclusion */}
            {synthesis.conclusion && (
              <div className="pt-4 border-t border-purple-200 dark:border-purple-700">
                <h5 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
                  Final Recommendation
                </h5>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                    {synthesis.conclusion}
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}

// Helper functions
function getSystemPrompt(role: 'analyst' | 'critic' | 'synthesizer'): string {
  const prompts = {
    analyst: 'You are an analytical expert who evaluates decisions objectively using data and logic. Focus on quantitative analysis, risk assessment, and evidence-based reasoning.',
    critic: 'You are a critical thinker who challenges assumptions and identifies potential problems. Focus on risks, downsides, and alternative perspectives that others might miss.',
    synthesizer: 'You are a synthesis expert who integrates multiple perspectives into balanced recommendations. Focus on finding common ground and actionable conclusions.'
  }
  return prompts[role]
}

function getAgentGradient(role: 'analyst' | 'critic' | 'synthesizer'): string {
  const gradients = {
    analyst: 'from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800',
    critic: 'from-orange-100 to-orange-200 dark:from-orange-900 dark:to-orange-800',
    synthesizer: 'from-purple-100 to-purple-200 dark:from-purple-900 dark:to-purple-800'
  }
  return gradients[role]
}

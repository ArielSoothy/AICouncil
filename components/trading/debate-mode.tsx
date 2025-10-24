'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, TrendingUp, TrendingDown, Minus, Users, MessageSquare, ChevronDown, ChevronUp, Sparkles, Zap, Gift } from 'lucide-react'
import { DebateTranscript, createDebateMessage, type DebateMessage } from './debate-transcript'
import { getModelDisplayName } from '@/lib/trading/models-config'
import { SingleModelBadgeSelector } from './single-model-badge-selector'
import { TimeframeSelector, type TradingTimeframe } from './timeframe-selector'

interface ReasoningDetails {
  bullishCase?: string
  bearishCase?: string
  technicalAnalysis?: string
  fundamentalAnalysis?: string
  sentiment?: string
  timing?: string
}

interface DebateAgent {
  role: 'analyst' | 'critic' | 'synthesizer'
  name: string
  decision: {
    action: 'BUY' | 'SELL' | 'HOLD'
    symbol?: string
    quantity?: number
    reasoning: string | ReasoningDetails
    confidence: number
  }
}

interface DebateResult {
  round1: DebateAgent[]
  round2: DebateAgent[]
  finalDecision: {
    action: 'BUY' | 'SELL' | 'HOLD'
    symbol?: string
    quantity?: number
    reasoning: string | ReasoningDetails
    confidence: number
    consensus: string
  }
}

// Debate Mode Presets - Pre-selected models for each role
const DEBATE_PRESETS = {
  free: {
    label: 'Free',
    icon: Gift,
    description: 'All free models',
    color: 'bg-green-100 hover:bg-green-200 text-green-700 border-green-300',
    roles: {
      analyst: 'gemini-2.0-flash',      // Google free (good reasoning)
      critic: 'llama-3.3-70b-versatile', // Groq free (best free model)
      synthesizer: 'gemini-1.5-flash',   // Google free (fast synthesis)
    }
  },
  pro: {
    label: 'Pro',
    icon: Zap,
    description: 'Balanced tier models',
    color: 'bg-blue-100 hover:bg-blue-200 text-blue-700 border-blue-300',
    roles: {
      analyst: 'claude-3-5-sonnet-20241022',  // Anthropic balanced (strong analysis)
      critic: 'gpt-4o',                        // OpenAI balanced (critical thinking)
      synthesizer: 'llama-3.3-70b-versatile', // Groq free (good synthesis)
    }
  },
  max: {
    label: 'Max',
    icon: Sparkles,
    description: 'Best flagship models',
    color: 'bg-purple-100 hover:bg-purple-200 text-purple-700 border-purple-300',
    roles: {
      analyst: 'claude-sonnet-4-5-20250929', // Anthropic flagship (best analysis)
      critic: 'gpt-5-chat-latest',            // OpenAI flagship (best reasoning)
      synthesizer: 'gemini-2.5-pro',          // Google flagship (comprehensive synthesis)
    }
  }
}

export function DebateMode() {
  const [loading, setLoading] = useState(false)
  const [debate, setDebate] = useState<DebateResult | null>(null)
  const [activeRound, setActiveRound] = useState<1 | 2>(1)
  const [showTranscript, setShowTranscript] = useState(false)
  const [transcriptMessages, setTranscriptMessages] = useState<DebateMessage[]>([])
  const [timeframe, setTimeframe] = useState<TradingTimeframe>('swing')
  const [targetSymbol, setTargetSymbol] = useState<string>('')

  // Model selection for each debate role (default to Pro preset)
  const [analystModel, setAnalystModel] = useState(DEBATE_PRESETS.pro.roles.analyst)
  const [criticModel, setCriticModel] = useState(DEBATE_PRESETS.pro.roles.critic)
  const [synthesizerModel, setSynthesizerModel] = useState(DEBATE_PRESETS.pro.roles.synthesizer)

  // Apply preset function
  const applyPreset = (presetKey: 'free' | 'pro' | 'max') => {
    const preset = DEBATE_PRESETS[presetKey]
    setAnalystModel(preset.roles.analyst)
    setCriticModel(preset.roles.critic)
    setSynthesizerModel(preset.roles.synthesizer)
  }

  const startDebate = async () => {
    setLoading(true)
    setDebate(null)
    setActiveRound(1)
    setTranscriptMessages([])

    try {
      const response = await fetch('/api/trading/debate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analystModel,
          criticModel,
          synthesizerModel,
          timeframe,
          targetSymbol: targetSymbol.trim() || undefined,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to start debate')
      }

      const data = await response.json()
      setDebate(data.debate)

      // Build transcript from debate results
      if (data.debate) {
        const messages: DebateMessage[] = []

        // Round 1 messages
        data.debate.round1.forEach((agent: DebateAgent) => {
          messages.push(
            createDebateMessage(
              agent.role,
              agent.name,
              `${agent.decision.action}${agent.decision.symbol ? ` ${agent.decision.symbol}` : ''} - ${agent.decision.reasoning}`,
              1
            )
          )
        })

        // Round 2 messages
        data.debate.round2.forEach((agent: DebateAgent) => {
          messages.push(
            createDebateMessage(
              agent.role,
              agent.name,
              `${agent.decision.action}${agent.decision.symbol ? ` ${agent.decision.symbol}` : ''} - ${agent.decision.reasoning}`,
              2
            )
          )
        })

        setTranscriptMessages(messages)
        setShowTranscript(true) // Auto-show transcript
      }
    } catch (error) {
      console.error('Failed to start trading debate:', error)
      alert(error instanceof Error ? error.message : 'Failed to start trading debate')
    } finally {
      setLoading(false)
    }
  }

  const currentRound = debate && activeRound === 1 ? debate.round1 : debate?.round2

  return (
    <div className="space-y-6">
      {/* Model Selection for Debate Roles */}
      <div className="bg-card rounded-lg border p-6">
        <h3 className="font-semibold mb-4">Select AI Models for Each Role</h3>

        {/* Preset Buttons */}
        <div className="mb-6">
          <label className="text-sm font-medium text-muted-foreground block mb-3">
            Quick Presets
          </label>
          <div className="grid grid-cols-3 gap-3">
            {(Object.keys(DEBATE_PRESETS) as Array<keyof typeof DEBATE_PRESETS>).map((key) => {
              const preset = DEBATE_PRESETS[key]
              const Icon = preset.icon

              return (
                <Button
                  key={key}
                  onClick={() => applyPreset(key)}
                  disabled={loading}
                  variant="outline"
                  className={`flex flex-col items-center gap-2 h-auto py-4 border-2 ${preset.color} transition-all`}
                >
                  <Icon className="w-5 h-5" />
                  <div className="text-center">
                    <div className="font-semibold">{preset.label}</div>
                    <div className="text-xs opacity-80 mt-1">{preset.description}</div>
                  </div>
                </Button>
              )
            })}
          </div>
        </div>

        <div className="space-y-6">
          {/* Analyst Model Selection */}
          <SingleModelBadgeSelector
            value={analystModel}
            onChange={setAnalystModel}
            label="📊 Analyst (Proposes trades)"
            disabled={loading}
          />

          {/* Critic Model Selection */}
          <SingleModelBadgeSelector
            value={criticModel}
            onChange={setCriticModel}
            label="🔍 Critic (Challenges recommendations)"
            disabled={loading}
          />

          {/* Synthesizer Model Selection */}
          <SingleModelBadgeSelector
            value={synthesizerModel}
            onChange={setSynthesizerModel}
            label="⚖️ Synthesizer (Makes final decision)"
            disabled={loading}
          />

          {/* Stock Symbol Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              📊 Analyze Specific Stock (Optional)
            </label>
            <input
              type="text"
              value={targetSymbol}
              onChange={(e) => setTargetSymbol(e.target.value.toUpperCase())}
              placeholder="Enter symbol (e.g., TSLA, AAPL) or leave empty"
              disabled={loading}
              className="w-full px-4 py-2 rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            />
            <p className="text-xs text-muted-foreground">
              💡 Leave empty for general market analysis
            </p>
          </div>

          {/* Timeframe Selection */}
          <TimeframeSelector
            value={timeframe}
            onChange={setTimeframe}
            disabled={loading}
          />
        </div>

        <Button
          onClick={startDebate}
          disabled={loading}
          className="w-full mt-4"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Debate in Progress...
            </>
          ) : (
            <>
              <Users className="w-4 h-4 mr-2" />
              Start Agent Debate
            </>
          )}
        </Button>
      </div>

      {/* Debate Transcript */}
      {transcriptMessages.length > 0 && (
        <div>
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            {showTranscript ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            {showTranscript ? 'Hide' : 'Show'} Agent Debate Transcript
          </button>

          {showTranscript && (
            <DebateTranscript messages={transcriptMessages} />
          )}
        </div>
      )}

      {/* Debate Results */}
      {debate && (
        <div className="space-y-6">
          {/* Round Selector */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveRound(1)}
              className={`flex-1 py-3 px-4 rounded-lg border-2 font-medium transition-all ${
                activeRound === 1
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              Round 1: Initial Positions
            </button>
            <button
              onClick={() => setActiveRound(2)}
              className={`flex-1 py-3 px-4 rounded-lg border-2 font-medium transition-all ${
                activeRound === 2
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              Round 2: Debate & Refinement
            </button>
          </div>

          {/* Agent Cards */}
          {currentRound && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {currentRound.map((agent, index) => (
                <div key={index} className="bg-card rounded-lg border p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                        {agent.role}
                      </div>
                      <div className="font-semibold">{agent.name}</div>
                    </div>
                    <ActionBadge action={agent.decision.action} />
                  </div>

                  {agent.decision.action !== 'HOLD' && (
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Symbol:</span>
                        <span className="font-mono font-medium">{agent.decision.symbol}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Quantity:</span>
                        <span className="font-medium">{agent.decision.quantity} shares</span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 mb-4">
                    <div className="text-xs text-muted-foreground">Reasoning:</div>
                    <ReasoningDisplay reasoning={agent.decision.reasoning} />
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Confidence:</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${agent.decision.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium">
                          {(agent.decision.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Final Decision */}
          <div className="bg-card rounded-lg border p-6">
            <div className="flex items-center gap-2 mb-6">
              <MessageSquare className="w-5 h-5 text-primary" />
              <h3 className="text-2xl font-bold">Final Debate Decision</h3>
            </div>

            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="text-3xl font-bold">{debate.finalDecision.action}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {debate.finalDecision.consensus}
                </div>
              </div>
              <ActionBadge action={debate.finalDecision.action} large />
            </div>

            {debate.finalDecision.action !== 'HOLD' && (
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Symbol</div>
                  <div className="text-2xl font-mono font-bold">{debate.finalDecision.symbol}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Quantity</div>
                  <div className="text-2xl font-bold">{debate.finalDecision.quantity} shares</div>
                </div>
              </div>
            )}

            <div className="space-y-3 mb-6">
              <div className="text-sm text-muted-foreground">Final Reasoning:</div>
              <div className="bg-muted/50 p-4 rounded-lg">
                <ReasoningDisplay reasoning={debate.finalDecision.reasoning} />
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Overall Confidence:</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${debate.finalDecision.confidence * 100}%` }}
                    />
                  </div>
                  <span className="text-lg font-bold">
                    {(debate.finalDecision.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ReasoningDisplay({ reasoning }: { reasoning: string | ReasoningDetails }) {
  if (typeof reasoning === 'string') {
    return <div className="text-sm leading-relaxed">{reasoning}</div>
  }

  return (
    <div className="text-sm space-y-3">
      {reasoning.bullishCase && (
        <div>
          <div className="font-medium text-green-600 mb-1">📈 Bullish Case:</div>
          <div className="text-muted-foreground">{reasoning.bullishCase}</div>
        </div>
      )}
      {reasoning.bearishCase && (
        <div>
          <div className="font-medium text-red-600 mb-1">📉 Bearish Case:</div>
          <div className="text-muted-foreground">{reasoning.bearishCase}</div>
        </div>
      )}
      {reasoning.technicalAnalysis && (
        <div>
          <div className="font-medium mb-1">📊 Technical Analysis:</div>
          <div className="text-muted-foreground">{reasoning.technicalAnalysis}</div>
        </div>
      )}
      {reasoning.fundamentalAnalysis && (
        <div>
          <div className="font-medium mb-1">📋 Fundamental Analysis:</div>
          <div className="text-muted-foreground">{reasoning.fundamentalAnalysis}</div>
        </div>
      )}
      {reasoning.sentiment && (
        <div>
          <div className="font-medium mb-1">💭 Sentiment:</div>
          <div className="text-muted-foreground">{reasoning.sentiment}</div>
        </div>
      )}
      {reasoning.timing && (
        <div>
          <div className="font-medium mb-1">⏰ Timing:</div>
          <div className="text-muted-foreground">{reasoning.timing}</div>
        </div>
      )}
    </div>
  )
}

function ActionBadge({ action, large }: { action: 'BUY' | 'SELL' | 'HOLD'; large?: boolean }) {
  const config = {
    BUY: { icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-950' },
    SELL: { icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-950' },
    HOLD: { icon: Minus, color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-950' },
  }

  const { icon: Icon, color, bg } = config[action]
  const sizeClass = large ? 'text-lg' : 'text-sm'
  const iconSize = large ? 'w-6 h-6' : 'w-4 h-4'
  const padding = large ? 'px-4 py-2' : 'px-3 py-1'

  return (
    <div className={`flex items-center gap-1.5 ${padding} rounded-full ${bg}`}>
      <Icon className={`${iconSize} ${color}`} />
      <span className={`${sizeClass} font-semibold ${color}`}>{action}</span>
    </div>
  )
}

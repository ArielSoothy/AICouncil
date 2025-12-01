'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, TrendingUp, TrendingDown, Minus, Users, MessageSquare, ChevronDown, ChevronUp, RotateCcw, ShoppingCart } from 'lucide-react'
import { DebateTranscript, createDebateMessage, type DebateMessage } from './debate-transcript'
import { ReasoningStream, createReasoningStep, type ReasoningStep } from './reasoning-stream'
import { getModelDisplayName } from '@/lib/trading/models-config'
import { SingleModelBadgeSelector } from './single-model-badge-selector'
import { TimeframeSelector, type TradingTimeframe } from './timeframe-selector'
import { TradingHistoryDropdown } from './trading-history-dropdown'
import { useConversationPersistence } from '@/hooks/use-conversation-persistence'
import { useTradingPreset } from '@/contexts/trading-preset-context'
import { getDebateRolesForPreset, DEBATE_PRESETS, getDebatePresetConfig } from '@/lib/config/model-presets'
import { TradeCard, type TradeRecommendation } from './trade-card'

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

export function DebateMode() {
  const { globalTier } = useTradingPreset()
  const [loading, setLoading] = useState(false)
  const [debate, setDebate] = useState<DebateResult | null>(null)
  const [activeRound, setActiveRound] = useState<1 | 2>(1)
  const [showTranscript, setShowTranscript] = useState(false)
  const [transcriptMessages, setTranscriptMessages] = useState<DebateMessage[]>([])
  const [progressSteps, setProgressSteps] = useState<ReasoningStep[]>([])
  const [timeframe, setTimeframe] = useState<TradingTimeframe>('swing')
  const [targetSymbol, setTargetSymbol] = useState<string>('')
  const [tradeRecommendation, setTradeRecommendation] = useState<TradeRecommendation | null>(null)
  const [brokerEnv, setBrokerEnv] = useState<'live' | 'paper'>('paper')
  const [showTradeCard, setShowTradeCard] = useState(true)

  // Model selection for each debate role (initialized with Pro preset)
  const [analystModel, setAnalystModel] = useState(() => getDebateRolesForPreset('pro').analyst)
  const [criticModel, setCriticModel] = useState(() => getDebateRolesForPreset('pro').critic)
  const [synthesizerModel, setSynthesizerModel] = useState(() => getDebateRolesForPreset('pro').synthesizer)

  // Persistence for saving/restoring trading analyses
  const { saveConversation, isRestoring } = useConversationPersistence({
    storageKey: 'trading-debate-mode',
    onRestored: (conversation) => {
      console.log('Restoring Debate Mode analysis:', conversation)
      const responses = conversation.responses as any
      const evalData = conversation.evaluation_data as any

      // Restore state
      if (responses.debate) {
        setDebate(responses.debate)
        setActiveRound(1) // Reset to round 1
      }
      if (evalData?.metadata) {
        const meta = evalData.metadata
        if (meta.timeframe) setTimeframe(meta.timeframe)
        if (meta.targetSymbol) setTargetSymbol(meta.targetSymbol)
        if (meta.analystModel) setAnalystModel(meta.analystModel)
        if (meta.criticModel) setCriticModel(meta.criticModel)
        if (meta.synthesizerModel) setSynthesizerModel(meta.synthesizerModel)
      }
    }
  })

  // Auto-apply global preset when it changes
  useEffect(() => {
    const roles = getDebateRolesForPreset(globalTier)
    setAnalystModel(roles.analyst)
    setCriticModel(roles.critic)
    setSynthesizerModel(roles.synthesizer)
  }, [globalTier])

  // Fetch broker environment on mount
  useEffect(() => {
    fetch('/api/trading/portfolio')
      .then(res => res.json())
      .then(data => {
        setBrokerEnv(data.broker?.environment || 'paper')
      })
      .catch(() => setBrokerEnv('paper'))
  }, [])

  // Execute trade via API
  const handleExecuteTrade = async (symbol: string, action: 'buy' | 'sell', quantity: number) => {
    const response = await fetch('/api/trading/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol, action, quantity })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to execute trade')
    }

    return response.json()
  }

  // Reset/clear results and start new analysis
  const handleStartNew = () => {
    setDebate(null)
    setActiveRound(1)
    setTranscriptMessages([])
    setProgressSteps([])
    setTradeRecommendation(null)
    setShowTradeCard(true)
    // Remove URL parameter
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.delete('c')
      window.history.replaceState({}, '', url.pathname + url.search)
    }
  }

  const startDebate = async () => {
    setLoading(true)
    setDebate(null)
    setActiveRound(1)
    setTranscriptMessages([])
    setProgressSteps([])

    // Show initial progress
    const initialSteps: ReasoningStep[] = [
      createReasoningStep('thinking', '🔄 Starting agent debate...'),
    ]
    setProgressSteps(initialSteps)

    await new Promise(resolve => setTimeout(resolve, 150))

    // Add debate roles being used
    const roleSteps = [
      ...initialSteps,
      createReasoningStep('analysis', `💰 Fetching account data...`),
      createReasoningStep('thinking', `🤖 Debate participants:`),
      createReasoningStep('analysis', `   • 📊 Analyst: ${getModelDisplayName(analystModel)}`),
      createReasoningStep('analysis', `   • 🔍 Critic: ${getModelDisplayName(criticModel)}`),
      createReasoningStep('analysis', `   • ⚖️ Synthesizer: ${getModelDisplayName(synthesizerModel)}`),
    ]
    setProgressSteps(roleSteps)

    await new Promise(resolve => setTimeout(resolve, 150))

    setProgressSteps([
      ...roleSteps,
      createReasoningStep('thinking', '🎭 Round 1: Initial positions...')
    ])

    await new Promise(resolve => setTimeout(resolve, 150))

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

      // Show Round 2 progress
      setProgressSteps(prev => [
        ...prev,
        createReasoningStep('thinking', '🎭 Round 2: Refined analysis...')
      ])

      await new Promise(resolve => setTimeout(resolve, 150))

      // Show synthesis progress
      setProgressSteps(prev => [
        ...prev,
        createReasoningStep('decision', '⚖️ Synthesizing final decision...')
      ])

      await new Promise(resolve => setTimeout(resolve, 150))

      // Show completion
      setProgressSteps(prev => [
        ...prev,
        createReasoningStep('decision', `✅ Debate complete!`),
        createReasoningStep('analysis', '📊 Processing results...')
      ])

      setDebate(data.debate)

      // Create trade recommendation from final decision
      if (data.debate?.finalDecision) {
        const fd = data.debate.finalDecision
        const recommendation: TradeRecommendation = {
          symbol: fd.symbol || 'N/A',
          action: fd.action,
          suggestedQuantity: fd.quantity || 1,
          currentPrice: 0, // Will be fetched from portfolio
          rationale: typeof fd.reasoning === 'string'
            ? fd.reasoning
            : fd.consensus || 'Based on debate analysis',
          confidence: fd.confidence,
          source: 'debate'
        }
        setTradeRecommendation(recommendation)
        setShowTradeCard(true)
      }

      // Save conversation for history and persistence
      try {
        const saveResponse = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: 'Debate Trading Analysis',
            responses: {
              debate: data.debate
            },
            mode: 'trading-debate',
            metadata: {
              timeframe,
              targetSymbol: targetSymbol.trim() || null,
              analystModel,
              criticModel,
              synthesizerModel
            }
          })
        })

        if (saveResponse.ok) {
          const savedConversation = await saveResponse.json()
          saveConversation(savedConversation.id)
          console.log('Debate Mode analysis saved:', savedConversation.id)
        }
      } catch (saveError) {
        console.error('Failed to save analysis:', saveError)
        // Don't block user experience if save fails
      }

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
      {/* Trading History */}
      <div className="flex justify-end">
        <TradingHistoryDropdown
          mode="trading-debate"
          onSelect={(conversation) => {
            // Trigger restoration
            window.location.href = `${window.location.pathname}?c=${conversation.id}`
          }}
        />
      </div>

      {/* Model Selection for Debate Roles */}
      <div className="bg-card rounded-lg border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Select AI Models for Each Role</h3>

          {/* Global Preset Indicator */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Using:</span>
            {(() => {
              const preset = getDebatePresetConfig(globalTier)
              const Icon = preset.icon
              return (
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border-2 ${preset.color}`}>
                  <Icon className="w-4 h-4" />
                  <span className="font-semibold">{preset.label}</span>
                </div>
              )
            })()}
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

      {/* Real-time Progress */}
      {loading && progressSteps.length > 0 && (
        <ReasoningStream
          steps={progressSteps}
          isStreaming={true}
          title="Debate Progress"
          modelName="Trading System"
        />
      )}

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
          {/* Results Header with Reset Button */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-2xl font-bold">Debate Results</h3>
              <p className="text-sm text-muted-foreground">
                3 AI agents debating across 2 rounds
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleStartNew}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Start New Analysis
            </Button>
          </div>

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

          {/* Trade Action Card */}
          {tradeRecommendation && showTradeCard && (
            <div className="bg-card rounded-lg border p-6">
              <div className="flex items-center gap-2 mb-4">
                <ShoppingCart className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">Take Action</h3>
              </div>
              <TradeCard
                recommendation={tradeRecommendation}
                brokerEnvironment={brokerEnv}
                onExecute={handleExecuteTrade}
                onDismiss={() => setShowTradeCard(false)}
              />
            </div>
          )}
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

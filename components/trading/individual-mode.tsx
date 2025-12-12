'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, RotateCcw, ShoppingCart } from 'lucide-react'
import { ReasoningStream, createReasoningStep, type ReasoningStep } from './reasoning-stream'
import { getModelDisplayName, TRADING_MODELS } from '@/lib/trading/models-config'
import { TradingModelSelector } from './trading-model-selector'
import { TimeframeSelector, type TradingTimeframe } from './timeframe-selector'
import { TradingHistoryDropdown } from './trading-history-dropdown'
import { useConversationPersistence } from '@/hooks/use-conversation-persistence'
import { ModelConfig } from '@/types/consensus'
import { useTradingPreset } from '@/contexts/trading-preset-context'
import { getModelsForPreset } from '@/lib/config/model-presets'
import { TradeCard, type TradeRecommendation } from './trade-card'
import { InputModeSelector, type InputMode } from './input-mode-selector'
import { ResearchActivityPanel } from './research-activity-panel'
import { ResearchReport } from '@/lib/agents/research-agents'

interface ReasoningDetails {
  bullishCase?: string
  bearishCase?: string
  technicalAnalysis?: string
  fundamentalAnalysis?: string
  sentiment?: string
  timing?: string
}

interface TradingDecision {
  model: string
  action: 'BUY' | 'SELL' | 'HOLD'
  symbol?: string
  quantity?: number
  reasoning: string | ReasoningDetails
  confidence: number
  // Tool usage tracking (Hybrid Research Mode)
  toolsUsed?: boolean
  toolCallCount?: number
  toolNames?: string[]
}

interface AnalysisContext {
  accountBalance: string
  buyingPower: string
  cash: string
  analysisDate: string
  promptSummary: string
}

export function IndividualMode() {
  const { globalTier } = useTradingPreset()
  const [selectedModels, setSelectedModels] = useState<ModelConfig[]>(() => getModelsForPreset('pro'))
  const [timeframe, setTimeframe] = useState<TradingTimeframe>('swing')
  const [targetSymbol, setTargetSymbol] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [decisions, setDecisions] = useState<TradingDecision[]>([])
  const [context, setContext] = useState<AnalysisContext | null>(null)
  const [showContext, setShowContext] = useState(false)
  const [contextSteps, setContextSteps] = useState<ReasoningStep[]>([])
  const [progressSteps, setProgressSteps] = useState<ReasoningStep[]>([])
  const [brokerEnv, setBrokerEnv] = useState<'live' | 'paper'>('paper')
  const [showTradeCard, setShowTradeCard] = useState(true)
  const [inputMode, setInputMode] = useState<InputMode>('research')
  const [researchData, setResearchData] = useState<ResearchReport | null>(null)
  const [researchLoading, setResearchLoading] = useState(false)

  // Persistence for saving/restoring trading analyses
  const { saveConversation, isRestoring } = useConversationPersistence({
    storageKey: 'trading-individual-mode',
    onRestored: (conversation) => {
      console.log('Restoring Individual Mode analysis:', conversation)
      const responses = conversation.responses as any
      const evalData = conversation.evaluation_data as any

      // Restore state
      if (responses.decisions) {
        setDecisions(responses.decisions)
      }
      if (responses.context) {
        setContext(responses.context)
      }
      if (evalData?.metadata) {
        const meta = evalData.metadata
        if (meta.timeframe) setTimeframe(meta.timeframe)
        if (meta.targetSymbol) setTargetSymbol(meta.targetSymbol)
        if (meta.selectedModels) {
          // Restore selected models by matching against current preset models
          const presetModels = getModelsForPreset(globalTier)
          const restoredModels = presetModels.map(m => ({
            ...m,
            enabled: meta.selectedModels.includes(m.model)
          }))
          setSelectedModels(restoredModels)
        }
      }
    }
  })

  // Auto-apply global preset when it changes
  useEffect(() => {
    const presetModels = getModelsForPreset(globalTier)
    setSelectedModels(presetModels)
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

  // Get best recommendation from decisions (highest confidence non-HOLD)
  const getBestRecommendation = (): TradeRecommendation | null => {
    const actionableDecisions = decisions.filter(d => d.action !== 'HOLD' && d.symbol)
    if (actionableDecisions.length === 0) return null

    // Sort by confidence descending
    const best = actionableDecisions.sort((a, b) => b.confidence - a.confidence)[0]

    return {
      symbol: best.symbol!,
      action: best.action,
      suggestedQuantity: best.quantity || 1,
      currentPrice: 0,
      rationale: typeof best.reasoning === 'string'
        ? best.reasoning
        : best.reasoning.bullishCase || best.reasoning.bearishCase || 'Based on individual analysis',
      confidence: best.confidence,
      source: `individual (${getModelDisplayName(best.model)})`
    }
  }

  // Reset/clear results and start new analysis
  const handleStartNew = () => {
    setDecisions([])
    setContext(null)
    setContextSteps([])
    setShowTradeCard(true)
    setProgressSteps([])
    setResearchData(null)
    setResearchLoading(false)
    // Remove URL parameter
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.delete('c')
      window.history.replaceState({}, '', url.pathname + url.search)
    }
  }

  const getTradingDecisions = async () => {
    setLoading(true)
    setDecisions([])
    setContext(null)
    setContextSteps([])
    setProgressSteps([])
    setResearchData(null)
    setResearchLoading(true)

    // Extract enabled model IDs for API
    const modelIds = selectedModels.filter(m => m.enabled).map(m => m.model)
    const enabledModels = selectedModels.filter(m => m.enabled)

    // Show initial progress
    const initialSteps: ReasoningStep[] = [
      createReasoningStep('thinking', '🔄 Starting analysis...'),
    ]
    setProgressSteps(initialSteps)

    // Small delay to show first step
    await new Promise(resolve => setTimeout(resolve, 150))

    // Add models being queried
    const modelSteps = [
      ...initialSteps,
      createReasoningStep('analysis', `💰 Fetching account data...`),
      createReasoningStep('thinking', `🤖 Querying ${modelIds.length} AI models in parallel:`),
    ]
    enabledModels.forEach(m => {
      modelSteps.push(createReasoningStep('analysis', `   • ${getModelDisplayName(m.model)}`))
    })
    setProgressSteps(modelSteps)

    await new Promise(resolve => setTimeout(resolve, 150))

    setProgressSteps([
      ...modelSteps,
      createReasoningStep('thinking', '⏳ Waiting for model responses...')
    ])

    try {
      const response = await fetch('/api/trading/individual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedModels: modelIds,
          timeframe,
          targetSymbol: targetSymbol.trim() || undefined,
          researchTier: globalTier  // Pass global tier to control research model
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to get trading decisions')
      }

      const data = await response.json()

      // Show completion
      setProgressSteps(prev => [
        ...prev,
        createReasoningStep('decision', `✅ Received ${data.decisions.length} trading recommendations!`),
        createReasoningStep('analysis', '📊 Processing results...')
      ])

      setDecisions(data.decisions)

      // Capture research data for ResearchActivityPanel
      if (data.research) {
        setResearchData(data.research as ResearchReport)
      }
      setResearchLoading(false)

      // Set context and create reasoning steps for transparency
      if (data.context) {
        setContext(data.context)

        const steps: ReasoningStep[] = [
          createReasoningStep('thinking', `Analyzing portfolio with balance of $${parseFloat(data.context.accountBalance).toLocaleString()}`),
          createReasoningStep('analysis', `Available buying power: $${parseFloat(data.context.buyingPower).toLocaleString()}`),
          createReasoningStep('analysis', `Available cash: $${parseFloat(data.context.cash).toLocaleString()}`),
          createReasoningStep('thinking', data.context.promptSummary),
          createReasoningStep('decision', `Querying ${selectedModels.filter(m => m.enabled).length} AI models for trading recommendations...`)
        ]

        setContextSteps(steps)
        setShowContext(true) // Auto-show context on first load
      }

      // Save conversation for history and persistence
      try {
        const saveResponse = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: 'Individual Trading Analysis',
            responses: {
              decisions: data.decisions,
              context: data.context
            },
            mode: 'trading-individual',
            metadata: {
              timeframe,
              targetSymbol: targetSymbol.trim() || null,
              selectedModels: modelIds,
              modelCount: modelIds.length
            }
          })
        })

        if (saveResponse.ok) {
          const savedConversation = await saveResponse.json()
          saveConversation(savedConversation.id)
          console.log('Individual Mode analysis saved:', savedConversation.id)
        }
      } catch (saveError) {
        console.error('Failed to save analysis:', saveError)
        // Don't block user experience if save fails
      }
    } catch (error) {
      console.error('Failed to get trading decisions:', error)
      alert(error instanceof Error ? error.message : 'Failed to get trading decisions')
    } finally {
      setLoading(false)
      setResearchLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Trading History */}
      <div className="flex justify-end">
        <TradingHistoryDropdown
          mode="trading-individual"
          onSelect={(conversation) => {
            // Trigger restoration
            window.location.href = `${window.location.pathname}?c=${conversation.id}`
          }}
        />
      </div>

      {/* Model Selector & Timeframe */}
      <div className="bg-card rounded-lg border p-6 space-y-6">
        <TradingModelSelector
          models={selectedModels}
          onChange={setSelectedModels}
          disabled={loading}
        />

        {/* Input Mode Selector - Research/Portfolio/Position */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            📊 Analysis Target
          </label>
          <InputModeSelector
            onSymbolSelect={(symbol) => {
              if (symbol === '__PORTFOLIO__') {
                // Portfolio mode - auto-trigger analysis
                setTargetSymbol('')
                setTimeout(() => getTradingDecisions(), 100)
              } else {
                setTargetSymbol(symbol)
              }
            }}
            onModeChange={setInputMode}
            disabled={loading}
            initialSymbol={targetSymbol}
            showPortfolioMode={true}
          />
        </div>

        <TimeframeSelector
          value={timeframe}
          onChange={setTimeframe}
          disabled={loading}
        />

        <Button
          onClick={getTradingDecisions}
          disabled={loading || selectedModels.filter(m => m.enabled).length < 2}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Getting Trading Decisions...
            </>
          ) : (
            <>Get Trading Decisions from {selectedModels.filter(m => m.enabled).length} Models</>
          )}
        </Button>
      </div>

      {/* Real-time Progress */}
      {loading && progressSteps.length > 0 && (
        <ReasoningStream
          steps={progressSteps}
          isStreaming={true}
          title="Analysis Progress"
          modelName="Trading System"
        />
      )}

      {/* AI Analysis Context - Transparency */}
      {context && contextSteps.length > 0 && (
        <div>
          <button
            onClick={() => setShowContext(!showContext)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            {showContext ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            {showContext ? 'Hide' : 'Show'} AI Analysis Context
          </button>

          {showContext && (
            <ReasoningStream
              steps={contextSteps}
              isStreaming={false}
              title="AI Analysis Context"
              modelName={`${selectedModels.filter(m => m.enabled).length} Models`}
            />
          )}
        </div>
      )}

      {/* Research Activity Panel - Shows 4 specialized research agents */}
      {(researchData || researchLoading) && (
        <ResearchActivityPanel
          research={researchData}
          isLoading={researchLoading}
        />
      )}

      {/* Results */}
      {decisions.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-2xl font-bold">Trading Decisions</h3>
              <p className="text-sm text-muted-foreground">
                From {decisions.length} AI model{decisions.length !== 1 ? 's' : ''}
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
          {/* Research Activity Summary (Hybrid Research Mode) */}
          {decisions.some(d => d.toolsUsed) && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg border border-blue-200 dark:border-blue-800 p-6 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🔍</span>
                <h3 className="text-lg font-semibold">AI Research Activity</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div className="bg-white/50 dark:bg-black/20 rounded-lg p-3">
                  <div className="text-muted-foreground text-xs mb-1">Models with Tools</div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {decisions.filter(d => d.toolsUsed).length}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    of {decisions.length} total
                  </div>
                </div>
                <div className="bg-white/50 dark:bg-black/20 rounded-lg p-3">
                  <div className="text-muted-foreground text-xs mb-1">Total Tool Calls</div>
                  <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                    {decisions.reduce((sum, d) => sum + (d.toolCallCount || 0), 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    research queries
                  </div>
                </div>
                <div className="col-span-2 md:col-span-1 bg-white/50 dark:bg-black/20 rounded-lg p-3">
                  <div className="text-muted-foreground text-xs mb-1">Tools Used</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Array.from(new Set(decisions.flatMap(d => d.toolNames || []))).slice(0, 3).map((tool, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
                        {tool.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {decisions.map((decision, index) => (
            <div key={index} className="bg-card rounded-lg border p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <h4 className="font-semibold">{decision.model}</h4>
                  {decision.toolsUsed && (
                    <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                      <span>🔍</span>
                      <span className="font-medium">{decision.toolCallCount} research {decision.toolCallCount === 1 ? 'call' : 'calls'}</span>
                    </div>
                  )}
                </div>
                <ActionBadge action={decision.action} />
              </div>

              {decision.action !== 'HOLD' && (
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Symbol:</span>
                    <span className="font-mono font-medium">{decision.symbol}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Quantity:</span>
                    <span className="font-medium">{decision.quantity} shares</span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Reasoning:</div>
                {typeof decision.reasoning === 'string' ? (
                  <div className="text-sm">{decision.reasoning}</div>
                ) : (
                  <div className="text-sm space-y-3">
                    {decision.reasoning.bullishCase && (
                      <div>
                        <div className="font-medium text-green-600 mb-1">📈 Bullish Case:</div>
                        <div className="text-muted-foreground">{decision.reasoning.bullishCase}</div>
                      </div>
                    )}
                    {decision.reasoning.bearishCase && (
                      <div>
                        <div className="font-medium text-red-600 mb-1">📉 Bearish Case:</div>
                        <div className="text-muted-foreground">{decision.reasoning.bearishCase}</div>
                      </div>
                    )}
                    {decision.reasoning.technicalAnalysis && (
                      <div>
                        <div className="font-medium mb-1">📊 Technical Analysis:</div>
                        <div className="text-muted-foreground">{decision.reasoning.technicalAnalysis}</div>
                      </div>
                    )}
                    {decision.reasoning.fundamentalAnalysis && (
                      <div>
                        <div className="font-medium mb-1">📋 Fundamental Analysis:</div>
                        <div className="text-muted-foreground">{decision.reasoning.fundamentalAnalysis}</div>
                      </div>
                    )}
                    {decision.reasoning.sentiment && (
                      <div>
                        <div className="font-medium mb-1">💭 Sentiment:</div>
                        <div className="text-muted-foreground">{decision.reasoning.sentiment}</div>
                      </div>
                    )}
                    {decision.reasoning.timing && (
                      <div>
                        <div className="font-medium mb-1">⏰ Timing:</div>
                        <div className="text-muted-foreground">{decision.reasoning.timing}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Confidence:</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${decision.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">
                      {(decision.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          </div>

          {/* Trade Action Card - Best Recommendation */}
          {(() => {
            const bestRec = getBestRecommendation()
            return bestRec && showTradeCard ? (
              <div className="bg-card rounded-lg border p-6 mt-6">
                <div className="flex items-center gap-2 mb-4">
                  <ShoppingCart className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold">Best Recommendation</h3>
                  <span className="text-sm text-muted-foreground">
                    (Highest confidence actionable trade)
                  </span>
                </div>
                <TradeCard
                  recommendation={bestRec}
                  brokerEnvironment={brokerEnv}
                  onExecute={handleExecuteTrade}
                  onDismiss={() => setShowTradeCard(false)}
                />
              </div>
            ) : null
          })()}
        </>
      )}
    </div>
  )
}

function ActionBadge({ action }: { action: 'BUY' | 'SELL' | 'HOLD' }) {
  const config = {
    BUY: { icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-950' },
    SELL: { icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-950' },
    HOLD: { icon: Minus, color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-950' },
  }

  const { icon: Icon, color, bg } = config[action]

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${bg}`}>
      <Icon className={`w-4 h-4 ${color}`} />
      <span className={`text-sm font-semibold ${color}`}>{action}</span>
    </div>
  )
}

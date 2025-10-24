'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp } from 'lucide-react'
import { ReasoningStream, createReasoningStep, type ReasoningStep } from './reasoning-stream'
import { getModelDisplayName, TRADING_MODELS } from '@/lib/trading/models-config'
import { TradingModelSelector } from './trading-model-selector'
import { TimeframeSelector, type TradingTimeframe } from './timeframe-selector'
import { TradingHistoryDropdown } from './trading-history-dropdown'
import { useConversationPersistence } from '@/hooks/use-conversation-persistence'
import { ModelConfig } from '@/types/consensus'

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
}

interface AnalysisContext {
  accountBalance: string
  buyingPower: string
  cash: string
  analysisDate: string
  promptSummary: string
}

// Default models for Individual Mode (Pro preset - 8 balanced models)
const DEFAULT_INDIVIDUAL_MODELS: ModelConfig[] = [
  { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', enabled: true },
  { provider: 'openai', model: 'gpt-4o', enabled: true },
  { provider: 'openai', model: 'gpt-5-mini', enabled: true },
  { provider: 'google', model: 'gemini-2.5-pro', enabled: true },
  { provider: 'groq', model: 'llama-3.3-70b-versatile', enabled: true },
  { provider: 'xai', model: 'grok-3', enabled: true },
  { provider: 'mistral', model: 'mistral-large-latest', enabled: true },
  { provider: 'perplexity', model: 'sonar-pro', enabled: true },
]

export function IndividualMode() {
  const [selectedModels, setSelectedModels] = useState<ModelConfig[]>(DEFAULT_INDIVIDUAL_MODELS)
  const [timeframe, setTimeframe] = useState<TradingTimeframe>('swing')
  const [targetSymbol, setTargetSymbol] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [decisions, setDecisions] = useState<TradingDecision[]>([])
  const [context, setContext] = useState<AnalysisContext | null>(null)
  const [showContext, setShowContext] = useState(false)
  const [contextSteps, setContextSteps] = useState<ReasoningStep[]>([])
  const [progressSteps, setProgressSteps] = useState<ReasoningStep[]>([])

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
          // Restore selected models
          const restoredModels = DEFAULT_INDIVIDUAL_MODELS.map(m => ({
            ...m,
            enabled: meta.selectedModels.includes(m.model)
          }))
          setSelectedModels(restoredModels)
        }
      }
    }
  })

  const getTradingDecisions = async () => {
    setLoading(true)
    setDecisions([])
    setContext(null)
    setContextSteps([])
    setProgressSteps([])

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
        body: JSON.stringify({ selectedModels: modelIds, timeframe, targetSymbol: targetSymbol.trim() || undefined }),
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
            window.location.href = `${window.location.pathname}?t=${conversation.id}`
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

      {/* Results */}
      {decisions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {decisions.map((decision, index) => (
            <div key={index} className="bg-card rounded-lg border p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold">{decision.model}</h4>
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

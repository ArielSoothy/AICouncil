'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Loader2, TrendingUp, TrendingDown, Minus, Users, CheckCircle, AlertCircle, XCircle, RotateCcw } from 'lucide-react'
import { ReasoningStream, createReasoningStep, type ReasoningStep } from './reasoning-stream'
import { getModelDisplayName, TRADING_MODELS } from '@/lib/trading/models-config'
import { TradingModelSelector } from './trading-model-selector'
import { TimeframeSelector, type TradingTimeframe } from './timeframe-selector'
import { TradingHistoryDropdown } from './trading-history-dropdown'
import { useConversationPersistence } from '@/hooks/use-conversation-persistence'
import { ModelConfig } from '@/types/consensus'
import { useTradingPreset } from '@/contexts/trading-preset-context'
import { getModelsForPreset } from '@/lib/config/model-presets'

interface ReasoningDetails {
  bullishCase?: string
  bearishCase?: string
  technicalAnalysis?: string
  fundamentalAnalysis?: string
  sentiment?: string
  timing?: string
}

interface TradingDecision {
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
}

interface ConsensusResult {
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

export function ConsensusMode() {
  const { globalTier } = useTradingPreset()
  const [selectedModels, setSelectedModels] = useState<ModelConfig[]>(() => getModelsForPreset('pro'))
  const [timeframe, setTimeframe] = useState<TradingTimeframe>('swing')
  const [targetSymbol, setTargetSymbol] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [consensus, setConsensus] = useState<ConsensusResult | null>(null)
  const [decisions, setDecisions] = useState<TradingDecision[]>([])
  const [progressSteps, setProgressSteps] = useState<ReasoningStep[]>([])

  // Persistence for saving/restoring trading analyses
  const { saveConversation, isRestoring } = useConversationPersistence({
    storageKey: 'trading-consensus-mode',
    onRestored: (conversation) => {
      console.log('Restoring Consensus Mode analysis:', conversation)

      // Check if this is a local (guest) ID
      if (conversation.id.startsWith('local-')) {
        // Restore from localStorage for guest users
        const localData = localStorage.getItem(`trading-consensus-${conversation.id}`)
        if (localData) {
          const parsed = JSON.parse(localData)
          if (parsed.consensus) {
            setConsensus(parsed.consensus)
          }
          if (parsed.decisions) {
            setDecisions(parsed.decisions)
          }
          if (parsed.metadata) {
            const meta = parsed.metadata
            if (meta.timeframe) setTimeframe(meta.timeframe)
            if (meta.targetSymbol) setTargetSymbol(meta.targetSymbol)
            if (meta.selectedModels) {
              const presetModels = getModelsForPreset(globalTier)
              const restoredModels = presetModels.map(m => ({
                ...m,
                enabled: meta.selectedModels.includes(m.model)
              }))
              setSelectedModels(restoredModels)
            }
          }
        }
      } else {
        // Restore from database for authenticated users
        const responses = conversation.responses as any
        const evalData = conversation.evaluation_data as any

        if (responses.consensus) {
          setConsensus(responses.consensus)
        }
        if (responses.decisions) {
          setDecisions(responses.decisions)
        }
        if (evalData?.metadata) {
          const meta = evalData.metadata
          if (meta.timeframe) setTimeframe(meta.timeframe)
          if (meta.targetSymbol) setTargetSymbol(meta.targetSymbol)
          if (meta.selectedModels) {
            const presetModels = getModelsForPreset(globalTier)
            const restoredModels = presetModels.map(m => ({
              ...m,
              enabled: meta.selectedModels.includes(m.model)
            }))
            setSelectedModels(restoredModels)
          }
        }
      }
    }
  })

  // Auto-apply global preset when it changes
  useEffect(() => {
    const presetModels = getModelsForPreset(globalTier)
    setSelectedModels(presetModels)
  }, [globalTier])

  // Reset/clear results and start new analysis
  const handleStartNew = () => {
    setConsensus(null)
    setDecisions([])
    setProgressSteps([])
    // Remove URL parameter
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.delete('c')
      window.history.replaceState({}, '', url.pathname + url.search)
    }
  }

  const getConsensusDecision = async () => {
    setLoading(true)
    setConsensus(null)
    setDecisions([])
    setProgressSteps([])

    // Extract enabled model IDs for API
    const modelIds = selectedModels.filter(m => m.enabled).map(m => m.model)
    const enabledModels = selectedModels.filter(m => m.enabled)

    // Show initial progress
    const initialSteps: ReasoningStep[] = [
      createReasoningStep('thinking', '🔄 Starting consensus analysis...'),
    ]
    setProgressSteps(initialSteps)

    await new Promise(resolve => setTimeout(resolve, 150))

    // Add models being queried
    const modelSteps = [
      ...initialSteps,
      createReasoningStep('analysis', `💰 Fetching account data...`),
      createReasoningStep('thinking', `🤖 Querying ${modelIds.length} AI models for consensus:`),
    ]
    enabledModels.forEach(m => {
      modelSteps.push(createReasoningStep('analysis', `   • ${getModelDisplayName(m.model)}`))
    })
    setProgressSteps(modelSteps)

    await new Promise(resolve => setTimeout(resolve, 150))

    setProgressSteps([
      ...modelSteps,
      createReasoningStep('thinking', '⏳ Building consensus from all models...')
    ])

    try {
      const response = await fetch('/api/trading/consensus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedModels: modelIds, timeframe, targetSymbol: targetSymbol.trim() || undefined }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to get consensus decision')
      }

      const data = await response.json()

      // Show completion
      setProgressSteps(prev => [
        ...prev,
        createReasoningStep('decision', `✅ Consensus reached!`),
        createReasoningStep('analysis', '📊 Processing final decision...')
      ])

      setConsensus(data.consensus)
      setDecisions(data.decisions || [])

      // Save conversation for history and persistence
      try {
        const saveResponse = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: 'Consensus Trading Analysis',
            responses: {
              consensus: data.consensus,
              decisions: data.decisions
            },
            mode: 'trading-consensus',
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
          console.log('Consensus Mode analysis saved:', savedConversation.id)
        } else {
          // Guest mode: save failed but still persist locally with client ID
          const clientId = `local-${Date.now()}`
          console.log('Guest mode: persisting locally with ID:', clientId)

          // Store data in localStorage for guest users
          if (typeof window !== 'undefined') {
            localStorage.setItem(`trading-consensus-${clientId}`, JSON.stringify({
              consensus: data.consensus,
              decisions: data.decisions,
              metadata: {
                timeframe,
                targetSymbol: targetSymbol.trim() || null,
                selectedModels: modelIds,
                modelCount: modelIds.length
              },
              timestamp: new Date().toISOString()
            }))
          }

          saveConversation(clientId)
        }
      } catch (saveError) {
        console.error('Failed to save analysis:', saveError)
        // Even on error, persist locally for guest users
        const clientId = `local-${Date.now()}`
        if (typeof window !== 'undefined') {
          localStorage.setItem(`trading-consensus-${clientId}`, JSON.stringify({
            consensus: data.consensus,
            decisions: data.decisions,
            metadata: {
              timeframe,
              targetSymbol: targetSymbol.trim() || null,
              selectedModels: modelIds,
              modelCount: modelIds.length
            },
            timestamp: new Date().toISOString()
          }))
        }
        saveConversation(clientId)
      }
    } catch (error) {
      console.error('Failed to get consensus decision:', error)
      alert(error instanceof Error ? error.message : 'Failed to get consensus decision')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Trading History */}
      <div className="flex justify-end">
        <TradingHistoryDropdown
          mode="trading-consensus"
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
          onClick={getConsensusDecision}
          disabled={loading || selectedModels.filter(m => m.enabled).length < 2}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Getting Consensus from {selectedModels.filter(m => m.enabled).length} Models...
            </>
          ) : (
            <>
              <Users className="w-4 h-4 mr-2" />
              Get Consensus Decision from {selectedModels.filter(m => m.enabled).length} Models
            </>
          )}
        </Button>
      </div>

      {/* Real-time Progress */}
      {loading && progressSteps.length > 0 && (
        <ReasoningStream
          steps={progressSteps}
          isStreaming={true}
          title="Consensus Progress"
          modelName="Trading System"
        />
      )}

      {/* Consensus Results */}
      {consensus && (
        <div className="bg-card rounded-lg border p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold">Consensus Decision</h3>
              <p className="text-sm text-muted-foreground">
                Based on {consensus.modelCount} AI model{consensus.modelCount !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleStartNew}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Start New Analysis
              </Button>
              <ActionBadge action={consensus.action} />
            </div>
          </div>

          {/* Agreement Level */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AgreementIcon agreement={consensus.agreement} />
                <span className="font-medium">{consensus.agreementText}</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {Math.round(consensus.agreement * 100)}% agreement
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Agreement Level</span>
                <span>{Math.round(consensus.agreement * 100)}%</span>
              </div>
              <Progress value={consensus.agreement * 100} className="h-2" />
            </div>
          </div>

          {/* Overall Confidence */}
          <div className="space-y-2 mb-6">
            <div className="flex justify-between text-sm">
              <span>Overall Confidence</span>
              <span>{Math.round(consensus.confidence)}%</span>
            </div>
            <Progress value={consensus.confidence} className="h-2" />
          </div>

          {/* Consensus Summary */}
          {consensus.summary && (
            <div className="mb-6">
              <h4 className="font-medium mb-2">Consensus Summary</h4>
              <p className="text-sm text-muted-foreground">{consensus.summary}</p>
            </div>
          )}

          {/* Key Disagreements */}
          {consensus.disagreements && consensus.disagreements.length > 0 && (
            <div className="mb-6">
              <h4 className="font-medium mb-2">Key Disagreements</h4>
              <ul className="space-y-1">
                {consensus.disagreements.map((disagreement, index) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-destructive">•</span>
                    {disagreement}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Vote Breakdown */}
          <div className="mb-6 p-4 bg-muted/50 rounded-lg">
            <h4 className="text-sm font-semibold mb-3">Vote Breakdown:</h4>
            <div className="grid grid-cols-3 gap-3">
              <VoteCard label="BUY" count={consensus.votes.BUY} total={consensus.modelCount} />
              <VoteCard label="SELL" count={consensus.votes.SELL} total={consensus.modelCount} />
              <VoteCard label="HOLD" count={consensus.votes.HOLD} total={consensus.modelCount} />
            </div>
          </div>

          {/* Trade Details */}
          {consensus.action !== 'HOLD' && (
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Symbol:</span>
                <span className="font-mono font-medium text-lg">{consensus.symbol}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Quantity:</span>
                <span className="font-medium text-lg">{consensus.quantity} shares</span>
              </div>
            </div>
          )}

          {/* Reasoning */}
          <div className="space-y-2 mb-6">
            <div className="text-sm text-muted-foreground">Consensus Reasoning:</div>
            {typeof consensus.reasoning === 'string' ? (
              <div className="text-sm leading-relaxed">{consensus.reasoning}</div>
            ) : (
              <div className="text-sm space-y-3">
                {consensus.reasoning.bullishCase && (
                  <div>
                    <div className="font-medium text-green-600 mb-1">📈 Bullish Case:</div>
                    <div className="text-muted-foreground">{consensus.reasoning.bullishCase}</div>
                  </div>
                )}
                {consensus.reasoning.bearishCase && (
                  <div>
                    <div className="font-medium text-red-600 mb-1">📉 Bearish Case:</div>
                    <div className="text-muted-foreground">{consensus.reasoning.bearishCase}</div>
                  </div>
                )}
                {consensus.reasoning.technicalAnalysis && (
                  <div>
                    <div className="font-medium mb-1">📊 Technical Analysis:</div>
                    <div className="text-muted-foreground">{consensus.reasoning.technicalAnalysis}</div>
                  </div>
                )}
                {consensus.reasoning.fundamentalAnalysis && (
                  <div>
                    <div className="font-medium mb-1">📋 Fundamental Analysis:</div>
                    <div className="text-muted-foreground">{consensus.reasoning.fundamentalAnalysis}</div>
                  </div>
                )}
                {consensus.reasoning.sentiment && (
                  <div>
                    <div className="font-medium mb-1">💭 Sentiment:</div>
                    <div className="text-muted-foreground">{consensus.reasoning.sentiment}</div>
                  </div>
                )}
                {consensus.reasoning.timing && (
                  <div>
                    <div className="font-medium mb-1">⏰ Timing:</div>
                    <div className="text-muted-foreground">{consensus.reasoning.timing}</div>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      )}

      {/* Research Activity Summary (Hybrid Research Mode) */}
      {decisions.length > 0 && decisions.some(d => d.toolsUsed) && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg border border-blue-200 dark:border-blue-800 p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">🔍</span>
            <h3 className="text-lg font-semibold">AI Research Activity</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
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
            <div className="col-span-2 bg-white/50 dark:bg-black/20 rounded-lg p-3">
              <div className="text-muted-foreground text-xs mb-1">Tools Used</div>
              <div className="flex flex-wrap gap-1 mt-1">
                {Array.from(new Set(decisions.flatMap(d => d.toolNames || []))).map((tool, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
                    {tool.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Individual Model Decisions */}
      {decisions.length > 0 && (
        <div className="bg-card rounded-lg border p-6">
          <h3 className="text-xl font-semibold mb-4">Individual Model Decisions</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {decisions.map((decision, index) => (
              <TradingDecisionCard key={index} decision={decision} />
            ))}
          </div>
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

  // Defensive: Default to HOLD if action is invalid
  const safeAction = (action && config[action]) ? action : 'HOLD'
  const { icon: Icon, color, bg } = config[safeAction]

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${bg}`}>
      <Icon className={`w-4 h-4 ${color}`} />
      <span className={`text-sm font-semibold ${color}`}>{safeAction}</span>
    </div>
  )
}

function VoteCard({ label, count, total }: { label: string; count: number; total: number }) {
  const percentage = total > 0 ? (count / total) * 100 : 0

  const colorClass = {
    BUY: 'text-green-600 bg-green-100 dark:bg-green-950',
    SELL: 'text-red-600 bg-red-100 dark:bg-red-950',
    HOLD: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-950',
  }[label] || 'text-gray-600 bg-gray-100 dark:bg-gray-950'

  return (
    <div className={`p-3 rounded-lg ${colorClass}`}>
      <div className="text-xs font-semibold mb-1">{label}</div>
      <div className="text-2xl font-bold">{count}</div>
      <div className="text-xs mt-1">{percentage.toFixed(0)}%</div>
    </div>
  )
}

function AgreementIcon({ agreement }: { agreement: number }) {
  if (agreement >= 0.75) {
    return <CheckCircle className="w-5 h-5 text-green-600" />
  } else if (agreement >= 0.5) {
    return <AlertCircle className="w-5 h-5 text-yellow-600" />
  } else {
    return <XCircle className="w-5 h-5 text-red-600" />
  }
}

function TradingDecisionCard({ decision }: { decision: TradingDecision }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const modelName = decision.model ? getModelDisplayName(decision.model) : 'Unknown Model'

  const getReasoningPreview = (reasoning: string | ReasoningDetails): string => {
    if (typeof reasoning === 'string') {
      return reasoning.length > 150 ? reasoning.substring(0, 150) + '...' : reasoning
    }
    // For structured reasoning, show bullish case preview
    if (typeof reasoning === 'object' && reasoning.bullishCase) {
      return reasoning.bullishCase.substring(0, 150) + '...'
    }
    return 'No reasoning provided'
  }

  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-card">
      {/* Model Name & Action Badge */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">{modelName}</h4>
          {decision.toolsUsed && (
            <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
              <span>🔍</span>
              <span className="font-medium">{decision.toolCallCount} research {decision.toolCallCount === 1 ? 'call' : 'calls'}</span>
            </div>
          )}
        </div>
        <ActionBadge action={decision.action} />
      </div>

      {/* Trade Details */}
      {decision.action !== 'HOLD' && decision.symbol && (
        <div className="space-y-2 mb-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Symbol:</span>
            <span className="font-mono font-medium">{decision.symbol}</span>
          </div>
          {decision.quantity && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Quantity:</span>
              <span className="font-medium">{decision.quantity} shares</span>
            </div>
          )}
        </div>
      )}

      {/* Confidence */}
      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-muted-foreground">Confidence:</span>
          <span className="font-medium">{Math.round(decision.confidence * 100)}%</span>
        </div>
        <Progress value={decision.confidence * 100} className="h-1.5" />
      </div>

      {/* Reasoning Preview */}
      <div className="text-sm">
        <div className="text-muted-foreground mb-1">Reasoning:</div>
        <div className="text-xs leading-relaxed">
          {isExpanded ? (
            typeof decision.reasoning === 'string' ? (
              <div className="whitespace-pre-wrap">{decision.reasoning}</div>
            ) : (
              <div className="space-y-2">
                {decision.reasoning.bullishCase && (
                  <div>
                    <div className="font-medium text-green-600">📈 Bullish:</div>
                    <div className="text-muted-foreground">{decision.reasoning.bullishCase}</div>
                  </div>
                )}
                {decision.reasoning.bearishCase && (
                  <div>
                    <div className="font-medium text-red-600">📉 Bearish:</div>
                    <div className="text-muted-foreground">{decision.reasoning.bearishCase}</div>
                  </div>
                )}
                {decision.reasoning.technicalAnalysis && (
                  <div>
                    <div className="font-medium">📊 Technical:</div>
                    <div className="text-muted-foreground">{decision.reasoning.technicalAnalysis}</div>
                  </div>
                )}
              </div>
            )
          ) : (
            <div className="text-muted-foreground">
              {getReasoningPreview(decision.reasoning)}
            </div>
          )}
        </div>

        {/* Show More/Less Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
        >
          {isExpanded ? (
            <>
              <Minus className="h-3 w-3" />
              Show Less
            </>
          ) : (
            <>
              <TrendingUp className="h-3 w-3" />
              Show More
            </>
          )}
        </button>
      </div>
    </div>
  )
}

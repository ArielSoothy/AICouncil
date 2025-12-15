'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/ui/header'
import { Button } from '@/components/ui/button'
import {
  Trophy,
  Play,
  Settings,
  TrendingUp,
  TrendingDown,
  Award,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Clock,
  Target,
  Shield,
  Zap,
} from 'lucide-react'
import { UltraModelBadgeSelector } from '@/components/consensus/ultra-model-badge-selector'
import { PortfolioDisplay } from '@/components/trading/portfolio-display'
import { TimeframeSelector, TradingTimeframe } from '@/components/trading/timeframe-selector'
import { useGlobalModelTier } from '@/contexts/trading-preset-context'
import { getModelsForPreset } from '@/lib/config/model-presets'
import type { ModelConfig } from '@/types/consensus'

interface ModelPerformance {
  rank: number
  model_id: string
  model_name: string
  provider: string
  total_pnl: string
  win_rate: string
  total_trades: number
  winning_trades: number
  losing_trades: number
  avg_win: string
  avg_loss: string
  sharpe_ratio: string
  last_trade_at: string
}

interface ArenaConfig {
  is_enabled: boolean
  schedule_frequency: string
  enabled_models: string[]
  max_position_size: string
  max_daily_loss: string
  last_run_at: string
  default_timeframe: string
}

interface ArenaModelResult {
  modelId: string
  modelName: string
  status: 'success' | 'error' | 'pending'
  selectedSymbol: string | null
  selectionReasoning: string
  decision: {
    action: string
    symbol: string
    quantity: number
    reasoning: string
    confidence: number
    stopLoss: number
    takeProfit: number
    entryPrice?: number
    riskRewardRatio?: string
  } | null
  error?: string
  duration: number
}

interface StockConflict {
  symbol: string
  models: string[]
  modelNames: string[]
}

interface ResearchResult {
  success: boolean
  phase: string
  runId: string
  results: ArenaModelResult[]
  conflicts: StockConflict[]
  hasConflicts: boolean
  uniqueStocks: string[]
  summary: {
    totalModels: number
    successfulModels: number
    failedModels: number
    duration: number
  }
  rotationOrder: string[]
  lockedStocks: string[]
}

interface TodaysActivity {
  modelsTradedToday: string[]
  stocksTradedToday: string[]
  tradeDetails: Array<{
    modelId: string
    modelName: string
    symbol: string
    action: string
    createdAt: string
  }>
  summary: string
}

export default function ArenaModePage() {
  // Global tier from header selector
  const { globalTier } = useGlobalModelTier()

  const [leaderboard, setLeaderboard] = useState<ModelPerformance[]>([])
  const [config, setConfig] = useState<ArenaConfig | null>(null)
  const [loading, setLoading] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [loadingData, setLoadingData] = useState(true)

  // Models state for the selector (same format as other modes)
  const [models, setModels] = useState<ModelConfig[]>([])

  // Research phase state
  const [researchResults, setResearchResults] = useState<ResearchResult | null>(null)
  const [selectedTrades, setSelectedTrades] = useState<Set<string>>(new Set())
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set())
  const [executingTrades, setExecutingTrades] = useState(false)
  const [rerunningModels, setRerunningModels] = useState<Set<string>>(new Set())

  // Today's activity tracking
  const [todaysActivity, setTodaysActivity] = useState<TodaysActivity | null>(null)

  // Trading timeframe (Day Trading is default - most common use case)
  const [timeframe, setTimeframe] = useState<TradingTimeframe>('day')

  // Helper to check if using subscription tier
  const isSubscriptionTier = globalTier === 'sub-pro' || globalTier === 'sub-max'

  useEffect(() => {
    fetchLeaderboard()
    fetchConfig()
    fetchTodaysActivity()
  }, [])

  const fetchTodaysActivity = async () => {
    try {
      const response = await fetch('/api/arena/today')
      const data = await response.json()
      if (data.success) {
        setTodaysActivity(data)
      }
    } catch (error) {
      console.error('Error fetching today\'s activity:', error)
    }
  }

  // REPLACE models when tier changes (same as other modes)
  useEffect(() => {
    const presetModels = getModelsForPreset(globalTier)
    console.log(`🔄 Tier changed to ${globalTier}, setting preset models`)
    setModels(presetModels)
  }, [globalTier])

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch('/api/arena/leaderboard')
      const data = await response.json()
      setLeaderboard(data.leaderboard || [])
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
    } finally {
      setLoadingData(false)
    }
  }

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/arena/config')
      const data = await response.json()
      setConfig(data.config)
    } catch (error) {
      console.error('Error fetching config:', error)
    }
  }

  // Handle model changes from selector (same pattern as other modes)
  const handleModelsChange = (newModels: ModelConfig[]) => {
    setModels(newModels)

    // Also sync to config/API (convert to string[] for backend)
    const enabledModelIds = newModels.filter(m => m.enabled).map(m => m.model)
    if (config) {
      setConfig({ ...config, enabled_models: enabledModelIds })

      // Persist to API
      fetch('/api/arena/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled_models: enabledModelIds })
      }).catch(error => {
        console.error('Error updating config:', error)
        fetchConfig()
      })
    }
  }

  const toggleArenaEnabled = async () => {
    if (!config) return

    const newEnabled = !config.is_enabled
    setConfig({ ...config, is_enabled: newEnabled })

    try {
      await fetch('/api/arena/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_enabled: newEnabled })
      })
    } catch (error) {
      console.error('Error toggling arena:', error)
      await fetchConfig()
    }
  }

  // Phase 1: Run research phase (all models analyze in parallel)
  const executeResearchPhase = async () => {
    setExecuting(true)
    setResearchResults(null)
    setSelectedTrades(new Set())

    try {
      // Send selected models from frontend (not from DB config)
      const selectedModels = models.filter(m => m.enabled).map(m => m.model)
      const response = await fetch('/api/arena/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase: 'research', tier: globalTier, selectedModels, timeframe })
      })

      if (!response.ok) {
        const error = await response.json()
        alert(`Error: ${error.error}`)
        return
      }

      const data: ResearchResult = await response.json()
      setResearchResults(data)

      // Auto-select all successful trades that don't have conflicts
      const conflictSymbols = new Set(data.conflicts.map(c => c.symbol))
      const autoSelected = new Set<string>()
      for (const result of data.results) {
        if (result.status === 'success' && result.selectedSymbol && !conflictSymbols.has(result.selectedSymbol)) {
          autoSelected.add(result.modelId)
        }
      }
      setSelectedTrades(autoSelected)

    } catch (error) {
      console.error('Error executing research phase:', error)
      alert('Failed to execute research phase')
    } finally {
      setExecuting(false)
    }
  }

  // Phase 2: Execute approved trades
  const executeApprovedTrades = async () => {
    if (!researchResults || selectedTrades.size === 0) return

    setExecutingTrades(true)

    try {
      const approvedTrades = researchResults.results
        .filter(r => selectedTrades.has(r.modelId) && r.decision)
        .map(r => ({
          modelId: r.modelId,
          symbol: r.decision!.symbol,
          quantity: r.decision!.quantity,
          stopLoss: r.decision!.stopLoss,
          takeProfit: r.decision!.takeProfit,
          reasoning: r.decision!.reasoning,
          confidence: r.decision!.confidence,
        }))

      const response = await fetch('/api/arena/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phase: 'execute',
          approvedTrades,
          tier: globalTier
        })
      })

      if (!response.ok) {
        const error = await response.json()
        alert(`Error: ${error.error}`)
        return
      }

      const data = await response.json()
      alert(`Executed ${data.summary.executed}/${data.summary.requested} trades successfully!`)

      // Clear research results and refresh
      setResearchResults(null)
      setSelectedTrades(new Set())
      await fetchLeaderboard()
      await fetchConfig()
      await fetchTodaysActivity()

    } catch (error) {
      console.error('Error executing trades:', error)
      alert('Failed to execute trades')
    } finally {
      setExecutingTrades(false)
    }
  }

  // Re-run specific models with exclusions
  const rerunModelsWithExclusions = async (modelIds: string[], exclusions: string[]) => {
    setRerunningModels(new Set(modelIds))

    try {
      const response = await fetch('/api/arena/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phase: 'rerun',
          rerunModels: modelIds,
          additionalExclusions: exclusions,
          tier: globalTier
        })
      })

      if (!response.ok) {
        const error = await response.json()
        alert(`Error: ${error.error}`)
        return
      }

      const data = await response.json()

      // Update research results with new model results
      if (researchResults) {
        const updatedResults = researchResults.results.map(r => {
          const updated = data.results.find((nr: ArenaModelResult) => nr.modelId === r.modelId)
          return updated || r
        })

        // Recalculate conflicts
        const stockPicks: Record<string, { modelIds: string[]; modelNames: string[] }> = {}
        for (const result of updatedResults) {
          if (result.status === 'success' && result.selectedSymbol) {
            if (!stockPicks[result.selectedSymbol]) {
              stockPicks[result.selectedSymbol] = { modelIds: [], modelNames: [] }
            }
            stockPicks[result.selectedSymbol].modelIds.push(result.modelId)
            stockPicks[result.selectedSymbol].modelNames.push(result.modelName)
          }
        }

        const newConflicts: StockConflict[] = []
        for (const [symbol, picks] of Object.entries(stockPicks)) {
          if (picks.modelIds.length > 1) {
            newConflicts.push({
              symbol,
              models: picks.modelIds,
              modelNames: picks.modelNames,
            })
          }
        }

        setResearchResults({
          ...researchResults,
          results: updatedResults,
          conflicts: newConflicts,
          hasConflicts: newConflicts.length > 0,
          uniqueStocks: Object.keys(stockPicks),
        })
      }

    } catch (error) {
      console.error('Error re-running models:', error)
      alert('Failed to re-run models')
    } finally {
      setRerunningModels(new Set())
    }
  }

  const toggleTradeSelection = (modelId: string) => {
    const newSelected = new Set(selectedTrades)
    if (newSelected.has(modelId)) {
      newSelected.delete(modelId)
    } else {
      newSelected.add(modelId)
    }
    setSelectedTrades(newSelected)
  }

  const toggleExpanded = (modelId: string) => {
    const newExpanded = new Set(expandedResults)
    if (newExpanded.has(modelId)) {
      newExpanded.delete(modelId)
    } else {
      newExpanded.add(modelId)
    }
    setExpandedResults(newExpanded)
  }

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />
    if (rank === 2) return <Award className="w-5 h-5 text-gray-400" />
    if (rank === 3) return <Award className="w-5 h-5 text-amber-600" />
    return <span className="text-muted-foreground">#{rank}</span>
  }

  const getProviderColor = (provider: string) => {
    const colors: Record<string, string> = {
      anthropic: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200',
      openai: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200',
      google: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
      groq: 'bg-slate-100 text-slate-800 dark:bg-slate-950 dark:text-slate-200',
      mistral: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200',
      xai: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200',
    }
    return colors[provider] || 'bg-gray-100 text-gray-800 dark:bg-gray-950 dark:text-gray-200'
  }

  return (
    <div>
      <Header />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-10 h-10 text-primary" />
            <h1 className="text-4xl font-bold">Arena Mode</h1>
          </div>
          <p className="text-xl text-muted-foreground">
            Autonomous AI Trading Competition - Real-time Leaderboard
          </p>
        </div>

        {/* Portfolio Display - Alpaca Account Overview (Arena always uses Alpaca) */}
        <div className="mb-8">
          <PortfolioDisplay broker="alpaca" />
        </div>

        {/* Today's Activity Panel */}
        {todaysActivity && todaysActivity.tradeDetails.length > 0 && (
          <div className="mb-8 bg-card rounded-lg border p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">Today's Activity</h2>
              <span className="text-sm text-muted-foreground ml-auto">
                {todaysActivity.summary}
              </span>
            </div>
            <div className="space-y-2">
              {todaysActivity.tradeDetails.map((trade, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                >
                  <span className="font-mono font-bold text-primary">{trade.symbol}</span>
                  <span className="text-sm text-muted-foreground">→</span>
                  <span className="text-sm font-medium">{trade.modelName}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    trade.action === 'BUY'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    {trade.action}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {new Date(trade.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
            {todaysActivity.stocksTradedToday.length > 0 && (
              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-900">
                <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
                  <AlertTriangle className="w-4 h-4" />
                  <span>
                    <strong>Stocks traded today:</strong> {todaysActivity.stocksTradedToday.join(', ')}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Trading Timeframe Selection */}
        <div className="mb-8 bg-card rounded-lg border p-6">
          <TimeframeSelector value={timeframe} onChange={setTimeframe} />
        </div>

        {/* Model Selection */}
        <div className="mb-8 bg-card rounded-lg border p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-1">Select Competing Models</h2>
            <p className="text-sm text-muted-foreground">
              Choose which AI models will compete in Arena Mode. Click badges to swap models or add new ones.
            </p>
          </div>
          <UltraModelBadgeSelector
            models={models}
            onChange={handleModelsChange}
            showPower={true}
            showCost={true}
            isSubscriptionMode={isSubscriptionTier}
          />
        </div>

        {/* Arena Stats & Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Total Models */}
          <div className="bg-card rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Competing Models</p>
                <p className="text-3xl font-bold">{models.filter(m => m.enabled).length}</p>
              </div>
              <Settings className="w-8 h-8 text-muted-foreground" />
            </div>
          </div>

          {/* Last Run */}
          <div className="bg-card rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Last Run</p>
                <p className="text-lg font-medium">
                  {config?.last_run_at
                    ? new Date(config.last_run_at).toLocaleString()
                    : 'Never'}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-muted-foreground" />
            </div>
          </div>

          {/* Status */}
          <div className="bg-card rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <button
                  onClick={toggleArenaEnabled}
                  className="text-lg font-medium cursor-pointer hover:opacity-80 transition-opacity"
                  title="Click to toggle"
                >
                  {config?.is_enabled ? (
                    <span className="text-green-600">Active</span>
                  ) : (
                    <span className="text-gray-500">Disabled</span>
                  )}
                </button>
                <p className="text-xs text-muted-foreground mt-1">Click to toggle</p>
              </div>
              <Button
                onClick={executeResearchPhase}
                disabled={executing || !config?.is_enabled}
                size="lg"
                className="gap-2"
              >
                {executing ? (
                  <>Running...</>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Start Research
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Research Results (Phase 1) */}
        {researchResults && (
          <div className="mb-8 bg-card rounded-lg border">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Model Recommendations</h2>
                  <p className="text-sm text-muted-foreground">
                    {researchResults.summary.successfulModels}/{researchResults.summary.totalModels} models analyzed
                    {researchResults.hasConflicts && (
                      <span className="ml-2 text-amber-500">
                        ({researchResults.conflicts.length} conflict{researchResults.conflicts.length !== 1 ? 's' : ''})
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setResearchResults(null)
                      setSelectedTrades(new Set())
                    }}
                  >
                    Clear
                  </Button>
                  <Button
                    onClick={executeApprovedTrades}
                    disabled={executingTrades || selectedTrades.size === 0}
                    className="gap-2"
                  >
                    {executingTrades ? (
                      <>Executing...</>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Execute Selected ({selectedTrades.size})
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Conflicts Warning */}
            {researchResults.hasConflicts && (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-200">Stock Conflicts Detected</p>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      Multiple models selected the same stock. Select one model per stock, or re-run conflicting models with exclusions.
                    </p>
                    <div className="mt-2 space-y-1">
                      {researchResults.conflicts.map(conflict => (
                        <div key={conflict.symbol} className="flex items-center gap-2 text-sm">
                          <span className="font-mono font-medium text-amber-800 dark:text-amber-200">
                            {conflict.symbol}:
                          </span>
                          <span className="text-amber-700 dark:text-amber-300">
                            {conflict.modelNames.join(', ')}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-xs"
                            onClick={() => {
                              // Keep first model, re-run others with this stock excluded
                              const modelsToRerun = conflict.models.slice(1)
                              rerunModelsWithExclusions(modelsToRerun, [conflict.symbol])
                            }}
                          >
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Re-run Others
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Results Grid */}
            <div className="divide-y">
              {researchResults.results.map((result) => {
                const isConflict = researchResults.conflicts.some(c =>
                  c.symbol === result.selectedSymbol && c.models.includes(result.modelId)
                )
                const isSelected = selectedTrades.has(result.modelId)
                const isExpanded = expandedResults.has(result.modelId)
                const isRerunning = rerunningModels.has(result.modelId)

                return (
                  <div
                    key={result.modelId}
                    className={`p-4 ${isConflict ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''}`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Selection Checkbox */}
                      <div className="pt-1">
                        {result.status === 'success' ? (
                          <button
                            onClick={() => toggleTradeSelection(result.modelId)}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                              isSelected
                                ? 'bg-primary border-primary text-primary-foreground'
                                : 'border-muted-foreground hover:border-primary'
                            }`}
                          >
                            {isSelected && <CheckCircle className="w-3 h-3" />}
                          </button>
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}
                      </div>

                      {/* Model Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{result.modelName}</span>
                          {isConflict && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                              Conflict
                            </span>
                          )}
                          {result.status === 'error' && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                              Error
                            </span>
                          )}
                        </div>

                        {result.status === 'success' && result.decision && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Symbol:</span>
                              <span className="ml-2 font-mono font-medium">{result.selectedSymbol}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Action:</span>
                              <span className="ml-2 font-medium text-green-600">{result.decision.action}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Qty:</span>
                              <span className="ml-2">{result.decision.quantity}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Confidence:</span>
                              <span className="ml-2">{(result.decision.confidence * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                        )}

                        {result.status === 'success' && result.decision && (
                          <div className="grid grid-cols-3 gap-4 text-sm mt-2">
                            <div className="flex items-center gap-1">
                              <Target className="w-3 h-3 text-muted-foreground" />
                              <span className="text-muted-foreground">Entry:</span>
                              <span className="ml-1">${result.decision.entryPrice?.toFixed(2) || 'Market'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Shield className="w-3 h-3 text-red-500" />
                              <span className="text-muted-foreground">Stop:</span>
                              <span className="ml-1 text-red-600">${result.decision.stopLoss.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <TrendingUp className="w-3 h-3 text-green-500" />
                              <span className="text-muted-foreground">Target:</span>
                              <span className="ml-1 text-green-600">${result.decision.takeProfit.toFixed(2)}</span>
                            </div>
                          </div>
                        )}

                        {result.status === 'error' && (
                          <p className="text-sm text-red-600">{result.error}</p>
                        )}

                        {/* Expandable Reasoning */}
                        {result.status === 'success' && result.decision && (
                          <div className="mt-2">
                            <button
                              onClick={() => toggleExpanded(result.modelId)}
                              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                              {isExpanded ? 'Hide' : 'Show'} Reasoning
                            </button>
                            {isExpanded && (
                              <p className="mt-2 text-sm text-muted-foreground bg-muted/50 rounded p-3">
                                {result.decision.reasoning}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {(result.duration / 1000).toFixed(1)}s
                        </span>
                        {isConflict && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isRerunning}
                            onClick={() => rerunModelsWithExclusions(
                              [result.modelId],
                              [result.selectedSymbol!]
                            )}
                          >
                            {isRerunning ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <RefreshCw className="w-4 h-4 mr-1" />
                                Re-run
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Leaderboard */}
        <div className="bg-card rounded-lg border">
          <div className="p-6 border-b">
            <h2 className="text-2xl font-bold">Leaderboard</h2>
            <p className="text-sm text-muted-foreground">
              Model performance ranked by total P&L
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Model
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Total P&L
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Win Rate
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Trades
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Avg Win
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Avg Loss
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Sharpe
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loadingData ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                      Loading leaderboard...
                    </td>
                  </tr>
                ) : leaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Trophy className="w-12 h-12 text-muted-foreground/50" />
                        <p className="text-lg font-medium">No trading data yet</p>
                        <p className="text-sm">Run Arena Mode to start the competition!</p>
                        <Button
                          onClick={executeResearchPhase}
                          disabled={executing || !config?.is_enabled}
                          className="mt-4 gap-2"
                        >
                          <Play className="w-4 h-4" />
                          Start First Run
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  leaderboard.map((model) => (
                    <tr key={model.model_id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getRankBadge(model.rank)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="font-medium">{model.model_name}</div>
                          <div>
                            <span className={`text-xs px-2 py-1 rounded-full ${getProviderColor(model.provider)}`}>
                              {model.provider}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className={`flex items-center justify-end gap-1 font-semibold ${
                          parseFloat(model.total_pnl) >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {parseFloat(model.total_pnl) >= 0 ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          )}
                          ${model.total_pnl}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-medium">
                        {model.win_rate}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-muted-foreground">
                        {model.total_trades}
                        <span className="text-xs ml-1">
                          ({model.winning_trades}W / {model.losing_trades}L)
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-green-600">
                        ${model.avg_win}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-red-600">
                        ${model.avg_loss}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-medium">
                        {model.sharpe_ratio}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Arena Info */}
        <div className="mt-8 bg-muted/30 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-2">How Arena Mode Works</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>1. <strong>Research Phase:</strong> All models analyze the market in PARALLEL and recommend trades</li>
            <li>2. <strong>Review Conflicts:</strong> If multiple models pick the same stock, you can re-run them with exclusions</li>
            <li>3. <strong>Execute Trades:</strong> Select which recommendations to execute with bracket orders (stop-loss + take-profit)</li>
            <li>4. <strong>Monitor:</strong> Positions auto-close when stop-loss or take-profit is hit</li>
            <li>5. <strong>Leaderboard:</strong> Track model performance with real P&L, win rate, and Sharpe ratio</li>
          </ul>
          <div className="mt-4 p-3 bg-card rounded border">
            <h4 className="font-medium mb-1">Exclusive Stock Ownership</h4>
            <p className="text-sm text-muted-foreground">
              Each model can only own ONE stock at a time. When a position closes, the stock is unlocked for other models.
              This prevents position merging and ensures fair competition.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

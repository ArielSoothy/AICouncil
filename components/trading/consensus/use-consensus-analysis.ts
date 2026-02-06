'use client'

import { useState, useEffect, useRef } from 'react'
import { createReasoningStep, type ReasoningStep } from '../reasoning-stream'
import { getModelsForPreset } from '@/lib/config/model-presets'
import { extractTradeRecommendation, type TradeRecommendation } from '../trade-card'
import { type InputMode } from '../input-mode-selector'
import { type TradingTimeframe } from '../timeframe-selector'
import { useConversationPersistence } from '@/hooks/use-conversation-persistence'
import { TradingConversationResponses } from '@/lib/types/conversation'
import { ModelConfig } from '@/types/consensus'
import { useTradingPreset } from '@/contexts/trading-preset-context'
import { useCostTrackerOptional } from '@/contexts/cost-tracker-context'
import { getProviderForModel } from '@/lib/trading/models-config'
import { ResearchProgressPanelHandle } from '../research-progress-panel'
import type { ConsensusResultData, TradingDecision, FallbackMessage } from './types'

export interface UseConsensusAnalysisReturn {
  // State
  selectedModels: ModelConfig[]
  setSelectedModels: (models: ModelConfig[]) => void
  timeframe: TradingTimeframe
  setTimeframe: (tf: TradingTimeframe) => void
  targetSymbol: string
  setTargetSymbol: (s: string) => void
  loading: boolean
  consensus: ConsensusResultData | null
  decisions: TradingDecision[]
  progressSteps: ReasoningStep[]
  researchData: any | null
  tradeRecommendation: TradeRecommendation | null
  brokerEnv: 'live' | 'paper'
  showTradeCard: boolean
  setShowTradeCard: (v: boolean) => void
  inputMode: InputMode
  setInputMode: (m: InputMode) => void
  portfolioAnalysis: any | null
  isStreaming: boolean
  fallbackMessages: FallbackMessage[]
  progressPanelRef: React.RefObject<ResearchProgressPanelHandle | null>

  // Actions
  getConsensusDecision: () => Promise<void>
  getPortfolioAnalysis: () => Promise<void>
  handleExecuteTrade: (symbol: string, action: 'buy' | 'sell', quantity: number) => Promise<any>
  handleStartNew: () => void
}

export function useConsensusAnalysis(): UseConsensusAnalysisReturn {
  const { globalTier, researchModel } = useTradingPreset()
  const costTracker = useCostTrackerOptional()
  const [selectedModels, setSelectedModels] = useState<ModelConfig[]>(() => getModelsForPreset('pro'))
  const [timeframe, setTimeframe] = useState<TradingTimeframe>('swing')
  const [targetSymbol, setTargetSymbol] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [consensus, setConsensus] = useState<ConsensusResultData | null>(null)
  const [decisions, setDecisions] = useState<TradingDecision[]>([])
  const [progressSteps, setProgressSteps] = useState<ReasoningStep[]>([])
  const [researchData, setResearchData] = useState<any | null>(null)
  const [tradeRecommendation, setTradeRecommendation] = useState<TradeRecommendation | null>(null)
  const [brokerEnv, setBrokerEnv] = useState<'live' | 'paper'>('paper')
  const [showTradeCard, setShowTradeCard] = useState(true)
  const [inputMode, setInputMode] = useState<InputMode>('research')
  const [portfolioAnalysis, setPortfolioAnalysis] = useState<any | null>(null)

  // Feature #51: Real-time research progress streaming
  const progressPanelRef = useRef<ResearchProgressPanelHandle>(null)
  const [isStreaming, setIsStreaming] = useState(false)

  // Fallback tracking - shows when models fail and alternatives are used
  const [fallbackMessages, setFallbackMessages] = useState<FallbackMessage[]>([])

  // Persistence for saving/restoring trading analyses
  const { saveConversation } = useConversationPersistence({
    storageKey: 'trading-consensus-mode',
    onRestored: (conversation) => {

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
        const responses = conversation.responses as TradingConversationResponses
        const evalData = conversation.evaluation_data

        if (responses.consensus) {
          setConsensus(responses.consensus as unknown as ConsensusResultData)
        }
        if (responses.decisions) {
          setDecisions(responses.decisions as unknown as TradingDecision[])
        }
        if (evalData?.metadata) {
          const meta = evalData.metadata
          if (meta.timeframe) setTimeframe(meta.timeframe as TradingTimeframe)
          if (meta.targetSymbol) setTargetSymbol(meta.targetSymbol as string)
          if (meta.selectedModels && Array.isArray(meta.selectedModels)) {
            const presetModels = getModelsForPreset(globalTier)
            const selectedModelIds = meta.selectedModels as string[]
            const restoredModels = presetModels.map(m => ({
              ...m,
              enabled: selectedModelIds.includes(m.model)
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
    setConsensus(null)
    setDecisions([])
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

  // Portfolio Analysis - uses dedicated API
  const getPortfolioAnalysis = async () => {
    setLoading(true)
    setConsensus(null)
    setDecisions([])
    setPortfolioAnalysis(null)
    setProgressSteps([])

    const enabledModels = selectedModels.filter(m => m.enabled)

    setProgressSteps([
      createReasoningStep('thinking', 'Starting portfolio analysis...'),
      createReasoningStep('analysis', 'Fetching portfolio positions...'),
    ])

    try {
      const response = await fetch('/api/trading/portfolio-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          models: enabledModels,
          timeframe
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to analyze portfolio')
      }

      const data = await response.json()

      setProgressSteps(prev => [
        ...prev,
        createReasoningStep('decision', 'Portfolio analysis complete!'),
      ])

      setPortfolioAnalysis(data)
    } catch (error) {
      console.error('Portfolio analysis failed:', error)
      alert(error instanceof Error ? error.message : 'Failed to analyze portfolio')
    } finally {
      setLoading(false)
    }
  }

  const getConsensusDecision = async () => {
    setLoading(true)
    setIsStreaming(true)
    setConsensus(null)
    setDecisions([])
    setProgressSteps([])
    setResearchData(null)
    setFallbackMessages([])

    // Start cost tracking for this analysis
    costTracker?.startAnalysis('trading-consensus', `${targetSymbol || 'Market'} ${timeframe}`)

    // Extract enabled model IDs for API
    const modelIds = selectedModels.filter(m => m.enabled).map(m => m.model)

    try {
      // Feature #51: Use SSE streaming endpoint for real-time progress
      const response = await fetch('/api/trading/consensus/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedModels: modelIds,
          timeframe,
          targetSymbol: targetSymbol.trim() || undefined,
          researchTier: globalTier,
          researchModel,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to start consensus analysis')
      }

      // Read SSE stream
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No stream reader available')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const eventData = line.slice(6)
            try {
              const event = JSON.parse(eventData)

              // Send event to ResearchProgressPanel for real-time display
              progressPanelRef.current?.processEvent(event)

              // Track costs from SSE events
              if (costTracker) {
                // Track research agent completions (Phase 1)
                if (event.type === 'agent_complete' && event.tokensUsed > 0) {
                  costTracker.trackUsage({
                    modelId: event.model || 'research-agent',
                    provider: event.provider || 'anthropic',
                    tokens: {
                      prompt: Math.round(event.tokensUsed * 0.7),
                      completion: Math.round(event.tokensUsed * 0.3),
                      total: event.tokensUsed
                    },
                    analysisType: 'trading-consensus',
                    context: `Research: ${event.agent}`
                  })
                }

                // Track decision model completions (Phase 2)
                if (event.type === 'decision_complete' && event.tokensUsed) {
                  const provider = getProviderForModel(event.modelId) || 'unknown'
                  costTracker.trackUsage({
                    modelId: event.modelId,
                    provider,
                    tokens: {
                      prompt: event.inputTokens || 0,
                      completion: event.outputTokens || 0,
                      total: event.tokensUsed
                    },
                    analysisType: 'trading-consensus',
                    context: `Decision: ${event.modelName}`
                  })
                }

                // Track judge completion (Phase 3)
                if (event.type === 'judge_complete' && event.tokensUsed) {
                  costTracker.trackUsage({
                    modelId: 'claude-sonnet-4-5-20250929',
                    provider: 'anthropic',
                    tokens: {
                      prompt: event.inputTokens || 0,
                      completion: event.outputTokens || 0,
                      total: event.tokensUsed
                    },
                    analysisType: 'trading-consensus',
                    context: 'Judge synthesis'
                  })
                }
              }

              // Handle final_result event to set state
              if (event.type === 'final_result') {
                const data = event

                setConsensus(data.consensus)
                setDecisions(data.decisions || [])
                setResearchData(data.research || null)

                // Create trade recommendation from consensus
                const recommendation = extractTradeRecommendation(data.consensus, 'consensus')
                setTradeRecommendation(recommendation)
                setShowTradeCard(true)

                // End cost tracking - analysis complete
                costTracker?.endAnalysis('completed')

                // Save conversation for history and persistence (non-blocking, silent fail)
                fetch('/api/conversations', {
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
                }).then(res => {
                  if (res.ok) {
                    return res.json().then(saved => {
                      saveConversation(saved.id)
                    })
                  } else {
                    // Guest mode: persist locally only
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
                }).catch(() => {
                })
              }

              // Handle error events
              if (event.type === 'error') {
                console.error('Streaming error:', event.message)
              }

              // Handle fallback events - model failed, using alternative
              if (event.type === 'fallback') {
                setFallbackMessages(prev => [...prev, {
                  from: event.originalModelName,
                  to: event.fallbackModelName,
                  reason: event.userMessage,
                  category: event.errorCategory
                }])
              }

              // Handle warning events - unstable model being attempted
              if (event.type === 'warning') {
              }
            } catch (parseError) {
              console.error('Failed to parse SSE event:', parseError)
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to get consensus decision:', error)
      alert(error instanceof Error ? error.message : 'Failed to get consensus decision')
      costTracker?.endAnalysis('error')
    } finally {
      setLoading(false)
      setIsStreaming(false)
    }
  }

  return {
    selectedModels,
    setSelectedModels,
    timeframe,
    setTimeframe,
    targetSymbol,
    setTargetSymbol,
    loading,
    consensus,
    decisions,
    progressSteps,
    researchData,
    tradeRecommendation,
    brokerEnv,
    showTradeCard,
    setShowTradeCard,
    inputMode,
    setInputMode,
    portfolioAnalysis,
    isStreaming,
    fallbackMessages,
    progressPanelRef,
    getConsensusDecision,
    getPortfolioAnalysis,
    handleExecuteTrade,
    handleStartNew,
  }
}

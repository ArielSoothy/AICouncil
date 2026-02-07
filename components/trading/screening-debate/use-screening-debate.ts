'use client'

import { useState, useCallback, useRef } from 'react'
import type {
  ScreeningDebateConfig,
  ScreeningDebateEvent,
  StockDebateResult,
  ScreeningVerdict,
  DailyBriefing,
} from '@/lib/trading/screening-debate/types'

export interface ScreeningDebateState {
  isRunning: boolean
  briefingId: string | null
  stocksSelected: string[]
  currentStock: string | null
  currentStockIndex: number
  totalStocks: number
  currentRound: number
  results: StockDebateResult[]
  summary: DailyBriefing['summary']
  error: string | null
  events: ScreeningDebateEvent[]
}

const initialState: ScreeningDebateState = {
  isRunning: false,
  briefingId: null,
  stocksSelected: [],
  currentStock: null,
  currentStockIndex: 0,
  totalStocks: 0,
  currentRound: 0,
  results: [],
  summary: null,
  error: null,
  events: [],
}

export function useScreeningDebate() {
  const [state, setState] = useState<ScreeningDebateState>(initialState)
  const abortRef = useRef<AbortController | null>(null)

  const startDebate = useCallback(async (config: ScreeningDebateConfig, scanId?: string) => {
    // Abort any existing stream
    if (abortRef.current) {
      abortRef.current.abort()
    }

    const controller = new AbortController()
    abortRef.current = controller

    setState({
      ...initialState,
      isRunning: true,
    })

    try {
      const screeningKey = getScreeningKey()
      const response = await fetch('/api/trading/screening/debate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(screeningKey ? { 'x-screening-key': screeningKey } : {}),
        },
        body: JSON.stringify({ ...config, scanId }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response stream')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || '' // Keep incomplete chunk

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()

          if (raw === '[DONE]') {
            setState(prev => ({ ...prev, isRunning: false }))
            return
          }

          try {
            const event: ScreeningDebateEvent = JSON.parse(raw)
            processEvent(event, setState)
          } catch {
            // Skip unparseable events
          }
        }
      }

      setState(prev => ({ ...prev, isRunning: false }))
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setState(prev => ({ ...prev, isRunning: false }))
        return
      }
      setState(prev => ({
        ...prev,
        isRunning: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }))
    }
  }, [])

  const stopDebate = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
    setState(prev => ({ ...prev, isRunning: false }))
  }, [])

  const reset = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
    setState(initialState)
  }, [])

  return {
    ...state,
    startDebate,
    stopDebate,
    reset,
  }
}

// ─── Event processing ──────────────────────────────────────────────────────

function processEvent(
  event: ScreeningDebateEvent,
  setState: React.Dispatch<React.SetStateAction<ScreeningDebateState>>
) {
  setState(prev => {
    const next = { ...prev, events: [...prev.events, event] }

    switch (event.type) {
      case 'briefing_started':
        next.briefingId = event.data.briefingId as string
        break

      case 'stocks_selected':
        next.stocksSelected = event.data.symbols as string[]
        next.totalStocks = event.data.count as number
        break

      case 'stock_debate_started':
        next.currentStock = event.data.symbol as string
        next.currentStockIndex = event.data.index as number
        break

      case 'round_started':
        next.currentRound = event.data.round as number
        break

      case 'stock_debate_completed': {
        // Build result from accumulated events for this stock
        const symbol = event.data.symbol as string
        const stockEvents = next.events.filter(
          e => (e.data.symbol as string) === symbol
        )
        const result = buildResultFromEvents(symbol, stockEvents, event.data)
        if (result) {
          next.results = [...next.results, result]
        }
        break
      }

      case 'briefing_completed':
        next.summary = event.data.summary as DailyBriefing['summary']
        next.isRunning = false
        break

      case 'error':
        if (!event.data.symbol) {
          // Global error
          next.error = event.data.error as string
        }
        break
    }

    return next
  })
}

/**
 * Reconstruct a StockDebateResult from SSE events with agent previews and judge data.
 * The full transcript is in the DB - this gives enough for real-time UI display.
 */
function buildResultFromEvents(
  symbol: string,
  events: ScreeningDebateEvent[],
  completionData: Record<string, unknown>
): StockDebateResult | null {
  const judgeEvent = events.find(e => e.type === 'judge_verdict')
  if (!judgeEvent) return null

  // Extract agent response previews from round 2 (final positions)
  const agentEvents = events.filter(
    e => e.type === 'agent_response' && (e.data.round as number) === 2
  )
  const round2Entries = agentEvents.map(e => ({
    role: e.data.role as 'analyst' | 'critic' | 'synthesizer',
    model: e.data.model as string,
    round: 2,
    content: (e.data.preview as string) || '',
    tokensUsed: 0,
    timestamp: e.timestamp,
  }))

  // Also get round 1 previews
  const round1AgentEvents = events.filter(
    e => e.type === 'agent_response' && (e.data.round as number) === 1
  )
  const round1Entries = round1AgentEvents.map(e => ({
    role: e.data.role as 'analyst' | 'critic' | 'synthesizer',
    model: e.data.model as string,
    round: 1,
    content: (e.data.preview as string) || '',
    tokensUsed: 0,
    timestamp: e.timestamp,
  }))

  return {
    symbol,
    screeningData: {} as any, // Full data available when fetching from DB
    researchSummary: '',
    debate: { round1: round1Entries, round2: round2Entries },
    judgeVerdict: {
      verdict: judgeEvent.data.verdict as ScreeningVerdict,
      confidence: judgeEvent.data.confidence as number,
      reasoning: (judgeEvent.data.reasoning as string) || '',
      entryPrice: (judgeEvent.data.entryPrice as number) || null,
      stopLoss: (judgeEvent.data.stopLoss as number) || null,
      takeProfit: (judgeEvent.data.takeProfit as number) || null,
      positionSize: null,
      riskLevel: (judgeEvent.data.riskLevel as 'Low' | 'Medium' | 'High' | 'Critical') || 'Medium',
      riskRewardRatio: null,
      keyBullPoints: (judgeEvent.data.keyBullPoints as string[]) || [],
      keyBearPoints: (judgeEvent.data.keyBearPoints as string[]) || [],
      timeHorizon: 'Intraday',
    },
    duration: completionData.duration as number,
    totalTokens: 0,
    estimatedCost: 0,
  }
}

// ─── Auth helper ───────────────────────────────────────────────────────────

function getScreeningKey(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return sessionStorage.getItem('screening_auth_key')
  } catch {
    return null
  }
}

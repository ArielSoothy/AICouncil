'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { saveToLocalStorage, loadFromLocalStorage, saveScan, loadHistory, type ScreeningScanResult } from '@/lib/trading/screening-cache'
import { calculateWinnersScore, type WinnersScore, type StockData } from '@/lib/trading/screening/winners-scoring'
import type { StockResult, ScreeningResponse, FlowLogEntry, AnalysisResult, SortField, SortDirection, EnrichedStock } from './types'

const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000'

function getScreeningHeaders(): HeadersInit {
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  if (typeof window !== 'undefined') {
    const key = sessionStorage.getItem('screening_auth_key')
    if (key) headers['x-screening-key'] = key
  }
  return headers
}

export function useScreeningData() {
  const [data, setData] = useState<ScreeningResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [progressStep, setProgressStep] = useState<string>('')
  const [progressPercent, setProgressPercent] = useState<number>(0)
  const [flowLog, setFlowLog] = useState<FlowLogEntry[]>([])
  const [showFlowLog, setShowFlowLog] = useState<boolean>(false)
  const [twsWarning, setTwsWarning] = useState<string | null>(null)
  const flowLogRef = useRef<HTMLDivElement>(null)
  const flowLogTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('gap_percent')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // History panel state
  const [showHistory, setShowHistory] = useState(false)
  const [scanHistory, setScanHistory] = useState<ScreeningScanResult[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Stock deep-dive state
  const [expandedStock, setExpandedStock] = useState<string | null>(null)

  // AI Analysis state
  const [analysisResults, setAnalysisResults] = useState<Record<string, AnalysisResult>>({})
  const [analyzingStock, setAnalyzingStock] = useState<string | null>(null)
  const [analysisMode, setAnalysisMode] = useState<'quick' | 'deep'>('quick')
  const [analysisModel, setAnalysisModel] = useState<string>('gemini-2.5-pro')

  // Winners Strategy scoring cache
  const [winnersScores, setWinnersScores] = useState<Record<string, WinnersScore>>({})

  // Filter state
  const [minGapPercent, setMinGapPercent] = useState<number>(10)
  const [maxGapPercent, setMaxGapPercent] = useState<number>(100)
  const [gapDirection, setGapDirection] = useState<'up' | 'down' | 'both'>('up')
  const [minVolume, setMinVolume] = useState<number>(500000)
  const [maxVolume, setMaxVolume] = useState<number>(0)
  const [maxFloatShares, setMaxFloatShares] = useState<number>(30000000)
  const [minRelativeVolume, setMinRelativeVolume] = useState<number>(5.0)
  const [minWinnersScore, setMinWinnersScore] = useState<number>(0)
  const [minBorrowFee, setMinBorrowFee] = useState<number>(0)
  const [minPrice, setMinPrice] = useState<number>(1.0)
  const [maxPrice, setMaxPrice] = useState<number>(20.0)
  const [maxResults, setMaxResults] = useState<number>(20)

  // Convert StockResult to StockData for scoring
  const toStockData = useCallback((stock: StockResult): StockData => ({
    symbol: stock.symbol,
    gap_percent: stock.gap_percent,
    gap_direction: stock.gap_direction,
    pre_market_price: stock.pre_market_price,
    previous_close: stock.previous_close,
    pre_market_volume: stock.pre_market_volume,
    shortable_shares: stock.short_data?.shortable_shares,
    borrow_difficulty: stock.short_data?.borrow_difficulty as 'EASY' | 'MEDIUM' | 'HARD' | 'VERY_HARD' | undefined,
    float_shares: stock.float_shares ?? stock.fundamentals?.float_shares,
    borrow_fee_rate: stock.short_data?.short_fee_rate,
    relative_volume: stock.relative_volume,
    average_volume: stock.avg_volume_20d,
    market_cap: stock.fundamentals?.market_cap,
    vwap: stock.bars?.vwap,
  }), [])

  // Get or calculate Winners Score for a stock
  const getWinnersScore = useCallback((stock: StockResult): WinnersScore => {
    if (winnersScores[stock.symbol]) {
      return winnersScores[stock.symbol]
    }
    const score = calculateWinnersScore(toStockData(stock))
    setWinnersScores(prev => ({ ...prev, [stock.symbol]: score }))
    return score
  }, [winnersScores, toStockData])

  // Format enriched stock response to StockResult[]
  const formatStocks = useCallback((stocks: EnrichedStock[]): StockResult[] => {
    return stocks.map((stock) => ({
      symbol: stock.symbol,
      rank: stock.rank,
      gap_percent: stock.gap_percent || 0,
      gap_direction: (stock.gap_direction || 'up') as 'up' | 'down',
      pre_market_volume: stock.pre_market_volume || 0,
      pre_market_price: stock.pre_market_price || 0,
      previous_close: stock.previous_close || 0,
      short_data: stock.shortable_shares ? {
        shortable_shares: stock.shortable_shares,
        borrow_difficulty: stock.borrow_difficulty,
        short_fee_rate: stock.short_fee_rate,
      } : undefined,
      fundamentals: stock.float_shares ? {
        float_shares: stock.float_shares,
        shares_outstanding: stock.shares_outstanding,
      } : undefined,
      avg_volume_20d: stock.avg_volume_20d,
      relative_volume: stock.relative_volume,
      reddit_mentions: stock.reddit_mentions,
      reddit_sentiment: stock.reddit_sentiment,
      reddit_sentiment_label: stock.reddit_sentiment_label,
      news: stock.news,
      catalyst: stock.catalyst,
      score: stock.score || (100 - stock.rank)
    }))
  }, [])

  const fetchScreening = useCallback(async () => {
    setLoading(true)
    if (!data) {
      setError(null)
    }

    try {
      // Try FastAPI first (local development only), fall back to Next.js API (deployed/online)
      let response: Response
      const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost'
      if (isLocalhost) {
        try {
          response = await fetch(`${FASTAPI_URL}/api/screening/latest`)
          if (!response.ok) throw new Error('FastAPI not available')
        } catch {
          // FastAPI offline - use Next.js API route (reads from Supabase)
          response = await fetch('/api/trading/screening/results', {
            headers: getScreeningHeaders()
          })
        }
      } else {
        // Production - go directly to Next.js API (no FastAPI available)
        response = await fetch('/api/trading/screening/results', {
          headers: getScreeningHeaders()
        })
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || `HTTP ${response.status}`)
      }

      const latestJob = await response.json()

      if (latestJob.status === 'no_data') {
        setData(null)
        setLastUpdate(new Date())
        setError(null)
        return
      }

      const formattedStocks = formatStocks(latestJob.stocks || [])

      const screeningData: ScreeningResponse = {
        stocks: formattedStocks,
        total_scanned: latestJob.stocks_found || formattedStocks.length,
        total_returned: formattedStocks.length,
        execution_time_seconds: 1,
        timestamp: latestJob.completed_at || new Date().toISOString()
      }

      setData(screeningData)
      setLastUpdate(new Date())
      setError(null)
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Failed to fetch screening data'
      if (!data) {
        setError(errMsg)
      }
      console.error('Screening fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [data, formatStocks])

  // Run AI Analysis on a stock
  const analyzeStock = useCallback(async (stock: StockResult) => {
    setAnalyzingStock(stock.symbol)

    try {
      const response = await fetch('/api/trading/screening/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stock: {
            symbol: stock.symbol,
            rank: stock.rank,
            gap_percent: stock.gap_percent,
            gap_direction: stock.gap_direction,
            pre_market_price: stock.pre_market_price,
            previous_close: stock.previous_close,
            pre_market_volume: stock.pre_market_volume,
            score: stock.score,
          },
          mode: analysisMode,
          model: analysisModel,
          tier: 'sub-pro',
        }),
      })

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`)
      }

      const result = await response.json()

      if (result.success && result.analysis) {
        setAnalysisResults(prev => ({
          ...prev,
          [stock.symbol]: {
            ...result.analysis,
            model: analysisModel,
          },
        }))
      }
    } catch (err) {
      console.error('Analysis error:', err)
      setAnalysisResults(prev => ({
        ...prev,
        [stock.symbol]: {
          verdict: 'WATCH' as const,
          confidence: 0,
          reasons: ['Analysis failed - try again'],
          analysisTime: 0,
        },
      }))
    } finally {
      setAnalyzingStock(null)
    }
  }, [analysisMode, analysisModel])

  const runScreening = useCallback(async (customParams?: {
    minVolume?: number
    maxVolume?: number
    minPrice?: number
    maxPrice?: number
    maxResults?: number
    minGapPercent?: number
    maxGapPercent?: number
    gapDirection?: 'up' | 'down' | 'both'
  }) => {
    setRunning(true)
    setError(null)
    setTwsWarning(null)
    setProgressStep('Starting TWS scanner...')
    setFlowLog([])
    setShowFlowLog(true)
    if (flowLogTimerRef.current) {
      clearTimeout(flowLogTimerRef.current)
      flowLogTimerRef.current = null
    }

    const effectiveParams = {
      minVolume: customParams?.minVolume ?? minVolume,
      maxVolume: customParams?.maxVolume ?? maxVolume,
      minPrice: customParams?.minPrice ?? minPrice,
      maxPrice: customParams?.maxPrice ?? maxPrice,
      maxResults: customParams?.maxResults ?? maxResults,
      minGapPercent: customParams?.minGapPercent ?? minGapPercent,
      maxGapPercent: customParams?.maxGapPercent ?? maxGapPercent,
      gapDirection: customParams?.gapDirection ?? gapDirection
    }

    try {
      const params = new URLSearchParams({
        min_volume: String(effectiveParams.minVolume),
        max_volume: String(effectiveParams.maxVolume),
        min_price: String(effectiveParams.minPrice),
        max_price: String(effectiveParams.maxPrice),
        max_results: String(effectiveParams.maxResults),
        min_gap_percent: String(effectiveParams.minGapPercent),
        max_gap_percent: String(effectiveParams.maxGapPercent),
        gap_direction: effectiveParams.gapDirection
      })

      setProgressStep('Connecting to TWS...')
      setProgressPercent(10)

      const response = await fetch(`${FASTAPI_URL}/api/screening/v2/run?${params}`, {
        method: 'POST'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || `HTTP ${response.status}`)
      }

      const result = await response.json()
      const jobId = result.job_id

      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(`${FASTAPI_URL}/api/screening/v2/status/${jobId}`)
          if (statusResponse.ok) {
            const status = await statusResponse.json()

            setProgressStep(status.message || 'Scanning...')
            setProgressPercent(status.progress || 0)

            if (status.flow_log && status.flow_log.length > 0) {
              setFlowLog(status.flow_log)
              if (flowLogRef.current) {
                flowLogRef.current.scrollTop = flowLogRef.current.scrollHeight
              }
            }

            if (status.status === 'completed') {
              clearInterval(pollInterval)
              setProgressPercent(100)

              if (status.warning) {
                setTwsWarning(status.warning)
              }

              if (status.stocks && status.stocks.length > 0) {
                const formattedStocks = formatStocks(status.stocks)

                const responseData: ScreeningResponse = {
                  stocks: formattedStocks,
                  total_scanned: status.stocks_found,
                  total_returned: status.stocks_found,
                  execution_time_seconds: 1,
                  timestamp: new Date().toISOString()
                }
                setData(responseData)
                setLastUpdate(new Date())
                setProgressStep(`Found ${status.stocks_found} stocks!`)

                saveScan({
                  scanned_at: responseData.timestamp,
                  scanner_type: 'top_perc_gain',
                  filters: {
                    min_volume: effectiveParams.minVolume,
                    min_price: effectiveParams.minPrice,
                    max_price: effectiveParams.maxPrice,
                    max_results: effectiveParams.maxResults
                  },
                  stocks: formattedStocks,
                  stocks_count: formattedStocks.length,
                  execution_time_seconds: 1
                })
              } else {
                setData({ stocks: [], total_scanned: 0, total_returned: 0, execution_time_seconds: 0, timestamp: new Date().toISOString() })
                setProgressStep('No stocks found matching criteria')
              }

              setTimeout(() => {
                setProgressStep('')
                setProgressPercent(0)
                setRunning(false)
              }, 2000)

              flowLogTimerRef.current = setTimeout(() => {
                setShowFlowLog(false)
              }, 8000)

            } else if (status.status === 'failed') {
              clearInterval(pollInterval)
              setError(status.error || status.message || 'Screening failed')
              setProgressStep('')
              setProgressPercent(0)
              setRunning(false)
            }
          }
        } catch (pollErr) {
          console.error('Status poll error:', pollErr)
        }
      }, 500)

      setTimeout(() => {
        clearInterval(pollInterval)
        if (running) {
          setError('Screening timeout (>90 seconds)')
          setProgressStep('')
          setRunning(false)
        }
      }, 90 * 1000)

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to start screening'

      const isConnectionError = errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError') || errorMsg.includes('ECONNREFUSED') || errorMsg.includes('Load failed')
      if (isConnectionError) {
        setError('Cannot run new scans remotely. Start FastAPI + TWS locally to run scans. You can still view cached results.')
      } else if (errorMsg.includes('Failed to connect') || errorMsg.includes('TimeoutError')) {
        setError('Cannot connect to TWS Desktop. Please ensure:\n' +
          '1. TWS Desktop or IB Gateway is running\n' +
          '2. API is enabled in TWS settings\n' +
          '3. Socket port is set to 7496 (paper) or 4001 (live)\n' +
          '4. "Enable ActiveX and Socket Clients" is checked')
      } else {
        setError(errorMsg)
      }

      console.error('Screening run error:', err)
      setProgressStep('')
      setRunning(false)
    }
  }, [minVolume, maxVolume, minPrice, maxPrice, maxResults, minGapPercent, maxGapPercent, gapDirection, running, formatStocks])

  // Auto-refresh every 5 minutes if enabled
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchScreening, 5 * 60 * 1000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, fetchScreening])

  // Initial load - try localStorage first for instant display
  useEffect(() => {
    const cached = loadFromLocalStorage()
    if (cached) {
      setData({
        stocks: cached.stocks,
        total_scanned: cached.stocks_count,
        total_returned: cached.stocks_count,
        execution_time_seconds: cached.execution_time_seconds,
        timestamp: cached.scanned_at
      })
      setLastUpdate(new Date(cached.scanned_at))
      return
    }
    fetchScreening()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load history from Supabase when panel opens
  const handleOpenHistory = useCallback(async () => {
    setShowHistory(true)
    setLoadingHistory(true)
    try {
      let history = await loadHistory(20)
      // If local cache returned empty, try server API
      if (history.length === 0) {
        try {
          const res = await fetch('/api/trading/screening/history', {
            headers: getScreeningHeaders()
          })
          if (res.ok) {
            history = await res.json()
          }
        } catch {
          // Silently fail - no history available
        }
      }
      setScanHistory(history)
    } catch (e) {
      console.error('Failed to load history:', e)
    } finally {
      setLoadingHistory(false)
    }
  }, [])

  // Load a historical scan into the main view
  const loadHistoricalScan = useCallback((scan: ScreeningScanResult) => {
    setData({
      stocks: scan.stocks,
      total_scanned: scan.stocks_count,
      total_returned: scan.stocks_count,
      execution_time_seconds: scan.execution_time_seconds,
      timestamp: scan.scanned_at
    })
    setLastUpdate(new Date(scan.scanned_at))
    setShowHistory(false)
  }, [])

  // Sort and filter stocks based on current settings
  const getSortedStocks = useCallback((): StockResult[] => {
    if (!data?.stocks) return []

    let filteredStocks = [...data.stocks]

    if (minWinnersScore > 0) {
      filteredStocks = filteredStocks.filter(stock => {
        const scoreResult = calculateWinnersScore(toStockData(stock))
        return scoreResult.total >= minWinnersScore
      })
    }

    if (minBorrowFee > 0) {
      filteredStocks = filteredStocks.filter(stock => {
        const feeRate = stock.short_data?.short_fee_rate
        return feeRate != null && feeRate >= minBorrowFee
      })
    }

    return filteredStocks.sort((a, b) => {
      let aVal: number, bVal: number

      switch (sortField) {
        case 'rank':
          aVal = a.rank
          bVal = b.rank
          break
        case 'gap_percent':
          aVal = Math.abs(a.gap_percent)
          bVal = Math.abs(b.gap_percent)
          break
        case 'score':
          aVal = a.score
          bVal = b.score
          break
        case 'pre_market_volume':
          aVal = a.pre_market_volume
          bVal = b.pre_market_volume
          break
        case 'pre_market_price':
          aVal = a.pre_market_price
          bVal = b.pre_market_price
          break
        default:
          aVal = a.rank
          bVal = b.rank
      }

      if (sortDirection === 'asc') {
        return aVal - bVal
      } else {
        return bVal - aVal
      }
    })
  }, [data, minWinnersScore, minBorrowFee, sortField, sortDirection, toStockData])

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }, [sortField])

  return {
    // Data
    data,
    loading,
    running,
    error,
    lastUpdate,
    FASTAPI_URL,

    // Auto-refresh
    autoRefresh,
    setAutoRefresh,

    // Progress
    progressStep,
    progressPercent,
    flowLog,
    showFlowLog,
    flowLogRef,
    twsWarning,

    // Sorting
    sortField,
    sortDirection,
    handleSort,
    getSortedStocks,

    // History
    showHistory,
    setShowHistory,
    scanHistory,
    loadingHistory,
    handleOpenHistory,
    loadHistoricalScan,

    // Expanded stock
    expandedStock,
    setExpandedStock,

    // AI Analysis
    analysisResults,
    analyzingStock,
    analysisMode,
    setAnalysisMode,
    analysisModel,
    setAnalysisModel,
    analyzeStock,

    // Winners scoring
    getWinnersScore,

    // Filters
    minGapPercent, setMinGapPercent,
    maxGapPercent, setMaxGapPercent,
    gapDirection, setGapDirection,
    minVolume, setMinVolume,
    maxVolume, setMaxVolume,
    maxFloatShares, setMaxFloatShares,
    minRelativeVolume, setMinRelativeVolume,
    minWinnersScore, setMinWinnersScore,
    minBorrowFee, setMinBorrowFee,
    minPrice, setMinPrice,
    maxPrice, setMaxPrice,
    maxResults, setMaxResults,

    // Actions
    fetchScreening,
    runScreening,
  }
}

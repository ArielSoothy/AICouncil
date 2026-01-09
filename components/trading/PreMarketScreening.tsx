'use client'

import { useState, useEffect, useRef } from 'react'
import { RefreshCw, TrendingUp, TrendingDown, Clock, Database, AlertCircle, Play, Terminal, ArrowUpDown, ChevronDown, ChevronRight, History, X, Bot, Star, ExternalLink, Zap, Target } from 'lucide-react'
import { saveToLocalStorage, loadFromLocalStorage, saveScan, loadHistory, type ScreeningScanResult } from '@/lib/trading/screening-cache'
import { calculateWinnersScore, generateScoreSummaryForPrompt, type WinnersScore, type StockData } from '@/lib/trading/screening/winners-scoring'

// ============================================
// SCORING DISPLAY HELPERS - Winners Strategy
// ============================================

interface ScoreDisplay {
  points: number
  maxPoints: number
  color: string
  bgColor: string
  threshold: string
}

// Gap % scoring thresholds
function getGapScore(gapPercent: number): ScoreDisplay {
  const absGap = Math.abs(gapPercent)
  if (absGap > 20) return { points: 2, maxPoints: 2, color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/40', threshold: '>20% EXPLOSIVE' }
  if (absGap > 10) return { points: 1, maxPoints: 2, color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/40', threshold: '>10% STRONG' }
  return { points: 0, maxPoints: 2, color: 'text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-700', threshold: '<10%' }
}

// PM Volume scoring thresholds
function getVolumeScore(volume: number): ScoreDisplay {
  if (volume > 1_000_000) return { points: 1, maxPoints: 1, color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/40', threshold: '>1M HEAVY' }
  if (volume > 500_000) return { points: 0, maxPoints: 1, color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/40', threshold: '>500K OK' }
  return { points: 0, maxPoints: 1, color: 'text-red-500', bgColor: 'bg-red-100 dark:bg-red-900/40', threshold: '<500K LOW' }
}

// Float scoring thresholds (lower = better for squeeze)
function getFloatScore(floatShares: number | undefined): ScoreDisplay | null {
  if (!floatShares) return null
  if (floatShares < 5_000_000) return { points: 3, maxPoints: 3, color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/40', threshold: '<5M SUPERNOVA' }
  if (floatShares < 10_000_000) return { points: 2, maxPoints: 3, color: 'text-green-500', bgColor: 'bg-green-100 dark:bg-green-900/40', threshold: '<10M ULTRA LOW' }
  if (floatShares < 20_000_000) return { points: 1, maxPoints: 3, color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/40', threshold: '<20M LOW' }
  if (floatShares < 30_000_000) return { points: 0, maxPoints: 3, color: 'text-orange-500', bgColor: 'bg-orange-100 dark:bg-orange-900/40', threshold: '<30M MOD' }
  return { points: 0, maxPoints: 3, color: 'text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-700', threshold: '>30M HIGH' }
}

// Borrow Fee scoring (higher = better for squeeze)
function getBorrowFeeScore(feeRate: number | undefined): ScoreDisplay | null {
  if (feeRate === undefined) return null
  if (feeRate > 50) return { points: 2, maxPoints: 2, color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/40', threshold: '>50% EXTREME' }
  if (feeRate > 20) return { points: 1, maxPoints: 2, color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/40', threshold: '>20% HIGH' }
  if (feeRate > 10) return { points: 0, maxPoints: 2, color: 'text-orange-500', bgColor: 'bg-orange-100 dark:bg-orange-900/40', threshold: '>10% ELEVATED' }
  return { points: 0, maxPoints: 2, color: 'text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-700', threshold: '<10% NORMAL' }
}

// Shortable Shares scoring (lower = better for squeeze)
function getShortableScore(shares: number | undefined): ScoreDisplay | null {
  if (shares === undefined) return null
  if (shares < 50_000) return { points: 1, maxPoints: 1, color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/40', threshold: '<50K VERY HARD' }
  if (shares < 100_000) return { points: 0, maxPoints: 1, color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/40', threshold: '<100K HARD' }
  if (shares < 1_000_000) return { points: 0, maxPoints: 1, color: 'text-orange-500', bgColor: 'bg-orange-100 dark:bg-orange-900/40', threshold: '<1M MODERATE' }
  return { points: 0, maxPoints: 1, color: 'text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-700', threshold: '>1M EASY' }
}

// Borrow Difficulty scoring
function getBorrowDifficultyScore(difficulty: string | undefined): ScoreDisplay | null {
  if (!difficulty) return null
  if (difficulty === 'Very Hard') return { points: 1, maxPoints: 1, color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/40', threshold: 'SQUEEZE FUEL' }
  if (difficulty === 'Hard') return { points: 1, maxPoints: 1, color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/40', threshold: 'SQUEEZE POTENTIAL' }
  if (difficulty === 'Moderate') return { points: 0, maxPoints: 1, color: 'text-orange-500', bgColor: 'bg-orange-100 dark:bg-orange-900/40', threshold: 'WATCHABLE' }
  return { points: 0, maxPoints: 1, color: 'text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-700', threshold: 'EASY TO SHORT' }
}

// Relative Volume scoring
function getRelativeVolumeScore(relVol: number | undefined): ScoreDisplay | null {
  if (relVol === undefined || relVol <= 0) return null
  if (relVol > 5) return { points: 1, maxPoints: 1, color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/40', threshold: '>5x UNUSUAL' }
  if (relVol > 2) return { points: 0, maxPoints: 1, color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/40', threshold: '>2x IN PLAY' }
  return { points: 0, maxPoints: 1, color: 'text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-700', threshold: '<2x NORMAL' }
}

// Score badge component
function ScoreBadge({ score }: { score: ScoreDisplay }) {
  return (
    <span className={`ml-2 text-xs px-1.5 py-0.5 rounded font-medium ${score.bgColor} ${score.color}`}>
      +{score.points}/{score.maxPoints} {score.threshold}
    </span>
  )
}

interface FlowLogEntry {
  timestamp: string
  message: string
  status: 'running' | 'success' | 'error'
}

interface StockResult {
  symbol: string
  rank: number
  gap_percent: number
  gap_direction: 'up' | 'down'
  pre_market_volume: number
  pre_market_price: number
  previous_close: number
  fundamentals?: {
    pe_ratio?: number
    market_cap?: number
    float_shares?: number
    shares_outstanding?: number
  }
  short_data?: {
    shortable_shares?: number
    borrow_difficulty?: string
    short_fee_rate?: number
  }
  ratios?: {
    roe?: number
    debt_to_equity?: number
  }
  bars?: {
    vwap?: number
    high?: number
  }
  sentiment?: {
    score?: number
    mentions?: number
  }
  // Relative Volume data
  avg_volume_20d?: number
  relative_volume?: number
  // Reddit Sentiment (Phase 4)
  reddit_mentions?: number
  reddit_sentiment?: number
  reddit_sentiment_label?: string
  score: number
}

interface ScanParameters {
  min_gap_percent: number
  min_volume: number
  min_price: number
  max_price: number
  max_market_cap: number
  max_results: number
  scan_code: string
  include_sentiment: boolean
}

interface ScreeningResponse {
  stocks: StockResult[]
  total_scanned: number
  total_returned: number
  execution_time_seconds: number
  timestamp: string
  scan_parameters?: ScanParameters
}

export default function PreMarketScreening() {
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
  type SortField = 'rank' | 'gap_percent' | 'score' | 'pre_market_volume' | 'pre_market_price'
  type SortDirection = 'asc' | 'desc'
  const [sortField, setSortField] = useState<SortField>('gap_percent')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // History panel state
  const [showHistory, setShowHistory] = useState(false)
  const [scanHistory, setScanHistory] = useState<ScreeningScanResult[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Stock deep-dive state
  const [expandedStock, setExpandedStock] = useState<string | null>(null)

  // AI Analysis state
  interface AnalysisResult {
    verdict: 'BUY' | 'WATCH' | 'SKIP'
    confidence: number
    reasons: string[]
    entryTrigger?: string
    riskFlag?: string
    analysisTime: number
    model?: string
  }
  const [analysisResults, setAnalysisResults] = useState<Record<string, AnalysisResult>>({})
  const [analyzingStock, setAnalyzingStock] = useState<string | null>(null)
  const [analysisMode, setAnalysisMode] = useState<'quick' | 'deep'>('quick')
  const [analysisModel, setAnalysisModel] = useState<string>('gemini-2.5-pro')

  // Available models for screening analysis (Gemini 2.5+ supports thinking mode required by CLI)
  const analysisModels = [
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', badge: '🏆 Best' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', badge: '⚡ Fast' },
    { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', badge: '💨 Fastest' },
  ]

  // Winners Strategy scoring cache
  const [winnersScores, setWinnersScores] = useState<Record<string, WinnersScore>>({})

  // Convert StockResult to StockData for scoring
  const toStockData = (stock: StockResult): StockData => ({
    symbol: stock.symbol,
    gap_percent: stock.gap_percent,
    gap_direction: stock.gap_direction,
    pre_market_price: stock.pre_market_price,
    previous_close: stock.previous_close,
    pre_market_volume: stock.pre_market_volume,
    // Squeeze data (from short_data if available)
    shortable_shares: stock.short_data?.shortable_shares,
    borrow_difficulty: stock.short_data?.borrow_difficulty as 'EASY' | 'MEDIUM' | 'HARD' | 'VERY_HARD' | undefined,
    // Phase 3: Float and short data
    float_shares: stock.fundamentals?.float_shares,
    borrow_fee_rate: stock.short_data?.short_fee_rate,
    // Phase 3: Relative Volume
    relative_volume: stock.relative_volume,
    average_volume: stock.avg_volume_20d,
    // Additional context
    market_cap: stock.fundamentals?.market_cap,
    vwap: stock.bars?.vwap,
  })

  // Get or calculate Winners Score for a stock
  const getWinnersScore = (stock: StockResult): WinnersScore => {
    if (winnersScores[stock.symbol]) {
      return winnersScores[stock.symbol]
    }
    const score = calculateWinnersScore(toStockData(stock))
    setWinnersScores(prev => ({ ...prev, [stock.symbol]: score }))
    return score
  }

  // ✅ Filter state - V2 API uses all these now (Winners Strategy filters added)
  const [minGapPercent, setMinGapPercent] = useState<number>(10) // ✅ Sent to V2 API
  const [maxGapPercent, setMaxGapPercent] = useState<number>(100) // ✅ Sent to V2 API (100 = no limit)
  const [gapDirection, setGapDirection] = useState<'up' | 'down' | 'both'>('up') // ✅ Sent to V2 API
  const [minVolume, setMinVolume] = useState<number>(500000) // ✅ Sent to V2 API
  const [maxVolume, setMaxVolume] = useState<number>(0) // ✅ Sent to V2 API (0 = no limit)
  const [maxFloatShares, setMaxFloatShares] = useState<number>(30000000) // UI-only (Phase 3: needs TWS float data)
  const [minRelativeVolume, setMinRelativeVolume] = useState<number>(5.0) // UI-only (Phase 3: needs TWS rel vol)
  const [minPrice, setMinPrice] = useState<number>(1.0) // ✅ Sent to V2 API
  const [maxPrice, setMaxPrice] = useState<number>(20.0) // ✅ Sent to V2 API
  const [maxResults, setMaxResults] = useState<number>(20) // ✅ Sent to V2 API

  const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000'

  const fetchScreening = async () => {
    setLoading(true)
    // Only clear error if we don't have cached data - preserve cached data display
    if (!data) {
      setError(null)
    }

    try {
      const response = await fetch(`${FASTAPI_URL}/api/screening/latest`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || `HTTP ${response.status}`)
      }

      const latestJob = await response.json()

      // Handle "no_data" response (empty state)
      if (latestJob.status === 'no_data') {
        setData(null)
        setLastUpdate(new Date())
        setError(null)
        return
      }

      // Transform ScanJob stocks to StockResult format (same as polling code)
      interface EnrichedStock {
        symbol: string
        rank: number
        gap_percent: number
        gap_direction: string
        pre_market_price: number
        previous_close: number
        pre_market_volume: number
        momentum_score: number
        score: number
        shortable_shares?: number
        borrow_difficulty?: string
        short_fee_rate?: number
        shares_outstanding?: number
        float_shares?: number
        avg_volume_20d?: number
        relative_volume?: number
        reddit_mentions?: number
        reddit_sentiment?: number
        reddit_sentiment_label?: string
      }

      const formattedStocks: StockResult[] = (latestJob.stocks || []).map((stock: EnrichedStock) => ({
        symbol: stock.symbol,
        rank: stock.rank,
        gap_percent: stock.gap_percent || 0,
        gap_direction: (stock.gap_direction || 'up') as 'up' | 'down',
        pre_market_volume: stock.pre_market_volume || 0,
        pre_market_price: stock.pre_market_price || 0,
        previous_close: stock.previous_close || 0,
        // Phase 3: Short data
        short_data: stock.shortable_shares ? {
          shortable_shares: stock.shortable_shares,
          borrow_difficulty: stock.borrow_difficulty,
          short_fee_rate: stock.short_fee_rate,
        } : undefined,
        // Phase 3: Float estimate
        fundamentals: stock.float_shares ? {
          float_shares: stock.float_shares,
          shares_outstanding: stock.shares_outstanding,
        } : undefined,
        // Phase 3: Relative Volume
        avg_volume_20d: stock.avg_volume_20d,
        relative_volume: stock.relative_volume,
        // Phase 4: Reddit Sentiment
        reddit_mentions: stock.reddit_mentions,
        reddit_sentiment: stock.reddit_sentiment,
        reddit_sentiment_label: stock.reddit_sentiment_label,
        score: stock.score || (100 - stock.rank)
      }))

      const screeningData: ScreeningResponse = {
        stocks: formattedStocks,
        total_scanned: latestJob.stocks_found || formattedStocks.length,
        total_returned: formattedStocks.length,
        execution_time_seconds: 1,
        timestamp: latestJob.completed_at || new Date().toISOString()
      }

      setData(screeningData)
      setLastUpdate(new Date())
      setError(null) // Clear error on success
    } catch (err) {
      // Only show error if we don't have any data to display
      if (!data) {
        setError(err instanceof Error ? err.message : 'Failed to fetch screening data')
      }
      console.error('Screening fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Run AI Analysis on a stock
  const analyzeStock = async (stock: StockResult) => {
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
            model: analysisModel, // Store which model was used
          },
        }))
      }
    } catch (err) {
      console.error('Analysis error:', err)
      // Set a failed state
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
  }

  const runScreening = async (customParams?: {
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
    setTwsWarning(null) // Clear previous warning
    setProgressStep('Starting TWS scanner...')
    setFlowLog([]) // Clear previous flow log
    setShowFlowLog(true) // Show flow log when scan starts
    // Clear any existing timer
    if (flowLogTimerRef.current) {
      clearTimeout(flowLogTimerRef.current)
      flowLogTimerRef.current = null
    }

    // Use custom params if provided, otherwise use state
    // V2 API now supports Winners Strategy filters
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
      // === USE V2 API (SYNCHRONOUS SCANNER - WORKS!) ===
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
      console.log('[INFO] V2 Screening started, job_id:', jobId)

      // Poll V2 status endpoint for progress
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(`${FASTAPI_URL}/api/screening/v2/status/${jobId}`)
          if (statusResponse.ok) {
            const status = await statusResponse.json()

            // Update UI with real progress
            setProgressStep(status.message || 'Scanning...')
            setProgressPercent(status.progress || 0)

            // Update flow log for real-time observability
            if (status.flow_log && status.flow_log.length > 0) {
              setFlowLog(status.flow_log)
              // Auto-scroll to bottom
              if (flowLogRef.current) {
                flowLogRef.current.scrollTop = flowLogRef.current.scrollHeight
              }
            }

            if (status.status === 'completed') {
              // SUCCESS - got results!
              clearInterval(pollInterval)
              setProgressPercent(100)

              // Check for TWS warnings (e.g., need restart)
              if (status.warning) {
                setTwsWarning(status.warning)
              }

              // Convert V2 results to ScreeningResponse format (now with enriched data!)
              if (status.stocks && status.stocks.length > 0) {
                interface EnrichedStock {
                  symbol: string
                  rank: number
                  exchange: string
                  conid: number
                  gap_percent: number
                  gap_direction: string
                  pre_market_price: number
                  previous_close: number
                  pre_market_volume: number
                  momentum_score: number
                  score: number
                  // Phase 3 data
                  shortable_shares?: number
                  borrow_difficulty?: string
                  short_fee_rate?: number
                  shares_outstanding?: number
                  float_shares?: number
                  // Relative Volume data
                  avg_volume_20d?: number
                  relative_volume?: number
                  // Reddit Sentiment (Phase 4)
                  reddit_mentions?: number
                  reddit_sentiment?: number
                  reddit_sentiment_label?: string
                }
                const formattedStocks: StockResult[] = status.stocks.map((stock: EnrichedStock) => ({
                  symbol: stock.symbol,
                  rank: stock.rank,
                  gap_percent: stock.gap_percent || 0,
                  gap_direction: (stock.gap_direction || 'up') as 'up' | 'down',
                  pre_market_volume: stock.pre_market_volume || 0,
                  pre_market_price: stock.pre_market_price || 0,
                  previous_close: stock.previous_close || 0,
                  // Phase 3: Short data
                  short_data: stock.shortable_shares ? {
                    shortable_shares: stock.shortable_shares,
                    borrow_difficulty: stock.borrow_difficulty,
                    short_fee_rate: stock.short_fee_rate,
                  } : undefined,
                  // Phase 3: Float estimate
                  fundamentals: stock.float_shares ? {
                    float_shares: stock.float_shares,
                    shares_outstanding: stock.shares_outstanding,
                  } : undefined,
                  // Phase 3: Relative Volume (PM volume vs 20-day avg)
                  avg_volume_20d: stock.avg_volume_20d,
                  relative_volume: stock.relative_volume,
                  // Phase 4: Reddit Sentiment
                  reddit_mentions: stock.reddit_mentions,
                  reddit_sentiment: stock.reddit_sentiment,
                  reddit_sentiment_label: stock.reddit_sentiment_label,
                  score: stock.score || (100 - stock.rank)
                }))

                const response: ScreeningResponse = {
                  stocks: formattedStocks,
                  total_scanned: status.stocks_found,
                  total_returned: status.stocks_found,
                  execution_time_seconds: 1,
                  timestamp: new Date().toISOString()
                }
                setData(response)
                setLastUpdate(new Date())
                setProgressStep(`✅ Found ${status.stocks_found} stocks!`)

                // Save to cache (localStorage + Supabase)
                saveScan({
                  scanned_at: response.timestamp,
                  scanner_type: 'top_perc_gain',  // Changed from most_active to find gappers
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

              // Keep flow log visible for 8 seconds after completion
              flowLogTimerRef.current = setTimeout(() => {
                setShowFlowLog(false)
              }, 8000)

            } else if (status.status === 'failed') {
              // Error occurred
              clearInterval(pollInterval)
              setError(status.error || status.message || 'Screening failed')
              setProgressStep('')
              setProgressPercent(0)
              setRunning(false)
            }
            // 'queued' or 'running' - keep polling
          }
        } catch (pollErr) {
          console.error('Status poll error:', pollErr)
          // Don't stop on poll errors, keep trying
        }
      }, 500) // Poll every 500ms (V2 is fast!)

      // Safety timeout - stop polling after 30 seconds (V2 is fast, shouldn't take long)
      setTimeout(() => {
        clearInterval(pollInterval)
        if (running) {
          setError('Screening timeout (>30 seconds)')
          setProgressStep('')
          setRunning(false)
        }
      }, 30 * 1000)

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to start screening'

      // Check for common TWS connection errors
      if (errorMsg.includes('Failed to connect') || errorMsg.includes('TimeoutError')) {
        setError('❌ Cannot connect to TWS Desktop. Please ensure:\n' +
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
  }

  // Auto-refresh every 5 minutes if enabled
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchScreening, 5 * 60 * 1000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  // Initial load - try localStorage first for instant display
  useEffect(() => {
    // Load cached data from localStorage (instant)
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
      // Don't fetch from API if we have cached data - avoids error overriding cache
      return
    }

    // Only try fetching from FastAPI if no cached data
    fetchScreening()
  }, [])

  // Load history from Supabase when panel opens
  const handleOpenHistory = async () => {
    setShowHistory(true)
    setLoadingHistory(true)
    try {
      const history = await loadHistory(20)
      setScanHistory(history)
    } catch (e) {
      console.error('Failed to load history:', e)
    } finally {
      setLoadingHistory(false)
    }
  }

  // Load a historical scan into the main view
  const loadHistoricalScan = (scan: ScreeningScanResult) => {
    setData({
      stocks: scan.stocks,
      total_scanned: scan.stocks_count,
      total_returned: scan.stocks_count,
      execution_time_seconds: scan.execution_time_seconds,
      timestamp: scan.scanned_at
    })
    setLastUpdate(new Date(scan.scanned_at))
    setShowHistory(false)
  }

  // Format share counts (volume, float, etc.) - NO $ prefix
  const formatNumber = (num: number): string => {
    if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
    return num.toLocaleString()
  }

  // Format dollar amounts (price, market cap) - WITH $ prefix
  const formatCurrency = (num: number): string => {
    if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(2)}B`
    if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`
    if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`
    return `$${num.toLocaleString()}`
  }

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600 dark:text-green-400'
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getDifficultyColor = (difficulty?: string): string => {
    if (!difficulty) return 'text-gray-500'
    if (difficulty.toLowerCase().includes('easy')) return 'text-green-600 dark:text-green-400'
    if (difficulty.toLowerCase().includes('hard')) return 'text-red-600 dark:text-red-400'
    return 'text-yellow-600 dark:text-yellow-400'
  }

  // Sort stocks based on current sort field and direction
  const getSortedStocks = (): StockResult[] => {
    if (!data?.stocks) return []

    return [...data.stocks].sort((a, b) => {
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
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      // New field, default to descending (highest first)
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const sortOptions: { value: SortField; label: string; icon: string }[] = [
    { value: 'gap_percent', label: 'Top Gainers', icon: '📈' },
    { value: 'score', label: 'Highest Score', icon: '⭐' },
    { value: 'pre_market_volume', label: 'Most Volume', icon: '📊' },
    { value: 'pre_market_price', label: 'Price', icon: '💰' },
    { value: 'rank', label: 'Scanner Rank', icon: '🏆' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Pre-Market Screening
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            High-probability trading opportunities identified by AI
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Auto-refresh toggle */}
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            Auto-refresh (5min)
          </label>

          {/* Run screening button */}
          <button
            onClick={() => runScreening()}
            disabled={running || loading}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg transition-colors"
            title="Connect to TWS Desktop and run screening now"
          >
            <Play className={`w-4 h-4 ${running ? 'animate-pulse' : ''}`} />
            {running ? 'Running...' : 'Run Screening Now'}
          </button>

          {/* History button */}
          <button
            onClick={handleOpenHistory}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            title="View scan history"
          >
            <History className="w-4 h-4" />
            History
          </button>

          {/* Manual refresh button */}
          <button
            onClick={fetchScreening}
            disabled={loading || running}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Last update timestamp */}
      {lastUpdate && (
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Clock className="w-4 h-4" />
          Last updated: {lastUpdate.toLocaleTimeString()}
          {data && (
            <span className="text-gray-500">
              • Data from: {new Date(data.timestamp).toLocaleString()}
            </span>
          )}
        </div>
      )}

      {/* ✅ Advanced Filters Panel */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-4 flex items-center gap-2 text-lg">
          <Database className="w-5 h-5" />
          Advanced Filters (Low-Float Runner Optimization)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Min Gap % */}
          <div className="space-y-2">
            <label className="flex items-center justify-between text-sm font-medium text-blue-900 dark:text-blue-100">
              <span>Min Gap %</span>
              <span className="font-bold text-blue-600 dark:text-blue-400">{minGapPercent}%</span>
            </label>
            <input
              type="range"
              min="5"
              max="50"
              step="1"
              value={minGapPercent}
              onChange={(e) => setMinGapPercent(Number(e.target.value))}
              className="w-full h-2 bg-blue-200 dark:bg-blue-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          {/* Max Gap % */}
          <div className="space-y-2">
            <label className="flex items-center justify-between text-sm font-medium text-blue-900 dark:text-blue-100">
              <span>Max Gap %</span>
              <span className="font-bold text-purple-600 dark:text-purple-400">{maxGapPercent === 100 ? '∞' : `${maxGapPercent}%`}</span>
            </label>
            <input
              type="range"
              min="20"
              max="100"
              step="5"
              value={maxGapPercent}
              onChange={(e) => setMaxGapPercent(Number(e.target.value))}
              className="w-full h-2 bg-purple-200 dark:bg-purple-800 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
            <p className="text-xs text-purple-600 dark:text-purple-400 italic">100 = no limit</p>
          </div>

          {/* Gap Direction Selector */}
          <div className="space-y-2">
            <label className="flex items-center justify-between text-sm font-medium text-blue-900 dark:text-blue-100">
              <span>Gap Direction</span>
              <span className="font-bold text-blue-600 dark:text-blue-400">
                {gapDirection === 'up' ? '📈 UP' : gapDirection === 'down' ? '📉 DOWN' : '↕️ BOTH'}
              </span>
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setGapDirection('up')}
                className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  gapDirection === 'up'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-green-100 dark:hover:bg-green-900'
                }`}
              >
                📈 UP
              </button>
              <button
                type="button"
                onClick={() => setGapDirection('down')}
                className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  gapDirection === 'down'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-red-100 dark:hover:bg-red-900'
                }`}
              >
                📉 DOWN
              </button>
              <button
                type="button"
                onClick={() => setGapDirection('both')}
                className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  gapDirection === 'both'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900'
                }`}
              >
                ↕️ BOTH
              </button>
            </div>
            <p className="text-xs text-blue-700 dark:text-blue-300 italic">
              UP = momentum runners, DOWN = shorts/reversals
            </p>
          </div>

          {/* Min Volume */}
          <div className="space-y-2">
            <label className="flex items-center justify-between text-sm font-medium text-blue-900 dark:text-blue-100">
              <span>Min Volume</span>
              <span className="font-bold text-blue-600 dark:text-blue-400">{(minVolume / 1_000_000).toFixed(1)}M</span>
            </label>
            <input
              type="range"
              min="100000"
              max="5000000"
              step="100000"
              value={minVolume}
              onChange={(e) => setMinVolume(Number(e.target.value))}
              className="w-full h-2 bg-blue-200 dark:bg-blue-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          {/* Max Volume */}
          <div className="space-y-2">
            <label className="flex items-center justify-between text-sm font-medium text-blue-900 dark:text-blue-100">
              <span>Max Volume</span>
              <span className="font-bold text-purple-600 dark:text-purple-400">{maxVolume === 0 ? '∞' : `${(maxVolume / 1_000_000).toFixed(0)}M`}</span>
            </label>
            <input
              type="range"
              min="0"
              max="500000000"
              step="10000000"
              value={maxVolume}
              onChange={(e) => setMaxVolume(Number(e.target.value))}
              className="w-full h-2 bg-purple-200 dark:bg-purple-800 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
            <p className="text-xs text-purple-600 dark:text-purple-400 italic">0 = no limit</p>
          </div>

          {/* Max Float Shares Slider */}
          <div className="space-y-2">
            <label className="flex items-center justify-between text-sm font-medium text-blue-900 dark:text-blue-100">
              <span>Max Float (Shares)</span>
              <span className="font-bold text-blue-600 dark:text-blue-400">{(maxFloatShares / 1000000).toFixed(0)}M</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600 dark:text-gray-400">5M</span>
              <input
                type="range"
                min="5000000"
                max="50000000"
                step="5000000"
                value={maxFloatShares}
                onChange={(e) => setMaxFloatShares(Number(e.target.value))}
                className="flex-1 h-2 bg-blue-200 dark:bg-blue-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <span className="text-xs text-gray-600 dark:text-gray-400">50M</span>
            </div>
            <p className="text-xs text-blue-700 dark:text-blue-300 italic">
              Lower float = easier to move price
            </p>
          </div>

          {/* Min Relative Volume Slider */}
          <div className="space-y-2">
            <label className="flex items-center justify-between text-sm font-medium text-blue-900 dark:text-blue-100">
              <span>Min Relative Volume</span>
              <span className="font-bold text-blue-600 dark:text-blue-400">{minRelativeVolume.toFixed(1)}x</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600 dark:text-gray-400">1x</span>
              <input
                type="range"
                min="1"
                max="20"
                step="0.5"
                value={minRelativeVolume}
                onChange={(e) => setMinRelativeVolume(Number(e.target.value))}
                className="flex-1 h-2 bg-blue-200 dark:bg-blue-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <span className="text-xs text-gray-600 dark:text-gray-400">20x</span>
            </div>
            <p className="text-xs text-blue-700 dark:text-blue-300 italic">
              Volume vs 20-day average
            </p>
          </div>

          {/* Price Range Inputs */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Price Range
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="text-xs text-gray-600 dark:text-gray-400">Min</label>
                <input
                  type="number"
                  min="0.01"
                  max="100"
                  step="0.1"
                  value={minPrice}
                  onChange={(e) => setMinPrice(Number(e.target.value))}
                  className="w-full px-2 py-1 text-sm border border-blue-300 dark:border-blue-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
              <span className="text-gray-500 mt-5">-</span>
              <div className="flex-1">
                <label className="text-xs text-gray-600 dark:text-gray-400">Max</label>
                <input
                  type="number"
                  min="0.01"
                  max="1000"
                  step="1"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full px-2 py-1 text-sm border border-blue-300 dark:border-blue-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
            <p className="text-xs text-blue-700 dark:text-blue-300 italic">
              $1-$20 = penny stock sweet spot
            </p>
          </div>

          {/* Max Results Slider */}
          <div className="space-y-2">
            <label className="flex items-center justify-between text-sm font-medium text-blue-900 dark:text-blue-100">
              <span>Max Results</span>
              <span className="font-bold text-blue-600 dark:text-blue-400">{maxResults}</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600 dark:text-gray-400">5</span>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={maxResults}
                onChange={(e) => setMaxResults(Number(e.target.value))}
                className="flex-1 h-2 bg-blue-200 dark:bg-blue-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <span className="text-xs text-gray-600 dark:text-gray-400">50</span>
            </div>
            <p className="text-xs text-blue-700 dark:text-blue-300 italic">
              Number of stocks to return
            </p>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="mt-6 pt-4 border-t border-blue-300 dark:border-blue-700">
          <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-3">Quick Presets (click to update sliders):</h4>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                // Update UI state
                setMinGapPercent(10)
                setMaxGapPercent(100) // No max limit
                setMinVolume(500000)
                setMaxVolume(50000000) // Max 50M volume
                setMaxFloatShares(30000000)
                setMinRelativeVolume(5.0)
                setMinPrice(1.0)
                setMaxPrice(20.0)
                setMaxResults(20)
                setGapDirection('up')
                // Run with V2 API params (Winners Strategy defaults)
                runScreening({ minVolume: 500000, maxVolume: 50000000, minPrice: 1.0, maxPrice: 20.0, maxResults: 20, minGapPercent: 10, maxGapPercent: 100, gapDirection: 'up' })
              }}
              disabled={running || loading}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm rounded transition-colors"
            >
              🎯 Low-Float Runners (Default)
            </button>
            <button
              onClick={() => {
                // Update UI state
                setMinGapPercent(20)
                setMaxGapPercent(60) // Cap at 60% (avoid crazy pumps)
                setMinVolume(1000000)
                setMaxVolume(100000000) // Max 100M volume
                setMaxFloatShares(15000000)
                setMinRelativeVolume(10.0)
                setMinPrice(1.0)
                setMaxPrice(10.0)
                setMaxResults(10)
                setGapDirection('up')
                // Run with V2 API params (Extreme = 20-60% gap UP)
                runScreening({ minVolume: 1000000, maxVolume: 100000000, minPrice: 1.0, maxPrice: 10.0, maxResults: 10, minGapPercent: 20, maxGapPercent: 60, gapDirection: 'up' })
              }}
              disabled={running || loading}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white text-sm rounded transition-colors"
            >
              🔥 Extreme Movers
            </button>
            <button
              onClick={() => {
                // Update UI state
                setMinGapPercent(5)
                setMaxGapPercent(100) // No max limit
                setMinVolume(250000)
                setMaxVolume(0) // No max limit
                setMaxFloatShares(50000000)
                setMinRelativeVolume(2.0)
                setMinPrice(0.5)
                setMaxPrice(50.0)
                setMaxResults(50)
                setGapDirection('both')
                // Run with V2 API params (Wide Net = 5%+ gap, both directions, no volume cap)
                runScreening({ minVolume: 250000, maxVolume: 0, minPrice: 0.5, maxPrice: 50.0, maxResults: 50, minGapPercent: 5, maxGapPercent: 100, gapDirection: 'both' })
              }}
              disabled={running || loading}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm rounded transition-colors"
            >
              📊 Wide Net (More Results)
            </button>
          </div>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 italic">
            Clicking a preset will immediately run screening with those filters
          </p>
        </div>
      </div>

      {/* Progress indicator */}
      {running && progressStep && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5 animate-spin" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">Running Screening...</h3>
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{progressPercent}%</span>
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">{progressStep}</p>
              <div className="mt-3 bg-blue-200 dark:bg-blue-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Real-Time Flow Log - persists 8 seconds after completion */}
      {showFlowLog && flowLog.length > 0 && (
        <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
          <div className="bg-gray-800 px-4 py-2 flex items-center gap-2 border-b border-gray-700">
            <Terminal className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium text-green-400">Screening Log</span>
            <span className="text-xs text-gray-500">({flowLog.length} entries)</span>
          </div>
          <div
            ref={flowLogRef}
            className="p-4 font-mono text-sm max-h-64 overflow-y-auto"
          >
            {flowLog.map((entry, i) => (
              <div key={i} className="flex gap-3 py-0.5">
                <span className="text-gray-500 flex-shrink-0">{entry.timestamp}</span>
                <span className="flex-shrink-0">
                  {entry.status === 'success' ? '✅' : entry.status === 'error' ? '❌' : '⏳'}
                </span>
                <span className={
                  entry.status === 'success' ? 'text-green-400' :
                  entry.status === 'error' ? 'text-red-400' :
                  'text-yellow-400'
                }>
                  {entry.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TWS Warning (e.g., need restart) */}
      {twsWarning && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-900 dark:text-amber-100">TWS Connection Issue</h3>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">{twsWarning}</p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                Stocks were found but price/volume data couldn&apos;t be retrieved. Restart TWS Desktop and run again.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 dark:text-red-100">Error running screening</h3>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1 whitespace-pre-line">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats summary */}
      {data && !error && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
              <Database className="w-4 h-4" />
              Total Scanned
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {data.total_scanned}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
              <TrendingUp className="w-4 h-4" />
              Opportunities Found
            </div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {data.total_returned}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
              <Clock className="w-4 h-4" />
              Execution Time
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {data.execution_time_seconds}s
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Avg Score
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {(data.stocks.reduce((sum, s) => sum + s.score, 0) / data.stocks.length).toFixed(1)}
            </div>
          </div>
        </div>
      )}

      {/* Scan Parameters Display */}
      {data && data.scan_parameters && (
        <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
            <Database className="w-4 h-4" />
            Scan Filters Used
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <span className="text-blue-600 dark:text-blue-400 font-medium">Gap:</span>
              <span className="ml-2 text-blue-900 dark:text-blue-100">≥ {data.scan_parameters.min_gap_percent}%</span>
            </div>
            <div>
              <span className="text-blue-600 dark:text-blue-400 font-medium">Volume:</span>
              <span className="ml-2 text-blue-900 dark:text-blue-100">≥ {(data.scan_parameters.min_volume / 1000).toFixed(0)}K</span>
            </div>
            <div>
              <span className="text-blue-600 dark:text-blue-400 font-medium">Price:</span>
              <span className="ml-2 text-blue-900 dark:text-blue-100">${data.scan_parameters.min_price} - ${data.scan_parameters.max_price}</span>
            </div>
            <div>
              <span className="text-blue-600 dark:text-blue-400 font-medium">Market Cap:</span>
              <span className="ml-2 text-blue-900 dark:text-blue-100">&lt; ${(data.scan_parameters.max_market_cap / 1_000_000_000).toFixed(1)}B</span>
            </div>
            <div>
              <span className="text-blue-600 dark:text-blue-400 font-medium">Scanner:</span>
              <span className="ml-2 text-blue-900 dark:text-blue-100">{data.scan_parameters.scan_code}</span>
            </div>
            <div>
              <span className="text-blue-600 dark:text-blue-400 font-medium">Max Results:</span>
              <span className="ml-2 text-blue-900 dark:text-blue-100">{data.scan_parameters.max_results}</span>
            </div>
            <div>
              <span className="text-blue-600 dark:text-blue-400 font-medium">Sentiment:</span>
              <span className="ml-2 text-blue-900 dark:text-blue-100">{data.scan_parameters.include_sentiment ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Sorting Controls */}
      {data && !error && data.stocks.length > 0 && (
        <div className="flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <ArrowUpDown className="w-4 h-4" />
            <span>Sort by:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {sortOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSort(option.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  sortField === option.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <span>{option.icon}</span>
                <span>{option.label}</span>
                {sortField === option.value && (
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform ${
                      sortDirection === 'asc' ? 'rotate-180' : ''
                    }`}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stocks list */}
      {data && !error && (
        <div className="space-y-3">
          {getSortedStocks().map((stock) => {
            const isExpanded = expandedStock === stock.symbol

            return (
              <div key={stock.symbol} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden transition-all duration-200">
                {/* Clickable Header Row */}
                <div
                  onClick={() => setExpandedStock(isExpanded ? null : stock.symbol)}
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {/* Expand/Collapse Icon */}
                    <div className="flex-shrink-0">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-blue-500" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      )}
                    </div>

                    {/* Symbol & Gap */}
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          {stock.symbol}
                        </h3>
                        <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                          #{stock.rank + 1}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {stock.gap_direction === 'up' ? (
                          <TrendingUp className="w-4 h-4 text-green-600" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-600" />
                        )}
                        <span className={`font-semibold ${stock.gap_direction === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                          {stock.gap_percent > 0 ? '+' : ''}{stock.gap_percent.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                      <div className="text-xs text-gray-500 dark:text-gray-400">Price</div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">
                        ${stock.pre_market_price.toFixed(2)}
                      </div>
                    </div>
                    <div className="text-right hidden md:block">
                      <div className="text-xs text-gray-500 dark:text-gray-400">Volume</div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">
                        {formatNumber(stock.pre_market_volume)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${getScoreColor(stock.score)}`}>
                        {stock.score}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Score</div>
                    </div>
                  </div>
                </div>

                {/* Expanded Detail View */}
                {isExpanded && (
                  <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    {/* TradingView Chart */}
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                          📊 Chart - {stock.symbol}
                        </h4>
                        <a
                          href={`https://www.tradingview.com/chart/?symbol=${stock.symbol}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
                        >
                          Open in TradingView <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <div className="bg-gray-900 rounded-lg overflow-hidden">
                        <iframe
                          src={`https://www.tradingview.com/widgetembed/?symbol=${stock.symbol}&interval=5&hidesidetoolbar=1&symboledit=0&saveimage=0&toolbarbg=1e222d&studies=[]&theme=dark&timezone=America%2FNew_York&withdateranges=0&hideideas=1&width=100%25&height=350`}
                          style={{ width: '100%', height: 350, border: 'none' }}
                          title={`${stock.symbol} Chart`}
                        />
                      </div>
                    </div>

                    {/* Winners Strategy Score */}
                    {(() => {
                      const wscore = getWinnersScore(stock)
                      return (
                        <div className={`p-4 border-b ${
                          wscore.conviction === 'HIGH' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' :
                          wscore.conviction === 'MEDIUM' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' :
                          'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700'
                        }`}>
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                              <Target className="w-5 h-5 text-blue-600" />
                              Winners Strategy Score
                            </h4>
                            <div className="flex items-center gap-3">
                              <span className={`text-2xl font-bold ${
                                wscore.conviction === 'HIGH' ? 'text-green-600' :
                                wscore.conviction === 'MEDIUM' ? 'text-amber-600' :
                                'text-gray-500'
                              }`}>
                                {wscore.emoji} {wscore.total}/{wscore.maxPossible}
                              </span>
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                wscore.conviction === 'HIGH' ? 'bg-green-500 text-white' :
                                wscore.conviction === 'MEDIUM' ? 'bg-amber-500 text-white' :
                                wscore.conviction === 'LOW' ? 'bg-gray-400 text-white' :
                                'bg-gray-300 text-gray-700'
                              }`}>
                                {wscore.conviction}
                              </span>
                            </div>
                          </div>

                          {/* Momentum vs Squeeze Signals */}
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className={`p-3 rounded-lg ${
                              wscore.momentum.signal === 'STRONG' ? 'bg-green-100 dark:bg-green-900/30' :
                              wscore.momentum.signal === 'MODERATE' ? 'bg-amber-100 dark:bg-amber-900/30' :
                              'bg-gray-100 dark:bg-gray-800'
                            }`}>
                              <div className="flex items-center gap-2 mb-1">
                                <Zap className="w-4 h-4 text-blue-500" />
                                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Momentum</span>
                              </div>
                              <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                {wscore.momentum.signal}
                              </div>
                              <div className="text-xs text-gray-500">
                                {wscore.momentum.total}/{wscore.momentum.maxPossible} pts
                              </div>
                            </div>
                            <div className={`p-3 rounded-lg ${
                              wscore.squeeze.signal === 'HIGH' ? 'bg-red-100 dark:bg-red-900/30' :
                              wscore.squeeze.signal === 'MEDIUM' ? 'bg-orange-100 dark:bg-orange-900/30' :
                              'bg-gray-100 dark:bg-gray-800'
                            }`}>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm">💥</span>
                                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Squeeze</span>
                              </div>
                              <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                {wscore.squeeze.signal}
                              </div>
                              <div className="text-xs text-gray-500">
                                {wscore.squeeze.total}/{wscore.squeeze.maxPossible} pts
                              </div>
                            </div>
                          </div>

                          {/* Score Breakdown */}
                          <div className="space-y-2">
                            {wscore.breakdown.map((item, i) => (
                              <div key={i} className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-2">
                                  <span className={item.met ? 'text-green-500' : 'text-gray-400'}>
                                    {item.met ? '✓' : '○'}
                                  </span>
                                  <span className="text-gray-700 dark:text-gray-300">{item.category}</span>
                                </span>
                                <span className="flex items-center gap-2">
                                  <span className="text-gray-500">{item.value || '--'}</span>
                                  <span className={`font-semibold ${item.met ? 'text-green-600' : 'text-gray-400'}`}>
                                    +{item.points}
                                  </span>
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Missing Data Warning */}
                          {wscore.missingData.length > 0 && (
                            <div className="mt-3 p-2 bg-amber-100 dark:bg-amber-900/20 rounded text-xs text-amber-700 dark:text-amber-400">
                              ⚠️ Missing: {wscore.missingData.join(', ')} (Phase 3: TWS data)
                            </div>
                          )}

                          {/* Recommendation */}
                          <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                              {wscore.recommendation}
                            </div>
                            <div className="text-xs text-blue-600 dark:text-blue-400">
                              📍 {wscore.entryTrigger}
                            </div>
                          </div>
                        </div>
                      )
                    })()}

                    {/* Metrics Grid - Two Columns */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                      {/* MOMENTUM Section - Winners Strategy Criteria */}
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-green-600" />
                          Momentum Data
                          <span className="text-xs px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded ml-auto">
                            Winners Strategy
                          </span>
                        </h4>
                        <div className="space-y-3">
                          {/* Gap % with score */}
                          {(() => {
                            const gapScore = getGapScore(stock.gap_percent)
                            return (
                              <div className="flex justify-between items-center">
                                <span className="text-gray-600 dark:text-gray-400">Gap %</span>
                                <div className="flex items-center">
                                  <span className={`font-semibold ${gapScore.color}`}>
                                    {stock.gap_percent > 0 ? '+' : ''}{stock.gap_percent.toFixed(2)}%
                                  </span>
                                  <ScoreBadge score={gapScore} />
                                </div>
                              </div>
                            )
                          })()}
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Pre-Market Price</span>
                            <span className="font-semibold text-gray-900 dark:text-gray-100">${stock.pre_market_price.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Previous Close</span>
                            <span className="font-semibold text-gray-900 dark:text-gray-100">${stock.previous_close.toFixed(2)}</span>
                          </div>
                          {/* PM Volume with score */}
                          {(() => {
                            const volScore = getVolumeScore(stock.pre_market_volume)
                            return (
                              <div className="flex justify-between items-center">
                                <span className="text-gray-600 dark:text-gray-400">Pre-Market Volume</span>
                                <div className="flex items-center">
                                  <span className={`font-semibold ${volScore.color}`}>{formatNumber(stock.pre_market_volume)}</span>
                                  <ScoreBadge score={volScore} />
                                </div>
                              </div>
                            )
                          })()}
                          {/* Relative Volume - Key Winners Strategy metric */}
                          {(() => {
                            const relVolScore = getRelativeVolumeScore(stock.relative_volume)
                            return (
                              <div className="flex justify-between items-center">
                                <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                  Relative Volume
                                  <span className="text-xs text-blue-500" title="Volume vs 20-day avg. >5x = explosive">ℹ️</span>
                                </span>
                                {stock.relative_volume != null ? (
                                  <div className="flex items-center">
                                    <span className={`font-semibold ${relVolScore?.color || 'text-gray-900'}`}>
                                      {stock.relative_volume.toFixed(1)}x
                                    </span>
                                    {relVolScore && <ScoreBadge score={relVolScore} />}
                                  </div>
                                ) : (
                                  <span className="text-gray-400 italic text-sm">--</span>
                                )}
                              </div>
                            )
                          })()}
                          {/* Average Volume (20d) */}
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                              Avg Volume (20d)
                              <span className="text-xs text-blue-500" title="20-day average daily volume">ℹ️</span>
                            </span>
                            {stock.avg_volume_20d ? (
                              <span className="font-semibold text-gray-900 dark:text-gray-100">
                                {formatNumber(stock.avg_volume_20d)}
                              </span>
                            ) : (
                              <span className="text-gray-400 italic text-sm">--</span>
                            )}
                          </div>
                          {stock.bars?.vwap && (
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">VWAP</span>
                              <span className="font-semibold text-gray-900 dark:text-gray-100">${stock.bars.vwap.toFixed(2)}</span>
                            </div>
                          )}
                          {stock.sentiment?.score && (
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Sentiment</span>
                              <span className={`font-semibold ${stock.sentiment.score > 0.5 ? 'text-green-600' : 'text-red-600'}`}>
                                {(stock.sentiment.score * 100).toFixed(0)}% bullish
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* SQUEEZE POTENTIAL Section - Winners Strategy Criteria */}
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                          🔥 Squeeze Potential
                          <span className="text-xs px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded ml-auto">
                            Winners Strategy
                          </span>
                        </h4>
                        <div className="space-y-3">
                          {/* Float Shares - Critical for squeeze */}
                          {(() => {
                            const floatScore = getFloatScore(stock.fundamentals?.float_shares)
                            return (
                              <div className="flex justify-between items-center">
                                <span className="text-gray-600 dark:text-gray-400">Float</span>
                                {stock.fundamentals?.float_shares ? (
                                  <div className="flex items-center">
                                    <span className={`font-semibold ${floatScore?.color || 'text-gray-900'}`}>
                                      {formatNumber(stock.fundamentals.float_shares)}
                                    </span>
                                    {floatScore && <ScoreBadge score={floatScore} />}
                                  </div>
                                ) : (
                                  <span className="text-gray-400 italic text-sm">--</span>
                                )}
                              </div>
                            )
                          })()}

                          {/* Borrow Fee Rate - High = squeeze setup */}
                          {(() => {
                            const feeScore = getBorrowFeeScore(stock.short_data?.short_fee_rate)
                            return (
                              <div className="flex justify-between items-center">
                                <span className="text-gray-600 dark:text-gray-400">Borrow Fee %</span>
                                {stock.short_data?.short_fee_rate != null ? (
                                  <div className="flex items-center">
                                    <span className={`font-semibold ${feeScore?.color || 'text-gray-900'}`}>
                                      {stock.short_data.short_fee_rate.toFixed(1)}%
                                    </span>
                                    {feeScore && <ScoreBadge score={feeScore} />}
                                  </div>
                                ) : (
                                  <span className="text-gray-400 italic text-sm">--</span>
                                )}
                              </div>
                            )
                          })()}

                          {/* Borrow Difficulty */}
                          {(() => {
                            const diffScore = getBorrowDifficultyScore(stock.short_data?.borrow_difficulty)
                            return (
                              <div className="flex justify-between items-center">
                                <span className="text-gray-600 dark:text-gray-400">Borrow Difficulty</span>
                                {stock.short_data?.borrow_difficulty ? (
                                  <div className="flex items-center">
                                    <span className={`font-semibold ${diffScore?.color || 'text-gray-900'}`}>
                                      {stock.short_data.borrow_difficulty}
                                    </span>
                                    {diffScore && <ScoreBadge score={diffScore} />}
                                  </div>
                                ) : (
                                  <span className="text-gray-400 italic text-sm">--</span>
                                )}
                              </div>
                            )
                          })()}

                          {/* Shortable Shares - Available to short */}
                          {(() => {
                            const shortScore = getShortableScore(stock.short_data?.shortable_shares)
                            return (
                              <div className="flex justify-between items-center">
                                <span className="text-gray-600 dark:text-gray-400">Shortable Shares</span>
                                {stock.short_data?.shortable_shares ? (
                                  <div className="flex items-center">
                                    <span className={`font-semibold ${shortScore?.color || 'text-gray-900'}`}>
                                      {formatNumber(stock.short_data.shortable_shares)}
                                    </span>
                                    {shortScore && <ScoreBadge score={shortScore} />}
                                  </div>
                                ) : (
                                  <span className="text-gray-400 italic text-sm">--</span>
                                )}
                              </div>
                            )
                          })()}

                          {/* Shares Outstanding */}
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 dark:text-gray-400">Shares Outstanding</span>
                            {stock.fundamentals?.shares_outstanding ? (
                              <span className="font-semibold text-gray-900 dark:text-gray-100">
                                {formatNumber(stock.fundamentals.shares_outstanding)}
                              </span>
                            ) : (
                              <span className="text-gray-400 italic text-sm">--</span>
                            )}
                          </div>

                          {/* Market Cap - if available */}
                          {stock.fundamentals?.market_cap && (
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Market Cap</span>
                              <span className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(stock.fundamentals.market_cap)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Reddit Sentiment Section (Phase 4) */}
                    {(stock.reddit_mentions !== undefined || stock.reddit_sentiment !== undefined) && (
                      <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                          🔥 Reddit Sentiment
                          <span className="text-xs px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded ml-auto">
                            r/wallstreetbets + r/stocks
                          </span>
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col">
                            <span className="text-xs text-gray-500 dark:text-gray-400">24h Mentions</span>
                            <span className={`text-lg font-bold ${
                              (stock.reddit_mentions || 0) > 10 ? 'text-green-600' :
                              (stock.reddit_mentions || 0) > 5 ? 'text-yellow-600' : 'text-gray-600'
                            }`}>
                              {stock.reddit_mentions || 0}
                              {(stock.reddit_mentions || 0) > 10 && ' 🔥'}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs text-gray-500 dark:text-gray-400">Sentiment</span>
                            <span className={`text-lg font-bold ${
                              stock.reddit_sentiment_label === 'VERY_BULLISH' ? 'text-green-600' :
                              stock.reddit_sentiment_label === 'BULLISH' ? 'text-green-500' :
                              stock.reddit_sentiment_label === 'BEARISH' ? 'text-red-500' :
                              stock.reddit_sentiment_label === 'VERY_BEARISH' ? 'text-red-600' : 'text-gray-600'
                            }`}>
                              {stock.reddit_sentiment_label === 'VERY_BULLISH' && '🚀 '}
                              {stock.reddit_sentiment_label === 'BULLISH' && '📈 '}
                              {stock.reddit_sentiment_label === 'BEARISH' && '📉 '}
                              {stock.reddit_sentiment_label === 'VERY_BEARISH' && '💀 '}
                              {stock.reddit_sentiment_label?.replace('_', ' ') || 'N/A'}
                            </span>
                          </div>
                        </div>
                        {stock.reddit_sentiment !== undefined && (
                          <div className="mt-3 pt-3 border-t border-orange-200 dark:border-orange-700">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">Score:</span>
                              <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all ${
                                    stock.reddit_sentiment > 0.2 ? 'bg-green-500' :
                                    stock.reddit_sentiment < -0.2 ? 'bg-red-500' : 'bg-gray-400'
                                  }`}
                                  style={{ width: `${Math.min(100, Math.max(0, (stock.reddit_sentiment + 1) * 50))}%` }}
                                />
                              </div>
                              <span className="text-xs font-mono">
                                {(stock.reddit_sentiment > 0 ? '+' : '')}{stock.reddit_sentiment.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* AI Analysis Result */}
                    {analysisResults[stock.symbol] && (
                      <div className={`p-4 border-t ${
                        analysisResults[stock.symbol].verdict === 'BUY'
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                          : analysisResults[stock.symbol].verdict === 'SKIP'
                          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                          : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                      }`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                              analysisResults[stock.symbol].verdict === 'BUY'
                                ? 'bg-green-500 text-white'
                                : analysisResults[stock.symbol].verdict === 'SKIP'
                                ? 'bg-red-500 text-white'
                                : 'bg-amber-500 text-white'
                            }`}>
                              {analysisResults[stock.symbol].verdict === 'BUY' ? '🚀 BUY' :
                               analysisResults[stock.symbol].verdict === 'SKIP' ? '❌ SKIP' : '👀 WATCH'}
                            </span>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              Confidence: {analysisResults[stock.symbol].confidence}%
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            {analysisResults[stock.symbol].model && (
                              <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">
                                {analysisModels.find(m => m.id === analysisResults[stock.symbol].model)?.badge || '🤖'} {analysisResults[stock.symbol].model}
                              </span>
                            )}
                            <span>{analysisResults[stock.symbol].analysisTime}ms</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Reasons:</span>
                            <ul className="mt-1 space-y-1">
                              {analysisResults[stock.symbol].reasons.map((reason, i) => (
                                <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                                  <span className="text-gray-400">•</span>
                                  {reason}
                                </li>
                              ))}
                            </ul>
                          </div>
                          {analysisResults[stock.symbol].entryTrigger && (
                            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Entry Trigger:</span>
                              <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                                📍 {analysisResults[stock.symbol].entryTrigger}
                              </p>
                            </div>
                          )}
                          {analysisResults[stock.symbol].riskFlag && (
                            <div className="pt-2">
                              <span className="text-xs font-semibold text-red-500 uppercase">⚠️ Risk:</span>
                              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                                {analysisResults[stock.symbol].riskFlag}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Mode Toggle */}
                        <div className="flex items-center bg-gray-200 dark:bg-gray-700 rounded-lg p-0.5">
                          <button
                            onClick={() => setAnalysisMode('quick')}
                            className={`px-2 py-1 text-xs rounded-md transition-colors ${
                              analysisMode === 'quick'
                                ? 'bg-white dark:bg-gray-600 shadow-sm font-medium'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                            }`}
                          >
                            ⚡ Quick
                          </button>
                          <button
                            onClick={() => setAnalysisMode('deep')}
                            className={`px-2 py-1 text-xs rounded-md transition-colors ${
                              analysisMode === 'deep'
                                ? 'bg-white dark:bg-gray-600 shadow-sm font-medium'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                            }`}
                          >
                            🔬 Deep
                          </button>
                        </div>

                        {/* Model Selector */}
                        <select
                          value={analysisModel}
                          onChange={(e) => setAnalysisModel(e.target.value)}
                          className="px-2 py-1.5 text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                        >
                          {analysisModels.map((model) => (
                            <option key={model.id} value={model.id}>
                              {model.badge} {model.name}
                            </option>
                          ))}
                        </select>

                        <button
                          onClick={() => analyzeStock(stock)}
                          disabled={analyzingStock === stock.symbol}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors text-sm font-medium"
                        >
                          {analyzingStock === stock.symbol ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              Analyzing...
                            </>
                          ) : analysisResults[stock.symbol] ? (
                            <>
                              <Bot className="w-4 h-4" />
                              Re-analyze
                            </>
                          ) : (
                            <>
                              <Bot className="w-4 h-4" />
                              Run AI Analysis
                            </>
                          )}
                        </button>
                        <button
                          disabled
                          className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white rounded-lg transition-colors text-sm font-medium"
                          title="Coming in Phase 3"
                        >
                          <Star className="w-4 h-4" />
                          Add to Watchlist
                        </button>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Score breakdown: Rank {40 - stock.rank * 2}/40 + Gap {Math.min(30, Math.abs(stock.gap_percent) * 3).toFixed(0)}/30 + Vol {Math.min(30, stock.pre_market_volume / 1_000_000 * 10).toFixed(0)}/30
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {data.stocks.length === 0 && (
            <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
              <p className="text-gray-600 dark:text-gray-400">
                No screening results found. Run the orchestrator during pre-market hours (4:00-9:30am ET).
              </p>
            </div>
          )}
        </div>
      )}

      {/* History Panel Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <History className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Scan History</h3>
                <span className="text-sm text-gray-500">({scanHistory.length} scans)</span>
              </div>
              <button
                onClick={() => setShowHistory(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(80vh-80px)] p-6">
              {loadingHistory ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-6 h-6 animate-spin text-purple-600" />
                  <span className="ml-3 text-gray-600 dark:text-gray-400">Loading history...</span>
                </div>
              ) : scanHistory.length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No scan history yet.</p>
                  <p className="text-sm text-gray-500 mt-1">Run a scan to start building your history.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {scanHistory.map((scan) => (
                    <div
                      key={scan.id}
                      onClick={() => loadHistoricalScan(scan)}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors border border-gray-200 dark:border-gray-600"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                          <span className="text-xl font-bold text-purple-600 dark:text-purple-400">
                            {scan.stocks_count}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {new Date(scan.scanned_at).toLocaleDateString()} at {new Date(scan.scanned_at).toLocaleTimeString()}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {scan.stocks_count} stocks • Vol &gt;{(scan.filters.min_volume / 1000).toFixed(0)}K • ${scan.filters.min_price}-${scan.filters.max_price}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {/* Top 3 symbols preview */}
                        <div className="hidden sm:flex gap-1">
                          {scan.stocks.slice(0, 3).map((stock) => (
                            <span
                              key={stock.symbol}
                              className={`px-2 py-1 text-xs font-medium rounded ${
                                stock.gap_percent >= 0
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                              }`}
                            >
                              {stock.symbol}
                            </span>
                          ))}
                        </div>
                        <ChevronDown className="w-4 h-4 text-gray-400 -rotate-90" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

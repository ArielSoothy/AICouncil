'use client'

import { useState, useEffect, useRef } from 'react'
import { RefreshCw, TrendingUp, TrendingDown, Clock, Database, AlertCircle, Play, Terminal } from 'lucide-react'

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
  }
  short_data?: {
    shortable_shares?: number
    borrow_difficulty?: string
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

  // ✅ Filter state - V2 API uses: minVolume, minPrice, maxPrice, maxResults
  // Note: Gap, Float, and RelVol sliders are UI-only for now (V2 scanner uses TWS filters)
  const [minGapPercent, setMinGapPercent] = useState<number>(10) // UI-only (not sent to V2 API yet)
  const [minVolume, setMinVolume] = useState<number>(500000) // ✅ Sent to V2 API
  const [maxFloatShares, setMaxFloatShares] = useState<number>(30000000) // UI-only (not sent to V2 API yet)
  const [minRelativeVolume, setMinRelativeVolume] = useState<number>(5.0) // UI-only (not sent to V2 API yet)
  const [minPrice, setMinPrice] = useState<number>(1.0) // ✅ Sent to V2 API
  const [maxPrice, setMaxPrice] = useState<number>(20.0) // ✅ Sent to V2 API
  const [maxResults, setMaxResults] = useState<number>(20) // ✅ Sent to V2 API

  const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000'

  const fetchScreening = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${FASTAPI_URL}/api/screening/latest`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || `HTTP ${response.status}`)
      }

      const screeningData: ScreeningResponse = await response.json()
      setData(screeningData)
      setLastUpdate(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch screening data')
      console.error('Screening fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const runScreening = async (customParams?: {
    minVolume?: number
    minPrice?: number
    maxPrice?: number
    maxResults?: number
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
    // Note: V2 API only uses minVolume, minPrice, maxPrice, maxResults
    const effectiveParams = {
      minVolume: customParams?.minVolume ?? minVolume,
      minPrice: customParams?.minPrice ?? minPrice,
      maxPrice: customParams?.maxPrice ?? maxPrice,
      maxResults: customParams?.maxResults ?? maxResults
    }

    try {
      // === USE V2 API (SYNCHRONOUS SCANNER - WORKS!) ===
      const params = new URLSearchParams({
        min_volume: String(effectiveParams.minVolume),
        min_price: String(effectiveParams.minPrice),
        max_price: String(effectiveParams.maxPrice),
        max_results: String(effectiveParams.maxResults)
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
                }
                const formattedStocks: StockResult[] = status.stocks.map((stock: EnrichedStock) => ({
                  symbol: stock.symbol,
                  rank: stock.rank,
                  gap_percent: stock.gap_percent || 0,
                  gap_direction: (stock.gap_direction || 'up') as 'up' | 'down',
                  pre_market_volume: stock.pre_market_volume || 0,
                  pre_market_price: stock.pre_market_price || 0,
                  previous_close: stock.previous_close || 0,
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

  // Initial load
  useEffect(() => {
    fetchScreening()
  }, [])

  const formatNumber = (num: number): string => {
    if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(2)}B`
    if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
    return num.toLocaleString()
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
          {/* Gap Percentage Slider */}
          <div className="space-y-2">
            <label className="flex items-center justify-between text-sm font-medium text-blue-900 dark:text-blue-100">
              <span>Min Gap %</span>
              <span className="font-bold text-blue-600 dark:text-blue-400">{minGapPercent}%</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600 dark:text-gray-400">5%</span>
              <input
                type="range"
                min="5"
                max="50"
                step="1"
                value={minGapPercent}
                onChange={(e) => setMinGapPercent(Number(e.target.value))}
                className="flex-1 h-2 bg-blue-200 dark:bg-blue-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <span className="text-xs text-gray-600 dark:text-gray-400">50%</span>
            </div>
            <p className="text-xs text-blue-700 dark:text-blue-300 italic">
              Higher gaps = stronger momentum
            </p>
          </div>

          {/* Min Volume Slider */}
          <div className="space-y-2">
            <label className="flex items-center justify-between text-sm font-medium text-blue-900 dark:text-blue-100">
              <span>Min Volume</span>
              <span className="font-bold text-blue-600 dark:text-blue-400">{(minVolume / 1000).toFixed(0)}K</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600 dark:text-gray-400">100K</span>
              <input
                type="range"
                min="100000"
                max="5000000"
                step="100000"
                value={minVolume}
                onChange={(e) => setMinVolume(Number(e.target.value))}
                className="flex-1 h-2 bg-blue-200 dark:bg-blue-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <span className="text-xs text-gray-600 dark:text-gray-400">5M</span>
            </div>
            <p className="text-xs text-blue-700 dark:text-blue-300 italic">
              Absolute volume threshold
            </p>
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
                setMinVolume(500000)
                setMaxFloatShares(30000000)
                setMinRelativeVolume(5.0)
                setMinPrice(1.0)
                setMaxPrice(20.0)
                setMaxResults(20)
                // Run with V2 API params
                runScreening({ minVolume: 500000, minPrice: 1.0, maxPrice: 20.0, maxResults: 20 })
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
                setMinVolume(1000000)
                setMaxFloatShares(15000000)
                setMinRelativeVolume(10.0)
                setMinPrice(1.0)
                setMaxPrice(10.0)
                setMaxResults(10)
                // Run with V2 API params
                runScreening({ minVolume: 1000000, minPrice: 1.0, maxPrice: 10.0, maxResults: 10 })
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
                setMinVolume(250000)
                setMaxFloatShares(50000000)
                setMinRelativeVolume(2.0)
                setMinPrice(0.5)
                setMaxPrice(50.0)
                setMaxResults(50)
                // Run with V2 API params
                runScreening({ minVolume: 250000, minPrice: 0.5, maxPrice: 50.0, maxResults: 50 })
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

      {/* Stocks list */}
      {data && !error && (
        <div className="space-y-4">
          {data.stocks.map((stock) => (
            <div
              key={stock.symbol}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              {/* Header row */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {stock.symbol}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Rank #{stock.rank + 1}
                      </span>
                      {stock.gap_direction === 'up' ? (
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-600" />
                      )}
                      <span className={`text-lg font-semibold ${stock.gap_direction === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                        {stock.gap_percent > 0 ? '+' : ''}{stock.gap_percent.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className={`text-3xl font-bold ${getScoreColor(stock.score)}`}>
                    {stock.score}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Score</div>
                </div>
              </div>

              {/* Price info */}
              <div className="grid grid-cols-3 gap-4 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pre-Market Price</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    ${stock.pre_market_price.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Previous Close</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    ${stock.previous_close.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Volume</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {formatNumber(stock.pre_market_volume)}
                  </div>
                </div>
              </div>

              {/* Additional data grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {/* Fundamentals */}
                {stock.fundamentals && (
                  <>
                    {stock.fundamentals.pe_ratio && (
                      <div>
                        <div className="text-gray-500 dark:text-gray-400">P/E Ratio</div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          {stock.fundamentals.pe_ratio.toFixed(2)}
                        </div>
                      </div>
                    )}
                    {stock.fundamentals.market_cap && (
                      <div>
                        <div className="text-gray-500 dark:text-gray-400">Market Cap</div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          {formatNumber(stock.fundamentals.market_cap)}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Short data */}
                {stock.short_data && (
                  <>
                    {stock.short_data.shortable_shares && (
                      <div>
                        <div className="text-gray-500 dark:text-gray-400">Shortable Shares</div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          {formatNumber(stock.short_data.shortable_shares)}
                        </div>
                      </div>
                    )}
                    {stock.short_data.borrow_difficulty && (
                      <div>
                        <div className="text-gray-500 dark:text-gray-400">Borrow Difficulty</div>
                        <div className={`font-semibold ${getDifficultyColor(stock.short_data.borrow_difficulty)}`}>
                          {stock.short_data.borrow_difficulty}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Ratios */}
                {stock.ratios && (
                  <>
                    {stock.ratios.roe && (
                      <div>
                        <div className="text-gray-500 dark:text-gray-400">ROE</div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          {stock.ratios.roe.toFixed(1)}%
                        </div>
                      </div>
                    )}
                    {stock.ratios.debt_to_equity && (
                      <div>
                        <div className="text-gray-500 dark:text-gray-400">Debt/Equity</div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          {stock.ratios.debt_to_equity.toFixed(2)}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Sentiment */}
                {stock.sentiment && stock.sentiment.score && (
                  <div>
                    <div className="text-gray-500 dark:text-gray-400">Sentiment</div>
                    <div className={`font-semibold ${stock.sentiment.score > 0.5 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {(stock.sentiment.score * 100).toFixed(0)}%
                      {stock.sentiment.mentions && ` (${stock.sentiment.mentions})`}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {data.stocks.length === 0 && (
            <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
              <p className="text-gray-600 dark:text-gray-400">
                No screening results found. Run the orchestrator during pre-market hours (4:00-9:30am ET).
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

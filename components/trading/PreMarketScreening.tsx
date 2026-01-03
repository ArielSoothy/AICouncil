'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, TrendingUp, TrendingDown, Clock, Database, AlertCircle, Play } from 'lucide-react'

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

interface ScreeningResponse {
  stocks: StockResult[]
  total_scanned: number
  total_returned: number
  execution_time_seconds: number
  timestamp: string
}

export default function PreMarketScreening() {
  const [data, setData] = useState<ScreeningResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [progressStep, setProgressStep] = useState<string>('')

  const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8001'

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

  const runScreening = async () => {
    setRunning(true)
    setError(null)
    setProgressStep('Starting orchestrator...')

    try {
      // Start the screening
      const response = await fetch(`${FASTAPI_URL}/api/screening/run`, {
        method: 'POST'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || `HTTP ${response.status}`)
      }

      const result = await response.json()
      console.log('[INFO] Screening started:', result)

      // Show progress steps
      setProgressStep('Connecting to TWS Desktop...')
      await new Promise(resolve => setTimeout(resolve, 2000))

      setProgressStep('Scanning pre-market stocks...')
      await new Promise(resolve => setTimeout(resolve, 3000))

      setProgressStep('Fetching fundamentals & data...')
      await new Promise(resolve => setTimeout(resolve, 5000))

      setProgressStep('Calculating scores...')
      await new Promise(resolve => setTimeout(resolve, 3000))

      setProgressStep('Saving to database...')
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Fetch new results
      setProgressStep('Loading results...')
      await fetchScreening()

      setProgressStep('')
      setRunning(false)
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
            onClick={runScreening}
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

      {/* Progress indicator */}
      {running && progressStep && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5 animate-spin" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">Running Screening...</h3>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">{progressStep}</p>
              <div className="mt-3 bg-blue-200 dark:bg-blue-800 rounded-full h-2 overflow-hidden">
                <div className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
              </div>
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

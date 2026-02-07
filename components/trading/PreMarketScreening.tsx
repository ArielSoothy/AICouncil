'use client'

import { useState } from 'react'
import { RefreshCw, Clock, AlertCircle, Play, Terminal, ArrowUpDown, ChevronDown, History, Database, Swords } from 'lucide-react'
import { useScreeningData } from './screening/use-screening-data'
import { ScreeningFilters } from './screening/screening-filters'
import { ScreeningStats } from './screening/screening-stats'
import { StockCard } from './screening/stock-card'
import { ScreeningHistory } from './screening/screening-history'
import { DebateConfigModal } from './screening-debate/debate-config-modal'
import { useScreeningDebate } from './screening-debate/use-screening-debate'
import { DebateProgressBar } from './screening-debate/debate-progress-bar'
import type { SortField } from './screening/types'
import { DEFAULT_SCREENING_DEBATE_CONFIG } from '@/lib/trading/screening-debate/types'
import type { ScreeningDebateConfig } from '@/lib/trading/screening-debate/types'

export default function PreMarketScreening() {
  const {
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
  } = useScreeningData()

  const [showDebateConfig, setShowDebateConfig] = useState(false)
  const debate = useScreeningDebate()

  const handleStartDebate = (config: ScreeningDebateConfig) => {
    debate.startDebate(config)
  }

  const handleDebateStock = (symbol: string) => {
    debate.startDebate({
      ...DEFAULT_SCREENING_DEBATE_CONFIG,
      symbols: [symbol],
      topN: 1,
    })
  }

  const sortOptions: { value: SortField; label: string; icon: string }[] = [
    { value: 'gap_percent', label: 'Top Gainers', icon: 'chart' },
    { value: 'score', label: 'Highest Score', icon: 'star' },
    { value: 'pre_market_volume', label: 'Most Volume', icon: 'bar' },
    { value: 'pre_market_price', label: 'Price', icon: 'dollar' },
    { value: 'rank', label: 'Scanner Rank', icon: 'trophy' },
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

          {/* Debate Top Stocks button */}
          {data && data.stocks.length > 0 && (
            <button
              onClick={() => setShowDebateConfig(true)}
              disabled={debate.isRunning}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white rounded-lg transition-colors"
              title="Run AI debate on top screened stocks"
            >
              <Swords className={`w-4 h-4 ${debate.isRunning ? 'animate-pulse' : ''}`} />
              {debate.isRunning ? 'Debating...' : 'Debate Top Stocks'}
            </button>
          )}

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
              &bull; Data from: {new Date(data.timestamp).toLocaleString()}
            </span>
          )}
        </div>
      )}

      {/* Advanced Filters Panel */}
      <ScreeningFilters
        minGapPercent={minGapPercent} setMinGapPercent={setMinGapPercent}
        maxGapPercent={maxGapPercent} setMaxGapPercent={setMaxGapPercent}
        gapDirection={gapDirection} setGapDirection={setGapDirection}
        minVolume={minVolume} setMinVolume={setMinVolume}
        maxVolume={maxVolume} setMaxVolume={setMaxVolume}
        maxFloatShares={maxFloatShares} setMaxFloatShares={setMaxFloatShares}
        minRelativeVolume={minRelativeVolume} setMinRelativeVolume={setMinRelativeVolume}
        minWinnersScore={minWinnersScore} setMinWinnersScore={setMinWinnersScore}
        minBorrowFee={minBorrowFee} setMinBorrowFee={setMinBorrowFee}
        minPrice={minPrice} setMinPrice={setMinPrice}
        maxPrice={maxPrice} setMaxPrice={setMaxPrice}
        maxResults={maxResults} setMaxResults={setMaxResults}
        running={running} loading={loading} runScreening={runScreening}
      />

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

      {/* Real-Time Flow Log */}
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
                  {entry.status === 'success' ? '\u2705' : entry.status === 'error' ? '\u274C' : '\u23F3'}
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

      {/* TWS Warning */}
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

      {/* Error state - generic */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 dark:text-red-100">Error running screening</h3>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1 whitespace-pre-line">{error}</p>
              <button
                onClick={fetchScreening}
                disabled={loading}
                className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50"
              >
                {loading ? 'Retrying...' : 'Retry'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats summary */}
      {data && (
        <ScreeningStats data={data} />
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
              <span className="ml-2 text-blue-900 dark:text-blue-100">&ge; {data.scan_parameters.min_gap_percent}%</span>
            </div>
            <div>
              <span className="text-blue-600 dark:text-blue-400 font-medium">Volume:</span>
              <span className="ml-2 text-blue-900 dark:text-blue-100">&ge; {(data.scan_parameters.min_volume / 1000).toFixed(0)}K</span>
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
      {data && data.stocks.length > 0 && (
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
      {data && (
        <div className="space-y-3">
          {getSortedStocks().map((stock) => (
            <StockCard
              key={stock.symbol}
              stock={stock}
              isExpanded={expandedStock === stock.symbol}
              onToggleExpand={() => setExpandedStock(expandedStock === stock.symbol ? null : stock.symbol)}
              winnersScore={getWinnersScore(stock)}
              analysisResult={analysisResults[stock.symbol]}
              analyzingStock={analyzingStock}
              analysisMode={analysisMode}
              setAnalysisMode={setAnalysisMode}
              analysisModel={analysisModel}
              setAnalysisModel={setAnalysisModel}
              onAnalyze={analyzeStock}
              debateResult={debate.results.find(r => r.symbol === stock.symbol)}
              onDebateStock={handleDebateStock}
              isDebating={debate.isRunning && debate.currentStock === stock.symbol}
            />
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

      {/* Debate Progress */}
      {debate.isRunning && (
        <DebateProgressBar
          currentStock={debate.currentStock}
          currentStockIndex={debate.currentStockIndex}
          totalStocks={debate.totalStocks}
          currentRound={debate.currentRound}
          results={debate.results}
          onStop={debate.stopDebate}
        />
      )}

      {/* Debate Results Summary */}
      {!debate.isRunning && debate.results.length > 0 && debate.summary && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-amber-900 dark:text-amber-100 flex items-center gap-2">
              <Swords className="w-4 h-4" />
              Debate Results
            </h3>
            <button
              onClick={debate.reset}
              className="text-xs text-amber-600 hover:text-amber-800 underline"
            >
              Clear
            </button>
          </div>
          <div className="grid grid-cols-4 gap-3 text-center">
            <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-2">
              <p className="text-2xl font-bold text-green-700 dark:text-green-400">{debate.summary.buys}</p>
              <p className="text-xs text-green-600 dark:text-green-500">BUY</p>
            </div>
            <div className="bg-amber-100 dark:bg-amber-900/30 rounded-lg p-2">
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{debate.summary.watches}</p>
              <p className="text-xs text-amber-600 dark:text-amber-500">WATCH</p>
            </div>
            <div className="bg-red-100 dark:bg-red-900/30 rounded-lg p-2">
              <p className="text-2xl font-bold text-red-700 dark:text-red-400">{debate.summary.skips}</p>
              <p className="text-xs text-red-600 dark:text-red-500">SKIP</p>
            </div>
            <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-2">
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{debate.summary.tradesExecuted}</p>
              <p className="text-xs text-blue-600 dark:text-blue-500">TRADES</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-right">
            {(debate.summary.totalDuration / 1000).toFixed(0)}s | {debate.summary.totalTokens.toLocaleString()} tokens
          </p>
        </div>
      )}

      {/* Debate Config Modal */}
      <DebateConfigModal
        isOpen={showDebateConfig}
        onClose={() => setShowDebateConfig(false)}
        onStart={handleStartDebate}
      />

      {/* History Panel Modal */}
      <ScreeningHistory
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        scanHistory={scanHistory}
        loadingHistory={loadingHistory}
        onLoadScan={loadHistoricalScan}
      />
    </div>
  )
}

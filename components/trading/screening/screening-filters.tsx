'use client'

import { Database } from 'lucide-react'

interface ScreeningFiltersProps {
  minGapPercent: number
  setMinGapPercent: (v: number) => void
  maxGapPercent: number
  setMaxGapPercent: (v: number) => void
  gapDirection: 'up' | 'down' | 'both'
  setGapDirection: (v: 'up' | 'down' | 'both') => void
  minVolume: number
  setMinVolume: (v: number) => void
  maxVolume: number
  setMaxVolume: (v: number) => void
  maxFloatShares: number
  setMaxFloatShares: (v: number) => void
  minRelativeVolume: number
  setMinRelativeVolume: (v: number) => void
  minWinnersScore: number
  setMinWinnersScore: (v: number) => void
  minBorrowFee: number
  setMinBorrowFee: (v: number) => void
  minPrice: number
  setMinPrice: (v: number) => void
  maxPrice: number
  setMaxPrice: (v: number) => void
  maxResults: number
  setMaxResults: (v: number) => void
  running: boolean
  loading: boolean
  runScreening: (params?: {
    minVolume?: number
    maxVolume?: number
    minPrice?: number
    maxPrice?: number
    maxResults?: number
    minGapPercent?: number
    maxGapPercent?: number
    gapDirection?: 'up' | 'down' | 'both'
  }) => void
}

export function ScreeningFilters({
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
  running, loading, runScreening,
}: ScreeningFiltersProps) {
  return (
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
            <span className="font-bold text-blue-600 dark:text-blue-400">{minGapPercent}%+</span>
          </label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600 dark:text-gray-400">5%</span>
            <input
              type="range"
              min="5"
              max="30"
              step="1"
              value={minGapPercent}
              onChange={(e) => setMinGapPercent(Number(e.target.value))}
              className="flex-1 h-2 bg-blue-200 dark:bg-blue-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <span className="text-xs text-gray-600 dark:text-gray-400">30%</span>
          </div>
          <p className="text-xs text-blue-700 dark:text-blue-300 italic">
            Stocks gapping at least this %
          </p>
        </div>

        {/* Gap Direction Selector */}
        <div className="space-y-2">
          <label className="flex items-center justify-between text-sm font-medium text-blue-900 dark:text-blue-100">
            <span>Gap Direction</span>
            <span className="font-bold text-blue-600 dark:text-blue-400">
              {gapDirection === 'up' ? 'UP' : gapDirection === 'down' ? 'DOWN' : 'BOTH'}
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
              UP
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
              DOWN
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
              BOTH
            </button>
          </div>
          <p className="text-xs text-blue-700 dark:text-blue-300 italic">
            UP = momentum runners, DOWN = shorts/reversals
          </p>
        </div>

        {/* Volume Range (Combined) */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-blue-900 dark:text-blue-100">
            Pre-Market Volume
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="text-xs text-gray-600 dark:text-gray-400">Min</label>
              <div className="flex items-center">
                <input
                  type="number"
                  min="0.1"
                  max="10"
                  step="0.1"
                  value={(minVolume / 1_000_000).toFixed(1)}
                  onChange={(e) => setMinVolume(Number(e.target.value) * 1_000_000)}
                  className="w-full px-2 py-1 text-sm border border-blue-300 dark:border-blue-700 rounded-l bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
                <span className="px-2 py-1 text-sm bg-gray-100 dark:bg-gray-700 border border-l-0 border-blue-300 dark:border-blue-700 rounded-r text-gray-600 dark:text-gray-400">M</span>
              </div>
            </div>
            <span className="text-gray-500 mt-5">-</span>
            <div className="flex-1">
              <label className="text-xs text-gray-600 dark:text-gray-400">Max</label>
              <div className="flex items-center">
                <input
                  type="number"
                  min="0"
                  max="500"
                  step="10"
                  value={maxVolume === 0 ? '' : (maxVolume / 1_000_000).toFixed(0)}
                  placeholder="&infin;"
                  onChange={(e) => setMaxVolume(e.target.value === '' ? 0 : Number(e.target.value) * 1_000_000)}
                  className="w-full px-2 py-1 text-sm border border-blue-300 dark:border-blue-700 rounded-l bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
                <span className="px-2 py-1 text-sm bg-gray-100 dark:bg-gray-700 border border-l-0 border-blue-300 dark:border-blue-700 rounded-r text-gray-600 dark:text-gray-400">M</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-blue-700 dark:text-blue-300 italic">
            Empty max = no limit
          </p>
        </div>

        {/* Max Float Shares Slider */}
        <div className="space-y-2">
          <label className="flex items-center justify-between text-sm font-medium text-blue-900 dark:text-blue-100">
            <span>Max Float (Shares)</span>
            <span className="font-bold text-blue-600 dark:text-blue-400">{(maxFloatShares / 1000000).toFixed(0)}M</span>
          </label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600 dark:text-gray-400">1M</span>
            <input
              type="range"
              min="1000000"
              max="50000000"
              step="1000000"
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

        {/* Min Winners Score */}
        <div className="space-y-2">
          <label className="flex items-center justify-between text-sm font-medium text-blue-900 dark:text-blue-100">
            <span>Min Winners Score</span>
            <span className="font-bold text-green-600 dark:text-green-400">{minWinnersScore === 0 ? 'OFF' : `${minWinnersScore}/10`}</span>
          </label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600 dark:text-gray-400">0</span>
            <input
              type="range"
              min="0"
              max="8"
              step="1"
              value={minWinnersScore}
              onChange={(e) => setMinWinnersScore(Number(e.target.value))}
              className="flex-1 h-2 bg-green-200 dark:bg-green-800 rounded-lg appearance-none cursor-pointer accent-green-600"
            />
            <span className="text-xs text-gray-600 dark:text-gray-400">8</span>
          </div>
          <p className="text-xs text-green-700 dark:text-green-300 italic">
            0 = show all, higher = only top setups
          </p>
        </div>

        {/* Min Borrow Fee */}
        <div className="space-y-2">
          <label className="flex items-center justify-between text-sm font-medium text-blue-900 dark:text-blue-100">
            <span>Min Borrow Fee %</span>
            <span className="font-bold text-orange-600 dark:text-orange-400">{minBorrowFee === 0 ? 'OFF' : `${minBorrowFee}%+`}</span>
          </label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600 dark:text-gray-400">0</span>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={minBorrowFee}
              onChange={(e) => setMinBorrowFee(Number(e.target.value))}
              className="flex-1 h-2 bg-orange-200 dark:bg-orange-800 rounded-lg appearance-none cursor-pointer accent-orange-600"
            />
            <span className="text-xs text-gray-600 dark:text-gray-400">100</span>
          </div>
          <p className="text-xs text-orange-700 dark:text-orange-300 italic">
            High fee = squeeze potential
          </p>
        </div>
      </div>

      {/* Quick Presets */}
      <div className="mt-6 pt-4 border-t border-blue-300 dark:border-blue-700">
        <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-3">Quick Presets (click to update sliders):</h4>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setMinGapPercent(10)
              setMaxGapPercent(100)
              setMinVolume(500000)
              setMaxVolume(50000000)
              setMaxFloatShares(30000000)
              setMinRelativeVolume(5.0)
              setMinWinnersScore(0)
              setMinBorrowFee(0)
              setMinPrice(1.0)
              setMaxPrice(20.0)
              setMaxResults(20)
              setGapDirection('up')
              runScreening({ minVolume: 500000, maxVolume: 50000000, minPrice: 1.0, maxPrice: 20.0, maxResults: 20, minGapPercent: 10, maxGapPercent: 100, gapDirection: 'up' })
            }}
            disabled={running || loading}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm rounded transition-colors"
          >
            Low-Float Runners
          </button>
          <button
            onClick={() => {
              setMinGapPercent(10)
              setMaxGapPercent(100)
              setMinVolume(300000)
              setMaxVolume(0)
              setMaxFloatShares(15000000)
              setMinRelativeVolume(3.0)
              setMinWinnersScore(5)
              setMinBorrowFee(20)
              setMinPrice(1.0)
              setMaxPrice(30.0)
              setMaxResults(20)
              setGapDirection('up')
              runScreening({ minVolume: 300000, maxVolume: 0, minPrice: 1.0, maxPrice: 30.0, maxResults: 20, minGapPercent: 10, maxGapPercent: 100, gapDirection: 'up' })
            }}
            disabled={running || loading}
            className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white text-sm rounded transition-colors"
          >
            Squeeze Plays
          </button>
          <button
            onClick={() => {
              setMinGapPercent(20)
              setMaxGapPercent(60)
              setMinVolume(1000000)
              setMaxVolume(100000000)
              setMaxFloatShares(15000000)
              setMinRelativeVolume(10.0)
              setMinWinnersScore(0)
              setMinBorrowFee(0)
              setMinPrice(1.0)
              setMaxPrice(10.0)
              setMaxResults(10)
              setGapDirection('up')
              runScreening({ minVolume: 1000000, maxVolume: 100000000, minPrice: 1.0, maxPrice: 10.0, maxResults: 10, minGapPercent: 20, maxGapPercent: 60, gapDirection: 'up' })
            }}
            disabled={running || loading}
            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white text-sm rounded transition-colors"
          >
            Extreme Movers
          </button>
          <button
            onClick={() => {
              setMinGapPercent(5)
              setMaxGapPercent(100)
              setMinVolume(250000)
              setMaxVolume(0)
              setMaxFloatShares(50000000)
              setMinRelativeVolume(2.0)
              setMinWinnersScore(0)
              setMinBorrowFee(0)
              setMinPrice(0.5)
              setMaxPrice(50.0)
              setMaxResults(50)
              setGapDirection('both')
              runScreening({ minVolume: 250000, maxVolume: 0, minPrice: 0.5, maxPrice: 50.0, maxResults: 50, minGapPercent: 5, maxGapPercent: 100, gapDirection: 'both' })
            }}
            disabled={running || loading}
            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm rounded transition-colors"
          >
            Wide Net
          </button>
        </div>
        <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 italic">
          Presets update filters + run scan. Score & Borrow Fee filters apply client-side after scan.
        </p>
      </div>
    </div>
  )
}

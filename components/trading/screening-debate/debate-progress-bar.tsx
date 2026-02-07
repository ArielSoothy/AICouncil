'use client'

import { Square, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import type { StockDebateResult, ScreeningVerdict } from '@/lib/trading/screening-debate/types'

interface DebateProgressBarProps {
  currentStock: string | null
  currentStockIndex: number
  totalStocks: number
  currentRound: number
  results: StockDebateResult[]
  onStop: () => void
}

const VERDICT_COLORS: Record<ScreeningVerdict, string> = {
  BUY: 'bg-green-500',
  WATCH: 'bg-amber-500',
  SKIP: 'bg-red-500',
}

export function DebateProgressBar({
  currentStock,
  currentStockIndex,
  totalStocks,
  currentRound,
  results,
  onStop,
}: DebateProgressBarProps) {
  const progress = totalStocks > 0 ? (currentStockIndex / totalStocks) * 100 : 0

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          <h3 className="font-semibold text-blue-900 dark:text-blue-100">
            Debating: {currentStock || 'Loading...'}
          </h3>
          <span className="text-xs text-blue-600 bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
            Stock {currentStockIndex}/{totalStocks}
          </span>
          {currentRound > 0 && (
            <span className="text-xs text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full">
              Round {currentRound}/2
            </span>
          )}
        </div>
        <button
          onClick={onStop}
          className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <Square className="w-3 h-3" />
          Stop
        </button>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-3">
        <div
          className="bg-blue-500 h-2 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Completed stock verdicts */}
      {results.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {results.map(r => (
            <span
              key={r.symbol}
              className={`inline-flex items-center gap-1 text-xs text-white px-2 py-1 rounded-full ${
                VERDICT_COLORS[r.judgeVerdict.verdict]
              }`}
            >
              {r.symbol}: {r.judgeVerdict.verdict}
              <span className="opacity-75">({r.judgeVerdict.confidence}%)</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

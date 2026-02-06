'use client'

import { History, X, RefreshCw, ChevronDown } from 'lucide-react'
import type { ScreeningScanResult } from '@/lib/trading/screening-cache'

interface ScreeningHistoryProps {
  isOpen: boolean
  onClose: () => void
  scanHistory: ScreeningScanResult[]
  loadingHistory: boolean
  onLoadScan: (scan: ScreeningScanResult) => void
}

export function ScreeningHistory({
  isOpen,
  onClose,
  scanHistory,
  loadingHistory,
  onLoadScan,
}: ScreeningHistoryProps) {
  if (!isOpen) return null

  return (
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
            onClick={onClose}
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
                  onClick={() => onLoadScan(scan)}
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
                        {scan.stocks_count} stocks &bull; Vol &gt;{(scan.filters.min_volume / 1000).toFixed(0)}K &bull; ${scan.filters.min_price}-${scan.filters.max_price}
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
  )
}

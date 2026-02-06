'use client'

import { Database, TrendingUp, Clock } from 'lucide-react'
import type { ScreeningResponse } from './types'

interface ScreeningStatsProps {
  data: ScreeningResponse
}

export function ScreeningStats({ data }: ScreeningStatsProps) {
  return (
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
          {data.stocks.length > 0
            ? (data.stocks.reduce((sum, s) => sum + s.score, 0) / data.stocks.length).toFixed(1)
            : '0'}
        </div>
      </div>
    </div>
  )
}

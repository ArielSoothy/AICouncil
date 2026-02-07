'use client'

import { useState, useEffect } from 'react'
import { Swords, Calendar, RefreshCw, ChevronRight, AlertCircle } from 'lucide-react'
import { BriefingStockCard } from './briefing-stock-card'
import type { ScreeningDebateRow, DailyBriefing as DailyBriefingType } from '@/lib/trading/screening-debate/types'

function getScreeningKey(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem('screening_access_key')
  } catch {
    return null
  }
}

export function DailyBriefing() {
  const [debates, setDebates] = useState<ScreeningDebateRow[]>([])
  const [selectedDebate, setSelectedDebate] = useState<ScreeningDebateRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDebates = async () => {
    setLoading(true)
    setError(null)
    try {
      const key = getScreeningKey()
      const params = new URLSearchParams({ limit: '20' })
      if (key) params.set('key', key)

      const res = await fetch(`/api/trading/screening/debate/results?${params}`)
      if (!res.ok) {
        if (res.status === 401) {
          setError('Authentication required. Set screening access key in Settings.')
          return
        }
        throw new Error(`HTTP ${res.status}`)
      }
      const data = await res.json()
      setDebates(data.debates || [])

      // Auto-select latest completed debate
      const latest = (data.debates || []).find((d: ScreeningDebateRow) => d.status === 'completed')
      if (latest && !selectedDebate) {
        loadFullDebate(latest.id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load briefings')
    } finally {
      setLoading(false)
    }
  }

  const loadFullDebate = async (id: string) => {
    try {
      const key = getScreeningKey()
      const params = new URLSearchParams({ id })
      if (key) params.set('key', key)

      const res = await fetch(`/api/trading/screening/debate/results?${params}`)
      if (!res.ok) throw new Error('Failed to load debate')
      const data: ScreeningDebateRow = await res.json()
      setSelectedDebate(data)
    } catch (err) {
      console.error('Failed to load debate:', err)
    }
  }

  useEffect(() => {
    fetchDebates()
  }, [])

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Swords className="w-6 h-6 text-amber-600" />
            Daily Briefing
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            AI-debated screening results with judge verdicts
          </p>
        </div>
        <button
          onClick={fetchDebates}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar: Debate list */}
        <div className="lg:col-span-1 space-y-2">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">History</h2>
          {debates.length === 0 && !loading && (
            <p className="text-sm text-gray-400 py-4">No briefings yet. Run a screening debate first.</p>
          )}
          {debates.map(d => (
            <button
              key={d.id}
              onClick={() => loadFullDebate(d.id)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                selectedDebate?.id === d.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {new Date(d.started_at).toLocaleDateString()}
                </span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  d.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                  d.status === 'error' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                }`}>
                  {d.status}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {d.stocks_selected?.join(', ') || 'No stocks'}
                </span>
              </div>
              {d.summary && (
                <div className="flex gap-2 mt-1 text-xs text-gray-500">
                  <span className="text-green-600">{(d.summary as Record<string, number>).buys}B</span>
                  <span className="text-amber-600">{(d.summary as Record<string, number>).watches}W</span>
                  <span className="text-red-600">{(d.summary as Record<string, number>).skips}S</span>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Main: Selected debate results */}
        <div className="lg:col-span-3">
          {selectedDebate ? (
            <div className="space-y-4">
              {/* Summary cards */}
              {selectedDebate.summary && (
                <div className="grid grid-cols-4 gap-3">
                  <SummaryCard label="BUY" count={(selectedDebate.summary as Record<string, number>).buys} color="green" />
                  <SummaryCard label="WATCH" count={(selectedDebate.summary as Record<string, number>).watches} color="amber" />
                  <SummaryCard label="SKIP" count={(selectedDebate.summary as Record<string, number>).skips} color="red" />
                  <SummaryCard label="Trades" count={(selectedDebate.summary as Record<string, number>).tradesExecuted} color="blue" />
                </div>
              )}

              {/* Date + metadata */}
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <Calendar className="w-4 h-4" />
                <span>{new Date(selectedDebate.started_at).toLocaleString()}</span>
                {selectedDebate.summary && (
                  <>
                    <span>&bull;</span>
                    <span>{((selectedDebate.summary as Record<string, number>).totalDuration / 1000).toFixed(0)}s total</span>
                    <span>&bull;</span>
                    <span>{((selectedDebate.summary as Record<string, number>).totalTokens || 0).toLocaleString()} tokens</span>
                  </>
                )}
              </div>

              {/* Stock-by-stock results */}
              {Array.isArray(selectedDebate.results) && selectedDebate.results.length > 0 ? (
                <div className="space-y-4">
                  {(selectedDebate.results as any[]).map((result, i) => (
                    <BriefingStockCard key={result.symbol || i} result={result} index={i} />
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-8 text-center text-gray-500">
                  {selectedDebate.status === 'error'
                    ? `Error: ${selectedDebate.error_message || 'Unknown error'}`
                    : 'No results available'}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-12 text-center">
              <Swords className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500">Select a briefing from the sidebar or run a new screening debate</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ label, count, color }: { label: string; count: number; color: string }) {
  const colors: Record<string, string> = {
    green: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    red: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  }
  return (
    <div className={`rounded-lg p-3 text-center ${colors[color]}`}>
      <p className="text-2xl font-bold">{count}</p>
      <p className="text-xs font-medium">{label}</p>
    </div>
  )
}

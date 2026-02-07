'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Gavel, TrendingUp, TrendingDown, Clock, Bot, AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { StockDebateResult, ScreeningVerdict, AgentDebateEntry } from '@/lib/trading/screening-debate/types'

interface BriefingStockCardProps {
  result: StockDebateResult
  index: number
}

const VERDICT_STYLES: Record<ScreeningVerdict, { border: string; bg: string; text: string; icon: string }> = {
  BUY: { border: 'border-green-300 dark:border-green-700', bg: 'bg-green-50 dark:bg-green-900/10', text: 'text-green-700 dark:text-green-400', icon: 'text-green-500' },
  WATCH: { border: 'border-amber-300 dark:border-amber-700', bg: 'bg-amber-50 dark:bg-amber-900/10', text: 'text-amber-700 dark:text-amber-400', icon: 'text-amber-500' },
  SKIP: { border: 'border-red-300 dark:border-red-700', bg: 'bg-red-50 dark:bg-red-900/10', text: 'text-red-700 dark:text-red-400', icon: 'text-red-500' },
}

export function BriefingStockCard({ result, index }: BriefingStockCardProps) {
  const [showTranscript, setShowTranscript] = useState(false)
  const v = result.judgeVerdict
  const style = VERDICT_STYLES[v.verdict]
  const stock = result.screeningData

  return (
    <div className={`border ${style.border} rounded-lg overflow-hidden`}>
      {/* Header */}
      <div className={`${style.bg} p-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
              #{index + 1} {result.symbol}
            </span>
            <span className={`text-sm font-bold px-3 py-1 rounded-full ${style.bg} ${style.text} border ${style.border}`}>
              {v.verdict}
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {v.confidence}% confidence
            </span>
          </div>
          <div className="text-right text-sm text-gray-600 dark:text-gray-400">
            <span>{(result.duration / 1000).toFixed(0)}s</span>
            <span className="mx-1">&bull;</span>
            <span>{result.totalTokens.toLocaleString()} tokens</span>
          </div>
        </div>

        {/* Screening metrics row */}
        {stock && stock.gap_percent !== undefined && (
          <div className="flex gap-4 mt-2 text-sm">
            <span className="flex items-center gap-1">
              {stock.gap_percent > 0 ? (
                <TrendingUp className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-red-500" />
              )}
              {stock.gap_percent > 0 ? '+' : ''}{stock.gap_percent?.toFixed(1)}%
            </span>
            {stock.pre_market_price && (
              <span>${stock.pre_market_price.toFixed(2)}</span>
            )}
            {stock.score && (
              <span className="text-gray-500">Score: {stock.score}/100</span>
            )}
          </div>
        )}
      </div>

      {/* Verdict reasoning */}
      <div className="p-4 space-y-3">
        <div className="flex items-start gap-2">
          <Gavel className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-gray-700 dark:text-gray-300">{v.reasoning}</p>
        </div>

        {/* Trade parameters */}
        {v.verdict === 'BUY' && v.entryPrice && (
          <div className="grid grid-cols-4 gap-2">
            <TradeParam label="Entry" value={`$${v.entryPrice.toFixed(2)}`} color="green" />
            {v.stopLoss && <TradeParam label="Stop" value={`$${v.stopLoss.toFixed(2)}`} color="red" />}
            {v.takeProfit && <TradeParam label="Target" value={`$${v.takeProfit.toFixed(2)}`} color="blue" />}
            {v.riskRewardRatio && <TradeParam label="R:R" value={`1:${v.riskRewardRatio.toFixed(1)}`} color="purple" />}
          </div>
        )}

        {/* Key points */}
        <div className="grid grid-cols-2 gap-3">
          {v.keyBullPoints.length > 0 && (
            <div>
              <p className="text-xs font-medium text-green-600 mb-1">Bull Case</p>
              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                {v.keyBullPoints.map((p, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <span className="text-green-500 mt-0.5">+</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {v.keyBearPoints.length > 0 && (
            <div>
              <p className="text-xs font-medium text-red-600 mb-1">Bear Case</p>
              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                {v.keyBearPoints.map((p, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <span className="text-red-500 mt-0.5">-</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Trade execution status */}
        {result.tradeExecution?.executed && (
          <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded px-3 py-2 text-sm">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span className="text-green-700 dark:text-green-400">
              Trade executed: {result.tradeExecution.quantity} shares @ ${result.tradeExecution.filledPrice?.toFixed(2)}
            </span>
          </div>
        )}

        {/* Collapsible debate transcript */}
        <button
          onClick={() => setShowTranscript(!showTranscript)}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          {showTranscript ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          {showTranscript ? 'Hide' : 'Show'} debate transcript
        </button>

        {showTranscript && (
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-3 max-h-96 overflow-y-auto">
            <TranscriptRound label="Round 1" entries={result.debate.round1} />
            <TranscriptRound label="Round 2" entries={result.debate.round2} />
          </div>
        )}
      </div>
    </div>
  )
}

function TradeParam({ label, value, color }: { label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    green: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400',
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400',
  }
  return (
    <div className={`rounded p-2 text-center text-xs ${colors[color]}`}>
      <p className="font-medium">{label}</p>
      <p className="font-bold">{value}</p>
    </div>
  )
}

function TranscriptRound({ label, entries }: { label: string; entries: AgentDebateEntry[] }) {
  if (entries.length === 0) return null

  const roleColors: Record<string, string> = {
    analyst: 'border-l-blue-500',
    critic: 'border-l-red-500',
    synthesizer: 'border-l-green-500',
  }

  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 mb-2">{label}</p>
      <div className="space-y-2">
        {entries.map((entry, i) => (
          <div key={i} className={`border-l-2 ${roleColors[entry.role] || 'border-l-gray-300'} pl-3`}>
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 capitalize">
              {entry.role} <span className="text-gray-400 font-normal">({entry.model})</span>
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 whitespace-pre-wrap">
              {entry.content.length > 500 ? entry.content.slice(0, 500) + '...' : entry.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

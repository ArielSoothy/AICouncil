'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, TrendingUp, TrendingDown, Minus, Clock, DollarSign } from 'lucide-react'

interface Trade {
  id: string
  mode: string
  symbol: string
  action: 'BUY' | 'SELL' | 'HOLD'
  quantity: number | null
  price: number | null
  reasoning: string
  confidence: number
  executed_at: string
  alpaca_order_id: string | null
}

export function TradeHistory() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    mode: '',
    action: '',
  })
  const [expandedTrade, setExpandedTrade] = useState<string | null>(null)

  useEffect(() => {
    fetchTrades()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  const fetchTrades = async () => {
    setLoading(true)

    try {
      const params = new URLSearchParams()
      if (filters.mode) params.append('mode', filters.mode)
      if (filters.action) params.append('action', filters.action)

      const response = await fetch(`/api/trading/history?${params}`)

      if (!response.ok) {
        throw new Error('Failed to fetch trade history')
      }

      const data = await response.json()
      setTrades(data.trades)
    } catch (error) {
      console.error('Failed to fetch trade history:', error)
      alert(error instanceof Error ? error.message : 'Failed to fetch trade history')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatMode = (mode: string) => {
    if (mode.startsWith('individual_')) {
      const model = mode.replace('individual_', '')
      return `Individual: ${model.charAt(0).toUpperCase() + model.slice(1)}`
    }
    return mode.charAt(0).toUpperCase() + mode.slice(1)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Trade History</h2>
          <p className="text-sm text-muted-foreground">
            {trades.length} recent trades
          </p>
        </div>
        <Button onClick={fetchTrades} disabled={loading} variant="outline">
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Loading...
            </>
          ) : (
            'Refresh'
          )}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <select
          value={filters.mode}
          onChange={(e) => setFilters({ ...filters, mode: e.target.value })}
          className="px-3 py-2 rounded-lg border bg-background"
        >
          <option value="">All Modes</option>
          <option value="individual_claude">Individual: Claude</option>
          <option value="individual_gpt4">Individual: GPT-4</option>
          <option value="individual_gemini">Individual: Gemini</option>
          <option value="individual_llama">Individual: Llama</option>
          <option value="consensus">Consensus</option>
          <option value="debate">Debate</option>
        </select>

        <select
          value={filters.action}
          onChange={(e) => setFilters({ ...filters, action: e.target.value })}
          className="px-3 py-2 rounded-lg border bg-background"
        >
          <option value="">All Actions</option>
          <option value="BUY">BUY</option>
          <option value="SELL">SELL</option>
          <option value="HOLD">HOLD</option>
        </select>

        {(filters.mode || filters.action) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilters({ mode: '', action: '' })}
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Trade List */}
      {loading && trades.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : trades.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-lg border">
          <p className="text-muted-foreground">
            No trades found. Start trading to see history here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {trades.map((trade) => (
            <div
              key={trade.id}
              className="bg-card rounded-lg border p-4 hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <ActionBadge action={trade.action} />
                  <div>
                    <div className="font-semibold text-lg">
                      {trade.action !== 'HOLD' && (
                        <>
                          {trade.quantity} × {trade.symbol}
                        </>
                      )}
                      {trade.action === 'HOLD' && <>No Action</>}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatMode(trade.mode)}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  {trade.price && (
                    <div className="flex items-center gap-1 text-sm font-medium mb-1">
                      <DollarSign className="w-4 h-4" />
                      {trade.price.toFixed(2)}
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {formatDate(trade.executed_at)}
                  </div>
                </div>
              </div>

              {/* Confidence Bar */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-muted-foreground w-20">
                  Confidence:
                </span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${trade.confidence * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium w-10 text-right">
                  {(trade.confidence * 100).toFixed(0)}%
                </span>
              </div>

              {/* Reasoning (Expandable) */}
              <div>
                <button
                  onClick={() =>
                    setExpandedTrade(expandedTrade === trade.id ? null : trade.id)
                  }
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {expandedTrade === trade.id ? '▼' : '▶'} View Reasoning
                </button>

                {expandedTrade === trade.id && (
                  <div className="mt-2 p-3 bg-muted/50 rounded-lg text-sm leading-relaxed">
                    {trade.reasoning}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ActionBadge({ action }: { action: 'BUY' | 'SELL' | 'HOLD' }) {
  const config = {
    BUY: { icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-950' },
    SELL: { icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-950' },
    HOLD: { icon: Minus, color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-950' },
  }

  const { icon: Icon, color, bg } = config[action]

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${bg}`}>
      <Icon className={`w-4 h-4 ${color}`} />
      <span className={`text-sm font-semibold ${color}`}>{action}</span>
    </div>
  )
}

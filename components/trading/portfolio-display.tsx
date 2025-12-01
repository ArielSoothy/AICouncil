'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, DollarSign, TrendingUp, TrendingDown, Wallet, BarChart3 } from 'lucide-react'

interface PortfolioData {
  broker?: {
    id: string
    name: string
    environment: string
  }
  account: {
    portfolio_value: number
    cash: number
    buying_power: number
    equity: number
    last_equity: number
  }
  positions: {
    symbol: string
    qty: number
    side: string
    market_value: number
    cost_basis: number
    unrealized_pl: number
    unrealized_plpc: number
    current_price: number
    avg_entry_price: number
  }[]
  performance: {
    daily_pl: number
    daily_pl_percent: number
    total_pl: number
    total_pl_percent: number
  }
}

export function PortfolioDisplay() {
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchPortfolio()
  }, [])

  const fetchPortfolio = async () => {
    setLoading(true)

    try {
      const response = await fetch('/api/trading/portfolio')

      if (!response.ok) {
        throw new Error('Failed to fetch portfolio')
      }

      const data = await response.json()
      setPortfolio(data)
    } catch (error) {
      console.error('Failed to fetch portfolio:', error)
      alert(error instanceof Error ? error.message : 'Failed to fetch portfolio')
    } finally {
      setLoading(false)
    }
  }

  if (loading && !portfolio) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!portfolio) {
    return (
      <div className="text-center py-12 bg-card rounded-lg border">
        <p className="text-muted-foreground">Failed to load portfolio data</p>
        <Button onClick={fetchPortfolio} variant="outline" className="mt-4">
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Portfolio Overview</h2>
          <p className="text-sm text-muted-foreground">
            {portfolio.broker
              ? `${portfolio.broker.name} ${portfolio.broker.environment === 'live' ? 'Live' : 'Paper'} Trading Account`
              : 'Trading Account'}
          </p>
        </div>
        <Button onClick={fetchPortfolio} disabled={loading} variant="outline">
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Refreshing...
            </>
          ) : (
            'Refresh'
          )}
        </Button>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Portfolio Value */}
        <MetricCard
          title="Portfolio Value"
          value={`$${portfolio.account.portfolio_value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<DollarSign className="w-5 h-5" />}
          iconColor="text-blue-600"
        />

        {/* Cash */}
        <MetricCard
          title="Cash Available"
          value={`$${portfolio.account.cash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<Wallet className="w-5 h-5" />}
          iconColor="text-green-600"
        />

        {/* Daily P&L */}
        <MetricCard
          title="Daily P&L"
          value={`$${portfolio.performance.daily_pl >= 0 ? '+' : ''}${portfolio.performance.daily_pl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle={`${portfolio.performance.daily_pl_percent >= 0 ? '+' : ''}${portfolio.performance.daily_pl_percent.toFixed(2)}%`}
          icon={portfolio.performance.daily_pl >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
          iconColor={portfolio.performance.daily_pl >= 0 ? 'text-green-600' : 'text-red-600'}
          valueColor={portfolio.performance.daily_pl >= 0 ? 'text-green-600' : 'text-red-600'}
        />

        {/* Total P&L */}
        <MetricCard
          title="Total P&L"
          value={`$${portfolio.performance.total_pl >= 0 ? '+' : ''}${portfolio.performance.total_pl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle={`${portfolio.performance.total_pl_percent >= 0 ? '+' : ''}${portfolio.performance.total_pl_percent.toFixed(2)}%`}
          icon={<BarChart3 className="w-5 h-5" />}
          iconColor={portfolio.performance.total_pl >= 0 ? 'text-green-600' : 'text-red-600'}
          valueColor={portfolio.performance.total_pl >= 0 ? 'text-green-600' : 'text-red-600'}
        />
      </div>

      {/* Open Positions */}
      <div className="bg-card rounded-lg border">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-lg">Open Positions</h3>
          <p className="text-sm text-muted-foreground">
            {portfolio.positions.length} active {portfolio.positions.length === 1 ? 'position' : 'positions'}
          </p>
        </div>

        {portfolio.positions.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No open positions. Execute trades to see positions here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr className="text-left text-sm">
                  <th className="p-3 font-medium">Symbol</th>
                  <th className="p-3 font-medium text-right">Qty</th>
                  <th className="p-3 font-medium text-right">Avg Price</th>
                  <th className="p-3 font-medium text-right">Current Price</th>
                  <th className="p-3 font-medium text-right">Market Value</th>
                  <th className="p-3 font-medium text-right">P&L</th>
                  <th className="p-3 font-medium text-right">P&L %</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {portfolio.positions.map((position, index) => (
                  <tr key={index} className="text-sm hover:bg-muted/30">
                    <td className="p-3 font-medium font-mono">{position.symbol}</td>
                    <td className="p-3 text-right">{position.qty}</td>
                    <td className="p-3 text-right font-mono">
                      ${position.avg_entry_price.toFixed(2)}
                    </td>
                    <td className="p-3 text-right font-mono">
                      ${position.current_price.toFixed(2)}
                    </td>
                    <td className="p-3 text-right font-mono">
                      ${position.market_value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className={`p-3 text-right font-mono font-medium ${position.unrealized_pl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${position.unrealized_pl >= 0 ? '+' : ''}{position.unrealized_pl.toFixed(2)}
                    </td>
                    <td className={`p-3 text-right font-mono font-medium ${position.unrealized_plpc >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {position.unrealized_plpc >= 0 ? '+' : ''}{(position.unrealized_plpc * 100).toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  iconColor,
  valueColor,
}: {
  title: string
  value: string
  subtitle?: string
  icon: React.ReactNode
  iconColor: string
  valueColor?: string
}) {
  return (
    <div className="bg-card rounded-lg border p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">{title}</span>
        <div className={iconColor}>{icon}</div>
      </div>
      <div className={`text-2xl font-bold ${valueColor || ''}`}>{value}</div>
      {subtitle && <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>}
    </div>
  )
}

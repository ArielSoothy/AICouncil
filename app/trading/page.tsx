'use client'

import { Suspense, useState } from 'react'
import { Header } from '@/components/ui/header'
import { useSearchParams } from 'next/navigation'
import { Info, Wifi, WifiOff, AlertTriangle, Clock, RefreshCw, TrendingUp, TrendingDown, ChevronDown, ChevronUp, Wallet, DollarSign, BarChart3 } from 'lucide-react'
import { ModeSelector, TradingMode } from '@/components/trading/mode-selector'
import { ConsensusMode } from '@/components/trading/consensus-mode'
import { DebateMode } from '@/components/trading/debate-mode'
import { IndividualMode } from '@/components/trading/individual-mode'
import { TradeHistory } from '@/components/trading/trade-history'
import { PortfolioDisplay } from '@/components/trading/portfolio-display'
import { IBKRAuthButton } from '@/components/trading/broker-status-badge'
import { IS_PRODUCTION } from '@/lib/utils/environment'
import { PortfolioProvider, usePortfolio } from '@/contexts/portfolio-context'
import { cn } from '@/lib/utils'

// Compact status header - single line with broker info
function CompactStatusHeader() {
  const { portfolio, loading, error, lastUpdated, refresh } = usePortfolio()

  const isLive = portfolio.broker?.environment === 'live'
  const isConnected = !!portfolio.broker && !error
  const portfolioValue = portfolio.account?.portfolio_value

  const formatDateTime = (date: Date) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())

    const time = date.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })

    if (dateOnly.getTime() === today.getTime()) {
      return `Today, ${time}`
    } else if (dateOnly.getTime() === yesterday.getTime()) {
      return `Yesterday, ${time}`
    } else {
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    }
  }

  return (
    <div className="flex items-center justify-between py-4 border-b mb-6">
      {/* Left: Title */}
      <h1 className="text-2xl font-bold">Trading</h1>

      {/* Right: Status pill */}
      <div className="flex items-center gap-3">
        {loading && !portfolio.broker ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-sm">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Connecting...</span>
          </div>
        ) : error || !portfolio.broker ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 text-sm">
            <WifiOff className="w-4 h-4" />
            <span>Disconnected</span>
            <button onClick={refresh} className="underline text-xs">Retry</button>
          </div>
        ) : (
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
            isLive
              ? "bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200"
              : "bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200"
          )}>
            <Wifi className="w-4 h-4" />
            <span>{portfolio.broker.name}</span>
            <span className={cn(
              "px-1.5 py-0.5 rounded text-xs font-bold",
              isLive
                ? "bg-orange-200 dark:bg-orange-800 text-orange-900 dark:text-orange-100"
                : "bg-green-200 dark:bg-green-800 text-green-900 dark:text-green-100"
            )}>
              {isLive ? 'LIVE' : 'PAPER'}
            </span>
            {portfolioValue !== undefined && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="font-mono">
                  ${portfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </>
            )}
          </div>
        )}

        {/* Last updated time */}
        {lastUpdated && !loading && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            {formatDateTime(lastUpdated)}
          </div>
        )}

        {/* Refresh button */}
        {!loading && portfolio.broker && (
          <button
            onClick={refresh}
            className="p-1.5 rounded hover:bg-muted transition-colors"
            title="Refresh portfolio"
          >
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  )
}

// Live trading warning - shown only when in live mode
function LiveTradingWarning() {
  const { portfolio } = usePortfolio()
  const isLive = portfolio.broker?.environment === 'live'

  if (!isLive) return null

  return (
    <div className="mb-4 flex items-center gap-2 p-3 rounded-lg bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800">
      <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0" />
      <p className="text-sm text-orange-800 dark:text-orange-200">
        <strong>Live Mode:</strong> Connected to real account. AI recommendations only - no automatic execution.
      </p>
    </div>
  )
}

// Compact Portfolio Summary - shows key metrics + positions with nice styling
function PortfolioSummary() {
  const { portfolio, loading } = usePortfolio()
  const [expanded, setExpanded] = useState(true)

  if (loading && !portfolio.account) return null
  if (!portfolio.account) return null

  const dailyPL = portfolio.performance?.daily_pl || 0
  const dailyPLPercent = portfolio.performance?.daily_pl_percent || 0
  const totalPL = portfolio.performance?.total_pl || 0
  const totalPLPercent = portfolio.performance?.total_pl_percent || 0

  return (
    <div className="mb-6 space-y-4">
      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Portfolio Value */}
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-lg border border-blue-200 dark:border-blue-800 p-3">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
            <Wallet className="w-4 h-4" />
            <span className="text-xs font-medium">Portfolio</span>
          </div>
          <div className="text-lg font-bold">
            ${portfolio.account.portfolio_value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
        </div>

        {/* Cash */}
        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 rounded-lg border border-emerald-200 dark:border-emerald-800 p-3">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
            <DollarSign className="w-4 h-4" />
            <span className="text-xs font-medium">Cash</span>
          </div>
          <div className="text-lg font-bold">
            ${portfolio.account.cash.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
        </div>

        {/* Daily P&L */}
        <div className={cn(
          "rounded-lg border p-3",
          dailyPL >= 0
            ? "bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-200 dark:border-green-800"
            : "bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-200 dark:border-red-800"
        )}>
          <div className={cn(
            "flex items-center gap-2 mb-1",
            dailyPL >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
          )}>
            {dailyPL >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span className="text-xs font-medium">Today</span>
          </div>
          <div className={cn(
            "text-lg font-bold",
            dailyPL >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
          )}>
            {dailyPL >= 0 ? '+' : ''}{dailyPLPercent.toFixed(2)}%
          </div>
        </div>

        {/* Total P&L */}
        <div className={cn(
          "rounded-lg border p-3",
          totalPL >= 0
            ? "bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-200 dark:border-green-800"
            : "bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-200 dark:border-red-800"
        )}>
          <div className={cn(
            "flex items-center gap-2 mb-1",
            totalPL >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
          )}>
            <BarChart3 className="w-4 h-4" />
            <span className="text-xs font-medium">Total</span>
          </div>
          <div className={cn(
            "text-lg font-bold",
            totalPL >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
          )}>
            {totalPL >= 0 ? '+' : ''}{totalPLPercent.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Positions - Collapsible */}
      {portfolio.positions.length > 0 && (
        <div className="bg-card rounded-lg border overflow-hidden">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="font-semibold">Positions</span>
              <span className="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {portfolio.positions.length}
              </span>
            </div>
            {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>

          {expanded && (
            <div className="border-t">
              <div className="divide-y">
                {portfolio.positions.map((pos, idx) => (
                  <div key={idx} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center font-bold text-sm">
                        {pos.symbol.slice(0, 2)}
                      </div>
                      <div>
                        <div className="font-semibold">{pos.symbol}</div>
                        <div className="text-xs text-muted-foreground">{pos.qty} shares @ ${pos.avg_entry_price.toFixed(2)}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-medium">${pos.market_value.toLocaleString()}</div>
                      <div className={cn(
                        "text-sm font-medium",
                        pos.unrealized_pl >= 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {pos.unrealized_pl >= 0 ? '+' : ''}{pos.unrealized_plpc.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TradingPageContent() {
  const searchParams = useSearchParams()
  const [selectedMode, setSelectedMode] = useState<TradingMode>('consensus')

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-4">
        <div className="max-w-6xl mx-auto">
          {/* Compact Status Header */}
          <CompactStatusHeader />

          {/* Live trading warning (if applicable) */}
          <LiveTradingWarning />

          {/* Production Notice */}
          {IS_PRODUCTION && (
            <div className="mb-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  <strong>Free Tier:</strong> Using 6 free AI models only. Clone repo for full access to 46+ models.
                </p>
              </div>
            </div>
          )}

          {/* Portfolio Display - shows on analysis tabs */}
          {(selectedMode === 'consensus' || selectedMode === 'debate' || selectedMode === 'individual') && (
            <div className="mb-6">
              <PortfolioDisplay />
            </div>
          )}

          {/* Mode selector tabs - PRIMARY NAVIGATION */}
          <ModeSelector
            selectedMode={selectedMode}
            onModeChange={setSelectedMode}
          />

          {/* Tab Content */}
          <div className="mt-6">
            {selectedMode === 'consensus' && <ConsensusMode />}
            {selectedMode === 'debate' && <DebateMode />}
            {selectedMode === 'individual' && <IndividualMode />}
            {selectedMode === 'portfolio' && (
              <div className="space-y-6">
                {/* IBKR Auth - only shown in portfolio tab */}
                <IBKRAuthButton />
                <PortfolioDisplay />
              </div>
            )}
            {selectedMode === 'history' && <TradeHistory />}
          </div>
        </div>
      </main>
    </div>
  )
}

export default function TradingPage() {
  return (
    <PortfolioProvider>
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
        <TradingPageContent />
      </Suspense>
    </PortfolioProvider>
  )
}

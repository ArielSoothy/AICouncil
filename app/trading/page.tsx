'use client'

import { Suspense, useState } from 'react'
import { Header } from '@/components/ui/header'
import { useSearchParams } from 'next/navigation'
import { Info, Wifi, WifiOff, AlertTriangle, Clock, RefreshCw } from 'lucide-react'
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

  const formatTime = (date: Date) => {
    return date.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
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
            {formatTime(lastUpdated)}
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

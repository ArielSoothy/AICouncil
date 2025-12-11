'use client'

import { Suspense, useState, useEffect } from 'react'
import { Header } from '@/components/ui/header'
import { useAuth } from '@/contexts/auth-context'
import { useSearchParams } from 'next/navigation'
import { TrendingUp, Brain, Info, Building2, TestTube } from 'lucide-react'
import { ModeSelector, TradingMode } from '@/components/trading/mode-selector'
import { ConsensusMode } from '@/components/trading/consensus-mode'
import { DebateMode } from '@/components/trading/debate-mode'
import { IndividualMode } from '@/components/trading/individual-mode'
import { TradeHistory } from '@/components/trading/trade-history'
import { PortfolioDisplay } from '@/components/trading/portfolio-display'
import { IBKRAuthButton } from '@/components/trading/broker-status-badge'
import { IS_PRODUCTION } from '@/lib/utils/environment'

function TradingPageContent() {
  const { user, userTier } = useAuth()
  const searchParams = useSearchParams()
  const isGuestMode = searchParams.get('mode') === 'guest'
  const [selectedMode, setSelectedMode] = useState<TradingMode>('consensus')
  const [brokerEnv, setBrokerEnv] = useState<'live' | 'paper' | null>(null)
  const [brokerName, setBrokerName] = useState<string | null>(null)
  // Key to force child components to remount and refetch when broker changes
  const [brokerRefreshKey, setBrokerRefreshKey] = useState(0)

  // Fetch broker info for dynamic header
  useEffect(() => {
    fetch('/api/trading/portfolio')
      .then(res => res.json())
      .then(data => {
        setBrokerEnv(data.broker?.environment || 'paper')
        setBrokerName(data.broker?.name || 'Alpaca')
      })
      .catch(() => {
        setBrokerEnv('paper')
        setBrokerName('Alpaca')
      })
  }, [brokerRefreshKey]) // Refetch when broker changes

  const effectiveUserTier = isGuestMode ? 'guest' : userTier
  const isLive = brokerEnv === 'live'

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <div className="flex justify-center items-center gap-3 mb-4">
              {isLive ? (
                <Building2 className="w-10 h-10 text-orange-600" />
              ) : (
                <TrendingUp className="w-10 h-10 text-green-600" />
              )}
              <h1 className="text-4xl font-bold tracking-tight">
                {isLive ? 'AI Trading Analysis' : 'AI Paper Trading'}
              </h1>
            </div>

            <p className="text-xl text-muted-foreground mb-2">
              {isLive
                ? `Connected to ${brokerName || 'Live Broker'}`
                : 'Multi-Model Paper Trading Arena'}
            </p>

            <p className="text-muted-foreground max-w-3xl mx-auto mb-4">
              {isLive
                ? 'Get AI-powered trading recommendations based on your real portfolio. No automatic execution - all decisions are yours.'
                : 'Compare how different AI models make trading decisions. Test consensus trading and agent debate strategies with paper trading (no real money).'}
            </p>

            <div className="flex justify-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                {isLive ? (
                  <Building2 className="w-4 h-4 text-orange-600" />
                ) : (
                  <TestTube className="w-4 h-4 text-green-600" />
                )}
                <span>{isLive ? 'Real Account Data' : 'Paper Trading'}</span>
              </div>
              <div className="flex items-center gap-1">
                <Brain className="w-4 h-4" />
                <span>3 Analysis Modes</span>
              </div>
            </div>
          </div>

          {/* IBKR Auth Button - Only shows on local development */}
          <div className="mb-6 flex justify-center">
            <IBKRAuthButton
              onAuthChange={(authenticated) => {
                if (authenticated) {
                  // Refresh all broker-dependent components when IBKR authenticates
                  setBrokerRefreshKey(prev => prev + 1)
                }
              }}
            />
          </div>

          {/* Production Notice - Free Tier Only */}
          {IS_PRODUCTION && (
            <div className="mb-8 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                    Free Tier Models Only (Production Mode)
                  </h3>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    This public deployment uses <strong>6 free AI models</strong> only: Llama 3.3 70B and Gemini 2.0/1.5 Flash.
                    All research agents use free models to prevent API cost abuse. Pro/Max tiers and Ultra Mode are locked 🔒
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                    💡 For local development with all 46+ models, clone the repo and run locally.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Portfolio Overview - key forces remount on broker change */}
          <div className="mb-8">
            <PortfolioDisplay key={`portfolio-${brokerRefreshKey}`} />
          </div>

          {/* Mode selector tabs */}
          <ModeSelector
            selectedMode={selectedMode}
            onModeChange={setSelectedMode}
          />

          {/* Trading interface based on selected mode */}
          {selectedMode === 'consensus' && <ConsensusMode />}

          {selectedMode === 'debate' && <DebateMode />}

          {selectedMode === 'individual' && <IndividualMode />}

          {/* Trading History - Shows below all modes */}
          <div className="mt-12 pt-8 border-t">
            <TradeHistory />
          </div>
        </div>
      </main>
    </div>
  )
}

export default function TradingPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TradingPageContent />
    </Suspense>
  )
}

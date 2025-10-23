'use client'

import { Suspense, useState } from 'react'
import { Header } from '@/components/ui/header'
import { useAuth } from '@/contexts/auth-context'
import { useSearchParams } from 'next/navigation'
import { TrendingUp, LineChart, Brain } from 'lucide-react'
import { ModeSelector, TradingMode } from '@/components/trading/mode-selector'
import { IndividualMode } from '@/components/trading/individual-mode'

function TradingPageContent() {
  const { user, userTier } = useAuth()
  const searchParams = useSearchParams()
  const isGuestMode = searchParams.get('mode') === 'guest'
  const [selectedMode, setSelectedMode] = useState<TradingMode>('individual')

  const effectiveUserTier = isGuestMode ? 'guest' : userTier

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <div className="flex justify-center items-center gap-3 mb-4">
              <TrendingUp className="w-10 h-10 text-green-600" />
              <h1 className="text-4xl font-bold tracking-tight">
                AI Paper Trading
              </h1>
            </div>

            <p className="text-xl text-muted-foreground mb-2">
              Multi-Model Paper Trading Arena
            </p>

            <p className="text-muted-foreground max-w-3xl mx-auto mb-4">
              Compare how different AI models make trading decisions. Test consensus trading
              and agent debate strategies with paper trading (no real money).
            </p>

            <div className="flex justify-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <LineChart className="w-4 h-4" />
                <span>$100,000 Paper Balance</span>
              </div>
              <div className="flex items-center gap-1">
                <Brain className="w-4 h-4" />
                <span>3 Trading Modes</span>
              </div>
            </div>
          </div>

          {/* Mode selector tabs */}
          <ModeSelector
            selectedMode={selectedMode}
            onModeChange={setSelectedMode}
          />

          {/* Trading interface based on selected mode */}
          {selectedMode === 'individual' && <IndividualMode />}

          {selectedMode === 'consensus' && (
            <div className="bg-card rounded-lg border p-6">
              <p className="text-center text-muted-foreground">
                Consensus Trade mode coming in Step 5...
              </p>
            </div>
          )}

          {selectedMode === 'debate' && (
            <div className="bg-card rounded-lg border p-6">
              <p className="text-center text-muted-foreground">
                Debate Trade mode coming in Step 7...
              </p>
            </div>
          )}
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

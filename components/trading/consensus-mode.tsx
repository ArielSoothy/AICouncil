'use client'

import { Button } from '@/components/ui/button'
import { Loader2, Users } from 'lucide-react'
import { TradingModelSelector } from './trading-model-selector'
import { TimeframeSelector } from './timeframe-selector'
import { TradingHistoryDropdown } from './trading-history-dropdown'
import { ResearchActivityPanel } from './research-activity-panel'
import { ResearchProgressPanel, type ResearchProgressPanelHandle } from './research-progress-panel'
import { InputModeSelector } from './input-mode-selector'
import { useConsensusAnalysis } from './consensus/use-consensus-analysis'
import { ConsensusResults } from './consensus/consensus-results'
import {
  FallbackNotifications,
  ResearchActivitySummary,
  IndividualDecisions,
  PortfolioAnalysisResults,
} from './consensus/research-panel'

export function ConsensusMode() {
  const {
    selectedModels,
    setSelectedModels,
    timeframe,
    setTimeframe,
    targetSymbol,
    setTargetSymbol,
    loading,
    consensus,
    decisions,
    researchData,
    tradeRecommendation,
    brokerEnv,
    showTradeCard,
    setShowTradeCard,
    setInputMode,
    portfolioAnalysis,
    isStreaming,
    fallbackMessages,
    progressPanelRef,
    getConsensusDecision,
    getPortfolioAnalysis,
    handleExecuteTrade,
    handleStartNew,
  } = useConsensusAnalysis()

  return (
    <div className="space-y-6">
      {/* Trading History */}
      <div className="flex justify-end">
        <TradingHistoryDropdown
          mode="trading-consensus"
          onSelect={(conversation) => {
            window.location.href = `${window.location.pathname}?c=${conversation.id}`
          }}
        />
      </div>

      {/* Model Selector & Timeframe */}
      <div className="bg-card rounded-lg border p-6 space-y-6">
        <TradingModelSelector
          models={selectedModels}
          onChange={setSelectedModels}
          disabled={loading}
        />

        {/* Input Mode Selector - Research/Portfolio/Position */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Analysis Target
          </label>
          <InputModeSelector
            onSymbolSelect={(symbol) => {
              if (symbol === '__PORTFOLIO__') {
                setTargetSymbol('')
                setTimeout(() => getPortfolioAnalysis(), 100)
              } else {
                setTargetSymbol(symbol)
              }
            }}
            onInputChange={(symbol) => setTargetSymbol(symbol)}
            onModeChange={setInputMode}
            disabled={loading}
            initialSymbol={targetSymbol}
            showPortfolioMode={true}
          />
        </div>

        <TimeframeSelector
          value={timeframe}
          onChange={setTimeframe}
          disabled={loading}
        />

        <Button
          onClick={getConsensusDecision}
          disabled={loading || selectedModels.filter(m => m.enabled).length < 2}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Getting Consensus from {selectedModels.filter(m => m.enabled).length} Models...
            </>
          ) : (
            <>
              <Users className="w-4 h-4 mr-2" />
              Get Consensus Decision from {selectedModels.filter(m => m.enabled).length} Models
            </>
          )}
        </Button>
      </div>

      {/* Feature #51: Real-time Research Progress Panel */}
      {(isStreaming || loading) && (
        <ResearchProgressPanel
          ref={progressPanelRef as React.Ref<ResearchProgressPanelHandle>}
          onError={(error) => console.error('Research progress error:', error)}
        />
      )}

      {/* Fallback Notifications */}
      <FallbackNotifications fallbackMessages={fallbackMessages} />

      {/* Phase 4: Research Activity Panel - Shows final summary after completion */}
      {!isStreaming && !loading && researchData && (
        <ResearchActivityPanel research={researchData} isLoading={false} />
      )}

      {/* Portfolio Analysis Results */}
      <PortfolioAnalysisResults
        portfolioAnalysis={portfolioAnalysis}
        onStartNew={handleStartNew}
      />

      {/* Consensus Results */}
      {consensus && (
        <ConsensusResults
          consensus={consensus}
          tradeRecommendation={tradeRecommendation}
          showTradeCard={showTradeCard}
          brokerEnv={brokerEnv}
          onExecuteTrade={handleExecuteTrade}
          onDismissTradeCard={() => setShowTradeCard(false)}
          onStartNew={handleStartNew}
        />
      )}

      {/* Research Activity Summary (Hybrid Research Mode) */}
      <ResearchActivitySummary decisions={decisions} />

      {/* Individual Model Decisions */}
      <IndividualDecisions decisions={decisions} />
    </div>
  )
}

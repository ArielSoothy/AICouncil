'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, TrendingUp, TrendingDown, Minus, Users } from 'lucide-react'
import { getModelDisplayName, TRADING_MODELS } from '@/lib/trading/models-config'
import { TradingModelSelector } from './trading-model-selector'
import { TimeframeSelector, type TradingTimeframe } from './timeframe-selector'
import { ModelConfig } from '@/types/consensus'

interface ReasoningDetails {
  bullishCase?: string
  bearishCase?: string
  technicalAnalysis?: string
  fundamentalAnalysis?: string
  sentiment?: string
  timing?: string
}

interface ConsensusResult {
  action: 'BUY' | 'SELL' | 'HOLD'
  symbol?: string
  quantity?: number
  reasoning: string | ReasoningDetails
  confidence: number
  votes: {
    BUY: number
    SELL: number
    HOLD: number
  }
  modelCount: number
}

// Default models for Consensus Mode (Pro preset - 8 balanced models)
const DEFAULT_CONSENSUS_MODELS: ModelConfig[] = [
  { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', enabled: true },
  { provider: 'openai', model: 'gpt-4o', enabled: true },
  { provider: 'openai', model: 'gpt-5-mini', enabled: true },
  { provider: 'google', model: 'gemini-2.5-pro', enabled: true },
  { provider: 'groq', model: 'llama-3.3-70b-versatile', enabled: true },
  { provider: 'xai', model: 'grok-3', enabled: true },
  { provider: 'mistral', model: 'mistral-large-latest', enabled: true },
  { provider: 'perplexity', model: 'sonar-pro', enabled: true },
]

export function ConsensusMode() {
  const [selectedModels, setSelectedModels] = useState<ModelConfig[]>(DEFAULT_CONSENSUS_MODELS)
  const [timeframe, setTimeframe] = useState<TradingTimeframe>('swing')
  const [targetSymbol, setTargetSymbol] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [consensus, setConsensus] = useState<ConsensusResult | null>(null)

  const getConsensusDecision = async () => {
    setLoading(true)
    setConsensus(null)

    // Extract enabled model IDs for API
    const modelIds = selectedModels.filter(m => m.enabled).map(m => m.model)

    try {
      const response = await fetch('/api/trading/consensus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedModels: modelIds, timeframe, targetSymbol: targetSymbol.trim() || undefined }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to get consensus decision')
      }

      const data = await response.json()
      setConsensus(data.consensus)
    } catch (error) {
      console.error('Failed to get consensus decision:', error)
      alert(error instanceof Error ? error.message : 'Failed to get consensus decision')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Model Selector & Timeframe */}
      <div className="bg-card rounded-lg border p-6 space-y-6">
        <TradingModelSelector
          models={selectedModels}
          onChange={setSelectedModels}
          disabled={loading}
        />

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            📊 Analyze Specific Stock (Optional)
          </label>
          <input
            type="text"
            value={targetSymbol}
            onChange={(e) => setTargetSymbol(e.target.value.toUpperCase())}
            placeholder="Enter symbol (e.g., TSLA, AAPL) or leave empty"
            disabled={loading}
            className="w-full px-4 py-2 rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          />
          <p className="text-xs text-muted-foreground">
            💡 Leave empty for general market analysis
          </p>
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

      {/* Consensus Results */}
      {consensus && (
        <div className="bg-card rounded-lg border p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold">Consensus Decision</h3>
              <p className="text-sm text-muted-foreground">
                Based on {consensus.modelCount} AI model{consensus.modelCount !== 1 ? 's' : ''}
              </p>
            </div>
            <ActionBadge action={consensus.action} />
          </div>

          {/* Vote Breakdown */}
          <div className="mb-6 p-4 bg-muted/50 rounded-lg">
            <h4 className="text-sm font-semibold mb-3">Vote Breakdown:</h4>
            <div className="grid grid-cols-3 gap-3">
              <VoteCard label="BUY" count={consensus.votes.BUY} total={consensus.modelCount} />
              <VoteCard label="SELL" count={consensus.votes.SELL} total={consensus.modelCount} />
              <VoteCard label="HOLD" count={consensus.votes.HOLD} total={consensus.modelCount} />
            </div>
          </div>

          {/* Trade Details */}
          {consensus.action !== 'HOLD' && (
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Symbol:</span>
                <span className="font-mono font-medium text-lg">{consensus.symbol}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Quantity:</span>
                <span className="font-medium text-lg">{consensus.quantity} shares</span>
              </div>
            </div>
          )}

          {/* Reasoning */}
          <div className="space-y-2 mb-6">
            <div className="text-sm text-muted-foreground">Consensus Reasoning:</div>
            {typeof consensus.reasoning === 'string' ? (
              <div className="text-sm leading-relaxed">{consensus.reasoning}</div>
            ) : (
              <div className="text-sm space-y-3">
                {consensus.reasoning.bullishCase && (
                  <div>
                    <div className="font-medium text-green-600 mb-1">📈 Bullish Case:</div>
                    <div className="text-muted-foreground">{consensus.reasoning.bullishCase}</div>
                  </div>
                )}
                {consensus.reasoning.bearishCase && (
                  <div>
                    <div className="font-medium text-red-600 mb-1">📉 Bearish Case:</div>
                    <div className="text-muted-foreground">{consensus.reasoning.bearishCase}</div>
                  </div>
                )}
                {consensus.reasoning.technicalAnalysis && (
                  <div>
                    <div className="font-medium mb-1">📊 Technical Analysis:</div>
                    <div className="text-muted-foreground">{consensus.reasoning.technicalAnalysis}</div>
                  </div>
                )}
                {consensus.reasoning.fundamentalAnalysis && (
                  <div>
                    <div className="font-medium mb-1">📋 Fundamental Analysis:</div>
                    <div className="text-muted-foreground">{consensus.reasoning.fundamentalAnalysis}</div>
                  </div>
                )}
                {consensus.reasoning.sentiment && (
                  <div>
                    <div className="font-medium mb-1">💭 Sentiment:</div>
                    <div className="text-muted-foreground">{consensus.reasoning.sentiment}</div>
                  </div>
                )}
                {consensus.reasoning.timing && (
                  <div>
                    <div className="font-medium mb-1">⏰ Timing:</div>
                    <div className="text-muted-foreground">{consensus.reasoning.timing}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Confidence */}
          <div className="pt-4 border-t">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Overall Confidence:</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${consensus.confidence * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium">
                  {(consensus.confidence * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
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

function VoteCard({ label, count, total }: { label: string; count: number; total: number }) {
  const percentage = total > 0 ? (count / total) * 100 : 0

  const colorClass = {
    BUY: 'text-green-600 bg-green-100 dark:bg-green-950',
    SELL: 'text-red-600 bg-red-100 dark:bg-red-950',
    HOLD: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-950',
  }[label] || 'text-gray-600 bg-gray-100 dark:bg-gray-950'

  return (
    <div className={`p-3 rounded-lg ${colorClass}`}>
      <div className="text-xs font-semibold mb-1">{label}</div>
      <div className="text-2xl font-bold">{count}</div>
      <div className="text-xs mt-1">{percentage.toFixed(0)}%</div>
    </div>
  )
}

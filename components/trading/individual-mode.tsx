'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp } from 'lucide-react'
import { ReasoningStream, createReasoningStep, type ReasoningStep } from './reasoning-stream'
import { getModelDisplayName, getDefaultModelSelections } from '@/lib/trading/models-config'
import { ProviderModelSelector } from './provider-model-selector'

interface TradingDecision {
  model: string
  action: 'BUY' | 'SELL' | 'HOLD'
  symbol?: string
  quantity?: number
  reasoning: string
  confidence: number
}

interface AnalysisContext {
  accountBalance: string
  buyingPower: string
  cash: string
  analysisDate: string
  promptSummary: string
}

export function IndividualMode() {
  const [selectedModels, setSelectedModels] = useState<string[]>(getDefaultModelSelections())
  const [loading, setLoading] = useState(false)
  const [decisions, setDecisions] = useState<TradingDecision[]>([])
  const [context, setContext] = useState<AnalysisContext | null>(null)
  const [showContext, setShowContext] = useState(false)
  const [contextSteps, setContextSteps] = useState<ReasoningStep[]>([])

  const getTradingDecisions = async () => {
    setLoading(true)
    setDecisions([])
    setContext(null)
    setContextSteps([])

    try {
      const response = await fetch('/api/trading/individual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedModels }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to get trading decisions')
      }

      const data = await response.json()
      setDecisions(data.decisions)

      // Set context and create reasoning steps for transparency
      if (data.context) {
        setContext(data.context)

        const steps: ReasoningStep[] = [
          createReasoningStep('thinking', `Analyzing portfolio with balance of $${parseFloat(data.context.accountBalance).toLocaleString()}`),
          createReasoningStep('analysis', `Available buying power: $${parseFloat(data.context.buyingPower).toLocaleString()}`),
          createReasoningStep('analysis', `Available cash: $${parseFloat(data.context.cash).toLocaleString()}`),
          createReasoningStep('thinking', data.context.promptSummary),
          createReasoningStep('decision', `Querying ${selectedModels.length} AI models for trading recommendations...`)
        ]

        setContextSteps(steps)
        setShowContext(true) // Auto-show context on first load
      }
    } catch (error) {
      console.error('Failed to get trading decisions:', error)
      alert(error instanceof Error ? error.message : 'Failed to get trading decisions')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Model Selector */}
      <div className="bg-card rounded-lg border p-6">
        <ProviderModelSelector
          value={selectedModels}
          onChange={(value) => setSelectedModels(value as string[])}
          mode="multiple"
          label="Select AI Models to Compare (2-10)"
          disabled={loading}
          minSelections={2}
          maxSelections={10}
        />

        <Button
          onClick={getTradingDecisions}
          disabled={loading || selectedModels.length < 2}
          className="w-full mt-4"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Getting Trading Decisions...
            </>
          ) : (
            <>Get Trading Decisions from {selectedModels.length} Models</>
          )}
        </Button>
      </div>

      {/* AI Analysis Context - Transparency */}
      {context && contextSteps.length > 0 && (
        <div>
          <button
            onClick={() => setShowContext(!showContext)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            {showContext ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            {showContext ? 'Hide' : 'Show'} AI Analysis Context
          </button>

          {showContext && (
            <ReasoningStream
              steps={contextSteps}
              isStreaming={false}
              title="AI Analysis Context"
              modelName={`${selectedModels.length} Models`}
            />
          )}
        </div>
      )}

      {/* Results */}
      {decisions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {decisions.map((decision, index) => (
            <div key={index} className="bg-card rounded-lg border p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold">{decision.model}</h4>
                <ActionBadge action={decision.action} />
              </div>

              {decision.action !== 'HOLD' && (
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Symbol:</span>
                    <span className="font-mono font-medium">{decision.symbol}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Quantity:</span>
                    <span className="font-medium">{decision.quantity} shares</span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Reasoning:</div>
                <div className="text-sm">{decision.reasoning}</div>
              </div>

              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Confidence:</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${decision.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">
                      {(decision.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
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

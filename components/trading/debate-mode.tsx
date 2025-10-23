'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, TrendingUp, TrendingDown, Minus, Users, MessageSquare } from 'lucide-react'

interface DebateAgent {
  role: 'analyst' | 'critic' | 'synthesizer'
  name: string
  decision: {
    action: 'BUY' | 'SELL' | 'HOLD'
    symbol?: string
    quantity?: number
    reasoning: string
    confidence: number
  }
}

interface DebateResult {
  round1: DebateAgent[]
  round2: DebateAgent[]
  finalDecision: {
    action: 'BUY' | 'SELL' | 'HOLD'
    symbol?: string
    quantity?: number
    reasoning: string
    confidence: number
    consensus: string
  }
}

export function DebateMode() {
  const [loading, setLoading] = useState(false)
  const [debate, setDebate] = useState<DebateResult | null>(null)
  const [activeRound, setActiveRound] = useState<1 | 2>(1)

  const startDebate = async () => {
    setLoading(true)
    setDebate(null)
    setActiveRound(1)

    try {
      const response = await fetch('/api/trading/debate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to start debate')
      }

      const data = await response.json()
      setDebate(data.debate)
    } catch (error) {
      console.error('Failed to start trading debate:', error)
      alert(error instanceof Error ? error.message : 'Failed to start trading debate')
    } finally {
      setLoading(false)
    }
  }

  const currentRound = debate && activeRound === 1 ? debate.round1 : debate?.round2

  return (
    <div className="space-y-6">
      {/* Start Debate Button */}
      <div className="bg-card rounded-lg border p-6">
        <div className="mb-4">
          <h3 className="font-semibold mb-2">Agent Debate Trading System</h3>
          <p className="text-sm text-muted-foreground">
            Three AI agents debate trading strategy through multiple rounds to reach a final decision.
          </p>
        </div>

        <Button
          onClick={startDebate}
          disabled={loading}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Debate in Progress...
            </>
          ) : (
            <>
              <Users className="w-4 h-4 mr-2" />
              Start Agent Debate
            </>
          )}
        </Button>
      </div>

      {/* Debate Results */}
      {debate && (
        <div className="space-y-6">
          {/* Round Selector */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveRound(1)}
              className={`flex-1 py-3 px-4 rounded-lg border-2 font-medium transition-all ${
                activeRound === 1
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              Round 1: Initial Positions
            </button>
            <button
              onClick={() => setActiveRound(2)}
              className={`flex-1 py-3 px-4 rounded-lg border-2 font-medium transition-all ${
                activeRound === 2
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              Round 2: Debate & Refinement
            </button>
          </div>

          {/* Agent Cards */}
          {currentRound && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {currentRound.map((agent, index) => (
                <div key={index} className="bg-card rounded-lg border p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                        {agent.role}
                      </div>
                      <div className="font-semibold">{agent.name}</div>
                    </div>
                    <ActionBadge action={agent.decision.action} />
                  </div>

                  {agent.decision.action !== 'HOLD' && (
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Symbol:</span>
                        <span className="font-mono font-medium">{agent.decision.symbol}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Quantity:</span>
                        <span className="font-medium">{agent.decision.quantity} shares</span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 mb-4">
                    <div className="text-xs text-muted-foreground">Reasoning:</div>
                    <div className="text-sm leading-relaxed">{agent.decision.reasoning}</div>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Confidence:</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${agent.decision.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium">
                          {(agent.decision.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Final Decision */}
          <div className="bg-card rounded-lg border p-6">
            <div className="flex items-center gap-2 mb-6">
              <MessageSquare className="w-5 h-5 text-primary" />
              <h3 className="text-2xl font-bold">Final Debate Decision</h3>
            </div>

            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="text-3xl font-bold">{debate.finalDecision.action}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {debate.finalDecision.consensus}
                </div>
              </div>
              <ActionBadge action={debate.finalDecision.action} large />
            </div>

            {debate.finalDecision.action !== 'HOLD' && (
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Symbol</div>
                  <div className="text-2xl font-mono font-bold">{debate.finalDecision.symbol}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Quantity</div>
                  <div className="text-2xl font-bold">{debate.finalDecision.quantity} shares</div>
                </div>
              </div>
            )}

            <div className="space-y-3 mb-6">
              <div className="text-sm text-muted-foreground">Final Reasoning:</div>
              <div className="text-sm leading-relaxed bg-muted/50 p-4 rounded-lg">
                {debate.finalDecision.reasoning}
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Overall Confidence:</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${debate.finalDecision.confidence * 100}%` }}
                    />
                  </div>
                  <span className="text-lg font-bold">
                    {(debate.finalDecision.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ActionBadge({ action, large }: { action: 'BUY' | 'SELL' | 'HOLD'; large?: boolean }) {
  const config = {
    BUY: { icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-950' },
    SELL: { icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-950' },
    HOLD: { icon: Minus, color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-950' },
  }

  const { icon: Icon, color, bg } = config[action]
  const sizeClass = large ? 'text-lg' : 'text-sm'
  const iconSize = large ? 'w-6 h-6' : 'w-4 h-4'
  const padding = large ? 'px-4 py-2' : 'px-3 py-1'

  return (
    <div className={`flex items-center gap-1.5 ${padding} rounded-full ${bg}`}>
      <Icon className={`${iconSize} ${color}`} />
      <span className={`${sizeClass} font-semibold ${color}`}>{action}</span>
    </div>
  )
}

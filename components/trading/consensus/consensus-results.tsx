'use client'

import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { TrendingUp, TrendingDown, Minus, CheckCircle, AlertCircle, XCircle, RotateCcw, ShoppingCart } from 'lucide-react'
import { TradeCard, type TradeRecommendation } from '../trade-card'
import type { ConsensusResultData } from './types'

interface ConsensusResultsProps {
  consensus: ConsensusResultData
  tradeRecommendation: TradeRecommendation | null
  showTradeCard: boolean
  brokerEnv: 'live' | 'paper'
  onExecuteTrade: (symbol: string, action: 'buy' | 'sell', quantity: number) => Promise<any>
  onDismissTradeCard: () => void
  onStartNew: () => void
}

export function ConsensusResults({
  consensus,
  tradeRecommendation,
  showTradeCard,
  brokerEnv,
  onExecuteTrade,
  onDismissTradeCard,
  onStartNew,
}: ConsensusResultsProps) {
  return (
    <>
      {/* Consensus Results */}
      <div className="bg-card rounded-lg border p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold">Consensus Decision</h3>
            <p className="text-sm text-muted-foreground">
              Based on {consensus.modelCount} AI model{consensus.modelCount !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={onStartNew}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Start New Analysis
            </Button>
            <ActionBadge action={consensus.action} />
          </div>
        </div>

        {/* Agreement Level */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AgreementIcon agreement={consensus.agreement} />
              <span className="font-medium">{consensus.agreementText}</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {Math.round(consensus.agreement * 100)}% agreement
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Agreement Level</span>
              <span>{Math.round(consensus.agreement * 100)}%</span>
            </div>
            <Progress value={consensus.agreement * 100} className="h-2" />
          </div>
        </div>

        {/* Overall Confidence */}
        <div className="space-y-2 mb-6">
          <div className="flex justify-between text-sm">
            <span>Overall Confidence</span>
            <span>{Math.round(consensus.confidence)}%</span>
          </div>
          <Progress value={consensus.confidence} className="h-2" />
        </div>

        {/* Consensus Summary */}
        {consensus.summary && (
          <div className="mb-6">
            <h4 className="font-medium mb-2">Consensus Summary</h4>
            <p className="text-sm text-muted-foreground">{consensus.summary}</p>
          </div>
        )}

        {/* Key Disagreements */}
        {consensus.disagreements && consensus.disagreements.length > 0 && (
          <div className="mb-6">
            <h4 className="font-medium mb-2">Key Disagreements</h4>
            <ul className="space-y-1">
              {consensus.disagreements.map((disagreement, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-destructive">&#8226;</span>
                  {disagreement}
                </li>
              ))}
            </ul>
          </div>
        )}

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
                  <div className="font-medium text-green-600 mb-1">Bullish Case:</div>
                  <div className="text-muted-foreground">{consensus.reasoning.bullishCase}</div>
                </div>
              )}
              {consensus.reasoning.bearishCase && (
                <div>
                  <div className="font-medium text-red-600 mb-1">Bearish Case:</div>
                  <div className="text-muted-foreground">{consensus.reasoning.bearishCase}</div>
                </div>
              )}
              {consensus.reasoning.technicalAnalysis && (
                <div>
                  <div className="font-medium mb-1">Technical Analysis:</div>
                  <div className="text-muted-foreground">{consensus.reasoning.technicalAnalysis}</div>
                </div>
              )}
              {consensus.reasoning.fundamentalAnalysis && (
                <div>
                  <div className="font-medium mb-1">Fundamental Analysis:</div>
                  <div className="text-muted-foreground">{consensus.reasoning.fundamentalAnalysis}</div>
                </div>
              )}
              {consensus.reasoning.sentiment && (
                <div>
                  <div className="font-medium mb-1">Sentiment:</div>
                  <div className="text-muted-foreground">{consensus.reasoning.sentiment}</div>
                </div>
              )}
              {consensus.reasoning.timing && (
                <div>
                  <div className="font-medium mb-1">Timing:</div>
                  <div className="text-muted-foreground">{consensus.reasoning.timing}</div>
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Trade Action Card */}
      {tradeRecommendation && showTradeCard && (
        <div className="bg-card rounded-lg border p-6">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Take Action</h3>
          </div>
          <TradeCard
            recommendation={tradeRecommendation}
            brokerEnvironment={brokerEnv}
            onExecute={onExecuteTrade}
            onDismiss={onDismissTradeCard}
          />
        </div>
      )}
    </>
  )
}

export function ActionBadge({ action }: { action: 'BUY' | 'SELL' | 'HOLD' }) {
  const config = {
    BUY: { icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-950' },
    SELL: { icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-950' },
    HOLD: { icon: Minus, color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-950' },
  }

  // Defensive: Default to HOLD if action is invalid
  const safeAction = (action && config[action]) ? action : 'HOLD'
  const { icon: Icon, color, bg } = config[safeAction]

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${bg}`}>
      <Icon className={`w-4 h-4 ${color}`} />
      <span className={`text-sm font-semibold ${color}`}>{safeAction}</span>
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

function AgreementIcon({ agreement }: { agreement: number }) {
  if (agreement >= 0.75) {
    return <CheckCircle className="w-5 h-5 text-green-600" />
  } else if (agreement >= 0.5) {
    return <AlertCircle className="w-5 h-5 text-yellow-600" />
  } else {
    return <XCircle className="w-5 h-5 text-red-600" />
  }
}

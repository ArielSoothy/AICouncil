'use client'

import { useState } from 'react'
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Loader2, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface TradeRecommendation {
  symbol: string
  action: 'BUY' | 'SELL' | 'HOLD'
  suggestedQuantity: number
  currentPrice: number
  rationale: string
  confidence: number
  source: string // e.g., "consensus", "debate", "individual"
}

interface TradeCardProps {
  recommendation: TradeRecommendation
  brokerEnvironment: 'live' | 'paper'
  onExecute?: (symbol: string, action: 'buy' | 'sell', quantity: number) => Promise<void>
  onDismiss?: () => void
  className?: string
}

export function TradeCard({
  recommendation,
  brokerEnvironment,
  onExecute,
  onDismiss,
  className
}: TradeCardProps) {
  const [quantity, setQuantity] = useState(recommendation.suggestedQuantity)
  const [isExecuting, setIsExecuting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [executed, setExecuted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isLive = brokerEnvironment === 'live'
  const isBuy = recommendation.action === 'BUY'
  const isSell = recommendation.action === 'SELL'
  const isHold = recommendation.action === 'HOLD'

  const estimatedTotal = quantity * recommendation.currentPrice

  const handleExecute = async () => {
    if (!onExecute) return

    setIsExecuting(true)
    setError(null)

    try {
      await onExecute(
        recommendation.symbol,
        isBuy ? 'buy' : 'sell',
        quantity
      )
      setExecuted(true)
      setShowConfirm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Order failed')
    } finally {
      setIsExecuting(false)
    }
  }

  // Already executed - show success state
  if (executed) {
    return (
      <div className={cn(
        'rounded-lg border-2 border-green-500 bg-green-50 dark:bg-green-950/30 p-4',
        className
      )}>
        <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
          <Check className="w-5 h-5" />
          <span className="font-semibold">Order Placed Successfully</span>
        </div>
        <p className="text-sm text-green-600 dark:text-green-400 mt-1">
          {isBuy ? 'Bought' : 'Sold'} {quantity} shares of {recommendation.symbol}
        </p>
      </div>
    )
  }

  // HOLD recommendation - no action card
  if (isHold) {
    return (
      <div className={cn(
        'rounded-lg border border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-950/30 p-4',
        className
      )}>
        <div className="flex items-center gap-2 mb-2">
          <Minus className="w-5 h-5 text-yellow-600" />
          <span className="font-semibold text-yellow-800 dark:text-yellow-200">
            HOLD - No Action Recommended
          </span>
        </div>
        <p className="text-sm text-yellow-700 dark:text-yellow-300">
          {recommendation.rationale.substring(0, 150)}...
        </p>
      </div>
    )
  }

  return (
    <div className={cn(
      'rounded-lg border-2 p-4 transition-all',
      isBuy
        ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950/30'
        : 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isBuy ? (
            <TrendingUp className="w-5 h-5 text-green-600" />
          ) : (
            <TrendingDown className="w-5 h-5 text-red-600" />
          )}
          <span className={cn(
            'font-bold text-lg',
            isBuy ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
          )}>
            {recommendation.action} RECOMMENDATION
          </span>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Symbol & Price */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="font-mono text-2xl font-bold">{recommendation.symbol}</span>
          <p className="text-sm text-muted-foreground">
            From: {recommendation.source} analysis
          </p>
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold">
            ${recommendation.currentPrice.toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground">
            Current Price
          </div>
        </div>
      </div>

      {/* Quantity Adjuster */}
      <div className="mb-4">
        <label className="text-sm font-medium mb-2 block">
          Quantity: {quantity} shares
        </label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="1"
            max={Math.max(recommendation.suggestedQuantity * 2, 100)}
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value))}
            className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-20 px-2 py-1 border rounded text-center font-mono"
          />
        </div>
        <div className="flex justify-between text-sm text-muted-foreground mt-1">
          <span>Suggested: {recommendation.suggestedQuantity}</span>
          <span>Est. Total: ${estimatedTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </div>

      {/* Confidence */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span>AI Confidence</span>
          <span>{Math.round(recommendation.confidence * 100)}%</span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              recommendation.confidence >= 0.7 ? 'bg-green-500' :
              recommendation.confidence >= 0.5 ? 'bg-yellow-500' : 'bg-red-500'
            )}
            style={{ width: `${recommendation.confidence * 100}%` }}
          />
        </div>
      </div>

      {/* Rationale Preview */}
      <div className="mb-4 p-3 bg-white/50 dark:bg-black/20 rounded-lg">
        <p className="text-sm text-muted-foreground">
          <strong>Rationale:</strong> {recommendation.rationale.substring(0, 200)}
          {recommendation.rationale.length > 200 && '...'}
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Confirmation Step */}
      {showConfirm ? (
        <div className="space-y-3">
          {isLive && (
            <div className="flex items-start gap-2 p-3 bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-orange-800 dark:text-orange-200 text-sm">
                  REAL MONEY ORDER
                </p>
                <p className="text-xs text-orange-700 dark:text-orange-300">
                  This will {isBuy ? 'spend' : 'sell'} approximately ${estimatedTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} of real money.
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirm(false)}
              disabled={isExecuting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleExecute}
              disabled={isExecuting}
              className={cn(
                'flex-1',
                isBuy
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              )}
            >
              {isExecuting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Placing Order...
                </>
              ) : (
                <>Confirm {recommendation.action}</>
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onDismiss}
            className="flex-1"
          >
            Dismiss
          </Button>
          <Button
            onClick={() => setShowConfirm(true)}
            className={cn(
              'flex-1',
              isBuy
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-red-600 hover:bg-red-700'
            )}
          >
            {isBuy ? 'Buy' : 'Sell'} {quantity} Shares
          </Button>
        </div>
      )}
    </div>
  )
}

// Wrapper to extract trade recommendation from AI response
export function extractTradeRecommendation(
  consensus: any,
  source: string = 'consensus'
): TradeRecommendation | null {
  if (!consensus || consensus.action === 'HOLD') {
    return consensus ? {
      symbol: consensus.symbol || 'N/A',
      action: 'HOLD',
      suggestedQuantity: 0,
      currentPrice: 0,
      rationale: typeof consensus.reasoning === 'string'
        ? consensus.reasoning
        : consensus.summary || 'No action recommended',
      confidence: consensus.confidence || 0,
      source
    } : null
  }

  return {
    symbol: consensus.symbol,
    action: consensus.action,
    suggestedQuantity: consensus.quantity || 1,
    currentPrice: 0, // Will be fetched from portfolio or quote API
    rationale: typeof consensus.reasoning === 'string'
      ? consensus.reasoning
      : consensus.summary || '',
    confidence: consensus.confidence / 100, // Convert to 0-1 scale
    source
  }
}

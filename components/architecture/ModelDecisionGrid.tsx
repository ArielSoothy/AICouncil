'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface ModelDecision {
  model: string
  modelId: string
  action: 'BUY' | 'SELL' | 'HOLD'
  confidence: number
  reasoning?: string
}

interface ModelDecisionGridProps {
  decisions: ModelDecision[]
  onClick?: (decision: ModelDecision) => void
}

const ACTION_COLORS = {
  BUY: 'bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700 text-green-800 dark:text-green-200',
  SELL: 'bg-red-100 dark:bg-red-900 border-red-300 dark:border-red-700 text-red-800 dark:text-red-200',
  HOLD: 'bg-yellow-100 dark:bg-yellow-900 border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200'
}

const ACTION_ICONS = {
  BUY: TrendingUp,
  SELL: TrendingDown,
  HOLD: Minus
}

export function ModelDecisionGrid({
  decisions,
  onClick
}: ModelDecisionGridProps) {
  if (!decisions || decisions.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        No model decisions available
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {decisions.map((decision, index) => {
        const Icon = ACTION_ICONS[decision.action]
        const colorClass = ACTION_COLORS[decision.action]

        return (
          <div
            key={`${decision.modelId}-${index}`}
            className={`rounded-lg border p-3 ${colorClass} cursor-pointer hover:shadow-md transition-all`}
            onClick={() => onClick?.(decision)}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-sm truncate flex-1">
                {decision.model}
              </span>
              <Icon className="w-4 h-4 flex-shrink-0" />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold">{decision.action}</span>
              <span className="opacity-75">
                {Math.round(decision.confidence * 100)}%
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

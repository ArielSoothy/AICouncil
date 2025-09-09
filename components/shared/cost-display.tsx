'use client'

import { DollarSign } from 'lucide-react'

interface CostDisplayProps {
  cost: {
    input: number
    output: number
  }
  variant?: 'compact' | 'detailed' | 'free-badge'
  className?: string
}

export function CostDisplay({ cost, variant = 'detailed', className = '' }: CostDisplayProps) {
  const isFree = cost.input === 0 && cost.output === 0

  if (variant === 'free-badge' && isFree) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <DollarSign className="h-3 w-3" />
        <span className="font-medium text-green-600">FREE</span>
      </div>
    )
  }

  if (variant === 'compact') {
    if (isFree) {
      return <span className={`text-green-600 font-medium ${className}`}>FREE</span>
    }
    return (
      <span className={`font-mono text-sm ${className}`}>
        ${cost.input.toFixed(4)}/${cost.output.toFixed(4)}
      </span>
    )
  }

  if (isFree) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <DollarSign className="h-3 w-3" />
        <span className="font-medium text-green-600">FREE</span>
      </div>
    )
  }

  // Detailed view
  return (
    <div className={`space-y-0.5 ${className}`}>
      <div className="flex items-center gap-1">
        <DollarSign className="h-3 w-3" />
        <span className="font-mono">
          ${cost.input.toFixed(4)}/1K in
        </span>
      </div>
      <div className="flex items-center gap-1">
        <span className="w-3"></span>
        <span className="font-mono">
          ${cost.output.toFixed(4)}/1K out
        </span>
      </div>
    </div>
  )
}
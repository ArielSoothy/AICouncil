'use client'

interface EfficiencyBadgeProps {
  model: string
  modelCosts: Record<string, { input: number; output: number }>
  className?: string
}

// Cost efficiency calculation (lower is better, cost per token)
const getCostEfficiency = (model: string, modelCosts: Record<string, { input: number; output: number }>): number => {
  const cost = modelCosts[model]
  if (!cost) return 0
  if (cost.input === 0 && cost.output === 0) return 0
  // Average of input and output cost per token
  return (cost.input + cost.output) / 2
}

const getEfficiencyBadge = (model: string, modelCosts: Record<string, { input: number; output: number }>): string => {
  const efficiency = getCostEfficiency(model, modelCosts)
  if (efficiency === 0) return '🆓'
  if (efficiency < 0.002) return '💰'  // Great value
  if (efficiency < 0.01) return '⚖️'   // Balanced
  if (efficiency < 0.05) return '💎'   // Premium
  return '🏆' // Flagship
}

const getEfficiencyLabel = (model: string, modelCosts: Record<string, { input: number; output: number }>): string => {
  const efficiency = getCostEfficiency(model, modelCosts)
  if (efficiency === 0) return 'Free'
  if (efficiency < 0.002) return 'Great Value'
  if (efficiency < 0.01) return 'Balanced'
  if (efficiency < 0.05) return 'Premium'
  return 'Flagship'
}

export function EfficiencyBadge({ model, modelCosts, className = '' }: EfficiencyBadgeProps) {
  const badge = getEfficiencyBadge(model, modelCosts)
  const label = getEfficiencyLabel(model, modelCosts)

  return (
    <span 
      className={`text-lg ${className}`} 
      title={`Cost efficiency: ${label}`}
    >
      {badge}
    </span>
  )
}
'use client'

import { CostService } from '@/lib/services'

interface EfficiencyBadgeProps {
  model: string
  className?: string
}

export function EfficiencyBadge({ model, className = '' }: EfficiencyBadgeProps) {
  const badge = CostService.getEfficiencyBadge(model)
  const label = CostService.getEfficiencyLabel(model)

  return (
    <span 
      className={`text-lg ${className}`} 
      title={`Cost efficiency: ${label}`}
    >
      {badge}
    </span>
  )
}
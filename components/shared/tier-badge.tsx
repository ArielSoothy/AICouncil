'use client'

import { ModelService, TierType } from '@/lib/services'

interface TierBadgeProps {
  tier: TierType
  className?: string
}

export function TierBadge({ tier, className = '' }: TierBadgeProps) {
  const tierColors = ModelService.getTierColors()
  const tierLabels = ModelService.getTierLabels()
  
  return (
    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${tierColors[tier]} ${className}`}>
      {tierLabels[tier]}
    </div>
  )
}
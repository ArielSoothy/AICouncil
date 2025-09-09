'use client'

import { Badge } from '@/components/ui/badge'

type TierType = 'free' | 'budget' | 'balanced' | 'premium' | 'flagship'

interface TierBadgeProps {
  tier: TierType
  className?: string
}

const tierColors = {
  free: 'text-green-600 bg-green-50 dark:bg-green-900/20',
  budget: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
  balanced: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20',
  premium: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20',
  flagship: 'text-red-600 bg-red-50 dark:bg-red-900/20'
}

const tierLabels = {
  free: 'FREE',
  budget: 'BUDGET',
  balanced: 'BALANCED',
  premium: 'PREMIUM',
  flagship: 'FLAGSHIP'
}

export function TierBadge({ tier, className = '' }: TierBadgeProps) {
  return (
    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${tierColors[tier]} ${className}`}>
      {tierLabels[tier]}
    </div>
  )
}
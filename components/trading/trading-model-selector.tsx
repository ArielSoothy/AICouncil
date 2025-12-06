'use client'

import { ModelConfig } from '@/types/consensus'
import { UltraModelBadgeSelector } from '@/components/consensus/ultra-model-badge-selector'

interface TradingModelSelectorProps {
  models: ModelConfig[]
  onChange: (models: ModelConfig[]) => void
  disabled?: boolean
}

export function TradingModelSelector({ models, onChange, disabled }: TradingModelSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground">
        Selected Models ({models.filter(m => m.enabled).length})
      </label>
      <UltraModelBadgeSelector
        models={models}
        onChange={onChange}
      />
    </div>
  )
}

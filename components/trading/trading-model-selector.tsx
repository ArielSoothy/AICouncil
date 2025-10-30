'use client'

import { ModelConfig } from '@/types/consensus'
import { Button } from '@/components/ui/button'
import { UltraModelBadgeSelector } from '@/components/consensus/ultra-model-badge-selector'
import { TRADING_MODELS } from '@/lib/trading/models-config'
import { useTradingPreset } from '@/contexts/trading-preset-context'
import { PRESET_CONFIGS, getPresetConfig } from '@/lib/config/model-presets'

interface TradingModelSelectorProps {
  models: ModelConfig[]
  onChange: (models: ModelConfig[]) => void
  disabled?: boolean
}

export function TradingModelSelector({ models, onChange, disabled }: TradingModelSelectorProps) {
  const { globalTier } = useTradingPreset()

  return (
    <div className="space-y-4">
      {/* Global Preset Indicator */}
      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
        <div>
          <div className="text-sm font-medium">Global Model Tier</div>
          <div className="text-xs text-muted-foreground">
            Change tier using the selector above to update all modes
          </div>
        </div>
        {(() => {
          const preset = getPresetConfig(globalTier)
          const Icon = preset.icon
          return (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border-2 ${preset.color}`}>
              <Icon className="w-4 h-4" />
              <span className="font-semibold">{preset.label}</span>
            </div>
          )
        })()}
      </div>

      {/* Model Badge Selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">
          Selected Models ({models.filter(m => m.enabled).length})
        </label>
        <UltraModelBadgeSelector
          models={models}
          onChange={onChange}
        />
      </div>
    </div>
  )
}

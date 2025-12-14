'use client'

import { ModelConfig } from '@/types/consensus'
import { UltraModelBadgeSelector } from './ultra-model-badge-selector'
import { useTradingPreset } from '@/contexts/trading-preset-context'

interface ModelSelectorProps {
  models: ModelConfig[]
  onChange: (models: ModelConfig[]) => void
  usePremiumQuery?: boolean
  maxModels?: number
  userTier?: string
}

/**
 * Model Selector - Badge Style
 *
 * Unified badge/pill style consistent with Trading page.
 * Uses UltraModelBadgeSelector for the actual UI.
 */
export function ModelSelector({
  models,
  onChange,
}: ModelSelectorProps) {
  const { globalTier } = useTradingPreset()

  // Check if using subscription mode
  const isSubscriptionMode = globalTier === 'sub-pro' || globalTier === 'sub-max'

  return (
    <div className="space-y-3">
      {/* Badge Selector */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Select AI Models</h3>
        </div>
        <UltraModelBadgeSelector
          models={models}
          onChange={onChange}
          isSubscriptionMode={isSubscriptionMode}
        />
      </div>

      {/* Tips */}
      <div className="text-xs text-muted-foreground space-y-1">
        <div>💡 Tip: Add multiple models from the same provider to compare their responses directly!</div>
        <div>💰 Cost shown per 1K tokens (input/output). Flagship models offer best performance but cost more.</div>
        <div>🌐 Models with globe icon have internet access for real-time information.</div>
        <div>🏷️ Efficiency badges: 🆓 Free • 💰 Great Value • ⚖️ Balanced • 💎 Premium • 🏆 Flagship</div>
      </div>
    </div>
  )
}

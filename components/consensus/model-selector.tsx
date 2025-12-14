'use client'

import { ModelConfig } from '@/types/consensus'
import { UltraModelBadgeSelector } from './ultra-model-badge-selector'
import { useAuth } from '@/contexts/auth-context'
import { useTradingPreset } from '@/contexts/trading-preset-context'
import { getPresetConfig } from '@/lib/config/model-presets'

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
  usePremiumQuery = false,
  maxModels,
  userTier: propUserTier
}: ModelSelectorProps) {
  const { userTier, loading } = useAuth()
  const { globalTier } = useTradingPreset()

  // Determine effective tier
  const currentTier = loading ? 'free' : (userTier || 'free')
  const effectiveTier = propUserTier || currentTier

  // Debug logging
  console.log('📊 ModelSelector - loading:', loading, 'userTier:', userTier, 'effectiveTier:', effectiveTier)

  // Check if using subscription mode
  const isSubscriptionMode = globalTier === 'sub-pro' || globalTier === 'sub-max'

  return (
    <div className="space-y-4">
      {/* Global Preset Indicator */}
      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
        <div>
          <div className="text-sm font-medium">Global Model Tier</div>
          <div className="text-xs text-muted-foreground">
            Change tier using the selector in the header to update all modes
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

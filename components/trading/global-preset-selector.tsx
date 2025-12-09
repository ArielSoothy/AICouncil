'use client'

import { Button } from '@/components/ui/button'
import { useGlobalModelTier } from '@/contexts/trading-preset-context'
import { PRESET_CONFIGS, PresetTier, getAllPresetTiers } from '@/lib/config/model-presets'
import { IS_PRODUCTION } from '@/lib/utils/environment'

/**
 * Global Model Tier Selector Component
 *
 * Single control point for Free/Pro/Max tier selection across ALL modes in the app.
 * Positioned in header below navigation (smart visibility on model-using pages).
 *
 * Affects ALL modes:
 * - Consensus Mode (/)
 * - Agent Debate Mode (/agents)
 * - Trading Modes (/trading): Consensus Trade, Debate Trade
 * - Ultra Mode (/ultra)
 * - Arena Mode (/arena)
 *
 * Features:
 * - Visual tier selector with icons and descriptions
 * - Syncs with user subscription tier (smart defaults)
 * - Consistent styling across all pages
 * - Compact header-friendly design
 */

export function GlobalModelTierSelector() {
  const { globalTier, setGlobalTier } = useGlobalModelTier()

  const allTiers = getAllPresetTiers()

  return (
    <div className="border-b bg-muted/20">
      <div className="container mx-auto px-4 py-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Header */}
          <div>
            <h3 className="text-sm font-semibold">AI Model Tier</h3>
            <p className="text-xs text-muted-foreground">
              {IS_PRODUCTION
                ? 'Free tier models only (6 models: Llama 3.3 70B, Gemini 2.0/1.5 Flash) - Pro/Max locked 🔒'
                : 'Applies to all modes across the app'
              }
            </p>
          </div>

          {/* Compact Preset Buttons */}
          <div className="flex gap-2">
            {allTiers.map((tier) => {
              const preset = PRESET_CONFIGS[tier]
              const Icon = preset.icon
              const isActive = globalTier === tier
              const isLocked = IS_PRODUCTION && tier !== 'free'

              return (
                <Button
                  key={tier}
                  onClick={() => {
                    if (!isLocked) {
                      setGlobalTier(tier)
                    }
                  }}
                  variant="outline"
                  size="sm"
                  disabled={isLocked}
                  className={`flex items-center gap-1.5 transition-all ${
                    isLocked
                      ? 'opacity-50 cursor-not-allowed text-gray-400'
                      : isActive
                      ? `${preset.color} border-current`
                      : 'hover:border-primary/50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="font-semibold text-xs">{preset.label}</span>
                  {isLocked && <span className="text-xs">🔒</span>}
                </Button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// Legacy export for backwards compatibility
export const GlobalPresetSelector = GlobalModelTierSelector

'use client'

import { ModelConfig } from '@/types/consensus'
import { Button } from '@/components/ui/button'
import { UltraModelBadgeSelector } from '@/components/consensus/ultra-model-badge-selector'
import { TRADING_MODELS } from '@/lib/trading/models-config'
import { Sparkles, Zap, Gift } from 'lucide-react'

interface TradingModelSelectorProps {
  models: ModelConfig[]
  onChange: (models: ModelConfig[]) => void
  disabled?: boolean
}

// Preset configurations based on tier
const PRESET_CONFIGS = {
  free: {
    label: 'Free',
    icon: Gift,
    description: 'All free models (6 models)',
    color: 'bg-green-100 hover:bg-green-200 text-green-700 border-green-300',
    modelIds: [
      // Google free models
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      // Groq free models
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'gemma2-9b-it',
    ]
  },
  pro: {
    label: 'Pro',
    icon: Zap,
    description: 'Balanced/Budget tier models (8 models)',
    color: 'bg-blue-100 hover:bg-blue-200 text-blue-700 border-blue-300',
    modelIds: [
      // Anthropic balanced
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      // OpenAI balanced
      'gpt-4o',
      'gpt-5-mini',
      // Google flagship (good value)
      'gemini-2.5-pro',
      // Groq best free
      'llama-3.3-70b-versatile',
      // xAI balanced
      'grok-3',
      // Mistral balanced
      'mistral-large-latest',
    ]
  },
  max: {
    label: 'Max',
    icon: Sparkles,
    description: 'Best flagship models (8 models)',
    color: 'bg-purple-100 hover:bg-purple-200 text-purple-700 border-purple-300',
    modelIds: [
      // Anthropic flagship
      'claude-sonnet-4-5-20250929',
      // OpenAI flagship
      'gpt-5-chat-latest',
      // Google flagship
      'gemini-2.5-pro',
      // xAI flagship
      'grok-4-fast-reasoning',
      'grok-4-fast-non-reasoning',
      'grok-4-0709',
      // Groq best free (still excellent)
      'llama-3.3-70b-versatile',
      // Perplexity premium
      'sonar-pro',
    ]
  }
}

export function TradingModelSelector({ models, onChange, disabled }: TradingModelSelectorProps) {
  const applyPreset = (presetKey: 'free' | 'pro' | 'max') => {
    const preset = PRESET_CONFIGS[presetKey]

    // Create new ModelConfig array from preset
    const newModels: ModelConfig[] = preset.modelIds.map(modelId => {
      const tradingModel = TRADING_MODELS.find(m => m.id === modelId)
      if (!tradingModel) {
        console.warn(`Model ${modelId} not found in TRADING_MODELS`)
        return null
      }

      return {
        provider: tradingModel.provider as any,
        model: modelId,
        enabled: true
      }
    }).filter(Boolean) as ModelConfig[]

    onChange(newModels)
  }

  return (
    <div className="space-y-4">
      {/* Preset Buttons */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">
          Quick Presets
        </label>
        <div className="grid grid-cols-3 gap-3">
          {(Object.keys(PRESET_CONFIGS) as Array<keyof typeof PRESET_CONFIGS>).map((key) => {
            const preset = PRESET_CONFIGS[key]
            const Icon = preset.icon

            return (
              <Button
                key={key}
                onClick={() => applyPreset(key)}
                disabled={disabled}
                variant="outline"
                className={`flex flex-col items-center gap-2 h-auto py-4 border-2 ${preset.color} transition-all`}
              >
                <Icon className="w-5 h-5" />
                <div className="text-center">
                  <div className="font-semibold">{preset.label}</div>
                  <div className="text-xs opacity-80 mt-1">{preset.description}</div>
                </div>
              </Button>
            )
          })}
        </div>
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

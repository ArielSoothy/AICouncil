'use client'

import { ModelConfig } from '@/types/consensus'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, Globe } from 'lucide-react'
import { getAllModelsWithTierInfo, canUseModel, UserTier } from '@/lib/user-tiers'
import { MODEL_COSTS_PER_1K, MODEL_POWER } from '@/lib/model-metadata'
import { useAuth } from '@/contexts/auth-context'
import { CostDisplay, TierBadge, EfficiencyBadge } from '@/components/shared'
import { PROVIDER_NAMES, hasInternetAccess as registryHasInternetAccess } from '@/lib/models/model-registry'

interface ModelSelectorProps {
  models: ModelConfig[]
  onChange: (models: ModelConfig[]) => void
  usePremiumQuery?: boolean
  maxModels?: number
  userTier?: string
}

// Derive model pricing and tier from centralized metadata
const modelCosts: Record<string, { input: number; output: number; tier: 'free' | 'budget' | 'balanced' | 'premium' | 'flagship' }> = {} as any
Object.entries(MODEL_COSTS_PER_1K).forEach(([model, cost]) => {
  const input = cost.input
  const output = cost.output
  const avg = (input + output) / 2
  const tier = avg === 0
    ? 'free'
    : avg < 0.002
      ? 'budget'
      : avg < 0.01
        ? 'balanced'
        : avg < 0.05
          ? 'premium'
          : 'flagship'
  ;
  modelCosts[model] = { input, output, tier }
})

// Cost efficiency calculation and badge now handled by EfficiencyBadge component

export function ModelSelector({ models, onChange, usePremiumQuery = false, maxModels, userTier: propUserTier }: ModelSelectorProps) {
  const { userTier, loading } = useAuth()

  // Show ALL models with tier info, using effective tier for premium queries
  const currentTier = loading ? 'free' : (userTier || 'free')
  // Use propUserTier if provided (for testing override), otherwise use auth tier
  const effectiveTier = (propUserTier || currentTier) as UserTier

  // Debug logging
  console.log('📊 ModelSelector - loading:', loading, 'userTier:', userTier, 'effectiveTier:', effectiveTier)
  const allModelsWithTierInfo = getAllModelsWithTierInfo(effectiveTier)
  
  // For provider dropdown, show all providers
  const availableProviders = allModelsWithTierInfo.map(p => p.provider)
  const toggleModel = (index: number) => {
    const updated = [...models]
    updated[index].enabled = !updated[index].enabled
    onChange(updated)
  }

  const changeModel = (index: number, model: string) => {
    const updated = [...models]
    
    // Check if user can use this model with effective tier
    if (!canUseModel(effectiveTier, updated[index].provider, model)) {
      // Show upgrade prompt instead
      alert(`This model requires a Pro subscription. Upgrade to access premium models like ${model}.`)
      return
    }
    
    updated[index].model = model
    onChange(updated)
  }

  const changeProvider = (index: number, provider: string) => {
    const updated = [...models]
    updated[index].provider = provider as '' | 'openai' | 'anthropic' | 'google' | 'groq' | 'xai' | 'perplexity' | 'mistral' | 'cohere'
    updated[index].model = '' // Don't auto-select first model
    onChange(updated)
  }

  const addModel = () => {
    const newModel: ModelConfig = {
      provider: '',
      model: '',
      enabled: true  // Auto-check new models for easier UX
    }
    onChange([...models, newModel]) // Add at the bottom
  }

  const removeModel = (index: number) => {
    if (models.length > 1) {
      const updated = models.filter((_, i) => i !== index)
      onChange(updated)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Select AI Models</h3>
        <Button 
          type="button"
          variant="outline" 
          size="sm"
          onClick={addModel}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Model
        </Button>
      </div>

      <div className="grid gap-3">
        {models.map((config, index) => (
          <div key={`${config.provider}-${config.model}-${index}`} className="flex items-center gap-3 p-4 border rounded-lg bg-card">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={() => toggleModel(index)}
              className="w-4 h-4 accent-primary"
            />
            
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Provider</label>
                <select
                  value={config.provider}
                  onChange={(e) => changeProvider(index, e.target.value)}
                  disabled={!config.enabled}
                  className="w-full text-sm bg-background border border-input rounded px-2 py-1 disabled:opacity-50"
                >
                  <option value="">Choose Provider</option>
                   {availableProviders.map((provider) => (
                    <option key={provider} value={provider}>
                      {PROVIDER_NAMES[provider as keyof typeof PROVIDER_NAMES]}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Model</label>
                <select
                  value={config.model}
                  onChange={(e) => changeModel(index, e.target.value)}
                  disabled={!config.enabled}
                  className="w-full text-sm bg-background border border-input rounded px-2 py-1 disabled:opacity-50"
                >
                  <option value="">Choose Model</option>
                  {allModelsWithTierInfo.find(p => p.provider === config.provider)?.models?.map((modelInfo) => {
                    const cost = modelCosts[modelInfo.name as keyof typeof modelCosts]
                    const costDisplay = cost ?
                      (cost.input === 0 && cost.output === 0 ? 'FREE' :
                       `$${cost.input.toFixed(4)}/$${cost.output.toFixed(4)} per 1K`) : ''

                    const internetIcon = registryHasInternetAccess(modelInfo.name) ? ' 🌐' : ''
                    const weight = MODEL_POWER[modelInfo.name as keyof typeof MODEL_POWER]
                    const weightTag = weight ? ` W:${weight.toFixed(2)}` : ''
                    const label = modelInfo.available 
                      ? `${modelInfo.name}${internetIcon} ${costDisplay ? `(${costDisplay})` : ''}${weightTag}`
                      : `${modelInfo.name}${internetIcon} (PRO ONLY) ${costDisplay ? `- ${costDisplay}` : ''}${weightTag}`
                    
                    return (
                      <option 
                        key={modelInfo.name} 
                        value={modelInfo.name}
                        disabled={!modelInfo.available}
                        style={!modelInfo.available ? { color: '#999', fontStyle: 'italic' } : {}}
                      >
                        {label}
                      </option>
                    )
                  })}
                </select>
              </div>
            </div>

            {/* Cost, Tier and Weight Display */}
            {config.enabled && modelCosts[config.model as keyof typeof modelCosts] && (
              <div className="flex-shrink-0">
                <div className="text-xs space-y-1">
                  <div className="flex items-center gap-1">
                    <TierBadge tier={modelCosts[config.model as keyof typeof modelCosts]?.tier || 'budget'} />
                    <EfficiencyBadge 
                      model={config.model} 
                      className="text-lg"
                    />
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <span>Weight:</span>
                    <span className="font-mono">{(MODEL_POWER[config.model as keyof typeof MODEL_POWER] || 0.7).toFixed(2)}</span>
                  </div>
                  <CostDisplay 
                    model={config.model}
                    variant="detailed"
                    className="text-muted-foreground"
                  />
                </div>
              </div>
            )}


            {models.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeModel(index)}
                className="text-muted-foreground hover:text-destructive"
                disabled={!config.enabled}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {(!maxModels || maxModels > 1) && (
        <div className="text-xs text-muted-foreground space-y-1">
          <div>💡 Tip: Add multiple models from the same provider to compare their responses directly!</div>
          <div>💰 Cost shown per 1K tokens (input/output). Flagship models offer best performance but cost more.</div>
          <div>🌐 Models with globe icon have internet access for real-time information.</div>
          <div>🏷️ Efficiency badges: 🆓 Free • 💰 Great Value • ⚖️ Balanced • 💎 Premium • 🏆 Flagship</div>
        </div>
      )}
    </div>
  )
}

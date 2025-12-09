'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Zap, DollarSign, Sparkles } from 'lucide-react'
import { canUseModel } from '@/lib/user-tiers'
import { MODEL_COSTS_PER_1K } from '@/lib/model-metadata'

interface LLMSelectorProps {
  selectedModels: Array<{ provider: string; model: string }>
  onModelsChange: (models: Array<{ provider: string; model: string }>) => void
  availableModels: { provider: string; models: string[] }[]
  userTier: 'guest' | 'free' | 'pro' | 'enterprise'
}

export function LLMSelector({ 
  selectedModels, 
  onModelsChange, 
  availableModels,
  userTier 
}: LLMSelectorProps) {
  const [modelStates, setModelStates] = useState<Record<string, boolean>>({})

  // Group models by provider
  const modelsByProvider = availableModels.reduce((acc, provider) => {
    provider.models.forEach(model => {
      const key = `${provider.provider}:${model}`
      if (!acc[provider.provider]) {
        acc[provider.provider] = []
      }
      acc[provider.provider].push({
        model,
        key,
        canUse: canUseModel(userTier, provider.provider, model),
        cost: MODEL_COSTS_PER_1K[model]
      })
    })
    return acc
  }, {} as Record<string, Array<{ model: string; key: string; canUse: boolean; cost: any }>>)

  // Initialize with some default selections
  useEffect(() => {
    const defaults: Record<string, boolean> = {}
    
    // Select these 3 specific diverse models by default
    const preferredModels = [
      'llama-3.1-8b-instant',     // Groq - Fast
      'llama-3.3-70b-versatile',   // Groq - Powerful
      'gemini-2.5-flash'           // Google - Free & capable
    ]
    
    // First, set all to false
    for (const provider of availableModels) {
      for (const model of provider.models) {
        const key = `${provider.provider}:${model}`
        defaults[key] = false
      }
    }
    
    // Then enable only the preferred models if available and user can use them
    for (const provider of availableModels) {
      for (const model of provider.models) {
        const key = `${provider.provider}:${model}`
        if (preferredModels.includes(model) && canUseModel(userTier, provider.provider, model)) {
          defaults[key] = true
        }
      }
    }
    
    setModelStates(defaults)
  }, [availableModels, userTier])

  // Update selected models when states change
  useEffect(() => {
    const models: Array<{ provider: string; model: string }> = []
    
    Object.entries(modelStates).forEach(([key, enabled]) => {
      if (enabled) {
        const [provider, ...modelParts] = key.split(':')
        const model = modelParts.join(':') // Handle models with colons in their names
        models.push({ provider, model })
      }
    })
    
    onModelsChange(models)
  }, [modelStates, onModelsChange])

  const toggleModel = (key: string) => {
    setModelStates(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const getCostTier = (cost: any) => {
    if (!cost) return { tier: 'Unknown', emoji: '❓' }
    const avgCost = (cost.input + cost.output) / 2
    if (avgCost < 0.001) return { tier: 'Free', emoji: '🆓' }
    if (avgCost < 0.01) return { tier: 'Budget', emoji: '💰' }
    if (avgCost < 0.1) return { tier: 'Standard', emoji: '⚖️' }
    return { tier: 'Premium', emoji: '💎' }
  }

  const selectedCount = Object.values(modelStates).filter(Boolean).length

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              Select LLM Models for Fast Consensus
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Choose models to query directly without agent personas for quick consensus
            </p>
          </div>
          <Badge variant={selectedCount >= 3 ? "default" : "secondary"}>
            {selectedCount} selected
          </Badge>
        </div>

        <div className="space-y-4">
          {Object.entries(modelsByProvider).map(([providerName, models]) => (
            <div key={providerName} className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground capitalize">
                {providerName}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {models.map(({ model, key, canUse, cost }) => {
                  const costInfo = getCostTier(cost)
                  const isSelected = modelStates[key]
                  
                  return (
                    <div
                      key={key}
                      className={`flex items-center space-x-3 p-3 rounded-lg border transition-all ${
                        canUse 
                          ? isSelected 
                            ? 'bg-primary/5 border-primary/30' 
                            : 'hover:bg-secondary/50 cursor-pointer'
                          : 'opacity-50 cursor-not-allowed bg-muted/20'
                      }`}
                      onClick={() => canUse && toggleModel(key)}
                    >
                      <Checkbox 
                        checked={isSelected || false}
                        disabled={!canUse}
                        onCheckedChange={() => canUse && toggleModel(key)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{model}</span>
                          <Badge variant="outline" className="text-xs">
                            {costInfo.emoji} {costInfo.tier}
                          </Badge>
                        </div>
                        {cost && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            ${cost.input}/1K in, ${cost.output}/1K out
                          </p>
                        )}
                      </div>
                      {!canUse && (
                        <Badge variant="secondary" className="text-xs">
                          {userTier === 'guest' ? 'Sign in' : 'Upgrade'}
                        </Badge>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {selectedCount < 3 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Tip:</strong> Select at least 3 models for better consensus results
            </p>
          </div>
        )}
      </div>
    </Card>
  )
}
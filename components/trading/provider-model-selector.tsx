'use client'

import { MODELS_BY_PROVIDER, getModelDisplayName } from '@/lib/trading/models-config'
import { PROVIDER_STYLES } from '@/lib/trading/provider-styles'

interface ProviderModelSelectorProps {
  value: string | string[]
  onChange: (value: string | string[]) => void
  mode: 'single' | 'multiple'
  label?: string
  description?: string
  disabled?: boolean
  minSelections?: number
  maxSelections?: number
}

export function ProviderModelSelector({
  value,
  onChange,
  mode,
  label,
  description,
  disabled = false,
  minSelections = 1,
  maxSelections = 10
}: ProviderModelSelectorProps) {
  const selectedModels = Array.isArray(value) ? value : [value]

  const handleSingleSelection = (modelId: string) => {
    if (mode === 'single') {
      onChange(modelId)
    }
  }

  const handleMultipleSelection = (providerKey: string, modelId: string) => {
    if (mode !== 'multiple' || !Array.isArray(value)) return

    const provider = PROVIDER_STYLES[providerKey as keyof typeof PROVIDER_STYLES]
    const providerModels = MODELS_BY_PROVIDER[providerKey as keyof typeof MODELS_BY_PROVIDER]

    // Find if this provider already has a selected model
    const currentProviderSelection = value.find(id => providerModels.some(m => m.id === id))

    if (modelId === '') {
      // Deselecting - remove current provider selection if we're above minimum
      if (currentProviderSelection && value.length > minSelections) {
        onChange(value.filter(id => id !== currentProviderSelection))
      }
    } else {
      // Selecting a model
      if (currentProviderSelection) {
        // Replace existing selection from this provider
        onChange(value.map(id => id === currentProviderSelection ? modelId : id))
      } else {
        // Add new selection if under maximum
        if (value.length < maxSelections) {
          onChange([...value, modelId])
        }
      }
    }
  }

  return (
    <div>
      {label && (
        <label className="text-sm font-semibold mb-3 block">
          {label}
        </label>
      )}
      {description && (
        <div className="text-xs text-muted-foreground mb-3">
          {description}
        </div>
      )}

      {/* Provider Dropdowns for Single Mode */}
      {mode === 'single' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.entries(MODELS_BY_PROVIDER).map(([providerKey, models]) => {
              const provider = PROVIDER_STYLES[providerKey as keyof typeof PROVIDER_STYLES]
              const isProviderSelected = models.some(m => m.id === value)

              return (
                <div key={providerKey} className="relative">
                  <select
                    value={isProviderSelected ? value : ''}
                    onChange={(e) => e.target.value && handleSingleSelection(e.target.value)}
                    disabled={disabled}
                    className={`w-full px-2 py-1.5 rounded-lg border-2 text-xs font-medium ${provider.borderColor} ${provider.bgColor} ${provider.textColor} cursor-pointer hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <option value="">{provider.icon} {provider.name}</option>
                    {models.map(model => (
                      <option key={model.id} value={model.id}>
                        {getModelDisplayName(model.id)}
                      </option>
                    ))}
                  </select>
                </div>
              )
            })}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Selected: {typeof value === 'string' ? getModelDisplayName(value) : 'None'}
          </div>
        </>
      )}

      {/* Provider Dropdowns for Multiple Mode */}
      {mode === 'multiple' && Array.isArray(value) && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.entries(MODELS_BY_PROVIDER).map(([providerKey, models]) => {
              const provider = PROVIDER_STYLES[providerKey as keyof typeof PROVIDER_STYLES]
              const selectedModelFromProvider = value.find(id => models.some(m => m.id === id))

              return (
                <div key={providerKey} className="relative">
                  <select
                    value={selectedModelFromProvider || ''}
                    onChange={(e) => handleMultipleSelection(providerKey, e.target.value)}
                    disabled={disabled}
                    className={`w-full px-2 py-1.5 rounded-lg border-2 text-xs font-medium ${provider.borderColor} ${provider.bgColor} ${provider.textColor} cursor-pointer hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <option value="">{provider.icon} {provider.name}</option>
                    {models.map(model => (
                      <option key={model.id} value={model.id}>
                        {getModelDisplayName(model.id)}
                      </option>
                    ))}
                  </select>
                </div>
              )
            })}
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            {value.length} models selected • Min: {minSelections} • Max: {maxSelections}
          </div>
        </>
      )}
    </div>
  )
}

'use client'

import { ModelConfig } from '@/types/consensus'

interface ModelSelectorProps {
  models: ModelConfig[]
  onChange: (models: ModelConfig[]) => void
}

const availableModels = {
  openai: ['gpt-4-turbo-preview', 'gpt-4', 'gpt-3.5-turbo'],
  anthropic: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
  google: ['gemini-pro', 'gemini-pro-vision'],
}

export function ModelSelector({ models, onChange }: ModelSelectorProps) {
  const toggleModel = (index: number) => {
    const updated = [...models]
    updated[index].enabled = !updated[index].enabled
    onChange(updated)
  }

  const changeModel = (index: number, model: string) => {
    const updated = [...models]
    updated[index].model = model
    onChange(updated)
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">Select AI Models</h3>
      <div className="grid gap-3">
        {models.map((config, index) => (
          <div key={`${config.provider}-${index}`} className="flex items-center gap-3 p-3 border rounded-lg">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={() => toggleModel(index)}
              className="w-4 h-4"
            />
            <div className="flex-1">
              <div className="text-sm font-medium capitalize">{config.provider}</div>
              <select
                value={config.model}
                onChange={(e) => changeModel(index, e.target.value)}
                disabled={!config.enabled}
                className="text-xs text-muted-foreground bg-transparent border-none p-0 disabled:opacity-50"
              >
                {availableModels[config.provider]?.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

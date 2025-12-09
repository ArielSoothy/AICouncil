'use client'

interface ResponseModesSelectorProps {
  mode: 'concise' | 'normal' | 'detailed'
  onChange: (mode: 'concise' | 'normal' | 'detailed') => void
}

export function ResponseModesSelector({ mode, onChange }: ResponseModesSelectorProps) {
  const modes = [
    {
      id: 'concise' as const,
      name: 'Concise',
      description: 'Max 50 words, direct answers',
      tokens: '~75 tokens',
      icon: '🎯'
    },
    {
      id: 'normal' as const,
      name: 'Normal',
      description: '100-150 words, balanced detail',
      tokens: '~200 tokens',
      icon: '📝'
    },
    {
      id: 'detailed' as const,
      name: 'Detailed',
      description: 'Comprehensive with examples',
      tokens: '~500 tokens',
      icon: '📚'
    }
  ]

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Response Mode</label>
      <div className="grid grid-cols-3 gap-2">
        {modes.map((modeOption) => (
          <button
            key={modeOption.id}
            onClick={() => onChange(modeOption.id)}
            className={`p-3 border rounded-lg text-left transition-colors ${
              mode === modeOption.id
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{modeOption.icon}</span>
              <span className="font-medium text-sm">{modeOption.name}</span>
            </div>
            <div className="text-xs text-muted-foreground mb-1">
              {modeOption.description}
            </div>
            <div className="text-xs text-muted-foreground">
              {modeOption.tokens}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

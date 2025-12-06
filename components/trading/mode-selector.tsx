'use client'

import { Users, TrendingUp, BarChart3, Wallet, History } from 'lucide-react'

export type TradingMode = 'consensus' | 'debate' | 'individual' | 'portfolio' | 'history'

interface ModeSelectorProps {
  selectedMode: TradingMode
  onModeChange: (mode: TradingMode) => void
}

export function ModeSelector({ selectedMode, onModeChange }: ModeSelectorProps) {
  const modes = [
    {
      id: 'consensus' as TradingMode,
      name: 'Consensus',
      description: 'Multi-model trading consensus',
      icon: TrendingUp,
    },
    {
      id: 'debate' as TradingMode,
      name: 'Debate',
      description: 'Agent debate for strategy',
      icon: Users,
    },
    {
      id: 'individual' as TradingMode,
      name: 'Individual',
      description: 'Parallel model analysis',
      icon: BarChart3,
    },
    {
      id: 'portfolio' as TradingMode,
      name: 'Portfolio',
      description: 'Account & positions',
      icon: Wallet,
    },
    {
      id: 'history' as TradingMode,
      name: 'History',
      description: 'Past trade decisions',
      icon: History,
    },
  ]

  return (
    <div className="w-full mb-6">
      <div className="flex border-b border-border">
        {modes.map((mode) => {
          const Icon = mode.icon
          const isActive = selectedMode === mode.id

          return (
            <button
              key={mode.id}
              onClick={() => onModeChange(mode.id)}
              className={`
                flex-1 px-6 py-4 text-left transition-all
                border-b-2 hover:bg-accent/50
                ${isActive
                  ? 'border-primary bg-accent'
                  : 'border-transparent'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                <div>
                  <div className={`font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {mode.name}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {mode.description}
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

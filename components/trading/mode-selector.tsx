'use client'

import { useState } from 'react'
import { Users, TrendingUp, BarChart3 } from 'lucide-react'

export type TradingMode = 'consensus' | 'debate' | 'individual'

interface ModeSelectorProps {
  selectedMode: TradingMode
  onModeChange: (mode: TradingMode) => void
}

export function ModeSelector({ selectedMode, onModeChange }: ModeSelectorProps) {
  const modes = [
    {
      id: 'consensus' as TradingMode,
      name: 'Consensus Trade',
      description: 'Multi-model consensus for trading decisions (with individual model responses)',
      icon: TrendingUp,
    },
    {
      id: 'debate' as TradingMode,
      name: 'Debate Trade',
      description: 'Agent debate system for trading strategy',
      icon: Users,
    },
    {
      id: 'individual' as TradingMode,
      name: 'Individual Analysis',
      description: 'Multi-model parallel analysis with detailed Bull/Bear/Technical/Fundamental breakdown',
      icon: BarChart3,
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

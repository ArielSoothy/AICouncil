'use client'

import { Clock, TrendingUp, Calendar, Target } from 'lucide-react'

export type TradingTimeframe = 'day' | 'swing' | 'position' | 'longterm'

interface TimeframeOption {
  value: TradingTimeframe
  label: string
  description: string
  icon: React.ReactNode
  duration: string
  focus: string
  minRiskReward: string
}

const TIMEFRAMES: TimeframeOption[] = [
  {
    value: 'day',
    label: 'Day Trading',
    description: 'Intraday momentum and volatility plays',
    icon: <Clock className="w-4 h-4" />,
    duration: 'Hours to 1 Day',
    focus: 'Technical: Support/Resistance, Volume, Momentum',
    minRiskReward: '2:1'
  },
  {
    value: 'swing',
    label: 'Swing Trading',
    description: 'Short-term trends and breakout setups',
    icon: <TrendingUp className="w-4 h-4" />,
    duration: 'Days to Weeks',
    focus: 'Technical + Sentiment: Patterns, Sector Rotation',
    minRiskReward: '2:1 to 3:1'
  },
  {
    value: 'position',
    label: 'Position Trading',
    description: 'Medium-term trends with fundamental backing',
    icon: <Calendar className="w-4 h-4" />,
    duration: 'Weeks to Months',
    focus: 'Fundamental + Technical: Earnings, Industry Trends',
    minRiskReward: '3:1'
  },
  {
    value: 'longterm',
    label: 'Long-term Investing',
    description: 'Value investing and growth opportunities',
    icon: <Target className="w-4 h-4" />,
    duration: 'Months to Years',
    focus: 'Fundamental: Valuation, Competitive Moat, Growth',
    minRiskReward: '5:1'
  }
]

interface TimeframeSelectorProps {
  value: TradingTimeframe
  onChange: (timeframe: TradingTimeframe) => void
  disabled?: boolean
}

export function TimeframeSelector({ value, onChange, disabled = false }: TimeframeSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-semibold block">
        Trading Timeframe
      </label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {TIMEFRAMES.map((timeframe) => {
          const isSelected = value === timeframe.value
          return (
            <button
              key={timeframe.value}
              onClick={() => !disabled && onChange(timeframe.value)}
              disabled={disabled}
              className={`
                p-4 rounded-lg border-2 text-left transition-all
                ${isSelected
                  ? 'border-primary bg-primary/10 shadow-md'
                  : 'border-border hover:border-primary/50'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-1 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                  {timeframe.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{timeframe.label}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {timeframe.minRiskReward}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">
                    {timeframe.duration}
                  </div>
                  <div className="text-xs text-muted-foreground leading-relaxed">
                    {timeframe.focus}
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>
      {value && (
        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
          <strong>Selected:</strong> {TIMEFRAMES.find(t => t.value === value)?.label} - Minimum Risk:Reward Ratio {TIMEFRAMES.find(t => t.value === value)?.minRiskReward}
        </div>
      )}
    </div>
  )
}

export function getTimeframeConfig(timeframe: TradingTimeframe): TimeframeOption {
  return TIMEFRAMES.find(t => t.value === timeframe) || TIMEFRAMES[0]
}

'use client'

import { useState, useEffect } from 'react'
import { Search, Briefcase, Target, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export type InputMode = 'research' | 'portfolio' | 'position'

interface Position {
  symbol: string
  quantity: number
  marketValue: number
  unrealizedPL: number
  unrealizedPLPercent: number
  avgCost: number
  currentPrice: number
}

interface InputModeOption {
  value: InputMode
  label: string
  description: string
  icon: React.ReactNode
}

const INPUT_MODES: InputModeOption[] = [
  {
    value: 'research',
    label: 'Research Symbol',
    description: 'Analyze any stock by ticker',
    icon: <Search className="w-4 h-4" />,
  },
  {
    value: 'portfolio',
    label: 'Portfolio Analysis',
    description: 'AI reviews your entire portfolio',
    icon: <Briefcase className="w-4 h-4" />,
  },
  {
    value: 'position',
    label: 'Position Analysis',
    description: 'Deep dive into a current holding',
    icon: <Target className="w-4 h-4" />,
  },
]

interface InputModeSelectorProps {
  onSymbolSelect: (symbol: string) => void
  onModeChange?: (mode: InputMode) => void
  onInputChange?: (symbol: string) => void  // Real-time sync on every keystroke
  disabled?: boolean
  initialSymbol?: string
  showPortfolioMode?: boolean
}

export function InputModeSelector({
  onSymbolSelect,
  onModeChange,
  onInputChange,
  disabled = false,
  initialSymbol = '',
  showPortfolioMode = true,
}: InputModeSelectorProps) {
  const [mode, setMode] = useState<InputMode>('research')
  const [symbol, setSymbol] = useState(initialSymbol)
  const [positions, setPositions] = useState<Position[]>([])
  const [loadingPositions, setLoadingPositions] = useState(false)
  const [selectedPosition, setSelectedPosition] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  // Fetch positions when portfolio or position mode is selected
  useEffect(() => {
    if ((mode === 'portfolio' || mode === 'position') && positions.length === 0) {
      fetchPositions()
    }
  }, [mode])

  const fetchPositions = async () => {
    setLoadingPositions(true)
    setError(null)
    try {
      const res = await fetch('/api/trading/portfolio')
      const data = await res.json()
      if (data.error) {
        setError(data.error)
        return
      }
      setPositions(data.positions || [])
    } catch (err) {
      setError('Failed to fetch portfolio')
    } finally {
      setLoadingPositions(false)
    }
  }

  const handleModeChange = (newMode: InputMode) => {
    setMode(newMode)
    setError(null)
    onModeChange?.(newMode)
  }

  const handleSymbolSubmit = () => {
    if (symbol.trim()) {
      onSymbolSelect(symbol.trim().toUpperCase())
    }
  }

  const handlePositionSelect = (sym: string) => {
    setSelectedPosition(sym)
    onSymbolSelect(sym)
  }

  const handlePortfolioAnalysis = () => {
    // For portfolio mode, we pass a special marker
    onSymbolSelect('__PORTFOLIO__')
  }

  // Filter modes based on props
  const availableModes = showPortfolioMode
    ? INPUT_MODES
    : INPUT_MODES.filter(m => m.value === 'research')

  return (
    <div className="space-y-4">
      {/* Mode Tabs */}
      {showPortfolioMode && (
        <div className="flex gap-2 p-1 bg-muted rounded-lg">
          {availableModes.map((option) => {
            const isSelected = mode === option.value
            return (
              <button
                key={option.value}
                onClick={() => !disabled && handleModeChange(option.value)}
                disabled={disabled}
                className={`
                  flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all
                  ${isSelected
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                {option.icon}
                <span className="hidden sm:inline">{option.label}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Mode-specific content */}
      <div className="space-y-3">
        {/* Research Mode - Symbol Input (auto-syncs on typing) */}
        {mode === 'research' && (
          <div className="space-y-2">
            <label className="text-sm font-semibold block">
              Stock Symbol
            </label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => {
                const value = e.target.value.toUpperCase()
                setSymbol(value)
                onInputChange?.(value)  // Real-time sync to parent
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleSymbolSubmit()}
              placeholder="e.g., AAPL, TSLA, NVDA"
              disabled={disabled}
              className="w-full px-3 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <p className="text-xs text-muted-foreground">
              Type a US stock ticker, then click Get Consensus
            </p>
          </div>
        )}

        {/* Portfolio Mode - Full Portfolio Analysis */}
        {mode === 'portfolio' && (
          <div className="space-y-3">
            {loadingPositions ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Loading portfolio...
              </div>
            ) : error ? (
              <div className="flex items-center gap-2 text-destructive text-sm p-3 bg-destructive/10 rounded-lg">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            ) : positions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No positions in portfolio</p>
                <p className="text-xs">Buy some stocks to enable portfolio analysis</p>
              </div>
            ) : (
              <>
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold">Your Portfolio</span>
                    <span className="text-sm text-muted-foreground">
                      {positions.length} position{positions.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {positions.map((pos) => (
                      <div
                        key={pos.symbol}
                        className="flex items-center justify-between text-sm py-1 px-2 rounded bg-background"
                      >
                        <span className="font-mono font-semibold">{pos.symbol}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground">
                            {pos.quantity} shares
                          </span>
                          <span className={(pos.unrealizedPL || 0) >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {(pos.unrealizedPL || 0) >= 0 ? '+' : ''}{(pos.unrealizedPLPercent || 0).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <Button
                  onClick={handlePortfolioAnalysis}
                  disabled={disabled}
                  className="w-full"
                >
                  <Briefcase className="w-4 h-4 mr-2" />
                  Analyze Full Portfolio
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  AI will review all positions and provide rebalancing recommendations
                </p>
              </>
            )}
          </div>
        )}

        {/* Position Mode - Select from Holdings */}
        {mode === 'position' && (
          <div className="space-y-3">
            <label className="text-sm font-semibold block">
              Select Position to Analyze
            </label>
            {loadingPositions ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Loading positions...
              </div>
            ) : error ? (
              <div className="flex items-center gap-2 text-destructive text-sm p-3 bg-destructive/10 rounded-lg">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            ) : positions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No positions to analyze</p>
                <p className="text-xs">Switch to Research mode to analyze any stock</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {positions.map((pos) => {
                  const isSelected = selectedPosition === pos.symbol
                  return (
                    <button
                      key={pos.symbol}
                      onClick={() => !disabled && handlePositionSelect(pos.symbol)}
                      disabled={disabled}
                      className={`
                        p-3 rounded-lg border-2 text-left transition-all
                        ${isSelected
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                        }
                        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                    >
                      <div className="font-mono font-bold text-sm">{pos.symbol}</div>
                      <div className="text-xs text-muted-foreground">
                        {pos.quantity} @ ${(pos.avgCost || 0).toFixed(2)}
                      </div>
                      <div className={`text-xs font-semibold ${(pos.unrealizedPL || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {(pos.unrealizedPL || 0) >= 0 ? '+' : ''}${(pos.unrealizedPL || 0).toFixed(2)}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function getInputModeConfig(mode: InputMode): InputModeOption {
  return INPUT_MODES.find(m => m.value === mode) || INPUT_MODES[0]
}

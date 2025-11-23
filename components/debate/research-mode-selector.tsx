'use client'

import { useState } from 'react'
import { Target, Share2, RefreshCw, Info, Check, AlertCircle } from 'lucide-react'
import {
  ResearchMode,
  RESEARCH_MODES,
  getRecommendedResearchMode
} from '@/lib/debate/research-modes'

interface ResearchModeSelectorProps {
  value: ResearchMode
  onChange: (mode: ResearchMode) => void
  query?: string  // Optional query for recommendations
  disabled?: boolean
  showRecommendation?: boolean
  compact?: boolean
}

const modeIcons: Record<ResearchMode, typeof Target> = {
  centralized: Target,
  distributed: Share2,
  hybrid: RefreshCw
}

export function ResearchModeSelector({
  value,
  onChange,
  query = '',
  disabled = false,
  showRecommendation = true,
  compact = false
}: ResearchModeSelectorProps) {
  const [showDetails, setShowDetails] = useState<ResearchMode | null>(null)

  // Get recommendation if query provided
  const recommendation = query
    ? getRecommendedResearchMode(query)
    : 'centralized'

  const modes = Object.values(RESEARCH_MODES)

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">Research Mode:</span>
        <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {modes.map((mode) => {
            const Icon = modeIcons[mode.id]
            const isSelected = value === mode.id
            const isRecommended = recommendation === mode.id && showRecommendation

            return (
              <button
                key={mode.id}
                onClick={() => !disabled && onChange(mode.id)}
                disabled={disabled}
                title={`${mode.name}${isRecommended ? ' (Recommended)' : ''}`}
                className={`
                  px-3 py-1.5 flex items-center gap-1.5 text-sm transition-colors
                  ${isSelected
                    ? 'bg-blue-500 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  border-r border-gray-200 dark:border-gray-700 last:border-r-0
                `}
              >
                <span>{mode.icon}</span>
                {isRecommended && !isSelected && (
                  <span className="text-green-500 text-xs">*</span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Research Mode
        </label>
        {showRecommendation && recommendation && (
          <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
            <Check className="w-3 h-3" />
            Recommended: {RESEARCH_MODES[recommendation].name}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {modes.map((mode) => {
          const Icon = modeIcons[mode.id]
          const isSelected = value === mode.id
          const isRecommended = recommendation === mode.id && showRecommendation

          return (
            <div key={mode.id} className="relative">
              <button
                onClick={() => !disabled && onChange(mode.id)}
                disabled={disabled}
                className={`
                  w-full p-4 rounded-lg border-2 transition-all text-left
                  ${isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{mode.icon}</span>
                    <div>
                      <h4 className={`font-medium ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-800 dark:text-gray-200'}`}>
                        {mode.name}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {mode.estimatedTime} • {mode.estimatedCost} cost
                      </p>
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="w-5 h-5 text-blue-500" />
                  )}
                </div>

                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {mode.description}
                </p>

                {isRecommended && !isSelected && (
                  <div className="mt-2 text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Recommended for this query
                  </div>
                )}
              </button>

              {/* Details toggle */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowDetails(showDetails === mode.id ? null : mode.id)
                }}
                className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <Info className="w-4 h-4" />
              </button>

              {/* Expanded details */}
              {showDetails === mode.id && (
                <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-sm">
                  <div className="mb-2">
                    <h5 className="font-medium text-green-600 dark:text-green-400 mb-1">Pros</h5>
                    <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-0.5">
                      {mode.pros.slice(0, 3).map((pro, i) => (
                        <li key={i} className="text-xs">{pro}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="mb-2">
                    <h5 className="font-medium text-red-600 dark:text-red-400 mb-1">Cons</h5>
                    <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-0.5">
                      {mode.cons.slice(0, 2).map((con, i) => (
                        <li key={i} className="text-xs">{con}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium text-blue-600 dark:text-blue-400 mb-1">Best For</h5>
                    <div className="flex flex-wrap gap-1">
                      {mode.recommendedFor.slice(0, 3).map((use, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs"
                        >
                          {use}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Current selection summary */}
      {value && (
        <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded text-sm flex items-center gap-2">
          <span className="text-lg">{RESEARCH_MODES[value].icon}</span>
          <div className="flex-1">
            <span className="font-medium">{RESEARCH_MODES[value].name}</span>
            <span className="text-gray-500 dark:text-gray-400"> — </span>
            <span className="text-gray-600 dark:text-gray-400">
              {RESEARCH_MODES[value].estimatedTime}, {RESEARCH_MODES[value].estimatedCost} cost
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default ResearchModeSelector

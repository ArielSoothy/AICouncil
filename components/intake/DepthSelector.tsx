'use client'

import { ResearchDepth, DomainType } from '@/lib/intake/types'
import { createDepthConfig } from '@/lib/intake/question-sequencer'

interface DepthSelectorProps {
  domain: DomainType
  selectedDepth: ResearchDepth
  onSelect: (depth: ResearchDepth) => void
}

export function DepthSelector({ domain, selectedDepth, onSelect }: DepthSelectorProps) {
  const quickConfig = createDepthConfig(domain, ResearchDepth.QUICK)
  const balancedConfig = createDepthConfig(domain, ResearchDepth.BALANCED)
  const thoroughConfig = createDepthConfig(domain, ResearchDepth.THOROUGH)

  const configs = [quickConfig, balancedConfig, thoroughConfig]

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md border border-gray-200 dark:border-gray-700">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
        Choose Your Research Depth
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        More questions = better recommendations, but takes more time
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {configs.map((config) => {
          const isSelected = config.depth === selectedDepth
          return (
            <button
              key={config.depth}
              onClick={() => onSelect(config.depth)}
              className={`p-4 rounded-lg border-2 transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-700'
              }`}
            >
              {/* Label */}
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {config.label}
              </div>

              {/* Stats */}
              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400 mb-3">
                <div className="flex items-center justify-between">
                  <span>Questions:</span>
                  <span className="font-medium">{config.questionCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Time:</span>
                  <span className="font-medium">~{config.estimatedTime} min</span>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {config.description}
              </p>

              {/* Selected Indicator */}
              {isSelected && (
                <div className="mt-3 flex items-center justify-center text-blue-500">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="ml-1 text-sm font-medium">Selected</span>
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

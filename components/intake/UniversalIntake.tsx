'use client'

import { useState } from 'react'
import { DomainType } from '@/lib/intake/types'
import { getDomainDisplayName, getDomainIcon } from '@/lib/intake/domain-classifier'

interface UniversalIntakeProps {
  onDomainSelect: (domain: DomainType, userContext?: string) => void
}

export function UniversalIntake({ onDomainSelect }: UniversalIntakeProps) {
  const [userInput, setUserInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  // Simple keyword-based routing (Phase 1)
  const detectDomain = (input: string): DomainType => {
    const lowerInput = input.toLowerCase()

    // Hotel keywords
    if (lowerInput.match(/hotel|accommodation|stay|resort|lodging|room|booking/)) {
      return 'hotel'
    }

    // Apartment keywords
    if (lowerInput.match(/apartment|flat|rental|lease|rent|housing|property/)) {
      return 'apartment'
    }

    // Budget keywords
    if (lowerInput.match(/budget|financial|money|expense|saving|spending|cost/)) {
      return 'budget'
    }

    // Product keywords
    if (lowerInput.match(/product|buy|purchase|compare|review|gadget|device|item/)) {
      return 'product'
    }

    // Default to generic if no clear match
    return 'generic'
  }

  const handleConversationalSubmit = () => {
    if (!userInput.trim()) return

    setIsProcessing(true)

    // Detect domain from user input
    const detectedDomain = detectDomain(userInput)

    // Pass both domain and user context
    onDomainSelect(detectedDomain, userInput)
  }

  const handleQuickAction = (domain: DomainType) => {
    onDomainSelect(domain)
  }

  const domains: DomainType[] = ['apartment', 'hotel', 'budget', 'product']

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          What decision can I help you with today?
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Describe your situation, or choose a category to get started
        </p>
      </div>

      {/* Conversational Input */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-md border border-gray-200 dark:border-gray-700">
        <div className="space-y-4">
          <label
            htmlFor="conversational-input"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Tell me about your decision
          </label>
          <textarea
            id="conversational-input"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleConversationalSubmit()
              }
            }}
            placeholder="E.g., 'I need help choosing between Hotel A and Hotel B in Dubai' or 'Looking for a family-friendly hotel near the beach with a pool, budget around $200/night'"
            className="w-full h-32 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                     placeholder-gray-500 dark:placeholder-gray-400
                     resize-none"
          />
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Press <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">⌘</kbd> +{' '}
              <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">Enter</kbd> to submit
            </p>
            <button
              onClick={handleConversationalSubmit}
              disabled={!userInput.trim() || isProcessing}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600
                       disabled:bg-gray-300 disabled:cursor-not-allowed font-medium
                       transition-colors"
            >
              {isProcessing ? 'Processing...' : 'Get Started →'}
            </button>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
            or choose a category
          </span>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {domains.map((domain) => (
          <button
            key={domain}
            onClick={() => handleQuickAction(domain)}
            className="p-6 rounded-lg border-2 border-gray-300 dark:border-gray-600
                     hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20
                     transition-all text-left group"
          >
            <div className="text-3xl mb-2">{getDomainIcon(domain)}</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {getDomainDisplayName(domain)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {domain === 'hotel' && 'Find the perfect hotel for your stay'}
              {domain === 'apartment' && 'Compare apartments and find your ideal home'}
              {domain === 'budget' && 'Create a budget plan that works for you'}
              {domain === 'product' && 'Compare products and make informed purchases'}
            </div>
          </button>
        ))}
      </div>

      {/* Help Text */}
      <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
        <p>
          💡 Tip: The more details you provide, the better recommendations you&apos;ll get. You can
          mention specific options, budget constraints, preferences, or ask open-ended questions.
        </p>
      </div>
    </div>
  )
}

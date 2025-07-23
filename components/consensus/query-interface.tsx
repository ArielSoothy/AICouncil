'use client'

import { useState, Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { EnhancedConsensusDisplay } from './enhanced-consensus-display-v3'
import { ModelSelector } from './model-selector'
import { ResponseModesSelector } from './response-modes-selector'
import { ConsensusResult, ModelConfig, EnhancedConsensusResponse } from '@/types/consensus'
import { useAuth } from '@/contexts/auth-context'
import { useSearchParams } from 'next/navigation'
import { Send, Loader2 } from 'lucide-react'

function QueryInterfaceContent() {
  const { userTier } = useAuth()
  const searchParams = useSearchParams()
  const isGuestMode = searchParams.get('mode') === 'guest'
  
  // Override userTier for guest mode
  const effectiveUserTier = isGuestMode ? 'guest' : userTier
  const [prompt, setPrompt] = useState('What are the top 3 AI coding tools for solo entrepreneurs ranked?')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<EnhancedConsensusResponse | null>(null)
  const [responseMode, setResponseMode] = useState<'concise' | 'normal' | 'detailed'>('concise')
  const [usePremiumQuery, setUsePremiumQuery] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  
  // Default models based on user tier
  const getDefaultModels = (): ModelConfig[] => {
    if (effectiveUserTier === 'guest') {
      // Guest mode: All 6 free models for impressive demo
      return [
        // 3 Best Free Groq Models
        { provider: 'groq', model: 'llama-3.3-70b-versatile', enabled: true },
        { provider: 'groq', model: 'llama-3.1-8b-instant', enabled: true },
        { provider: 'groq', model: 'gemma2-9b-it', enabled: true },
        // 3 Best Free Google Models
        { provider: 'google', model: 'gemini-2.5-pro', enabled: true },
        { provider: 'google', model: 'gemini-2.5-flash', enabled: true },
        { provider: 'google', model: 'gemini-2.0-flash', enabled: true },
      ]
    }
    
    // Free tier: All free models (6 models)
    return [
      // 3 Best Free Groq Models
      { provider: 'groq', model: 'llama-3.3-70b-versatile', enabled: true },
      { provider: 'groq', model: 'llama-3.1-8b-instant', enabled: true },
      { provider: 'groq', model: 'gemma2-9b-it', enabled: true },
      // 3 Best Free Google Models
      { provider: 'google', model: 'gemini-2.5-pro', enabled: true },
      { provider: 'google', model: 'gemini-2.5-flash', enabled: true },
      { provider: 'google', model: 'gemini-2.0-flash', enabled: true },
    ]
  }

  const [selectedModels, setSelectedModels] = useState<ModelConfig[]>(getDefaultModels())

  const handleSubmit = async () => {
    if (!prompt.trim() || isLoading) return

    // Premium queries not implemented yet - skip credit check

    setIsLoading(true)
    try {
      const response = await fetch('/api/consensus', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          models: selectedModels.filter(m => m.enabled),
          responseMode,
          usePremiumQuery,
          isGuestMode,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get consensus')
      }

      const consensusResult = await response.json()
      setResult(consensusResult)

      // Save conversation to database if user is authenticated
      try {
        const saveResponse = await fetch('/api/conversations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: prompt,
            responses: consensusResult,
          }),
        })
        
        if (saveResponse.ok) {
          const conversation = await saveResponse.json()
          setConversationId(conversation.id)
        }
      } catch (saveError) {
        console.error('Failed to save conversation:', saveError)
        // Don't block the user if saving fails
      }
    } catch (error) {
      console.error('Error:', error)
      // TODO: Add proper error handling/toast
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="model-card">
        <h2 className="text-lg font-semibold mb-4">Query Configuration</h2>
        
        <ModelSelector
          models={selectedModels}
          onChange={setSelectedModels}
          usePremiumQuery={usePremiumQuery}
        />
        
        <div className="mt-4">
          <ResponseModesSelector
            mode={responseMode}
            onChange={setResponseMode}
          />
        </div>

        {/* Premium Query Toggle for Free Tier Users (not Guest) */}
        {effectiveUserTier === 'free' && !isGuestMode && (
          <div className="mt-4 p-4 premium-query-dark rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="premium-query"
                  checked={usePremiumQuery}
                  onChange={(e) => setUsePremiumQuery(e.target.checked)}
                  className="w-4 h-4 accent-purple-600"
                />
                <label htmlFor="premium-query" className="text-sm font-medium">
                  🚀 Premium Query (0 credits available)
                </label>
              </div>
            </div>
            <p className="text-xs leading-relaxed">
              Use a premium credit to access ALL premium models (GPT-4, Claude Opus 4, etc.) with advanced consensus analysis. 
              {true && (
                <span className="font-medium text-orange-600"> No credits left - provide feedback to earn +2 credits!</span>
              )}
            </p>
            
            {/* Premium Model Showcase */}
            {usePremiumQuery && (
              <div className="mt-3 p-3 bg-card/50 rounded-md border border-border">
                <div className="text-xs font-medium text-purple-200 mb-2">🎯 Premium models now available:</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    <span className="text-foreground">Claude Opus 4 🏆</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                    <span className="text-foreground">GPT-4o 💎</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    <span className="text-foreground">Claude Sonnet 4 ⚖️</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span className="text-foreground">GPT-4 Turbo 💎</span>
                  </div>
                </div>
                <p className="text-xs text-purple-300 mt-2 italic">
                  Experience the power of flagship AI models with advanced reasoning and consensus analysis!
                </p>
              </div>
            )}
          </div>
        )}

        {/* Guest Upgrade Prompt */}
        {isGuestMode && (
          <div className="mt-4 p-4 guest-upgrade-dark rounded-lg">
            <div className="text-center">
              <h3 className="text-sm font-medium mb-2">
                🔒 Want access to premium models like GPT-4 and Claude?
              </h3>
              <p className="text-xs mb-3">
                Sign up for free and get 5 premium queries daily to try ALL models with advanced consensus analysis!
              </p>
              <div className="flex justify-center gap-2">
                <a 
                  href="/auth?mode=signup" 
                  className="px-3 py-1 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 transition-colors"
                >
                  Sign Up Free
                </a>
                <a 
                  href="/auth" 
                  className="px-3 py-1 bg-white dark:bg-gray-800 text-green-600 dark:text-green-400 border border-green-600 dark:border-green-400 text-xs rounded-md hover:bg-green-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Sign In
                </a>
              </div>
            </div>
          </div>
        )}
        
        <div className="mt-4">
          <label htmlFor="prompt" className="block text-sm font-medium mb-2">
            Enter your prompt
          </label>
          <Textarea
            id="prompt"
            placeholder="What are the top 3 AI coding tools for solo entrepreneurs ranked?"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            className="resize-none ai-input"
          />
          <div className="text-xs text-muted-foreground mt-1">
            💡 Concise mode: Ultra-brief answers (lists, phrases). Normal/Detailed: Full analysis with evidence.
          </div>
        </div>
        
        <div className="flex justify-end mt-4">
          <Button
            onClick={handleSubmit}
            disabled={!prompt.trim() || isLoading || !selectedModels.some(m => m.enabled)}
            className="min-w-[120px] ai-button"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Querying...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Get Consensus
              </>
            )}
          </Button>
        </div>
      </div>

      {result && <EnhancedConsensusDisplay result={result} conversationId={conversationId} />}
    </div>
  )
}

export function QueryInterface() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <QueryInterfaceContent />
    </Suspense>
  )
}

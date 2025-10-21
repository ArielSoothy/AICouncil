'use client';

import { Header } from '@/components/ui/header'
import { PROJECT_NAME } from '@/lib/config/branding'
import { Suspense, useState, useEffect, useRef } from 'react'
import { ModelConfig, EnhancedConsensusResponse } from '@/types/consensus'
import { AlertCircle, Send, Loader2, Sparkles } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { EnhancedConsensusDisplay } from '@/components/consensus/enhanced-consensus-display-v3'
import { UltraModelBadgeSelector } from '@/components/consensus/ultra-model-badge-selector'
import { ConversationHistoryDropdown } from '@/components/conversation/conversation-history-dropdown'
import { useToast } from '@/hooks/use-toast'
import { useConversationPersistence } from '@/hooks/use-conversation-persistence'
import { SavedConversation } from '@/lib/types/conversation'

// Ultra Mode: Best FLAGSHIP models (2025 releases) - ENABLED BY DEFAULT
// Users can modify the selection via the UI
const DEFAULT_ULTRA_MODELS: ModelConfig[] = [
  // 2025 Flagship models (enabled by default)
  { provider: 'openai', model: 'gpt-5-chat-latest', enabled: true }, // #1 GPT-5 (released Aug 7, 2025)
  { provider: 'anthropic', model: 'claude-sonnet-4-5-20250929', enabled: true }, // #2 Claude Sonnet 4.5 (released Sep 29, 2025)
  { provider: 'google', model: 'gemini-2.0-flash', enabled: true }, // #3 Gemini 2.0 Flash (free)
  { provider: 'groq', model: 'llama-3.3-70b-versatile', enabled: true }, // #4 Best free model
  { provider: 'xai', model: 'grok-4-fast-non-reasoning', enabled: true }, // #5 Grok 4 Fast (faster responses)

  // Optional premium models (disabled by default - enable if you have API keys)
  { provider: 'perplexity', model: 'sonar-pro', enabled: false }, // #6 Perplexity with native search (needs API key)
  { provider: 'mistral', model: 'mistral-large-latest', enabled: false }, // #7 Mistral (needs API key)
];

function UltraPageContent() {
  const { toast } = useToast()
  const [prompt, setPrompt] = useState('What are the best value for money top 3 scooters (automatic) up to 500cc, 2nd hand up to 20k shekels, including mp3 500, that can drive from tlv to jerusalem but can get to eilat comfortably? im 43 male from tel aviv, 1.75 cm, 70kilo, with a wife and a 1 year old baby, we also have car')
  const [isLoading, setIsLoading] = useState(false)
  const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(false)
  const [result, setResult] = useState<EnhancedConsensusResponse | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [selectedModels, setSelectedModels] = useState<ModelConfig[]>(DEFAULT_ULTRA_MODELS)

  // Ref for auto-scroll to results
  const resultsRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to results when they're loaded
  useEffect(() => {
    if (result && resultsRef.current) {
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100) // Small delay to ensure content is rendered
    }
  }, [result])

  // Conversation persistence: restore results on page refresh/URL sharing
  const { saveConversation, isRestoring } = useConversationPersistence({
    storageKey: 'ultra-mode-last-conversation',
    onRestored: (conversation: SavedConversation) => {
      // Restore the full conversation state
      setPrompt(conversation.query)
      setResult(conversation.responses as EnhancedConsensusResponse)
      setConversationId(conversation.id)

      toast({
        title: 'Conversation Restored',
        description: 'Your previous Ultra Mode query has been restored.',
      })
    },
    onError: (error: Error) => {
      console.error('Failed to restore conversation:', error)
      // Silent fail - user can just start a new query
    },
  })

  // LOCALHOST-ONLY ACCESS: Ultra Mode is restricted to development environment
  const isLocalhost = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.includes('localhost')
  )

  if (typeof window !== 'undefined' && !isLocalhost) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 mb-4">
              <h1 className="text-4xl font-bold tracking-tight consensus-gradient bg-clip-text text-transparent">
                Ultra Mode - Coming Soon
              </h1>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                💎 PREMIUM
              </span>
            </div>
            <p className="text-xl text-muted-foreground mb-8">
              Ultra Mode is currently in development and will be available soon for premium subscribers.
            </p>
            <Alert className="border-purple-200 bg-purple-50 max-w-2xl mx-auto">
              <AlertCircle className="h-4 w-4 text-purple-600" />
              <AlertTitle className="text-purple-900">Premium Feature</AlertTitle>
              <AlertDescription className="text-purple-800">
                This feature uses the most advanced AI models (GPT-5, Claude Sonnet 4.5, Grok 4) and requires a subscription to access.
              </AlertDescription>
            </Alert>
          </div>
        </main>
      </div>
    )
  }

  const handleGenerateQuestion = async () => {
    if (isGeneratingQuestion) return

    setIsGeneratingQuestion(true)
    try {
      const response = await fetch('/api/question-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priority: 'high',
          useAI: true,
          avoidRecent: true
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate question')
      }

      const data = await response.json()
      if (data.success && data.question) {
        setPrompt(data.question.question)
        toast({
          title: "Question Generated!",
          description: `Generated a ${data.question.complexity} ${data.question.category.toLowerCase()} question`,
        })
      } else {
        throw new Error(data.message || 'No question generated')
      }
    } catch (error) {
      console.error('Question generation error:', error)
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: error instanceof Error ? error.message : 'Failed to generate question',
      })
    } finally {
      setIsGeneratingQuestion(false)
    }
  }

  const handleSubmit = async () => {
    if (!prompt.trim() || isLoading) return

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
          responseMode: 'concise',
          usePremiumQuery: false,
          isGuestMode: false,
          includeComparison: true,
          // Comparison: Prefer GPT-5, fallback to first enabled model
          comparisonModel: selectedModels.find(m => m.model === 'gpt-5' && m.enabled)
            || selectedModels.find(m => m.enabled)
            || { provider: 'openai', model: 'gpt-4o', enabled: true },
          enableWebSearch: true,
          testingTierOverride: 'enterprise'
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get consensus')
      }

      const consensusResult = await response.json()
      setResult(consensusResult)

      toast({
        variant: "success",
        title: "Query Successful",
        description: `Generated consensus from ${consensusResult.models?.length || 'multiple'} models in ${(consensusResult.responseTime || 0).toFixed(1)}s`,
      })

      // Save conversation to database
      try {
        const saveResponse = await fetch('/api/conversations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: prompt,
            responses: consensusResult,
            isGuestMode: true, // Allow guest mode for localhost testing
          }),
        })

        if (saveResponse.ok) {
          const conversation = await saveResponse.json()
          setConversationId(conversation.id)

          // Enable persistence: update URL and localStorage
          saveConversation(conversation.id)
        }
      } catch (saveError) {
        console.error('Failed to save conversation:', saveError)
      }
    } catch (error) {
      console.error('Error:', error)
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
      toast({
        variant: "destructive",
        title: "Query Failed",
        description: errorMessage,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <h1 className="text-4xl font-bold tracking-tight consensus-gradient bg-clip-text text-transparent">
                {PROJECT_NAME}
              </h1>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                💎 ULTRA MODE
              </span>
            </div>
            <p className="text-xl text-muted-foreground mb-2">
              Ultimate AI Decision Engine
            </p>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Best answer, right now. No configuration needed.
            </p>
          </div>

          {/* Unified Ultra Mode Interface */}
          <div className="model-card space-y-4 mb-6">
            {/* Header row with label, History dropdown, and Generate Question button */}
            <div className="flex items-center justify-between">
              <label htmlFor="prompt" className="block text-sm font-medium">
                Enter your question
              </label>
              <div className="flex items-center gap-2">
                <ConversationHistoryDropdown mode="ultra-mode" limit={5} />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateQuestion}
                  disabled={isGeneratingQuestion}
                  className="text-xs gap-1"
                >
                  {isGeneratingQuestion ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3" />
                      Generate Question
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Question textarea */}
            <Textarea
              id="prompt"
              placeholder="What should I have for dinner tonight?"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="resize-none ai-input"
            />

            {/* Branded clickable model badges */}
            <UltraModelBadgeSelector
              models={selectedModels}
              onChange={setSelectedModels}
            />

            {/* Info text */}
            <p className="text-xs text-muted-foreground">
              💡 {selectedModels.filter(m => m.enabled).length} models enabled • Concise mode • Web search enabled • Comparing with GPT-5 • Judge: Claude Sonnet 4.5
            </p>

            {/* CTA Button - Larger and more prominent */}
            <div className="flex justify-end">
              <Button
                onClick={handleSubmit}
                disabled={!prompt.trim() || isLoading || isRestoring}
                className="min-w-[200px] py-4 text-lg ai-button"
              >
                {isRestoring ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Restoring...
                  </>
                ) : isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Querying...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-5 w-5" />
                    Get Ultimate Answer
                  </>
                )}
              </Button>
            </div>
          </div>

          {result && (
            <div ref={resultsRef}>
              <EnhancedConsensusDisplay
                result={result}
                conversationId={conversationId}
                isGuestMode={false}
                query={prompt}
                mode="ultra"
                onRefineQuery={(enrichedQuery) => {
                  setPrompt(enrichedQuery)
                  // Trigger re-submission with enriched query
                  setTimeout(() => handleSubmit(), 100)
                }}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default function UltraPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <UltraPageContent />
    </Suspense>
  )
}

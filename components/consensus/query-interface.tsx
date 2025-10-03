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
import { useToast } from '@/hooks/use-toast'
import { useConversationPersistence } from '@/hooks/use-conversation-persistence'
import { ConversationHistoryDropdown } from '@/components/conversation/conversation-history-dropdown'
import { SavedConversation } from '@/lib/types/conversation'
import { Send, Loader2, GitCompare, Search, Sparkles } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface QueryInterfaceContentProps {
  testingTierOverride?: 'pro' | 'enterprise';
  defaultModels?: ModelConfig[];
  ultraModeDefaults?: {
    responseMode?: 'concise' | 'normal' | 'detailed';
    enableWebSearch?: boolean;
    includeComparison?: boolean;
    comparisonModelId?: string;
  };
}

function QueryInterfaceContent({ testingTierOverride, defaultModels, ultraModeDefaults }: QueryInterfaceContentProps) {
  const { userTier } = useAuth()
  const searchParams = useSearchParams()
  const isGuestMode = searchParams.get('mode') === 'guest'
  const { toast } = useToast()
  
  // Override userTier for guest mode or testing
  const baseUserTier = isGuestMode ? 'guest' : userTier
  const effectiveUserTier = testingTierOverride || baseUserTier
  const [prompt, setPrompt] = useState('What are the best value for money top 3 scooters (automatic) up to 500cc, 2nd hand up to 20k shekels, drive from tlv to jerusalem but can get to eilat comfortably?')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<EnhancedConsensusResponse | null>(null)
  const [responseMode, setResponseMode] = useState<'concise' | 'normal' | 'detailed'>(ultraModeDefaults?.responseMode || 'concise')
  const [usePremiumQuery, setUsePremiumQuery] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [includeComparison, setIncludeComparison] = useState(ultraModeDefaults?.includeComparison || false)
  const [comparisonModel, setComparisonModel] = useState<ModelConfig | null>(null)
  const [enableWebSearch, setEnableWebSearch] = useState(ultraModeDefaults?.enableWebSearch || false)
  const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(false)

  // Conversation persistence: restore results on page refresh/URL sharing
  const { saveConversation, isRestoring } = useConversationPersistence({
    storageKey: 'consensus-mode-last-conversation',
    onRestored: (conversation: SavedConversation) => {
      // Restore the full conversation state
      setPrompt(conversation.query)
      setResult(conversation.responses as EnhancedConsensusResponse)
      setConversationId(conversation.id)

      toast({
        title: 'Conversation Restored',
        description: 'Your previous consensus query has been restored.',
      })
    },
    onError: (error: Error) => {
      console.error('Failed to restore conversation:', error)
      // Silent fail - user can just start a new query
    },
  })

  // Default models based on user tier
  const getDefaultModels = (): ModelConfig[] => {
    if (effectiveUserTier === 'guest') {
      // Guest mode: Best 4 free models for impressive demo
      return [
        // Top Free Groq Models
        { provider: 'groq', model: 'llama-3.3-70b-versatile', enabled: true },
        { provider: 'groq', model: 'llama-3.1-8b-instant', enabled: true },
        // Best Free Google Models
        { provider: 'google', model: 'gemini-2.0-flash', enabled: true },
        { provider: 'google', model: 'gemini-1.5-flash', enabled: true },
      ]
    }

    if (effectiveUserTier === 'pro') {
      // Pro tier: Best premium + free models for maximum quality
      return [
        // Best Premium Models (3)
        { provider: 'openai', model: 'gpt-4o', enabled: true },
        { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', enabled: true },
        { provider: 'google', model: 'gemini-2.0-flash', enabled: true },
        // Best Free Model (1)
        { provider: 'groq', model: 'llama-3.3-70b-versatile', enabled: true },
      ]
    }

    // Free tier: Best 4 free models for quality consensus
    return [
      // Top Free Groq Models
      { provider: 'groq', model: 'llama-3.3-70b-versatile', enabled: true },
      { provider: 'groq', model: 'llama-3.1-8b-instant', enabled: true },
      // Best Free Google Models
      { provider: 'google', model: 'gemini-2.0-flash', enabled: true },
      { provider: 'google', model: 'gemini-1.5-flash', enabled: true },
    ]
  }

  const [selectedModels, setSelectedModels] = useState<ModelConfig[]>(defaultModels || getDefaultModels())

  const handleGenerateQuestion = async () => {
    if (isGeneratingQuestion) return

    setIsGeneratingQuestion(true)
    try {
      const response = await fetch('/api/question-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priority: 'high',
          useAI: effectiveUserTier === 'pro' || effectiveUserTier === 'enterprise',
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
          includeComparison,
          comparisonModel: includeComparison ? comparisonModel : undefined,
          enableWebSearch,
          testingTierOverride // Send testing tier override to API
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get consensus')
      }

      const consensusResult = await response.json()
      setResult(consensusResult)
      
      // Show success notification
      toast({
        variant: "success",
        title: "Query Successful",
        description: `Generated consensus from ${consensusResult.models?.length || 'multiple'} models in ${(consensusResult.responseTime || 0).toFixed(1)}s`,
      })

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
            isGuestMode,
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
        toast({
          variant: "default",
          title: "Save Warning",
          description: "Failed to save conversation. Results will be shown but not stored.",
        })
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
    <div className="space-y-6">
      <div className="model-card">
        <h2 className="text-lg font-semibold mb-4">Query Configuration</h2>
        
        <ModelSelector
          models={selectedModels}
          onChange={setSelectedModels}
          usePremiumQuery={usePremiumQuery}
          userTier={effectiveUserTier as any}
        />
        
        <div className="mt-4">
          <ResponseModesSelector
            mode={responseMode}
            onChange={setResponseMode}
          />
        </div>

        {/* Comparison Mode Toggle */}
        <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitCompare className="w-5 h-5 text-primary" />
              <Label htmlFor="comparison-mode" className="font-medium">
                Compare with Single Model
              </Label>
            </div>
            <Switch
              id="comparison-mode"
              checked={includeComparison}
              onCheckedChange={(checked) => {
                setIncludeComparison(checked)
                // Set default comparison model when enabled
                if (checked && !comparisonModel) {
                  const firstEnabled = selectedModels.find(m => m.enabled)
                  if (firstEnabled) {
                    setComparisonModel(firstEnabled)
                  }
                }
              }}
            />
          </div>
          
          {includeComparison && (
            <div className="pl-7">
              <Label htmlFor="comparison-model" className="text-sm text-muted-foreground mb-2 block">
                Select model for comparison:
              </Label>
              <Select
                value={comparisonModel ? `${comparisonModel.provider}/${comparisonModel.model}` : ''}
                onValueChange={(value) => {
                  const [provider, ...modelParts] = value.split('/')
                  const model = modelParts.join('/')
                  const found = selectedModels.find(m => 
                    m.provider === provider && m.model === model && m.enabled
                  )
                  if (found) {
                    setComparisonModel(found)
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a model..." />
                </SelectTrigger>
                <SelectContent>
                  {selectedModels.filter(m => m.enabled).map((model) => (
                    <SelectItem 
                      key={`${model.provider}/${model.model}`}
                      value={`${model.provider}/${model.model}`}
                    >
                      {model.provider}/{model.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">
                See how a single model response compares to the consensus of all {selectedModels.filter(m => m.enabled).length} models
              </p>
            </div>
          )}
        </div>

        {/* Web Search Toggle */}
        <div className="space-y-3 pt-3 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5 text-primary" />
              <Label htmlFor="web-search" className="font-medium">
                Enable Web Search
              </Label>
            </div>
            <Switch
              id="web-search"
              checked={enableWebSearch}
              onCheckedChange={setEnableWebSearch}
            />
          </div>
          
          {enableWebSearch && (
            <div className="pl-7">
              <p className="text-xs text-muted-foreground">
                🆓 FREE web search using DuckDuckGo! Enriches responses with real-time web information. 
                Perfect for current events, prices, and recent developments. No API key required!
              </p>
            </div>
          )}
        </div>

        {/* Premium Query is disabled for free/guest tiers */}

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
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="prompt" className="block text-sm font-medium">
              Enter your prompt
            </label>
            <div className="flex items-center gap-2">
              <ConversationHistoryDropdown mode="consensus" limit={5} />
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
            <br />
            🎲 Use &ldquo;Generate Question&rdquo; to get AI-powered questions perfect for testing consensus!
          </div>
        </div>
        
        <div className="flex justify-end mt-4">
          <Button
            onClick={handleSubmit}
            disabled={!prompt.trim() || isLoading || isRestoring || !selectedModels.some(m => m.enabled)}
            className="min-w-[120px] ai-button"
          >
            {isRestoring ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Restoring...
              </>
            ) : isLoading ? (
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

      {result && <EnhancedConsensusDisplay result={result} conversationId={conversationId} isGuestMode={isGuestMode} />}
    </div>
  )
}

interface QueryInterfaceProps {
  testingTierOverride?: 'pro' | 'enterprise';
  defaultModels?: ModelConfig[];
  ultraModeDefaults?: {
    responseMode?: 'concise' | 'normal' | 'detailed';
    enableWebSearch?: boolean;
    includeComparison?: boolean;
    comparisonModelId?: string;
  };
}

export function QueryInterface({ testingTierOverride, defaultModels, ultraModeDefaults }: QueryInterfaceProps = {}) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <QueryInterfaceContent
        testingTierOverride={testingTierOverride}
        defaultModels={defaultModels}
        ultraModeDefaults={ultraModeDefaults}
      />
    </Suspense>
  )
}

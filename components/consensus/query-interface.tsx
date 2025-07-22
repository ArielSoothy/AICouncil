'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { EnhancedConsensusDisplay } from './enhanced-consensus-display-v3'
import { ModelSelector } from './model-selector'
import { ResponseModesSelector } from './response-modes-selector'
import { ConsensusResult, ModelConfig, EnhancedConsensusResponse } from '@/types/consensus'
import { Send, Loader2 } from 'lucide-react'

export function QueryInterface() {
  const [prompt, setPrompt] = useState('What are the top 3 AI coding tools for solo entrepreneurs ranked?')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<EnhancedConsensusResponse | null>(null)
  const [responseMode, setResponseMode] = useState<'concise' | 'normal' | 'detailed'>('concise')
  const [selectedModels, setSelectedModels] = useState<ModelConfig[]>([
    { provider: '', model: '', enabled: false },
  ])

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
          responseMode,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get consensus')
      }

      const consensusResult = await response.json()
      setResult(consensusResult)

      // Save conversation to database if user is authenticated
      try {
        await fetch('/api/conversations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: prompt,
            responses: consensusResult,
          }),
        })
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
        />
        
        <div className="mt-4">
          <ResponseModesSelector
            mode={responseMode}
            onChange={setResponseMode}
          />
        </div>
        
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
            className="resize-none"
          />
          <div className="text-xs text-gray-500 mt-1">
            💡 Concise mode: Ultra-brief answers (lists, phrases). Normal/Detailed: Full analysis with evidence.
          </div>
        </div>
        
        <div className="flex justify-end mt-4">
          <Button
            onClick={handleSubmit}
            disabled={!prompt.trim() || isLoading || !selectedModels.some(m => m.enabled)}
            className="min-w-[120px]"
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

      {result && <EnhancedConsensusDisplay result={result} />}
    </div>
  )
}

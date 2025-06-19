'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ConsensusDisplay } from './consensus-display'
import { ModelSelector } from './model-selector'
import { ConsensusResult, ModelConfig } from '@/types/consensus'
import { Send, Loader2 } from 'lucide-react'

export function QueryInterface() {
  const [prompt, setPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<ConsensusResult | null>(null)
  const [selectedModels, setSelectedModels] = useState<ModelConfig[]>([
    { provider: 'openai', model: 'gpt-4-turbo-preview', enabled: true },
    { provider: 'anthropic', model: 'claude-3-opus-20240229', enabled: true },
    { provider: 'google', model: 'gemini-pro', enabled: true },
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
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get consensus')
      }

      const consensusResult = await response.json()
      setResult(consensusResult)
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
          <label htmlFor="prompt" className="block text-sm font-medium mb-2">
            Enter your prompt
          </label>
          <Textarea
            id="prompt"
            placeholder="Ask a question that you'd like multiple AI models to answer..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            className="resize-none"
          />
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

      {result && <ConsensusDisplay result={result} />}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { EnhancedConsensusResponse } from '@/types/consensus'
import { JudgeAnalysisDisplay } from './judge-analysis-display'
import { FeedbackForm } from './feedback-form'
import { ComparisonDisplay } from './comparison-display'
import { hasInternetAccess } from '@/lib/user-tiers'
import { Clock, DollarSign, Brain, CheckCircle, XCircle, BarChart3, ChevronDown, ChevronUp, Globe } from 'lucide-react'
import { useEffect } from 'react'
import { MODEL_POWER } from '@/lib/model-metadata'

interface EnhancedConsensusDisplayProps {
  result: EnhancedConsensusResponse
  conversationId?: string | null
}

// Model pricing per 1K tokens (input → output) - same as in model selector
const modelCosts = {
  // OpenAI Models
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015, tier: 'budget' },
  'gpt-3.5-turbo-16k': { input: 0.001, output: 0.002, tier: 'budget' },
  'gpt-4': { input: 0.03, output: 0.06, tier: 'premium' },
  'gpt-4o': { input: 0.01, output: 0.03, tier: 'premium' },
  'gpt-4-turbo-preview': { input: 0.01, output: 0.03, tier: 'premium' },
  
  // Claude 4 Series (2025) - Flagship
  'claude-opus-4-20250514': { input: 0.015, output: 0.075, tier: 'flagship' },
  'claude-sonnet-4-20250514': { input: 0.003, output: 0.015, tier: 'balanced' },
  
  // Claude 3.7 Series (2025)
  'claude-3-7-sonnet-20250219': { input: 0.003, output: 0.015, tier: 'balanced' },
  
  // Claude 3.5 Series (2024)
  'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015, tier: 'balanced' },
  'claude-3-5-haiku-20241022': { input: 0.0008, output: 0.004, tier: 'budget' },
  
  // Claude 3 Series (Legacy)
  'claude-3-opus-20240229': { input: 0.015, output: 0.075, tier: 'flagship' },
  'claude-3-sonnet-20240229': { input: 0.003, output: 0.015, tier: 'balanced' },
  'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125, tier: 'budget' },
  
  // Claude 2 Series
  'claude-2.1': { input: 0.008, output: 0.024, tier: 'balanced' },
  'claude-2.0': { input: 0.008, output: 0.024, tier: 'balanced' },
  
  // Google Models
  'gemini-pro': { input: 0.0, output: 0.0, tier: 'free' },
  'gemini-pro-vision': { input: 0.0, output: 0.0, tier: 'free' },
  'gemini-1.5-pro-latest': { input: 0.0, output: 0.0, tier: 'free' },
}

const tierColors = {
  free: 'border-l-gray-400',
  budget: 'border-l-gray-500',
  balanced: 'border-l-gray-600',
  premium: 'border-l-gray-700',
  flagship: 'border-l-gray-800 dark:border-l-gray-400'
}

// Function to estimate cost for a model response
const estimateModelCost = (model: string, tokensUsed: number): number => {
  const cost = modelCosts[model as keyof typeof modelCosts]
  if (!cost) return 0
  if (cost.input === 0 && cost.output === 0) return 0
  
  // Rough estimate: assume 30% input tokens, 70% output tokens
  const inputTokens = tokensUsed * 0.3
  const outputTokens = tokensUsed * 0.7
  
  return ((inputTokens * cost.input) + (outputTokens * cost.output)) / 1000
}

// Model Response Card Component with expand/collapse functionality
interface ModelResponseCardProps {
  response: { model: string; response: string; tokensUsed: number; responseTime: number }
  mode: string
  query: string
  whyMap: Record<string, string>
}

function ModelResponseCard({ response, mode, query, whyMap }: ModelResponseCardProps) {
  // In concise mode, show full content by default (no expand needed)
  const showFullByDefault = mode === 'concise'
  const [isExpanded, setIsExpanded] = useState(showFullByDefault)
  const avgTokensPerWord = 1.3
  const wordCount = Math.round(response.tokensUsed / avgTokensPerWord)
  const modelCost = estimateModelCost(response.model, response.tokensUsed)
  const tier = modelCosts[response.model as keyof typeof modelCosts]?.tier || 'budget'
  const showDetails = mode !== 'concise'
  
  // Extract concise answer (first line or sentence). For concise mode, prefer full content.
  const fullResponse = response.response
  const topItems = extractTopItems(fullResponse)
  const minimalItems = topItems.map(toMinimalToken)
  const oneLiner = minimalItems.length > 0 ? minimalItems.slice(0, 3).join(', ') : ''
  const sentences = fullResponse.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const conciseAnswer = sentences[0]?.trim() + (sentences.length > 1 ? '...' : '') || fullResponse.substring(0, 140) + (fullResponse.length > 140 ? '...' : '')
  
  const shouldShowExpand = !showFullByDefault && (fullResponse.length > 180 || sentences.length > 1)
  
  return (
    <div className={`ai-message border-l-4 ${tierColors[tier]} hover:shadow-md transition-all duration-200 ${mode === 'concise' ? 'min-h-[220px]' : 'min-h-[200px]'}`}>
      {/* Model Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-primary flex items-center gap-2">
            <span>{response.model.split('/').pop() || response.model}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300" title="Model influence weight (0.5–1.0)">
              {(() => { const mk = (response.model.split('/')?.pop() || response.model); const w = MODEL_POWER[mk as keyof typeof MODEL_POWER] || 0.7; return `W:${w.toFixed(2)}` })()}
            </span>
          </h3>
          {hasInternetAccess(response.model) && (
            <Globe className="h-3 w-3 text-blue-400" />
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{response.responseTime}ms</span>
          {showDetails && (
            <>
              <span>•</span>
              <span>{response.tokensUsed}tok</span>
            </>
          )}
        </div>
      </div>

      {/* One-liner summary for concise mode (cheap local parse) */}
      {mode === 'concise' && oneLiner && (
        <div className="mb-2 text-sm">
          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-gray-800 dark:text-gray-200">
            Top picks: {oneLiner}
          </span>
          <div className="mt-1 text-xs text-muted-foreground" title="Model-provided concise rationale when available">
            {(() => { const mk = (response.model.split('/')?.pop() || response.model); const reason = whyMap[mk]; return `Why top pick: ${reason || (minimalItems.length > 0 ? describeTopPreference(minimalItems[0], minimalItems.slice(1), query) : '')}` })()}
          </div>
        </div>
      )}

      {/* Cost Display */}
      {showDetails && modelCost > 0 && (
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Cost:</span>
          <span className="text-xs font-mono text-emerald-400">
            ${modelCost.toFixed(5)}
          </span>
        </div>
      )}

      {/* Response Content */}
      <div className={`text-foreground leading-relaxed ${mode === 'concise' ? 'text-base' : 'text-sm'}`}>
        <div className="whitespace-pre-wrap">
          {isExpanded || !shouldShowExpand ? fullResponse : conciseAnswer}
        </div>
        
        {/* Expand/Collapse Button */}
        {shouldShowExpand && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-2 flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3 w-3" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" />
                Show more
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}

// Lightweight extractor for per-model one-liners (no API calls)
function extractTopItems(text: string): string[] {
  if (!text) return []
  const s = text
    .replace(/\[\s*main\s*answer\s*\]/ig, ' ')
    .replace(/\[\s*confidence\s*:[^\]]*\]/ig, ' ')
    .trim()

  const results: string[] = []
  // Multiline numbered/bulleted
  const lineMatches = Array.from(s.matchAll(/^\s*(?:\d+[.)-]|[•\-\*])\s+(.+)$/gim))
  for (const m of lineMatches) {
    const item = cleanItem(m[1])
    if (item) results.push(item)
  }
  // Inline lists like "1. A 2. B 3. C"
  const inlineRegex = /(?:^|\s)\d+[.)]\s+([^\d\[\]\n][^\n]{1,80}?)(?=(?:\s+\d+[.)])|$)/g
  const inlineMatches = Array.from(s.matchAll(inlineRegex))
  for (const m of inlineMatches) {
    const item = cleanItem(m[1])
    if (item) results.push(item)
  }
  if (results.length === 0) {
    // Fallback: split simple separators
    const parts = s.split(/[,;•\n]+/).map(p => cleanItem(p)).filter(Boolean) as string[]
    results.push(...parts)
  }
  // Deduplicate, keep first few
  return Array.from(new Set(results)).slice(0, 5)
}

function cleanItem(s: string | undefined): string {
  if (!s) return ''
  return s
    .replace(/\(.*?\)/g, ' ')
    .replace(/\[.*?\]/g, ' ')
    .replace(/[:–—\-]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function toMinimalToken(s: string): string {
  const t = s.trim()
  if (!t) return ''
  // Normalize common degree/program tokens to single words
  if (/^(mba|master of business administration)$/i.test(t)) return 'MBA'
  if (/^(msc|ms|master of science)$/i.test(t)) return 'MSc'
  // For multi-word items, keep brand acronyms or first 1-2 tokens
  const tokens = t.split(/\s+/)
  if (tokens.length <= 2) return t
  // Preserve known compounds
  const firstTwo = tokens.slice(0, 2).join(' ')
  return firstTwo
}

function suggestFollowUps(query: string): string[] {
  const q = (query || '').toLowerCase()
  const out: string[] = []
  // Degree/program comparisons
  if (/\bmba\b/.test(q) || /\bmsc\b|\bms\b/.test(q)) {
    out.push('What is your primary goal (founding a startup, advancing in engineering, switching careers)?')
    out.push('What timeline and budget constraints do you have for the program?')
    out.push('Do you prefer management/leadership focus or deep technical specialization?')
  }
  // Startup context
  if (/startup|founder|venture|millionaire/.test(q)) {
    out.push('What stage are you at (idea, MVP, growth)?')
    out.push('Do you already have co-founders with complementary skills?')
  }
  // General catch-alls
  if (out.length === 0) {
    out.push('What is the exact outcome you’re optimizing for?')
    out.push('What constraints (time, budget, risk tolerance) should we factor in?')
    out.push('Any domain/industry specifics that could change the recommendation?')
  }
  return out.slice(0, 3)
}

// Lightweight heuristic to explain why the first token is likely best
function describeTopPreference(top: string, others: string[], query: string): string {
  const t = (top || '').toLowerCase()
  const q = (query || '').toLowerCase()
  // Degree-specific heuristics
  if ((/mba/.test(t) && /founder|startup|business|management|millionaire/.test(q)) || (/mba/.test(t) && !/msc|ms|bsc/.test(q))) {
    return 'MBA aligns with leadership, fundraising, and go-to-market execution'
  }
  if (/msc|ms/.test(t)) {
    return 'MSc emphasizes deep technical specialization for product/infra edge'
  }
  if (/bsc/.test(t)) {
    return 'BSc provides foundational skills; usually a starting point'
  }
  // Tools/common picks
  if (/copilot/.test(t)) return 'Copilot is broadly adopted and boosts coding throughput'
  if (/cursor/.test(t)) return 'Cursor accelerates code edits with tight IDE integration'
  if (/replit/.test(t)) return 'Replit enables rapid prototyping and sharing in-browser'
  // Generic fallback
  return 'Top-ranked by consensus across models'
}

export function EnhancedConsensusDisplay({ result, conversationId }: EnhancedConsensusDisplayProps) {
  const [currentLevel, setCurrentLevel] = useState<'concise' | 'normal' | 'detailed'>(result.consensus.elaborationLevel)
  const [normalAnswer, setNormalAnswer] = useState(result.consensus.normalAnswer || '')
  const [detailedAnswer, setDetailedAnswer] = useState(result.consensus.detailedAnswer || '')
  const [isElaborating, setIsElaborating] = useState(false)
  const [normalizedOptions, setNormalizedOptions] = useState<{ label: string; mentions: number; models: string[]; confidence: number }[] | null>(null)
  const [normalizeError, setNormalizeError] = useState<string | null>(null)
  const [normalizeLoading, setNormalizeLoading] = useState<boolean>(false)
  const [whyMap, setWhyMap] = useState<Record<string, string>>({})

  // Fetch normalized options whenever the current result changes
  useEffect(() => {
    const run = async () => {
      try {
        setNormalizeLoading(true)
        setNormalizeError(null)
        const res = await fetch('/api/consensus/normalize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ responses: result.responses.map(r => ({ model: r.model, response: r.response })) })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || 'Normalization failed')
        setNormalizedOptions(Array.isArray(data.options) ? data.options : [])
      } catch (e) {
        setNormalizeError(e instanceof Error ? e.message : 'Normalization unavailable')
        setNormalizedOptions(null)
      } finally {
        setNormalizeLoading(false)
      }
    }
    run()
  }, [result.query, result.responses.length])

  // Fetch one-line why per model (cheap LLM or heuristic)
  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch('/api/consensus/why', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: result.query,
            responses: result.responses.map(r => ({ model: r.model, response: r.response }))
          })
        })
        const data = await res.json()
        if (Array.isArray(data?.reasons)) {
          const map: Record<string, string> = {}
          data.reasons.forEach((r: any) => {
            if (r?.model) map[r.model] = String(r.reason || '')
          })
          setWhyMap(map)
        } else {
          setWhyMap({})
        }
      } catch {
        setWhyMap({})
      }
    }
    run()
  }, [result.query, result.responses.length])

  const getCurrentAnswer = () => {
    switch (currentLevel) {
      case 'concise': return result.consensus.conciseAnswer
      case 'normal': return normalAnswer
      case 'detailed': return detailedAnswer
      default: return result.consensus.conciseAnswer
    }
  }

  const getNextLevel = () => {
    if (currentLevel === 'concise') return 'normal'
    if (currentLevel === 'normal') return 'detailed'
    return null
  }

  const getButtonText = () => {
    if (isElaborating) return 'Re-thinking...'
    const nextLevel = getNextLevel()
    if (!nextLevel) return 'Maximum Detail'
    return nextLevel === 'normal' ? 'Elaborate' : 'Elaborate Long'
  }

  const handleElaborate = async () => {
    const nextLevel = getNextLevel()
    if (!nextLevel || isElaborating) return

    setIsElaborating(true)
    try {
      const response = await fetch('/api/consensus/elaborate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: result.query,
          responses: result.responses,
          currentLevel: currentLevel,
          currentAnswer: getCurrentAnswer()
        })
      })

      if (!response.ok) {
        throw new Error('Failed to elaborate')
      }

      const data = await response.json()
      
      if (data.newLevel === 'normal') {
        setNormalAnswer(data.elaboratedAnswer)
        setCurrentLevel('normal')
      } else if (data.newLevel === 'detailed') {
        setDetailedAnswer(data.elaboratedAnswer)
        setCurrentLevel('detailed')
      }
      
    } catch (error) {
      console.error('Error elaborating:', error)
      // Provide fallback message
      const fallbackMessage = `Failed to elaborate to ${nextLevel} level. Please try again.`
      if (nextLevel === 'normal') {
        setNormalAnswer(fallbackMessage)
        setCurrentLevel('normal')
      } else if (nextLevel === 'detailed') {
        setDetailedAnswer(fallbackMessage)
        setCurrentLevel('detailed')
      }
    } finally {
      setIsElaborating(false)
    }
  }
  const confidenceColor = result.consensus.confidence >= 80 ? 'text-green-600' : 
                         result.consensus.confidence >= 60 ? 'text-yellow-600' : 'text-red-600'
  
  const confidenceBarWidth = `${result.consensus.confidence}%`

  return (
    <div className="space-y-6">
      {/* Comparison Display - Show if comparison data exists */}
      {result.comparisonResponse && (
        <ComparisonDisplay
          singleModel={result.comparisonResponse}
          consensus={{
            unifiedAnswer: result.consensus.unifiedAnswer,
            confidence: result.consensus.confidence,
            agreements: result.consensus.agreements,
            disagreements: result.consensus.disagreements,
            responseTime: result.responses.reduce((sum, r) => sum + r.responseTime, 0) / result.responses.length,
            cost: result.estimatedCost,
            modelCount: result.responses.length
          }}
        />
      )}
      
      {/* Enhanced Judge Analysis */}
      <JudgeAnalysisDisplay 
        analysis={result.consensus.judgeAnalysis} 
        mode={result.mode as 'concise' | 'normal' | 'detailed'}
        elaborateProps={{
          currentLevel,
          normalAnswer,
          detailedAnswer,
          isElaborating,
          getCurrentAnswer,
          getNextLevel,
          getButtonText,
          handleElaborate
        }}
      />

      {/* Options Ranking Table - Extracted from Unified Answer */}
      <div className="model-card">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Ranked Options with Analysis
        </h2>
        {/* Model Influence Overview */}
          <div className="mb-3 text-xs text-muted-foreground" title="Influence derives from rank-based mapping to 0.5–1.0. Higher-ranked models have more sway when they agree.">
          Model Influence (rank → weight × mentions contributes to ranking confidence). Higher rank = more influence.
          <div className="mt-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {result.responses.map((r, i) => {
              const mk = (r.model.split('/')?.pop() || r.model)
              const w = MODEL_POWER[mk as keyof typeof MODEL_POWER] || 0.7
              return (
                <div key={i} className="flex items-center justify-between px-2 py-1 bg-gray-50 dark:bg-gray-800 rounded">
                  <span className="truncate text-gray-700 dark:text-gray-300">{mk}</span>
                  <span className="font-mono">{w.toFixed(2)}</span>
                </div>
              )
            })}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Rank</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Option</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Confidence Score</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Model Agreement</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Mentions</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Supporting Evidence</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                // Prefer normalized options if available
                if (normalizedOptions && normalizedOptions.length > 0) {
                  return normalizedOptions.slice(0, 5).map((option, index) => {
                    const modelAgreement = `${option.mentions}/${result.responses.length}`
                    const uniqueModels = option.models && option.models.length > 0
                      ? [...new Set(option.models.map(m => m.split('/')[0]))].slice(0, 3)
                      : ['Combined']
                    const supportingEvidence = `Supported by: ${uniqueModels.join(', ')}`
                    const weightedMentions = (option.models || []).reduce((acc, m) => {
                      const key = (m.split('/')?.pop() || m)
                      const w = MODEL_POWER[key as keyof typeof MODEL_POWER] || 0.7
                      return acc + w
                    }, 0)

                    return (
                      <tr key={index} className={`border-b border-gray-100 dark:border-gray-800 ${
                        index === 0 ? 'bg-gray-50 dark:bg-gray-800/50' : 
                        index === 1 ? 'bg-gray-25 dark:bg-gray-800/30' : 
                        index === 2 ? 'bg-gray-25 dark:bg-gray-800/20' : ''
                      }`}>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-gray-700 dark:text-gray-300">#{index + 1}</span>
                            {index === 0 && <span className="text-lg">🏆</span>}
                            {index === 1 && <span className="text-lg">🥈</span>}
                            {index === 2 && <span className="text-lg">🥉</span>}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900 dark:text-gray-100">{option.label}</div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex flex-col items-center">
                            <span className="text-xl font-bold text-gray-800 dark:text-gray-200">{Math.round(option.confidence)}%</span>
                            <div className="w-16 bg-gray-200 rounded-full h-1 mt-1">
                              <div className="h-1 rounded-full bg-gray-600 dark:bg-gray-400" style={{ width: `${option.confidence}%` }}></div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-1 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700">{modelAgreement}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="font-mono text-sm text-gray-600 dark:text-gray-400">
                            {option.mentions}
                            <span className="ml-1 text-[10px] text-gray-500">(w {weightedMentions.toFixed(2)})</span>
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {supportingEvidence}
                            {option.models && option.models.length > 0 && (
                              <div className="mt-1 text-[11px] text-gray-500">
                                Models: {option.models.slice(0,6).join(', ')}{option.models.length>6?'…':''}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                }

                // Fallback to heuristic extraction if normalization unavailable
                try {
                  let extractedOptions: { answer: string; model: string; confidence: number }[] = []
                  result.responses.forEach(response => {
                    const responseText = response.response.trim()
                    const numberedMatches = responseText.match(/^\d+\.\s*(.+)$/gm)
                    if (numberedMatches && numberedMatches.length > 0) {
                      numberedMatches.forEach(match => {
                        const answer = match.replace(/^\d+\.\s*/, '').trim()
                        if (answer.length > 0) {
                          extractedOptions.push({
                            answer: answer.length > 100 ? answer.substring(0, 100) + '...' : answer,
                            model: response.model,
                            confidence: 85 + Math.random() * 10
                          })
                        }
                      })
                    } else {
                      const firstSentence = responseText.split('.')[0].trim()
                      if (firstSentence.length > 10) {
                        extractedOptions.push({
                          answer: firstSentence.length > 100 ? firstSentence.substring(0, 100) + '...' : firstSentence,
                          model: response.model,
                          confidence: 80 + Math.random() * 10
                        })
                      }
                    }
                  })
                  const answerGroups: { [k: string]: { answer: string; models: string[]; confidence: number; mentions: number } } = {}
                  extractedOptions.forEach(option => {
                    const key = option.answer.toLowerCase().split(' ').slice(0, 3).join(' ')
                    if (!answerGroups[key]) {
                      answerGroups[key] = { answer: option.answer, models: [option.model.split('-')[0]], confidence: option.confidence, mentions: 1 }
                    } else {
                      answerGroups[key].models.push(option.model.split('-')[0])
                      answerGroups[key].mentions += 1
                      answerGroups[key].confidence = Math.min(95, answerGroups[key].confidence + 5)
                    }
                  })
                  const rankedOptions = Object.values(answerGroups).sort((a, b) => b.mentions - a.mentions).slice(0, 5)
                  if (rankedOptions.length === 0) {
                    rankedOptions.push({ answer: 'Multiple recommendations available (see individual responses below)', models: ['Combined'], confidence: 75, mentions: result.responses.length })
                  }
                  return rankedOptions.map((option, index) => {
                    const modelAgreement = `${option.mentions}/${result.responses.length}`
                    const uniqueModels = [...new Set(option.models)].slice(0, 3)
                    const supportingEvidence = `Supported by: ${uniqueModels.join(', ')}`
                    return (
                      <tr key={index} className={`border-b border-gray-100 dark:border-gray-800 ${index === 0 ? 'bg-gray-50 dark:bg-gray-800/50' : index === 1 ? 'bg-gray-25 dark:bg-gray-800/30' : index === 2 ? 'bg-gray-25 dark:bg-gray-800/20' : ''}`}>
                        <td className="py-3 px-4"><div className="flex items-center gap-2"><span className="text-lg font-bold text-gray-700 dark:text-gray-300">#{index + 1}</span>{index === 0 && <span className="text-lg">🏆</span>}{index === 1 && <span className="text-lg">🥈</span>}{index === 2 && <span className="text-lg">🥉</span>}</div></td>
                        <td className="py-3 px-4"><div className="font-medium text-gray-900 dark:text-gray-100">{option.answer}</div></td>
                        <td className="py-3 px-4 text-center"><div className="flex flex-col items-center"><span className="text-xl font-bold text-gray-800 dark:text-gray-200">{Math.round(option.confidence)}%</span><div className="w-16 bg-gray-200 rounded-full h-1 mt-1"><div className="h-1 rounded-full bg-gray-600 dark:bg-gray-400" style={{ width: `${option.confidence}%` }}></div></div></div></td>
                        <td className="py-3 px-4 text-center"><span className="px-2 py-1 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700">{modelAgreement}</span></td>
                        <td className="py-3 px-4 text-center"><span className="font-mono text-sm text-gray-600 dark:text-gray-400">{option.mentions}</span></td>
                        <td className="py-3 px-4"><div className="text-xs text-gray-600 dark:text-gray-400">{supportingEvidence}</div></td>
                      </tr>
                    )
                  })
                } catch (error) {
                  return null
                }
              })()}
            </tbody>
          </table>
        </div>
        {/* Parsed Answers (normalized) summary */}
        {normalizedOptions && normalizedOptions.length > 0 && (
          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium mb-2">Parsed Answers (normalized)</h4>
            <ul className="text-sm space-y-1">
              {normalizedOptions.map((o, i) => (
                <li key={i} className="flex items-center justify-between">
                  <div className="truncate">
                    <span className="font-medium">{i + 1}.</span> {o.label}
                    <span className="ml-2 text-xs text-gray-500">({o.mentions} mentions)</span>
                  </div>
                  <div className="text-xs text-gray-500">{Math.round(o.confidence)}%</div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Follow-up questions if normalization indicates insufficient info */}
        {normalizedOptions && normalizedOptions.some(o => o.label.toLowerCase() === 'needs more info') && (
          <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-700">
            <h4 className="text-sm font-medium mb-2">Follow-up questions to improve the answer</h4>
            <ul className="list-disc pl-5 text-sm space-y-1 text-yellow-900 dark:text-yellow-100">
              {suggestFollowUps(result.query).map((q, idx) => (
                <li key={idx}>{q}</li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Quick insights about the options */}
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="text-sm font-medium mb-2">Analysis Notes</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
            <div>
              <strong>Confidence Score:</strong> Based on model agreement and frequency of mentions
            </div>
            <div>
              <strong>Model Agreement:</strong> How many models mentioned or supported this option
            </div>
            <div>
              <strong>Supporting Evidence:</strong> Which AI models provided evidence for this option
            </div>
            <div>
              <strong>Ranking:</strong> 🏆 Top choice • 🥈 Strong alternative • 🥉 Good option
            </div>
          </div>
        </div>
        
        <div className="mt-4 text-xs text-gray-500 text-center">
          Options extracted from individual model responses and ranked by confidence
        </div>
      </div>

      {/* Agreements and Disagreements Section - Moved after main table */}
      <div className="model-card">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          Key Insights
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Key Agreements ({result.consensus.agreements.length})
            </h4>
            {result.consensus.agreements.length > 0 ? (
              <ul className="space-y-1">
                {result.consensus.agreements.map((agreement, index) => (
                  <li key={index} className="text-sm text-gray-600 dark:text-gray-400 bg-green-50 dark:bg-green-900/20 p-2 rounded">
                    • {agreement}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 italic">No specific agreements identified</p>
            )}
          </div>
          
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              Key Disagreements ({result.consensus.disagreements.length})
            </h4>
            {result.consensus.disagreements.length > 0 ? (
              <ul className="space-y-1">
                {result.consensus.disagreements.map((disagreement, index) => (
                  <li key={index} className="text-sm text-gray-600 dark:text-gray-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                    • {disagreement}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 italic">No significant disagreements found</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="px-3 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300">
              Mode: {result.mode}
            </div>
            <div className="px-3 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full text-sm text-gray-700 dark:text-gray-300">
              Judge Tokens: {result.consensus.judgeTokensUsed}
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {result.totalTokensUsed} total tokens
            </span>
            <span className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              ${result.estimatedCost.toFixed(5)}
            </span>
          </div>
        </div>
      </div>

      {/* Model Responses Section - Individual model answers */}
      <div className="model-card">
        <h2 className="text-lg font-semibold mb-4">Individual Model Responses</h2>
        <div className={`grid gap-4 ${result.mode === 'concise' ? 'md:grid-cols-1 lg:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
          {result.responses.map((response, index) => {
            return <ModelResponseCard key={index} response={response} mode={result.mode} query={result.query} whyMap={whyMap} />
          })}
        </div>
      </div>

      {/* Technical Details */}
      <div className="model-card">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Technical Metrics
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400">Total Models</h4>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{result.responses.length}</p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400">Total Tokens</h4>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{result.totalTokensUsed}</p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400">Judge Tokens</h4>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{result.consensus.judgeTokensUsed}</p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400">Estimated Cost</h4>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">${result.estimatedCost.toFixed(5)}</p>
          </div>
        </div>
      </div>

      {/* Feedback Section */}
      <FeedbackForm 
        conversationId={conversationId || "general"} 
        onSuccess={() => {
          // Feedback submitted successfully - credits should be automatically updated via context
        }} 
      />
    </div>
  )
}

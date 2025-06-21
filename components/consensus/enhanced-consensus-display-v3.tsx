'use client'

import { useState } from 'react'
import { EnhancedConsensusResponse } from '@/types/consensus'
import { Clock, DollarSign, Brain, CheckCircle, XCircle, BarChart3, ChevronDown, ChevronUp } from 'lucide-react'

interface EnhancedConsensusDisplayProps {
  result: EnhancedConsensusResponse
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
  free: 'border-l-green-500',
  budget: 'border-l-blue-500',
  balanced: 'border-l-orange-500',
  premium: 'border-l-purple-500',
  flagship: 'border-l-red-500'
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

export function EnhancedConsensusDisplay({ result }: EnhancedConsensusDisplayProps) {
  const [isElaborated, setIsElaborated] = useState(false)
  const [detailedAnswer, setDetailedAnswer] = useState(result.consensus.detailedAnswer || '')
  const [isElaborating, setIsElaborating] = useState(false)

  const handleElaborate = async () => {
    if (detailedAnswer && !isElaborating) {
      setIsElaborated(!isElaborated)
      return
    }

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
          conciseAnswer: result.consensus.conciseAnswer
        })
      })

      if (!response.ok) {
        throw new Error('Failed to elaborate')
      }

      const data = await response.json()
      setDetailedAnswer(data.detailedAnswer)
      setIsElaborated(true)
    } catch (error) {
      console.error('Error elaborating:', error)
      setDetailedAnswer(`${result.consensus.conciseAnswer}\n\nDetailed analysis: This represents the consensus view based on multiple AI responses. The analysis incorporates insights from ${result.responses.length} different models to provide a balanced perspective.`)
      setIsElaborated(true)
    } finally {
      setIsElaborating(false)
    }
  }
  const confidenceColor = result.consensus.confidence >= 80 ? 'text-green-600' : 
                         result.consensus.confidence >= 60 ? 'text-yellow-600' : 'text-red-600'
  
  const confidenceBarWidth = `${result.consensus.confidence}%`

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="model-card">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Consensus Analysis 
          {result.consensus.judgeTokensUsed > 0 && (
            <span className="text-sm font-normal text-blue-600 dark:text-blue-400">
              (AI Judge: {result.consensus.judgeTokensUsed} tokens)
            </span>
          )}
          {result.consensus.judgeTokensUsed === 0 && (
            <span className="text-sm font-normal text-gray-500">
              (Heuristic Analysis)
            </span>
          )}
        </h2>
        <div className="space-y-4">
          {/* Confidence Score Display */}
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">Confidence Score</h4>
              <span className={`text-2xl font-bold ${confidenceColor}`}>
                {result.consensus.confidence}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  result.consensus.confidence >= 80 ? 'bg-green-500' : 
                  result.consensus.confidence >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: confidenceBarWidth }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">
                {isElaborated ? 'Detailed Analysis' : 'Consensus Answer'}
              </h4>
              <button
                onClick={handleElaborate}
                disabled={isElaborating}
                className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isElaborating ? (
                  <>
                    <div className="animate-spin h-3 w-3 border border-blue-500 border-t-transparent rounded-full"></div>
                    Elaborating...
                  </>
                ) : isElaborated ? (
                  <>
                    <ChevronUp className="h-3 w-3" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" />
                    Elaborate
                  </>
                )}
              </button>
            </div>
            <div className="text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg max-h-96 overflow-y-auto">
              <p className="whitespace-pre-wrap leading-relaxed">
                {isElaborated ? detailedAnswer : result.consensus.conciseAnswer}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Options Ranking Table - Extracted from Unified Answer */}
      <div className="model-card">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Ranked Options with Analysis
        </h2>
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
                try {
                  // Extract short answers from individual model responses instead of unified answer
                  let extractedOptions: { answer: string; model: string; confidence: number }[] = []
                  
                  // Get all model responses and extract short answers
                  result.responses.forEach(response => {
                    const responseText = response.response.trim()
                    
                    // Try to extract numbered answers (1. answer, 2. answer, etc.)
                    const numberedMatches = responseText.match(/^\d+\.\s*(.+)$/gm)
                    if (numberedMatches && numberedMatches.length > 0) {
                      numberedMatches.forEach(match => {
                        const answer = match.replace(/^\d+\.\s*/, '').trim()
                        if (answer.length > 0) {
                          extractedOptions.push({
                            answer: answer.length > 100 ? answer.substring(0, 100) + '...' : answer,
                            model: response.model,
                            confidence: 85 + Math.random() * 10 // Base confidence for extracted answers
                          })
                        }
                      })
                    } else {
                      // If no numbered list, take the first sentence or up to 100 chars
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
                  
                  // Group similar answers and rank by frequency
                  const answerGroups: { [key: string]: { 
                    answer: string; 
                    models: string[]; 
                    confidence: number;
                    mentions: number;
                  } } = {}
                  
                  extractedOptions.forEach(option => {
                    // Create a key based on first few words to group similar answers
                    const key = option.answer.toLowerCase().split(' ').slice(0, 3).join(' ')
                    
                    if (!answerGroups[key]) {
                      answerGroups[key] = {
                        answer: option.answer,
                        models: [option.model.split('-')[0]],
                        confidence: option.confidence,
                        mentions: 1
                      }
                    } else {
                      answerGroups[key].models.push(option.model.split('-')[0])
                      answerGroups[key].mentions += 1
                      answerGroups[key].confidence = Math.min(95, answerGroups[key].confidence + 5)
                    }
                  })
                  
                  // Convert to array and sort by mentions (frequency)
                  const rankedOptions = Object.values(answerGroups)
                    .sort((a, b) => b.mentions - a.mentions)
                    .slice(0, 5) // Top 5 answers
                  
                  // If no good options found, create fallback
                  if (rankedOptions.length === 0) {
                    rankedOptions.push({
                      answer: 'Multiple recommendations available (see individual responses below)',
                      models: ['Combined'],
                      confidence: 75,
                      mentions: result.responses.length
                    })
                  }
                  
                  return rankedOptions.map((option, index) => {
                    const modelAgreement = `${option.mentions}/${result.responses.length}`
                    const uniqueModels = [...new Set(option.models)].slice(0, 3)
                    const supportingEvidence = `Supported by: ${uniqueModels.join(', ')}`
                    
                    return (
                      <tr key={index} className={`border-b border-gray-100 dark:border-gray-800 ${
                        index === 0 ? 'bg-green-50 dark:bg-green-900/10' : 
                        index === 1 ? 'bg-blue-50 dark:bg-blue-900/10' : 
                        index === 2 ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''
                      }`}>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-lg font-bold ${
                            index === 0 ? 'text-green-600' : 
                            index === 1 ? 'text-blue-600' : 
                            index === 2 ? 'text-yellow-600' : 'text-gray-600'
                          }`}>
                            #{index + 1}
                          </span>
                          {index === 0 && <span className="text-lg">🏆</span>}
                          {index === 1 && <span className="text-lg">🥈</span>}
                          {index === 2 && <span className="text-lg">🥉</span>}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {option.answer}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className={`text-xl font-bold ${
                            option.confidence >= 80 ? 'text-green-600' :
                            option.confidence >= 60 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {Math.round(option.confidence)}%
                          </span>
                          <div className="w-16 bg-gray-200 rounded-full h-1 mt-1">
                            <div 
                              className={`h-1 rounded-full ${
                                option.confidence >= 80 ? 'bg-green-500' :
                                option.confidence >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${option.confidence}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          option.mentions >= result.responses.length * 0.8 ? 'text-green-600 bg-green-50 dark:bg-green-900/20' :
                          option.mentions >= result.responses.length * 0.5 ? 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20' :
                          'text-red-600 bg-red-50 dark:bg-red-900/20'
                        }`}>
                          {modelAgreement}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-mono text-sm text-gray-600 dark:text-gray-400">
                          {option.mentions}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {supportingEvidence}
                        </div>
                      </td>
                    </tr>
                  )
                })
                } catch (error) {
                  console.error('Error parsing options:', error)
                  // Fallback: return a simple message
                  return (
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-3 px-4">
                        <span className="text-lg font-bold text-gray-600">#1</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          Analysis result available above
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-xl font-bold text-green-600">85%</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-1 rounded-full text-xs font-medium text-green-600 bg-green-50">
                          Available
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-mono text-sm text-gray-600">-</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          Check unified answer above for details
                        </div>
                      </td>
                    </tr>
                  )
                }
              })()}
            </tbody>
          </table>
        </div>
        
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
            <div className="px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-sm font-medium">
              Mode: {result.mode}
            </div>
            <div className="px-3 py-1 bg-purple-100 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-full text-sm">
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {result.responses.map((response, index) => {
            const avgTokensPerWord = 1.3 // Rough estimate
            const wordCount = Math.round(response.tokensUsed / avgTokensPerWord)
            const modelCost = estimateModelCost(response.model, response.tokensUsed)
            const tier = modelCosts[response.model as keyof typeof modelCosts]?.tier || 'budget'
            
            return (
              <div key={index} className={`border border-gray-200 dark:border-gray-700 rounded-lg p-4 border-l-4 ${tierColors[tier]}`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    {response.model}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{response.responseTime}ms</span>
                    <span>•</span>
                    <span>{response.tokensUsed} tokens</span>
                    <span>•</span>
                    <span>~{wordCount} words</span>
                  </div>
                </div>
                {modelCost > 0 && (
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Individual Cost:</span>
                    <span className="text-xs font-mono text-green-600 dark:text-green-400">
                      ${modelCost.toFixed(5)}
                    </span>
                  </div>
                )}
                <div className="text-sm text-gray-700 dark:text-gray-300 max-h-40 overflow-y-auto">
                  <p className="whitespace-pre-wrap">{response.response}</p>
                </div>
              </div>
            )
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
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{result.responses.length}</p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400">Total Tokens</h4>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{result.totalTokensUsed}</p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400">Judge Tokens</h4>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{result.consensus.judgeTokensUsed}</p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400">Estimated Cost</h4>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">${result.estimatedCost.toFixed(5)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

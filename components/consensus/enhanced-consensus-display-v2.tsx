'use client'

import { EnhancedConsensusResponse } from '@/types/consensus'
import { Clock, DollarSign, Brain, CheckCircle, XCircle, BarChart3 } from 'lucide-react'

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
            <h4 className="font-medium mb-2">Unified Answer</h4>
            <div className="text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg max-h-96 overflow-y-auto">
              <p className="whitespace-pre-wrap leading-relaxed">
                {result.consensus.unifiedAnswer}
              </p>
            </div>
          </div>
          
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
          
          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
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
      </div>

      {/* Decision Analysis Summary Table */}
      <div className="model-card">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          Decision Analysis Summary
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Metric</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Score/Value</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Assessment</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Details</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-3 px-4 font-medium">Consensus Confidence</td>
                <td className="py-3 px-4 text-center">
                  <span className={`text-2xl font-bold ${confidenceColor}`}>
                    {result.consensus.confidence}%
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    result.consensus.confidence >= 80 ? 'text-green-600 bg-green-50 dark:bg-green-900/20' :
                    result.consensus.confidence >= 60 ? 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20' :
                    'text-red-600 bg-red-50 dark:bg-red-900/20'
                  }`}>
                    {result.consensus.confidence >= 80 ? 'HIGH CONFIDENCE' :
                     result.consensus.confidence >= 60 ? 'MEDIUM CONFIDENCE' : 'LOW CONFIDENCE'}
                  </span>
                </td>
                <td className="py-3 px-4 text-xs text-gray-600 dark:text-gray-400">
                  Models show {result.consensus.confidence >= 80 ? 'strong agreement' : 
                               result.consensus.confidence >= 60 ? 'moderate agreement' : 'significant disagreement'}
                </td>
              </tr>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-3 px-4 font-medium">Total Cost</td>
                <td className="py-3 px-4 text-center">
                  <span className="text-xl font-bold text-orange-600 dark:text-orange-400">
                    ${result.estimatedCost.toFixed(5)}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    result.estimatedCost < 0.01 ? 'text-green-600 bg-green-50 dark:bg-green-900/20' :
                    result.estimatedCost < 0.05 ? 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20' :
                    'text-red-600 bg-red-50 dark:bg-red-900/20'
                  }`}>
                    {result.estimatedCost < 0.01 ? 'LOW COST' :
                     result.estimatedCost < 0.05 ? 'MEDIUM COST' : 'HIGH COST'}
                  </span>
                </td>
                <td className="py-3 px-4 text-xs text-gray-600 dark:text-gray-400">
                  Across {result.responses.length} models + judge analysis
                </td>
              </tr>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-3 px-4 font-medium">Avg Response Time</td>
                <td className="py-3 px-4 text-center">
                  <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    {Math.round(result.responses.reduce((sum, r) => sum + r.responseTime, 0) / result.responses.length)}ms
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    Math.round(result.responses.reduce((sum, r) => sum + r.responseTime, 0) / result.responses.length) < 3000 ? 
                    'text-green-600 bg-green-50 dark:bg-green-900/20' :
                    Math.round(result.responses.reduce((sum, r) => sum + r.responseTime, 0) / result.responses.length) < 7000 ?
                    'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20' :
                    'text-red-600 bg-red-50 dark:bg-red-900/20'
                  }`}>
                    {Math.round(result.responses.reduce((sum, r) => sum + r.responseTime, 0) / result.responses.length) < 3000 ? 'FAST' :
                     Math.round(result.responses.reduce((sum, r) => sum + r.responseTime, 0) / result.responses.length) < 7000 ? 'MODERATE' : 'SLOW'}
                  </span>
                </td>
                <td className="py-3 px-4 text-xs text-gray-600 dark:text-gray-400">
                  Average across all model responses
                </td>
              </tr>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-3 px-4 font-medium">Key Agreements</td>
                <td className="py-3 px-4 text-center">
                  <span className="text-xl font-bold text-green-600 dark:text-green-400">
                    {result.consensus.agreements.length}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    result.consensus.agreements.length >= 3 ? 'text-green-600 bg-green-50 dark:bg-green-900/20' :
                    result.consensus.agreements.length >= 1 ? 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20' :
                    'text-red-600 bg-red-50 dark:bg-red-900/20'
                  }`}>
                    {result.consensus.agreements.length >= 3 ? 'STRONG CONSENSUS' :
                     result.consensus.agreements.length >= 1 ? 'SOME CONSENSUS' : 'WEAK CONSENSUS'}
                  </span>
                </td>
                <td className="py-3 px-4 text-xs text-gray-600 dark:text-gray-400">
                  Points where models strongly agree
                </td>
              </tr>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-3 px-4 font-medium">Key Disagreements</td>
                <td className="py-3 px-4 text-center">
                  <span className="text-xl font-bold text-red-600 dark:text-red-400">
                    {result.consensus.disagreements.length}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    result.consensus.disagreements.length === 0 ? 'text-green-600 bg-green-50 dark:bg-green-900/20' :
                    result.consensus.disagreements.length <= 2 ? 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20' :
                    'text-red-600 bg-red-50 dark:bg-red-900/20'
                  }`}>
                    {result.consensus.disagreements.length === 0 ? 'NO CONFLICTS' :
                     result.consensus.disagreements.length <= 2 ? 'MINOR CONFLICTS' : 'MAJOR CONFLICTS'}
                  </span>
                </td>
                <td className="py-3 px-4 text-xs text-gray-600 dark:text-gray-400">
                  Areas where models significantly differ
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium">Judge Analysis</td>
                <td className="py-3 px-4 text-center">
                  <span className="text-xl font-bold text-purple-600 dark:text-purple-400">
                    {result.consensus.judgeTokensUsed > 0 ? 'AI' : 'Heuristic'}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    result.consensus.judgeTokensUsed > 0 ? 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' :
                    'text-gray-600 bg-gray-50 dark:bg-gray-900/20'
                  }`}>
                    {result.consensus.judgeTokensUsed > 0 ? 'AI POWERED' : 'RULE BASED'}
                  </span>
                </td>
                <td className="py-3 px-4 text-xs text-gray-600 dark:text-gray-400">
                  {result.consensus.judgeTokensUsed > 0 ? 
                    `Advanced AI analysis (${result.consensus.judgeTokensUsed} tokens)` :
                    'Basic heuristic analysis'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Model Response Comparison Table */}
      <div className="model-card">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Model Response Comparison
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Model</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Tier</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Response Time</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Tokens Used</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Cost</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Word Count</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Cost/Word</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Response Preview</th>
              </tr>
            </thead>
            <tbody>
              {result.responses.map((response, index) => {
                const avgTokensPerWord = 1.3
                const wordCount = Math.round(response.tokensUsed / avgTokensPerWord)
                const modelCost = estimateModelCost(response.model, response.tokensUsed)
                const costPerWord = wordCount > 0 ? modelCost / wordCount : 0
                const tier = modelCosts[response.model as keyof typeof modelCosts]?.tier || 'budget'
                const tierColor = tier === 'flagship' ? 'text-red-600 bg-red-50 dark:bg-red-900/20' : 
                                tier === 'premium' ? 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' : 
                                tier === 'balanced' ? 'text-orange-600 bg-orange-50 dark:bg-orange-900/20' : 
                                tier === 'budget' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 
                                'text-green-600 bg-green-50 dark:bg-green-900/20'
                
                // Performance rating based on multiple factors
                const speedScore = response.responseTime < 2000 ? 3 : response.responseTime < 5000 ? 2 : 1
                const costScore = modelCost < 0.001 ? 3 : modelCost < 0.01 ? 2 : 1
                const lengthScore = wordCount > 50 ? 3 : wordCount > 20 ? 2 : 1
                const overallScore = Math.round((speedScore + costScore + lengthScore) / 3)
                
                const getPerformanceEmoji = (score: number) => {
                  return score === 3 ? '🏆' : score === 2 ? '⭐' : '📝'
                }
                
                return (
                  <tr key={index} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-blue-600 dark:text-blue-400">
                          {response.model}
                        </span>
                        <span className="text-lg" title={`Performance: ${overallScore}/3`}>
                          {getPerformanceEmoji(overallScore)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${tierColor}`}>
                        {tier.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`font-mono ${response.responseTime < 2000 ? 'text-green-600' : response.responseTime < 5000 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {response.responseTime}ms
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      {response.tokensUsed}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`font-mono ${modelCost === 0 ? 'text-green-600 font-bold' : 'text-gray-700 dark:text-gray-300'}`}>
                        {modelCost === 0 ? 'FREE' : `$${modelCost.toFixed(5)}`}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      {wordCount}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`font-mono text-xs ${costPerWord < 0.0001 ? 'text-green-600' : costPerWord < 0.001 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {costPerWord === 0 ? 'FREE' : `$${costPerWord.toFixed(6)}`}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <div className="text-xs text-gray-600 dark:text-gray-400 truncate" title={response.response}>
                        {response.response.substring(0, 100)}...
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        
        {/* Table Legend */}
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="text-sm font-medium mb-2">Table Legend</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
            <div>
              <strong>Performance Icons:</strong> 🏆 Excellent • ⭐ Good • 📝 Basic
            </div>
            <div>
              <strong>Response Time:</strong> <span className="text-green-600">Green &lt;2s</span> • <span className="text-yellow-600">Yellow &lt;5s</span> • <span className="text-red-600">Red &gt;5s</span>
            </div>
            <div>
              <strong>Tiers:</strong> <span className="text-green-600">FREE</span> • <span className="text-blue-600">BUDGET</span> • <span className="text-orange-600">BALANCED</span> • <span className="text-purple-600">PREMIUM</span> • <span className="text-red-600">FLAGSHIP</span>
            </div>
            <div>
              <strong>Cost/Word:</strong> Lower is better for cost efficiency
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-xs text-gray-600 dark:text-gray-400">
            💡 Hover over table rows for better readability • Click model names to see full responses below
          </div>
          <button 
            onClick={() => {
              const csvData = [
                ['Model', 'Tier', 'Response Time (ms)', 'Tokens', 'Cost ($)', 'Words', 'Cost per Word ($)', 'Performance Score'],
                ...result.responses.map(r => {
                  const wordCount = Math.round(r.tokensUsed / 1.3)
                  const modelCost = estimateModelCost(r.model, r.tokensUsed)
                  const costPerWord = wordCount > 0 ? modelCost / wordCount : 0
                  const tier = modelCosts[r.model as keyof typeof modelCosts]?.tier || 'budget'
                  const speedScore = r.responseTime < 2000 ? 3 : r.responseTime < 5000 ? 2 : 1
                  const costScore = modelCost < 0.001 ? 3 : modelCost < 0.01 ? 2 : 1
                  const lengthScore = wordCount > 50 ? 3 : wordCount > 20 ? 2 : 1
                  const overallScore = Math.round((speedScore + costScore + lengthScore) / 3)
                  
                  return [
                    r.model,
                    tier.toUpperCase(),
                    r.responseTime.toString(),
                    r.tokensUsed.toString(),
                    modelCost.toFixed(5),
                    wordCount.toString(),
                    costPerWord.toFixed(6),
                    `${overallScore}/3`
                  ]
                })
              ]
              
              const csvContent = csvData.map(row => row.join(',')).join('\n')
              const blob = new Blob([csvContent], { type: 'text/csv' })
              const url = window.URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `consensus-analysis-${new Date().toISOString().split('T')[0]}.csv`
              document.body.appendChild(a)
              a.click()
              document.body.removeChild(a)
              window.URL.revokeObjectURL(url)
            }}
            className="px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md transition-colors"
          >
            📊 Export CSV
          </button>
        </div>

        {/* Quick Recommendations */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {(() => {
            // Calculate best model for different criteria
            const bestCost = result.responses.reduce((best, current) => {
              const bestCostVal = estimateModelCost(best.model, best.tokensUsed)
              const currentCostVal = estimateModelCost(current.model, current.tokensUsed)
              return currentCostVal < bestCostVal || bestCostVal === 0 ? current : best
            })
            
            const fastestModel = result.responses.reduce((fastest, current) => 
              current.responseTime < fastest.responseTime ? current : fastest
            )
            
            const mostTokens = result.responses.reduce((most, current) => 
              current.tokensUsed > most.tokensUsed ? current : most
            )
            
            return [
              {
                title: "Most Cost Efficient",
                model: bestCost,
                metric: estimateModelCost(bestCost.model, bestCost.tokensUsed) === 0 ? 'FREE' : `$${estimateModelCost(bestCost.model, bestCost.tokensUsed).toFixed(5)}`,
                icon: "💰",
                color: "green"
              },
              {
                title: "Fastest Response",
                model: fastestModel,
                metric: `${fastestModel.responseTime}ms`,
                icon: "⚡",
                color: "blue"
              },
              {
                title: "Most Detailed",
                model: mostTokens,
                metric: `${mostTokens.tokensUsed} tokens`,
                icon: "📝",
                color: "purple"
              }
            ]
          })().map((rec, index) => (
            <div key={index} className={`p-4 rounded-lg border-2 ${
              rec.color === 'green' ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/10' :
              rec.color === 'blue' ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/10' :
              'border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-900/10'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{rec.icon}</span>
                <h4 className="font-medium text-sm">{rec.title}</h4>
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                {rec.model.model}
              </div>
              <div className={`font-bold ${
                rec.color === 'green' ? 'text-green-600' :
                rec.color === 'blue' ? 'text-blue-600' :
                'text-purple-600'
              }`}>
                {rec.metric}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Model Responses */}
      <div className="model-card">
        <h2 className="text-lg font-semibold mb-4">Model Responses</h2>
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
        
        {/* Cost Breakdown */}
        <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/10 dark:to-blue-900/10 rounded-lg">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Cost Breakdown by Model
          </h4>
          <div className="grid gap-2 text-sm">
            {result.responses.map((response, index) => {
              const modelCost = estimateModelCost(response.model, response.tokensUsed)
              const tier = modelCosts[response.model as keyof typeof modelCosts]?.tier || 'budget'
              const tierColor = tier === 'flagship' ? 'text-red-600' : 
                              tier === 'premium' ? 'text-purple-600' : 
                              tier === 'balanced' ? 'text-orange-600' : 
                              tier === 'budget' ? 'text-blue-600' : 'text-green-600'
              
              return (
                <div key={index} className="flex items-center justify-between py-1 px-3 bg-white/50 dark:bg-black/20 rounded">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs">{response.model}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${tierColor} bg-current/10`}>
                      {tier.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono">${modelCost.toFixed(5)}</span>
                    <span className="text-xs text-gray-500 ml-2">({response.tokensUsed} tokens)</span>
                  </div>
                </div>
              )
            })}
            {result.consensus.judgeTokensUsed > 0 && (
              <div className="flex items-center justify-between py-1 px-3 bg-purple-50/50 dark:bg-purple-900/20 rounded border-t border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs">Judge Analysis</span>
                  <span className="text-xs px-1.5 py-0.5 rounded text-purple-600 bg-purple-100 dark:bg-purple-900/50">
                    AI JUDGE
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-mono">${(result.estimatedCost - result.responses.reduce((sum, r) => sum + estimateModelCost(r.model, r.tokensUsed), 0)).toFixed(5)}</span>
                  <span className="text-xs text-gray-500 ml-2">({result.consensus.judgeTokensUsed} tokens)</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Model Comparison Table */}
      <div className="model-card">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Model Response Comparison
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Model</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Tier</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Response Time</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Tokens Used</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Cost</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Word Count</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Cost/Word</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Response Preview</th>
              </tr>
            </thead>
            <tbody>
              {result.responses.map((response, index) => {
                const avgTokensPerWord = 1.3
                const wordCount = Math.round(response.tokensUsed / avgTokensPerWord)
                const modelCost = estimateModelCost(response.model, response.tokensUsed)
                const costPerWord = wordCount > 0 ? modelCost / wordCount : 0
                const tier = modelCosts[response.model as keyof typeof modelCosts]?.tier || 'budget'
                const tierColor = tier === 'flagship' ? 'text-red-600 bg-red-50 dark:bg-red-900/20' : 
                                tier === 'premium' ? 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' : 
                                tier === 'balanced' ? 'text-orange-600 bg-orange-50 dark:bg-orange-900/20' : 
                                tier === 'budget' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 
                                'text-green-600 bg-green-50 dark:bg-green-900/20'
                
                // Performance rating based on multiple factors
                const speedScore = response.responseTime < 2000 ? 3 : response.responseTime < 5000 ? 2 : 1
                const costScore = modelCost < 0.001 ? 3 : modelCost < 0.01 ? 2 : 1
                const lengthScore = wordCount > 50 ? 3 : wordCount > 20 ? 2 : 1
                const overallScore = Math.round((speedScore + costScore + lengthScore) / 3)
                
                const getPerformanceEmoji = (score: number) => {
                  return score === 3 ? '🏆' : score === 2 ? '⭐' : '📝'
                }
                
                return (
                  <tr key={index} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-blue-600 dark:text-blue-400">
                          {response.model}
                        </span>
                        <span className="text-lg" title={`Performance: ${overallScore}/3`}>
                          {getPerformanceEmoji(overallScore)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${tierColor}`}>
                        {tier.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`font-mono ${response.responseTime < 2000 ? 'text-green-600' : response.responseTime < 5000 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {response.responseTime}ms
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      {response.tokensUsed}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`font-mono ${modelCost === 0 ? 'text-green-600 font-bold' : 'text-gray-700 dark:text-gray-300'}`}>
                        {modelCost === 0 ? 'FREE' : `$${modelCost.toFixed(5)}`}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      {wordCount}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`font-mono text-xs ${costPerWord < 0.0001 ? 'text-green-600' : costPerWord < 0.001 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {costPerWord === 0 ? 'FREE' : `$${costPerWord.toFixed(6)}`}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <div className="text-xs text-gray-600 dark:text-gray-400 truncate" title={response.response}>
                        {response.response.substring(0, 100)}...
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        
        {/* Table Legend */}
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="text-sm font-medium mb-2">Table Legend</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
            <div>
              <strong>Performance Icons:</strong> 🏆 Excellent • ⭐ Good • 📝 Basic
            </div>
            <div>
              <strong>Response Time:</strong> <span className="text-green-600">Green &lt;2s</span> • <span className="text-yellow-600">Yellow &lt;5s</span> • <span className="text-red-600">Red &gt;5s</span>
            </div>
            <div>
              <strong>Tiers:</strong> <span className="text-green-600">FREE</span> • <span className="text-blue-600">BUDGET</span> • <span className="text-orange-600">BALANCED</span> • <span className="text-purple-600">PREMIUM</span> • <span className="text-red-600">FLAGSHIP</span>
            </div>
            <div>
              <strong>Cost/Word:</strong> Lower is better for cost efficiency
            </div>
          </div>
        </div>
      </div>

      {/* Decision Summary Table */}
      <div className="model-card">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          Decision Analysis Summary
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Metric</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Score/Value</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Assessment</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Details</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-3 px-4 font-medium">Consensus Confidence</td>
                <td className="py-3 px-4 text-center">
                  <span className={`text-2xl font-bold ${confidenceColor}`}>
                    {result.consensus.confidence}%
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    result.consensus.confidence >= 80 ? 'text-green-600 bg-green-50 dark:bg-green-900/20' :
                    result.consensus.confidence >= 60 ? 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20' :
                    'text-red-600 bg-red-50 dark:bg-red-900/20'
                  }`}>
                    {result.consensus.confidence >= 80 ? 'HIGH CONFIDENCE' :
                     result.consensus.confidence >= 60 ? 'MEDIUM CONFIDENCE' : 'LOW CONFIDENCE'}
                  </span>
                </td>
                <td className="py-3 px-4 text-xs text-gray-600 dark:text-gray-400">
                  Models show {result.consensus.confidence >= 80 ? 'strong agreement' : 
                               result.consensus.confidence >= 60 ? 'moderate agreement' : 'significant disagreement'}
                </td>
              </tr>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-3 px-4 font-medium">Total Cost</td>
                <td className="py-3 px-4 text-center">
                  <span className="text-xl font-bold text-orange-600 dark:text-orange-400">
                    ${result.estimatedCost.toFixed(5)}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    result.estimatedCost < 0.01 ? 'text-green-600 bg-green-50 dark:bg-green-900/20' :
                    result.estimatedCost < 0.05 ? 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20' :
                    'text-red-600 bg-red-50 dark:bg-red-900/20'
                  }`}>
                    {result.estimatedCost < 0.01 ? 'LOW COST' :
                     result.estimatedCost < 0.05 ? 'MEDIUM COST' : 'HIGH COST'}
                  </span>
                </td>
                <td className="py-3 px-4 text-xs text-gray-600 dark:text-gray-400">
                  Across {result.responses.length} models + judge analysis
                </td>
              </tr>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-3 px-4 font-medium">Avg Response Time</td>
                <td className="py-3 px-4 text-center">
                  <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    {Math.round(result.responses.reduce((sum, r) => sum + r.responseTime, 0) / result.responses.length)}ms
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    Math.round(result.responses.reduce((sum, r) => sum + r.responseTime, 0) / result.responses.length) < 3000 ? 
                    'text-green-600 bg-green-50 dark:bg-green-900/20' :
                    Math.round(result.responses.reduce((sum, r) => sum + r.responseTime, 0) / result.responses.length) < 7000 ?
                    'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20' :
                    'text-red-600 bg-red-50 dark:bg-red-900/20'
                  }`}>
                    {Math.round(result.responses.reduce((sum, r) => sum + r.responseTime, 0) / result.responses.length) < 3000 ? 'FAST' :
                     Math.round(result.responses.reduce((sum, r) => sum + r.responseTime, 0) / result.responses.length) < 7000 ? 'MODERATE' : 'SLOW'}
                  </span>
                </td>
                <td className="py-3 px-4 text-xs text-gray-600 dark:text-gray-400">
                  Average across all model responses
                </td>
              </tr>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-3 px-4 font-medium">Key Agreements</td>
                <td className="py-3 px-4 text-center">
                  <span className="text-xl font-bold text-green-600 dark:text-green-400">
                    {result.consensus.agreements.length}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    result.consensus.agreements.length >= 3 ? 'text-green-600 bg-green-50 dark:bg-green-900/20' :
                    result.consensus.agreements.length >= 1 ? 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20' :
                    'text-red-600 bg-red-50 dark:bg-red-900/20'
                  }`}>
                    {result.consensus.agreements.length >= 3 ? 'STRONG CONSENSUS' :
                     result.consensus.agreements.length >= 1 ? 'SOME CONSENSUS' : 'WEAK CONSENSUS'}
                  </span>
                </td>
                <td className="py-3 px-4 text-xs text-gray-600 dark:text-gray-400">
                  Points where models strongly agree
                </td>
              </tr>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-3 px-4 font-medium">Key Disagreements</td>
                <td className="py-3 px-4 text-center">
                  <span className="text-xl font-bold text-red-600 dark:text-red-400">
                    {result.consensus.disagreements.length}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    result.consensus.disagreements.length === 0 ? 'text-green-600 bg-green-50 dark:bg-green-900/20' :
                    result.consensus.disagreements.length <= 2 ? 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20' :
                    'text-red-600 bg-red-50 dark:bg-red-900/20'
                  }`}>
                    {result.consensus.disagreements.length === 0 ? 'NO CONFLICTS' :
                     result.consensus.disagreements.length <= 2 ? 'MINOR CONFLICTS' : 'MAJOR CONFLICTS'}
                  </span>
                </td>
                <td className="py-3 px-4 text-xs text-gray-600 dark:text-gray-400">
                  Areas where models significantly differ
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium">Judge Analysis</td>
                <td className="py-3 px-4 text-center">
                  <span className="text-xl font-bold text-purple-600 dark:text-purple-400">
                    {result.consensus.judgeTokensUsed > 0 ? 'AI' : 'Heuristic'}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    result.consensus.judgeTokensUsed > 0 ? 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' :
                    'text-gray-600 bg-gray-50 dark:bg-gray-900/20'
                  }`}>
                    {result.consensus.judgeTokensUsed > 0 ? 'AI POWERED' : 'RULE BASED'}
                  </span>
                </td>
                <td className="py-3 px-4 text-xs text-gray-600 dark:text-gray-400">
                  {result.consensus.judgeTokensUsed > 0 ? 
                    `Advanced AI analysis (${result.consensus.judgeTokensUsed} tokens)` :
                    'Basic heuristic analysis'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Recommendations */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {(() => {
          // Calculate best model for different criteria
          const bestCost = result.responses.reduce((best, current) => {
            const bestCostVal = estimateModelCost(best.model, best.tokensUsed)
            const currentCostVal = estimateModelCost(current.model, current.tokensUsed)
            return currentCostVal < bestCostVal || bestCostVal === 0 ? current : best
          })
          
          const fastestModel = result.responses.reduce((fastest, current) => 
            current.responseTime < fastest.responseTime ? current : fastest
          )
          
          const mostTokens = result.responses.reduce((most, current) => 
            current.tokensUsed > most.tokensUsed ? current : most
          )
          
          return [
            {
              title: "Most Cost Efficient",
              model: bestCost,
              metric: estimateModelCost(bestCost.model, bestCost.tokensUsed) === 0 ? 'FREE' : `$${estimateModelCost(bestCost.model, bestCost.tokensUsed).toFixed(5)}`,
              icon: "💰",
              color: "green"
            },
            {
              title: "Fastest Response",
              model: fastestModel,
              metric: `${fastestModel.responseTime}ms`,
              icon: "⚡",
              color: "blue"
            },
            {
              title: "Most Detailed",
              model: mostTokens,
              metric: `${mostTokens.tokensUsed} tokens`,
              icon: "📝",
              color: "purple"
            }
          ]
        })().map((rec, index) => (
          <div key={index} className={`p-4 rounded-lg border-2 ${
            rec.color === 'green' ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/10' :
            rec.color === 'blue' ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/10' :
            'border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-900/10'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{rec.icon}</span>
              <h4 className="font-medium text-sm">{rec.title}</h4>
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
              {rec.model.model}
            </div>
            <div className={`font-bold ${
              rec.color === 'green' ? 'text-green-600' :
              rec.color === 'blue' ? 'text-blue-600' :
              'text-purple-600'
            }`}>
              {rec.metric}
            </div>
          </div>
        ))}
      </div>

      {/* Export and Tips */}
      <div className="mt-4 flex items-center justify-between">
          <div className="text-xs text-gray-600 dark:text-gray-400">
            💡 Hover over table rows for better readability • Click model names to see full responses above
          </div>
          <button 
            onClick={() => {
              const csvData = [
                ['Model', 'Tier', 'Response Time (ms)', 'Tokens', 'Cost ($)', 'Words', 'Cost per Word ($)', 'Performance Score'],
                ...result.responses.map(r => {
                  const wordCount = Math.round(r.tokensUsed / 1.3)
                  const modelCost = estimateModelCost(r.model, r.tokensUsed)
                  const costPerWord = wordCount > 0 ? modelCost / wordCount : 0
                  const tier = modelCosts[r.model as keyof typeof modelCosts]?.tier || 'budget'
                  const speedScore = r.responseTime < 2000 ? 3 : r.responseTime < 5000 ? 2 : 1
                  const costScore = modelCost < 0.001 ? 3 : modelCost < 0.01 ? 2 : 1
                  const lengthScore = wordCount > 50 ? 3 : wordCount > 20 ? 2 : 1
                  const overallScore = Math.round((speedScore + costScore + lengthScore) / 3)
                  
                  return [
                    r.model,
                    tier.toUpperCase(),
                    r.responseTime.toString(),
                    r.tokensUsed.toString(),
                    modelCost.toFixed(5),
                    wordCount.toString(),
                    costPerWord.toFixed(6),
                    `${overallScore}/3`
                  ]
                })
              ]
              
              const csvContent = csvData.map(row => row.join(',')).join('\n')
              const blob = new Blob([csvContent], { type: 'text/csv' })
              const url = window.URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `consensus-analysis-${new Date().toISOString().split('T')[0]}.csv`
              document.body.appendChild(a)
              a.click()
              document.body.removeChild(a)
              window.URL.revokeObjectURL(url)
            }}
            className="px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md transition-colors"
          >
            📊 Export CSV
          </button>
        </div>
    </div>
  )
}

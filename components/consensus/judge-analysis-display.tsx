'use client'

import { useState } from 'react'
import { JudgeAnalysis, ConciseJudgeResult } from '@/lib/judge-system'
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Brain, 
  Target, 
  TrendingUp, 
  Eye, 
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react'

interface JudgeAnalysisDisplayProps {
  analysis: JudgeAnalysis | ConciseJudgeResult | undefined
  mode: 'concise' | 'normal' | 'detailed'
}

export function JudgeAnalysisDisplay({ analysis, mode }: JudgeAnalysisDisplayProps) {
  const [showDetailed, setShowDetailed] = useState(false)

  if (!analysis) return null

  const isConcise = 'actionable' in analysis
  const conciseAnalysis = analysis as ConciseJudgeResult
  const detailedAnalysis = analysis as JudgeAnalysis

  // Risk level color mapping
  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'None': return 'text-green-600 bg-green-50 border-green-200'
      case 'Low': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'Medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'High': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'Critical': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getActionableColor = (actionable: string) => {
    switch (actionable) {
      case 'Yes': return 'text-green-600 bg-green-50'
      case 'Caution': case 'Yes with caution': return 'text-yellow-600 bg-yellow-50'
      case 'No': case 'No - needs human review': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  if (isConcise) {
    return (
      <div className="mt-4 p-4 bg-slate-50 rounded-lg border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-600" />
            AI Judge Analysis
          </h3>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Target className="w-4 h-4" />
            {conciseAnalysis.consensusScore}% consensus
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Consensus Score */}
          <div className="flex items-center gap-3 p-3 bg-white rounded border">
            <div className="w-2 h-8 bg-blue-500 rounded"></div>
            <div>
              <div className="text-sm text-gray-600">Consensus</div>
              <div className="text-lg font-semibold text-blue-600">
                {conciseAnalysis.consensusScore}%
              </div>
            </div>
          </div>

          {/* Risk Level */}
          <div className={`flex items-center gap-3 p-3 rounded border ${getRiskColor(conciseAnalysis.riskLevel)}`}>
            <Shield className="w-5 h-5" />
            <div>
              <div className="text-sm opacity-75">Risk Level</div>
              <div className="text-lg font-semibold">
                {conciseAnalysis.riskLevel}
              </div>
            </div>
          </div>

          {/* Actionable */}
          <div className={`flex items-center gap-3 p-3 rounded border ${getActionableColor(conciseAnalysis.actionable)}`}>
            <CheckCircle className="w-5 h-5" />
            <div>
              <div className="text-sm opacity-75">Decision</div>
              <div className="text-lg font-semibold">
                {conciseAnalysis.actionable}
              </div>
            </div>
          </div>
        </div>

        <div className="p-3 bg-white rounded border">
          <div className="text-sm text-gray-600 mb-1">Judge Synthesis</div>
          <div className="text-gray-800">
            {conciseAnalysis.bestAnswer}
          </div>
          <div className="mt-2 text-sm text-gray-500">
            Confidence: {conciseAnalysis.confidence}%
          </div>
        </div>
      </div>
    )
  }

  // Detailed analysis display
  return (
    <div className="mt-4 p-4 bg-slate-50 rounded-lg border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Brain className="w-5 h-5 text-blue-600" />
          Enterprise AI Judge Analysis
        </h3>
        <button
          onClick={() => setShowDetailed(!showDetailed)}
          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
        >
          {showDetailed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {showDetailed ? 'Show Less' : 'Show Detailed Analysis'}
        </button>
      </div>

      {/* Consensus Score */}
      <div className="mb-4 p-3 bg-white rounded border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            <span className="font-medium">Consensus Score</span>
          </div>
          <div className="text-2xl font-bold text-blue-600">
            {detailedAnalysis.consensusScore}%
          </div>
        </div>
        <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${detailedAnalysis.consensusScore}%` }}
          ></div>
        </div>
      </div>

      {/* Hallucination Detection */}
      <div className="mb-4 p-3 bg-white rounded border">
        <div className="flex items-center gap-2 mb-2">
          <Eye className="w-5 h-5 text-orange-600" />
          <span className="font-medium">Hallucination Detection</span>
        </div>
        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm ${getRiskColor(detailedAnalysis.hallucination?.riskLevel || 'Medium')}`}>
          <AlertTriangle className="w-4 h-4" />
          {detailedAnalysis.hallucination?.riskLevel || 'Medium'} Risk
        </div>
        {detailedAnalysis.hallucination?.detectedIssues?.length > 0 && (
          <div className="mt-2">
            <div className="text-sm text-gray-600 mb-1">Detected Issues:</div>
            <ul className="text-sm space-y-1">
              {detailedAnalysis.hallucination.detectedIssues.map((issue, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <XCircle className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />
                  {issue}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Best Answer Synthesis */}
      <div className="mb-4 p-3 bg-white rounded border">
        <div className="flex items-center gap-2 mb-2">
          <Brain className="w-5 h-5 text-green-600" />
          <span className="font-medium">Best Answer Synthesis</span>
        </div>
        <div className="text-gray-800 mb-2">
          {detailedAnalysis.synthesis?.bestAnswer}
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>Confidence: {detailedAnalysis.synthesis?.confidence}%</span>
          {detailedAnalysis.synthesis?.rationale && (
            <span className="text-xs">• {detailedAnalysis.synthesis.rationale}</span>
          )}
        </div>
      </div>

      {/* Decision Guidance */}
      <div className="mb-4 p-3 bg-white rounded border">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle className="w-5 h-5 text-blue-600" />
          <span className="font-medium">Decision Guidance</span>
        </div>
        <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getActionableColor(detailedAnalysis.decisionGuidance?.actionable || 'Caution')}`}>
          {detailedAnalysis.decisionGuidance?.actionable || 'Yes with caution'}
        </div>
        
        {detailedAnalysis.decisionGuidance?.keyRisks?.length > 0 && (
          <div className="mt-3">
            <div className="text-sm font-medium text-gray-700 mb-1">Key Risks:</div>
            <ul className="text-sm space-y-1">
              {detailedAnalysis.decisionGuidance.keyRisks.map((risk, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <AlertCircle className="w-3 h-3 text-orange-500 mt-0.5 flex-shrink-0" />
                  {risk}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {showDetailed && (
        <>
          {/* Answer Distribution */}
          {detailedAnalysis.answerDistribution && (
            <div className="mb-4 p-3 bg-white rounded border">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                <span className="font-medium">Answer Distribution</span>
              </div>
              
              {detailedAnalysis.answerDistribution.majorityPosition && (
                <div className="mb-2">
                  <div className="text-sm text-gray-600">Majority Position:</div>
                  <div className="text-sm">{detailedAnalysis.answerDistribution.majorityPosition}</div>
                </div>
              )}

              {detailedAnalysis.answerDistribution.outlierPositions?.length > 0 && (
                <div className="mb-2">
                  <div className="text-sm text-gray-600">Outlier Positions:</div>
                  <ul className="text-sm space-y-1">
                    {detailedAnalysis.answerDistribution.outlierPositions.map((outlier, idx) => (
                      <li key={idx}>• {outlier}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Unique Insights */}
          {detailedAnalysis.uniqueInsights?.length > 0 && (
            <div className="mb-4 p-3 bg-white rounded border">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-5 h-5 text-indigo-600" />
                <span className="font-medium">Unique Insights</span>
              </div>
              <ul className="text-sm space-y-1">
                {detailedAnalysis.uniqueInsights.map((insight, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></span>
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Red Flags */}
          {detailedAnalysis.redFlags?.length > 0 && (
            <div className="mb-4 p-3 bg-red-50 rounded border border-red-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span className="font-medium text-red-800">Red Flags</span>
              </div>
              <ul className="text-sm space-y-1">
                {detailedAnalysis.redFlags.map((flag, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-red-700">
                    <XCircle className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />
                    {flag}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <div className="text-xs text-gray-500 mt-3">
        Analysis powered by {detailedAnalysis.tokenUsage || 0} tokens
      </div>
    </div>
  )
}

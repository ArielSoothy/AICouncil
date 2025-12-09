'use client'

import { ModelResponse, StructuredModelResponse } from '@/types/consensus'
import { formatResponseTime, formatTokenCount } from '@/lib/utils'
import { Clock, Zap, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react'

interface ModelResponseCardProps {
  response: ModelResponse | StructuredModelResponse
  mode?: 'concise' | 'normal' | 'detailed'
}

export function ModelResponseCard({ response, mode = 'normal' }: ModelResponseCardProps) {
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'confidence-high'
    if (confidence >= 60) return 'confidence-medium'
    return 'confidence-low'
  }

  // Check if this is a structured response
  const isStructured = 'parsed' in response && response.parsed
  const structuredData = isStructured ? response.parsed : null
  
  // Use structured confidence if available, otherwise convert to percentage
  const displayConfidence = structuredData?.confidence || (response.confidence * 100)
  
  // Show structured details only for normal and detailed modes
  const showStructuredDetails = mode !== 'concise' && structuredData

  return (
    <div className="model-card">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold capitalize flex items-center gap-2">
            {response.provider}
            {isStructured && showStructuredDetails && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                Structured
              </span>
            )}
          </h3>
          <p className="text-xs text-muted-foreground">{response.model}</p>
        </div>
        <div className={`text-sm font-medium ${getConfidenceColor(displayConfidence)}`}>
          {Math.round(displayConfidence)}% confidence
        </div>
      </div>

      {response.error ? (
        <div className="flex items-center gap-2 text-destructive mb-3">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{response.error}</span>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Main Answer */}
          <div className="text-sm text-foreground min-h-[60px]">
            {structuredData?.mainAnswer || response.response}
          </div>
          
          {/* Structured Evidence & Limitations - Only for normal/detailed modes */}
          {showStructuredDetails && (
            <div className="space-y-2 border-t pt-2">
              {structuredData.keyEvidence.length > 0 && (
                <div>
                  <div className="flex items-center gap-1 text-xs text-green-600 font-medium mb-1">
                    <CheckCircle className="h-3 w-3" />
                    Evidence
                  </div>
                  <ul className="text-xs text-muted-foreground list-disc list-inside space-y-0.5">
                    {structuredData.keyEvidence.map((evidence, i) => (
                      <li key={i}>{evidence}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {structuredData.limitations.length > 0 && (
                <div>
                  <div className="flex items-center gap-1 text-xs text-amber-600 font-medium mb-1">
                    <AlertTriangle className="h-3 w-3" />
                    Limitations
                  </div>
                  <ul className="text-xs text-muted-foreground list-disc list-inside space-y-0.5">
                    {structuredData.limitations.map((limitation, i) => (
                      <li key={i}>{limitation}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Technical details - Only show in normal/detailed modes */}
      {mode !== 'concise' && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatResponseTime(response.responseTime)}
          </div>
          <div className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            {formatTokenCount(response.tokens.total)}
          </div>
        </div>
      )}
    </div>
  )
}

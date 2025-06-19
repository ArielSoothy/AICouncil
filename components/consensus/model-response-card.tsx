'use client'

import { ModelResponse } from '@/types/consensus'
import { formatResponseTime, formatTokenCount } from '@/lib/utils'
import { Clock, Zap, AlertCircle } from 'lucide-react'

interface ModelResponseCardProps {
  response: ModelResponse
}

export function ModelResponseCard({ response }: ModelResponseCardProps) {
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'confidence-high'
    if (confidence >= 0.6) return 'confidence-medium'
    return 'confidence-low'
  }

  return (
    <div className="model-card">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold capitalize">{response.provider}</h3>
          <p className="text-xs text-muted-foreground">{response.model}</p>
        </div>
        <div className={`text-sm font-medium ${getConfidenceColor(response.confidence)}`}>
          {Math.round(response.confidence * 100)}% confidence
        </div>
      </div>

      {response.error ? (
        <div className="flex items-center gap-2 text-destructive mb-3">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{response.error}</span>
        </div>
      ) : (
        <div className="text-sm text-foreground mb-3 min-h-[80px]">
          {response.response}
        </div>
      )}

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
    </div>
  )
}

'use client'

import { ConsensusResult } from '@/types/consensus'
import { ModelResponseCard } from './model-response-card'
import { ConsensusAnalysis } from './consensus-analysis'
import { PerformanceMetrics } from './performance-metrics'

interface ConsensusDisplayProps {
  result: ConsensusResult
}

export function ConsensusDisplay({ result }: ConsensusDisplayProps) {
  return (
    <div className="space-y-6">
      <div className="model-card">
        <h2 className="text-lg font-semibold mb-4">Consensus Analysis</h2>
        <ConsensusAnalysis consensus={result.consensus} />
      </div>

      <div className="model-card">
        <h2 className="text-lg font-semibold mb-4">Performance Metrics</h2>
        <PerformanceMetrics performance={result.performance} />
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Model Responses</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {result.responses.map((response) => (
            <ModelResponseCard key={response.id} response={response} />
          ))}
        </div>
      </div>
    </div>
  )
}

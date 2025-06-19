'use client'

import { EnhancedConsensusResponse } from '@/types/consensus'
import { Clock, DollarSign, Brain, CheckCircle, XCircle } from 'lucide-react'

interface EnhancedConsensusDisplayProps {
  result: EnhancedConsensusResponse
}

export function EnhancedConsensusDisplay({ result }: EnhancedConsensusDisplayProps) {
  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="model-card">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Consensus Analysis
        </h2>
        
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Unified Answer</h4>
            <p className="text-muted-foreground">{result.consensus.unifiedAnswer}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Key Agreements
              </h4>
              {result.consensus.agreements.length > 0 ? (
                <ul className="space-y-1">
                  {result.consensus.agreements.map((agreement, index) => (
                    <li key={index} className="text-sm text-muted-foreground">
                      • {agreement}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No specific agreements identified</p>
              )}
            </div>
            
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                Key Disagreements
              </h4>
              {result.consensus.disagreements.length > 0 ? (
                <ul className="space-y-1">
                  {result.consensus.disagreements.map((disagreement, index) => (
                    <li key={index} className="text-sm text-muted-foreground">
                      • {disagreement}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No significant disagreements found</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Confidence: {result.consensus.confidence}%
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                Mode: {result.mode}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {result.totalTokensUsed} tokens
              </span>
              <span className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                ${result.estimatedCost.toFixed(5)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Model Responses */}
      <div className="model-card">
        <h2 className="text-lg font-semibold mb-4">Model Responses</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {result.responses.map((response, index) => (
            <div key={index} className="border rounded-lg p-4 border-l-4 border-l-primary/20">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium">{response.model}</h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{response.responseTime}ms</span>
                  <span>{response.tokensUsed} tokens</span>
                </div>
              </div>
              <p className="text-sm whitespace-pre-wrap">{response.response}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Technical Details */}
      <div className="model-card">
        <h2 className="text-lg font-semibold mb-4">Technical Details</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <h4 className="font-medium text-sm">Total Models</h4>
            <p className="text-2xl font-bold">{result.responses.length}</p>
          </div>
          <div>
            <h4 className="font-medium text-sm">Total Tokens</h4>
            <p className="text-2xl font-bold">{result.totalTokensUsed}</p>
          </div>
          <div>
            <h4 className="font-medium text-sm">Judge Tokens</h4>
            <p className="text-2xl font-bold">{result.consensus.judgeTokensUsed}</p>
          </div>
          <div>
            <h4 className="font-medium text-sm">Estimated Cost</h4>
            <p className="text-2xl font-bold">${result.estimatedCost.toFixed(5)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

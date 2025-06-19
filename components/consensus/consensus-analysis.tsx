'use client'

import { ConsensusResult } from '@/types/consensus'
import { Progress } from '@/components/ui/progress'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface ConsensusAnalysisProps {
  consensus: ConsensusResult['consensus']
}

export function ConsensusAnalysis({ consensus }: ConsensusAnalysisProps) {
  const getAgreementIcon = (agreement: number) => {
    if (agreement >= 0.8) return <TrendingUp className="h-4 w-4 text-green-600" />
    if (agreement >= 0.5) return <Minus className="h-4 w-4 text-yellow-600" />
    return <TrendingDown className="h-4 w-4 text-red-600" />
  }

  const getAgreementText = (agreement: number) => {
    if (agreement >= 0.8) return 'High Consensus'
    if (agreement >= 0.5) return 'Moderate Consensus'
    return 'Low Consensus'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getAgreementIcon(consensus.agreement)}
          <span className="font-medium">{getAgreementText(consensus.agreement)}</span>
        </div>
        <span className="text-sm text-muted-foreground">
          {Math.round(consensus.agreement * 100)}% agreement
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Agreement Level</span>
          <span>{Math.round(consensus.agreement * 100)}%</span>
        </div>
        <Progress value={consensus.agreement * 100} className="h-2" />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Overall Confidence</span>
          <span>{Math.round(consensus.confidence * 100)}%</span>
        </div>
        <Progress value={consensus.confidence * 100} className="h-2" />
      </div>

      {consensus.summary && (
        <div>
          <h4 className="font-medium mb-2">Consensus Summary</h4>
          <p className="text-sm text-muted-foreground">{consensus.summary}</p>
        </div>
      )}

      {consensus.disagreements.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">Key Disagreements</h4>
          <ul className="space-y-1">
            {consensus.disagreements.map((disagreement, index) => (
              <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-destructive">•</span>
                {disagreement}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

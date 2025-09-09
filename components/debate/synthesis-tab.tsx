'use client'

import { DebateSession } from '@/lib/agents/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp,
  CheckCircle2,
  XCircle
} from 'lucide-react'
import { ComparisonDisplay } from '@/components/consensus/comparison-display'
import { ThreeWayComparison } from '@/components/consensus/three-way-comparison'

interface SynthesisTabProps {
  session: DebateSession
}

export function SynthesisTab({ session }: SynthesisTabProps) {
  return (
    <div className="space-y-4">
      {/* Show three-way comparison if all data available */}
      {session.comparisonResponse && session.consensusComparison && session.finalSynthesis ? (
        <ThreeWayComparison
          singleModel={session.comparisonResponse}
          consensus={{
            response: session.consensusComparison.response || session.finalSynthesis.conclusion || 'No conclusion available',
            models: session.consensusComparison.models || [],
            confidence: session.consensusComparison.confidence || 0.75,
            tokensUsed: session.consensusComparison.tokensUsed || 0,
            responseTime: session.consensusComparison.responseTime || 0,
            cost: session.consensusComparison.cost || 0
          }}
          agentDebate={{
            response: (() => {
              const conclusion = session.finalSynthesis.conclusion || 'No conclusion available'
              // Extract first numbered list if present, plus first sentence after
              const numberedListMatch = conclusion.match(/^((?:\d+\.\s+.*(?:\n|$))+)/)
              if (numberedListMatch) {
                const numberedList = numberedListMatch[1].trim();
                const afterList = conclusion.substring(conclusion.indexOf(numberedList) + numberedList.length).trim();
                const firstSentence = afterList.match(/^[^.!?]*[.!?]/)?.[0]?.trim() || '';
                return numberedList + (firstSentence ? '\n\n' + firstSentence : '');
              }
              return conclusion;
            })(),
            agents: session.agents.map(a => a.name),
            confidence: session.finalSynthesis.confidence || 0.8,
            tokensUsed: session.totalTokensUsed,
            responseTime: session.endTime ? 
              (new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 1000 : 0,
            cost: session.estimatedCost,
            rounds: session.rounds.length
          }}
        />
      ) : session.comparisonResponse && session.finalSynthesis ? (
        /* Show two-way comparison if only single model comparison available */
        <ComparisonDisplay 
          singleModel={session.comparisonResponse}
          consensus={{
            unifiedAnswer: session.finalSynthesis.conclusion || 'No conclusion available',
            confidence: session.finalSynthesis.confidence || 0.8,
            agreements: session.finalSynthesis.agreements || [],
            disagreements: session.finalSynthesis.disagreements || [],
            responseTime: session.endTime ? 
              (new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 1000 : 0,
            cost: session.estimatedCost,
            modelCount: session.agents.length
          }}
          showAsAgentDebate={true}  // Add flag to show this is Agent Debate, not consensus
        />
      ) : null}
      
      {/* Fallback synthesis display */}
      {session.finalSynthesis && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Final Synthesis</h3>
            {session.finalSynthesis.confidence && (
              <Badge variant="default" className="text-sm">
                {session.finalSynthesis.confidence}% Confidence
              </Badge>
            )}
          </div>
          <div className="space-y-4">
            {/* Show conclusion first as the main answer */}
            {session.finalSynthesis.conclusion && (
              <div className="space-y-2">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                  Conclusion
                </h4>
                <div className="text-sm pl-6 text-foreground whitespace-pre-wrap break-words">
                  {session.finalSynthesis.conclusion}
                </div>
              </div>
            )}
            
            {/* Show agreements if available */}
            {session.finalSynthesis.agreements && session.finalSynthesis.agreements.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Key Agreements
                </h4>
                <ul className="space-y-1 pl-6">
                  {session.finalSynthesis.agreements.map((agreement, idx) => (
                    <li key={idx} className="text-sm flex items-start gap-2">
                      <CheckCircle2 className="w-3 h-3 mt-1 text-green-500 flex-shrink-0" />
                      <span>{agreement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Show disagreements if any */}
            {session.finalSynthesis.disagreements && session.finalSynthesis.disagreements.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-500" />
                  Remaining Disagreements
                </h4>
                <ul className="space-y-1 pl-6">
                  {session.finalSynthesis.disagreements.map((disagreement, idx) => (
                    <li key={idx} className="text-sm flex items-start gap-2">
                      <XCircle className="w-3 h-3 mt-1 text-red-500 flex-shrink-0" />
                      <span>{disagreement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
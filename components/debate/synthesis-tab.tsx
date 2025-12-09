'use client'

import { useState } from 'react'
import { DebateSession } from '@/lib/agents/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  TrendingUp,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  Plus
} from 'lucide-react'
import { ComparisonDisplay } from '@/components/consensus/comparison-display'
import { ThreeWayComparison } from '@/components/consensus/three-way-comparison'

interface SynthesisTabProps {
  session: DebateSession
  onFollowUpRound?: (answers: Record<string | number, string>) => void
}

export function SynthesisTab({ session, onFollowUpRound }: SynthesisTabProps) {
  const [followUpAnswers, setFollowUpAnswers] = useState<Record<string | number, string>>({})
  const [showFollowUpInput, setShowFollowUpInput] = useState(false)
  const [customQuestion, setCustomQuestion] = useState('')

  const handleAnswerChange = (questionIndex: number, answer: string) => {
    setFollowUpAnswers(prev => ({
      ...prev,
      [questionIndex]: answer
    }))
  }

  const handleCustomQuestionChange = (question: string) => {
    setCustomQuestion(question)
    if (question.trim()) {
      setFollowUpAnswers(prev => ({
        ...prev,
        custom: question
      }))
    } else {
      setFollowUpAnswers(prev => {
        const { custom, ...rest } = prev
        return rest
      })
    }
  }

  const handleSubmitFollowUp = () => {
    if (Object.keys(followUpAnswers).length > 0 && onFollowUpRound) {
      onFollowUpRound(followUpAnswers)
      setShowFollowUpInput(false)
      setFollowUpAnswers({})
      setCustomQuestion('')
    }
  }
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
            {session.finalSynthesis.confidence !== undefined && (
              <Badge variant="default" className="text-sm">
                {Math.round(session.finalSynthesis.confidence * 100)}% Confidence
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

            {/* Follow-up Questions Section */}
            {session.informationRequest?.followUpQuestions && session.informationRequest.followUpQuestions.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-blue-500" />
                    Follow-up Questions
                  </h4>
                  {onFollowUpRound && !showFollowUpInput && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFollowUpInput(true)}
                      className="text-xs gap-1"
                    >
                      <ArrowRight className="w-3 h-3" />
                      Answer & Continue Debate
                    </Button>
                  )}
                </div>

                {showFollowUpInput ? (
                  <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                    <div className="space-y-3">
                      {session.informationRequest.followUpQuestions.map((question, idx) => (
                        <div key={idx} className="space-y-2">
                          <Label className="text-sm font-medium flex items-start gap-2">
                            <HelpCircle className="w-3 h-3 mt-0.5 text-blue-500 flex-shrink-0" />
                            {question}
                          </Label>
                          <Textarea
                            placeholder="Your answer..."
                            value={followUpAnswers[idx] || ''}
                            onChange={(e) => handleAnswerChange(idx, e.target.value)}
                            className="min-h-[60px] text-sm"
                          />
                        </div>
                      ))}

                      {/* Custom question input */}
                      <div className="space-y-2 pt-3 border-t border-blue-200 dark:border-blue-700">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          <Plus className="w-3 h-3 text-blue-500" />
                          Add your own question or context (optional)
                        </Label>
                        <Textarea
                          placeholder="Ask a specific question or provide additional context..."
                          value={customQuestion}
                          onChange={(e) => handleCustomQuestionChange(e.target.value)}
                          className="min-h-[60px] text-sm"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowFollowUpInput(false)
                          setFollowUpAnswers({})
                          setCustomQuestion('')
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSubmitFollowUp}
                        disabled={Object.keys(followUpAnswers).length === 0}
                        className="gap-1"
                      >
                        <ArrowRight className="w-3 h-3" />
                        Continue Debate with Answers
                      </Button>
                    </div>
                  </div>
                ) : (
                  <ul className="space-y-1 pl-6">
                    {session.informationRequest.followUpQuestions.map((question, idx) => (
                      <li key={idx} className="text-sm flex items-start gap-2">
                        <HelpCircle className="w-3 h-3 mt-1 text-blue-500 flex-shrink-0" />
                        <span>{question}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
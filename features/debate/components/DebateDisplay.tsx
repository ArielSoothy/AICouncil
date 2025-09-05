'use client'

// Focused component for displaying debate results
// Only handles display, no business logic

import { DebateSession, StreamEvent } from '../types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Brain, MessageSquare, Users, TrendingUp } from 'lucide-react'

interface DebateDisplayProps {
  session: DebateSession | null
  streamEvents: StreamEvent[]
  isLoading?: boolean
}

export function DebateDisplay({ session, streamEvents, isLoading = false }: DebateDisplayProps) {
  if (!session && !isLoading) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No debate in progress. Configure and start a debate to see results.</p>
      </Card>
    )
  }

  // Show loading state with stream events
  if (isLoading) {
    const latestEvent = streamEvents[streamEvents.length - 1]
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Debate in Progress</h3>
            <Badge variant="outline" className="animate-pulse">
              {latestEvent?.type || 'Starting...'}
            </Badge>
          </div>
          
          <Progress value={33} className="w-full" />
          
          <div className="space-y-2">
            {streamEvents.slice(-5).map((event, idx) => (
              <div key={idx} className="text-sm text-muted-foreground">
                {new Date(event.timestamp).toLocaleTimeString()} - {event.type}
              </div>
            ))}
          </div>
        </div>
      </Card>
    )
  }

  if (!session) return null

  return (
    <div className="space-y-6">
      {/* Debate Header */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="w-5 h-5 text-primary" />
            <div>
              <h3 className="font-semibold">Debate Session</h3>
              <p className="text-sm text-muted-foreground">
                {session.rounds.length} round(s) • {session.config.mode} mode
              </p>
            </div>
          </div>
          <Badge variant={session.status === 'completed' ? 'default' : 'secondary'}>
            {session.status}
          </Badge>
        </div>
      </Card>

      {/* Rounds Display */}
      {session.rounds.map((round, roundIdx) => (
        <Card key={roundIdx} className="p-6">
          <h4 className="font-semibold mb-4">Round {round.roundNumber}</h4>
          
          <div className="space-y-4">
            {round.responses.map((response, respIdx) => (
              <div key={`${response.agentName}-${response.role}-${respIdx}`} className="border-l-2 border-primary/20 pl-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{response.role}</Badge>
                    <span className="text-sm font-medium">{response.agentName}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {response.tokensUsed} tokens • {response.duration}ms
                  </div>
                </div>
                <p className="text-sm">{response.response}</p>
              </div>
            ))}
          </div>

          {round.disagreementScore !== undefined && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm">Disagreement Score</span>
                <Badge variant={round.disagreementScore > 0.5 ? 'destructive' : 'default'}>
                  {Math.round(round.disagreementScore * 100)}%
                </Badge>
              </div>
            </div>
          )}
        </Card>
      ))}

      {/* Synthesis */}
      {session.synthesis && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-primary" />
            <h4 className="font-semibold">Synthesis</h4>
            <Badge>{Math.round(session.synthesis.confidence * 100)}% confidence</Badge>
          </div>

          <div className="space-y-4">
            {session.synthesis.agreements.length > 0 && (
              <div>
                <h5 className="font-medium mb-2">Agreements</h5>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {session.synthesis.agreements.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {session.synthesis.disagreements.length > 0 && (
              <div>
                <h5 className="font-medium mb-2">Disagreements</h5>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {session.synthesis.disagreements.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-4 border-t">
              <h5 className="font-medium mb-2">Conclusion</h5>
              <p className="text-sm">{session.synthesis.conclusion}</p>
            </div>

            {session.synthesis.followUpQuestions && session.synthesis.followUpQuestions.length > 0 && (
              <div className="pt-4 border-t">
                <h5 className="font-medium mb-2">Follow-up Questions</h5>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {session.synthesis.followUpQuestions.map((q, idx) => (
                    <li key={idx}>{q}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Comparison Results */}
      {session.comparison && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h4 className="font-semibold">Comparison Analysis</h4>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h5 className="font-medium mb-2">Single Model</h5>
              <p className="text-sm text-muted-foreground">{session.comparison.singleModel.response}</p>
              <div className="mt-2 text-xs">
                {session.comparison.singleModel.tokensUsed} tokens • 
                ${session.comparison.singleModel.cost.toFixed(4)}
              </div>
            </div>

            <div>
              <h5 className="font-medium mb-2">Multi-Model</h5>
              <p className="text-sm text-muted-foreground">{session.comparison.multiModel.response}</p>
              <div className="mt-2 text-xs">
                {session.comparison.multiModel.tokensUsed} tokens • 
                ${session.comparison.multiModel.cost.toFixed(4)}
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-sm">
              <strong>Recommendation:</strong> {session.comparison.improvement.recommendation}
            </p>
            <div className="flex gap-4 mt-2 text-xs">
              <span>Confidence: +{Math.round(session.comparison.improvement.confidence)}%</span>
              <span>Cost: +{Math.round(session.comparison.improvement.costIncrease)}%</span>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
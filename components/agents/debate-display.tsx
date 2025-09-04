'use client'

import { useState } from 'react'
import { DebateSession, AgentMessage } from '@/lib/agents/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { 
  Brain, 
  Shield, 
  Users, 
  MessageSquare, 
  CheckCircle2, 
  XCircle,
  TrendingUp,
  DollarSign,
  Clock,
  Hash,
  HelpCircle,
  ArrowRight,
  GitCompare
} from 'lucide-react'
import { ComparisonDisplay } from '@/components/consensus/comparison-display'
import { ThreeWayComparison } from '@/components/consensus/three-way-comparison'

interface DebateDisplayProps {
  session: DebateSession
  onRefinedQuery?: (query: string) => void
  onFollowUpRound?: (answers: Record<string | number, string>) => void
}

const agentIcons = {
  analyst: Brain,
  critic: Shield,
  synthesizer: Users
}

const agentColors = {
  analyst: '#3B82F6',
  critic: '#EF4444',
  synthesizer: '#10B981'
}

export function DebateDisplay({ session, onRefinedQuery, onFollowUpRound }: DebateDisplayProps) {
  const [followUpAnswers, setFollowUpAnswers] = useState<Record<string | number, string>>({})
  const [showFollowUpInput, setShowFollowUpInput] = useState(false)
  
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const formatDuration = (start: Date, end?: Date) => {
    if (!end) return 'In progress...'
    const duration = new Date(end).getTime() - new Date(start).getTime()
    const seconds = Math.floor(duration / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  const renderMessage = (message: AgentMessage) => {
    const Icon = agentIcons[message.role]
    const agent = session.agents.find(a => a.id === message.agentId)
    
    return (
      <Card key={`${message.agentId}-${message.round}-${message.timestamp}`} className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5" style={{ color: agentColors[message.role] }} />
            <span className="font-semibold">{agent?.name || message.role}</span>
            <Badge variant="outline" className="text-xs">
              Round {message.round}
            </Badge>
            {message.confidence && (
              <Badge variant="secondary" className="text-xs">
                {message.confidence}% confident
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {formatTime(message.timestamp)}
          </span>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none">
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>

        {message.keyPoints && message.keyPoints.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs font-semibold mb-1 text-muted-foreground">Key Points:</p>
            <ul className="space-y-1">
              {message.keyPoints.map((point, idx) => (
                <li key={idx} className="text-sm flex items-start gap-1">
                  <CheckCircle2 className="w-3 h-3 mt-0.5 text-green-500 flex-shrink-0" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {message.challenges && message.challenges.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs font-semibold mb-1 text-muted-foreground">Challenges:</p>
            <ul className="space-y-1">
              {message.challenges.map((challenge, idx) => (
                <li key={idx} className="text-sm flex items-start gap-1">
                  <XCircle className="w-3 h-3 mt-0.5 text-red-500 flex-shrink-0" />
                  <span>{challenge}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Hash className="w-3 h-3" />
            {message.tokensUsed} tokens
          </span>
          <span>{message.model}</span>
        </div>
      </Card>
    )
  }

  const handleFollowUpSubmit = () => {
    if (Object.keys(followUpAnswers).length > 0 && onFollowUpRound) {
      onFollowUpRound(followUpAnswers)
      setShowFollowUpInput(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Debate Header */}
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Debate Query</h3>
            <div className="text-muted-foreground text-sm max-h-32 overflow-y-auto whitespace-pre-wrap break-words">
              {session.query}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Status</p>
              <Badge variant={session.status === 'completed' ? 'default' : 'secondary'}>
                {session.status}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Duration</p>
              <p className="text-sm font-medium flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDuration(session.startTime, session.endTime)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Total Tokens</p>
              <p className="text-sm font-medium flex items-center gap-1">
                <Hash className="w-3 h-3" />
                {session.totalTokensUsed.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Est. Cost</p>
              <p className="text-sm font-medium flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                ${session.estimatedCost.toFixed(4)}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Debate Content */}
      <Tabs defaultValue="synthesis" className="space-y-4">
        <TabsList className="w-full flex flex-wrap gap-1">
          {session.rounds.map((round, idx) => (
            <TabsTrigger 
              key={`round-${round.roundNumber}`} 
              value={`round-${round.roundNumber}`}
              className="flex items-center gap-1"
            >
              Round {round.roundNumber}
              {round.messages.some(m => m.content.includes('follow-up') || m.content.includes('Additional context')) && (
                <Badge variant="secondary" className="text-xs ml-1">Follow-up</Badge>
              )}
            </TabsTrigger>
          ))}
          <TabsTrigger value="timeline" className="ml-auto">Timeline</TabsTrigger>
          <TabsTrigger value="synthesis">Synthesis</TabsTrigger>
        </TabsList>

        {/* Individual Round Tabs */}
        {session.rounds.map(round => (
          <TabsContent key={`round-${round.roundNumber}`} value={`round-${round.roundNumber}`} className="space-y-4">
            <Card className="p-4 bg-muted/30">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold">Round {round.roundNumber}</h3>
                  {round.messages.some(m => m.content.includes('follow-up') || m.content.includes('Additional context')) && (
                    <Badge variant="secondary">Follow-up Round</Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatDuration(round.startTime, round.endTime)}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-4 h-4" />
                    {round.messages.length} responses
                  </span>
                  <span className="flex items-center gap-1">
                    <Hash className="w-4 h-4" />
                    {round.messages.reduce((sum, m) => sum + m.tokensUsed, 0)} tokens
                  </span>
                </div>
              </div>
            </Card>
            
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {round.messages.map(message => renderMessage(message))}
              </div>
            </ScrollArea>
          </TabsContent>
        ))}
        
        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-4">
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4">
              {session.rounds.map((round, roundIdx) => (
                <div key={round.roundNumber}>
                  {roundIdx > 0 && (
                    <div className="flex items-center gap-2 my-4">
                      <div className="flex-1 h-px bg-border" />
                      <Badge variant="outline" className="text-xs">
                        Round {round.roundNumber}
                      </Badge>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                  )}
                  {round.messages.map(message => renderMessage(message))}
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="synthesis" className="space-y-4">
          {/* Show three-way comparison if all data available */}
          {session.comparisonResponse && session.consensusComparison && session.finalSynthesis ? (
            <ThreeWayComparison
              singleModel={session.comparisonResponse}
              consensus={session.consensusComparison}
              agentDebate={{
                response: session.finalSynthesis.conclusion || session.finalSynthesis.content,
                agents: session.agents.map(a => `${a.name} (${a.role})`),
                confidence: session.finalSynthesis.confidence,
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
                unifiedAnswer: session.finalSynthesis.conclusion || session.finalSynthesis.content,
                confidence: session.finalSynthesis.confidence,
                agreements: session.finalSynthesis.agreements || [],
                disagreements: session.finalSynthesis.disagreements || [],
                responseTime: session.endTime ? 
                  (new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 1000 : 0,
                cost: session.estimatedCost,
                modelCount: session.agents.length
              }}
            />
          ) : null}
          
          {session.finalSynthesis ? (
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Final Synthesis</h3>
                <Badge variant="default" className="text-sm">
                  {session.finalSynthesis.confidence}% Confidence
                </Badge>
              </div>

              <div className="space-y-4">
                {/* Show conclusion first as the main answer */}
                {session.finalSynthesis.conclusion && (
                  <div>
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
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Points of Agreement
                    </h4>
                    <ul className="space-y-1 pl-6">
                      {session.finalSynthesis.agreements.map((agreement, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground list-disc list-inside">{agreement}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Show disagreements if available */}
                {session.finalSynthesis.disagreements && session.finalSynthesis.disagreements.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-500" />
                      Points of Disagreement
                    </h4>
                    <ul className="space-y-1 pl-6">
                      {session.finalSynthesis.disagreements.map((disagreement, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground list-disc list-inside">{disagreement}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Always show follow-up section */}
                <div className="mt-4 pt-4 border-t">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-yellow-500" />
                    Refine Your Results
                  </h4>
                  
                  {/* Show follow-up questions if detected */}
                  {session.informationRequest?.detected && session.informationRequest?.followUpQuestions && session.informationRequest.followUpQuestions.length > 0 && (
                    <>
                      <p className="text-sm text-muted-foreground mb-3 pl-6">
                        The agents identified some information that would help provide more accurate recommendations:
                      </p>
                      {!showFollowUpInput && (
                        <ul className="space-y-1 pl-6 mb-3">
                          {session.informationRequest.followUpQuestions.map((question, idx) => (
                            <li key={idx} className="text-sm flex items-start gap-2">
                              <span className="text-yellow-500">•</span>
                              <span>{question}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                  
                  <div className="pl-6 space-y-3">
                    {/* Show AI-suggested questions if they exist and we're in input mode */}
                    {showFollowUpInput && session.informationRequest?.detected && (
                      <>
                        {session.informationRequest.suggestedQuestions.map((question, idx) => (
                          <div key={idx} className="space-y-2">
                            <label className="text-sm font-medium">{question}</label>
                            <Textarea
                              placeholder="Your answer..."
                              value={followUpAnswers[idx] || ''}
                              onChange={(e) => setFollowUpAnswers({
                                ...followUpAnswers,
                                [idx]: e.target.value
                              })}
                              className="min-h-[60px] text-sm"
                            />
                          </div>
                        ))}
                        <div className="border-t my-3"></div>
                      </>
                    )}
                    
                    {/* Always show custom follow-up input */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <HelpCircle className="w-4 h-4" />
                        Need different results? Add context for a new debate
                      </label>
                      <Textarea
                        placeholder="Any specific requirements, constraints, or additional questions? (e.g., 'I prefer electric scooters', 'Budget is tight', 'Need good storage space')"
                        value={followUpAnswers['custom'] || ''}
                        onChange={(e) => setFollowUpAnswers({
                          ...followUpAnswers,
                          'custom': e.target.value
                        })}
                        className="min-h-[80px] text-sm"
                      />
                    </div>
                    
                    {/* Show AI questions button if they exist but not expanded */}
                    {session.informationRequest?.detected && !showFollowUpInput && (
                      <Button
                        onClick={() => setShowFollowUpInput(true)}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <ArrowRight className="w-4 h-4" />
                        Answer AI-Suggested Questions
                      </Button>
                    )}
                    
                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={() => {
                              // Build refined query with context
                              const answersProvided = session.informationRequest?.suggestedQuestions
                                .map((q, idx) => {
                                  const answer = followUpAnswers[idx]
                                  if (answer && answer.trim()) {
                                    return `${q} ${answer}`
                                  }
                                  return null
                                })
                                .filter(Boolean)
                                .join('. ')
                              
                              // Add custom question if provided
                              const customQuestion = followUpAnswers['custom']
                              const allContext = [answersProvided, customQuestion].filter(Boolean).join('. ')
                              
                              const refinedQuery = allContext 
                                ? `${session.query}\n\nAdditional context: ${allContext}\n\nBased on the above context and the previous synthesis that suggested: "${session.finalSynthesis?.conclusion?.substring(0, 200)}...", please provide more specific recommendations.`
                                : session.query
                              
                              // If we have a follow-up handler, use it to add as new round
                              if (onFollowUpRound) {
                                onFollowUpRound(followUpAnswers)
                                setShowFollowUpInput(false)
                                setFollowUpAnswers({})
                              } else if (onRefinedQuery) {
                                // Otherwise start new debate
                                onRefinedQuery(refinedQuery)
                                setShowFollowUpInput(false)
                                setFollowUpAnswers({})
                              } else {
                                navigator.clipboard.writeText(refinedQuery)
                                alert('Refined query copied to clipboard! Paste it in a new debate.')
                              }
                            }}
                            disabled={Object.keys(followUpAnswers).length === 0 || 
                              !Object.values(followUpAnswers).some(answer => answer && answer.trim())}
                            size="sm"
                            className="flex items-center gap-2"
                          >
                            <ArrowRight className="w-4 h-4" />
                            Start New Debate with Context
                          </Button>
                          {showFollowUpInput && session.informationRequest?.detected && (
                            <Button
                              onClick={() => {
                                setShowFollowUpInput(false)
                                setFollowUpAnswers({})
                              }}
                              variant="outline"
                              size="sm"
                            >
                              Hide AI Questions
                            </Button>
                          )}
                        </div>
                        
                        <p className="text-xs text-muted-foreground">
                          Clicking above will start a new debate with your original question plus the context you provided.
                        </p>
                      </div>
                  </div>
                </div>

              <div className="pt-4 border-t flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Hash className="w-3 h-3" />
                  {session.finalSynthesis.tokensUsed} synthesis tokens
                </span>
              </div>
            </Card>
          ) : (
            <Card className="p-6">
              <p className="text-center text-muted-foreground">
                Synthesis not yet available
              </p>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Debate Statistics */}
      <Card className="p-4">
        <h4 className="font-semibold mb-3">Debate Statistics</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Total Rounds</p>
            <p className="font-medium">{session.rounds.length}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Total Messages</p>
            <p className="font-medium">
              {session.rounds.reduce((sum, r) => sum + r.messages.length, 0)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Participating Agents</p>
            <p className="font-medium">{session.agents.length}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Avg Tokens/Message</p>
            <p className="font-medium">
              {Math.round(session.totalTokensUsed / 
                session.rounds.reduce((sum, r) => sum + r.messages.length, 0) || 1)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Start Time</p>
            <p className="font-medium">{formatTime(session.startTime)}</p>
          </div>
          {session.endTime && (
            <div>
              <p className="text-muted-foreground">End Time</p>
              <p className="font-medium">{formatTime(session.endTime)}</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
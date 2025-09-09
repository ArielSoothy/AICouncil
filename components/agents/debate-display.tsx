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
  MessageSquare, 
  CheckCircle2, 
  XCircle,
  TrendingUp,
  DollarSign,
  Clock,
  Hash,
  HelpCircle,
  ArrowRight,
  GitCompare,
  Globe,
  Users,
  AlertTriangle
} from 'lucide-react'
import { ComparisonDisplay } from '@/components/consensus/comparison-display'
import { ThreeWayComparison } from '@/components/consensus/three-way-comparison'
import { AgentAvatar, CollapsibleMessageCard } from '@/components/shared'
// Removed DisagreementInsights - using simple indicators instead

// Model cost calculation helper
const calculateMessageCost = (message: AgentMessage): number => {
  const MODEL_COSTS: Record<string, { input: number, output: number }> = {
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
    'gpt-4': { input: 0.03, output: 0.06 },
    'gpt-4o': { input: 0.01, output: 0.03 },
    'claude-opus-4-20250514': { input: 0.015, output: 0.075 },
    'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 },
    'gemini-2.5-flash': { input: 0, output: 0 }, // Free
    'gemini-2.0-flash-exp': { input: 0, output: 0 }, // Free
    'llama-3.3-70b-versatile': { input: 0, output: 0 }, // Free
    'llama-3.1-8b-instant': { input: 0, output: 0 }, // Free
  }
  
  const costs = MODEL_COSTS[message.model] || { input: 0.001, output: 0.003 }
  // Rough estimate: 70% input, 30% output of total tokens
  const inputTokens = message.tokensUsed * 0.7
  const outputTokens = message.tokensUsed * 0.3
  return (inputTokens / 1000 * costs.input) + (outputTokens / 1000 * costs.output)
}

// Synthesis cost calculation (typically uses llama-3.3-70b-versatile which is free)
const calculateSynthesisCost = (tokens: number): number => {
  // Most synthesis uses free models like llama-3.3-70b-versatile or gemini
  // But fallback might use paid models
  const costs = { input: 0.001, output: 0.003 } // Conservative fallback estimate
  const inputTokens = tokens * 0.7
  const outputTokens = tokens * 0.3
  return (inputTokens / 1000 * costs.input) + (outputTokens / 1000 * costs.output)
}

interface DebateDisplayProps {
  session: DebateSession
  onRefinedQuery?: (query: string) => void
  onFollowUpRound?: (answers: Record<string | number, string>) => void
  onAddRound?: () => void
  webSearchUsed?: boolean
}

// Agent icons and colors now handled by AgentAvatar component

export function DebateDisplay({ session, onRefinedQuery, onFollowUpRound, onAddRound, webSearchUsed = false }: DebateDisplayProps) {
  const [followUpAnswers, setFollowUpAnswers] = useState<Record<string | number, string>>({})
  const [showFollowUpInput, setShowFollowUpInput] = useState(false)
  const [showCostBreakdown, setShowCostBreakdown] = useState(false)
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set())
  
  
  // Debug logging
  console.log('DebateDisplay received session:', {
    hasComparison: !!session.comparisonResponse,
    hasConsensus: !!session.consensusComparison,
    hasSynthesis: !!session.finalSynthesis,
    consensusData: session.consensusComparison,
    roundsCount: session.rounds.length,
    rounds: session.rounds.map(r => ({
      roundNumber: r.roundNumber,
      messagesCount: r.messages.length,
      messageRounds: r.messages.map(m => m.round)
    }))
  })
  
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

  const getMessageId = (message: AgentMessage) => `${message.agentId}-${message.round}-${message.timestamp}`
  
  const isLongMessage = (content: string) => content.length > 800 || content.split('\n').length > 12
  
  const toggleMessageExpansion = (messageId: string) => {
    setExpandedMessages(prev => {
      const newSet = new Set(prev)
      if (newSet.has(messageId)) {
        newSet.delete(messageId)
      } else {
        newSet.add(messageId)
      }
      return newSet
    })
  }

  const renderMessage = (message: AgentMessage) => {
    const agent = session.agents.find(a => a.id === message.agentId)
    const messageId = getMessageId(message)
    
    return (
      <CollapsibleMessageCard
        key={messageId}
        content={message.content}
        maxLength={600}
        className="space-y-3"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <AgentAvatar 
              role={message.role}
              name={agent?.name}
              size="md"
              showName={true}
            />
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

        {message.searchQueries && message.searchQueries.length > 0 && (
          <div className="pt-2 border-t">
            <div className="flex items-center gap-1 mb-1">
              <Globe className="w-3 h-3 text-blue-500" />
              <p className="text-xs font-semibold text-muted-foreground">Web Search Used:</p>
            </div>
            {message.searchRationale && (
              <p className="text-xs text-muted-foreground italic mb-2">{message.searchRationale}</p>
            )}
            <ul className="space-y-1">
              {message.searchQueries.map((query, idx) => (
                <li key={idx} className="text-xs flex items-start gap-1">
                  <span className="text-blue-400 font-mono">•</span>
                  <span className="text-muted-foreground">&quot;{query}&quot;</span>
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
      </CollapsibleMessageCard>
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
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              Debate Query
              {webSearchUsed && (
                <Badge variant="outline" className="ml-2 text-xs">
                  <Globe className="w-3 h-3 mr-1" />
                  Web Search
                </Badge>
              )}
            </h3>
            <div className="text-muted-foreground text-sm max-h-32 overflow-y-auto whitespace-pre-wrap break-words">
              {session.query}
            </div>
            {webSearchUsed && (
              <div className="mt-2 p-2 bg-green-500/10 rounded-lg border border-green-500/30">
                <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  Enhanced with real-time web search results from DuckDuckGo
                </p>
              </div>
            )}
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
          
          {/* Cost Breakdown Toggle */}
          <div className="mt-4 pt-4 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCostBreakdown(!showCostBreakdown)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              <DollarSign className="w-3 h-3 mr-1" />
              {showCostBreakdown ? 'Hide' : 'Show'} Cost Breakdown
              <ArrowRight className={`w-3 h-3 ml-1 transition-transform ${showCostBreakdown ? 'rotate-90' : ''}`} />
            </Button>
            
            {showCostBreakdown && (
              <div className="mt-3 space-y-2">
                <div className="text-xs font-semibold text-muted-foreground mb-2">Per-Agent Costs:</div>
                {session.rounds.map((round) =>
                  round.messages.map((message) => {
                    const agent = session.agents.find(a => a.id === message.agentId)
                    // Agent icon now handled by AgentAvatar component
                    
                    // Calculate actual cost based on model pricing
                    const estimatedCost = calculateMessageCost(message)
                    
                    return (
                      <div key={`${message.agentId}-${message.round}-cost`} className="flex items-center justify-between py-1 px-2 bg-muted/30 rounded text-xs">
                        <div className="flex items-center gap-2">
                          <AgentAvatar 
                            role={message.role}
                            name={agent?.name}
                            size="sm"
                            showName={true}
                          />
                          <Badge variant="outline" className="text-xs px-1 py-0">
                            Round {message.round}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Hash className="w-3 h-3" />
                            {message.tokensUsed.toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            ${estimatedCost.toFixed(6)}
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}
                
                {/* Synthesis cost if available */}
                {session.finalSynthesis?.tokensUsed && (
                  <div className="flex items-center justify-between py-1 px-2 bg-green-500/10 rounded text-xs border border-green-500/20">
                    <div className="flex items-center gap-2">
                      <GitCompare className="w-3 h-3 text-green-600" />
                      <span className="font-medium">Final Synthesis</span>
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Hash className="w-3 h-3" />
                        {session.finalSynthesis.tokensUsed.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        ${calculateSynthesisCost(session.finalSynthesis.tokensUsed).toFixed(4)}
                      </span>
                    </div>
                  </div>
                )}
                
                <div className="mt-2 pt-2 border-t border-muted flex justify-between text-xs font-semibold">
                  <span>Total</span>
                  <span>${session.estimatedCost.toFixed(4)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Debate Content */}
      <Tabs defaultValue={session.rounds.length > 0 ? `round-${session.rounds[0].roundNumber}` : "synthesis"} className="space-y-4">
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
          <TabsTrigger value="insights">Insights</TabsTrigger>
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
            
            <ScrollArea className="h-[800px] pr-4">
              <div className="space-y-4">
                {/* Filter messages to ensure only this round's messages are shown */}
                {round.messages
                  .filter(message => message.round === round.roundNumber)
                  .map(message => renderMessage(message))}
              </div>
            </ScrollArea>
          </TabsContent>
        ))}
        
        {/* Chain-of-Debate Insights */}
        <TabsContent value="insights" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <GitCompare className="w-5 h-5" />
              Why Agents Disagreed
              <Badge variant="outline" className="ml-2 text-xs">Research-Based</Badge>
            </h3>
            
            <div className="space-y-6">
              {/* Core disagreement detection */}
              {(() => {
                const disagreements = []
                
                // Look for explicit challenges between agents
                session.rounds[0]?.messages.forEach((msg, i) => {
                  const otherAgents = session.rounds[0]?.messages.filter((_, idx) => idx !== i) || []
                  const content = msg.content.toLowerCase()
                  
                  // Find challenge phrases
                  const challenges = [
                    { phrase: 'however', type: 'Counter-Argument' },
                    { phrase: 'but', type: 'Contradiction' },
                    { phrase: 'disagree', type: 'Direct Challenge' },
                    { phrase: 'contrary', type: 'Opposition' },
                    { phrase: 'on the other hand', type: 'Alternative View' },
                    { phrase: 'contradicts', type: 'Evidence Conflict' }
                  ]
                  
                  challenges.forEach(challenge => {
                    if (content.includes(challenge.phrase)) {
                      // Find the challenge phrase and extract surrounding context
                      const phraseIndex = content.indexOf(challenge.phrase)
                      if (phraseIndex !== -1) {
                        // Get more context around the challenge phrase
                        const contextStart = Math.max(0, phraseIndex - 50)
                        const contextEnd = Math.min(msg.content.length, phraseIndex + 200)
                        let context = msg.content.slice(contextStart, contextEnd).trim()
                        
                        // Clean up the context to end at a complete word
                        if (contextEnd < msg.content.length) {
                          const lastSpace = context.lastIndexOf(' ')
                          if (lastSpace > context.length - 20) {
                            context = context.slice(0, lastSpace) + '...'
                          }
                        }
                        
                        if (context.length > 20) {
                          disagreements.push({
                            agent: msg.role,
                            type: challenge.type,
                            context: context,
                            targetAgents: otherAgents.map(a => a.role)
                          })
                        }
                      }
                    }
                  })
                })
                
                // Look for different recommendations - show FULL recommendations using proper truncation
                const recommendations = session.rounds[0]?.messages.map(msg => {
                  const fullResponse = msg.content.trim()
                  
                  // Extract first paragraph, then apply sentence-aware truncation
                  const firstParagraph = fullResponse.split('\n\n')[0] || fullResponse
                  
                  // Use same sentence-aware truncation as main messages (increased to 400 chars for insights)
                  let preview = firstParagraph
                  if (firstParagraph.length > 400) {
                    const sentences = firstParagraph.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0)
                    let truncated = ''
                    
                    for (const sentence of sentences) {
                      const nextLength = (truncated + sentence).length
                      if (nextLength <= 400 || truncated.length === 0) {
                        truncated += (truncated ? ' ' : '') + sentence
                      } else {
                        break
                      }
                    }
                    
                    // Fallback to word boundary if no sentences fit
                    if (truncated.length === 0) {
                      const chunk = firstParagraph.substring(0, 400)
                      const lastSpace = chunk.lastIndexOf(' ')
                      truncated = lastSpace > 0 ? chunk.substring(0, lastSpace) : chunk
                    }
                    
                    preview = truncated + (truncated.length < firstParagraph.length ? '...' : '')
                  }
                  
                  return {
                    agent: msg.role,
                    recommendations: [preview]
                  }
                }).filter(r => r.recommendations[0].length > 50) || []
                
                return (
                  <div className="space-y-4">
                    {disagreements.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-3 text-muted-foreground flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-orange-500" />
                          Points of Conflict
                        </h4>
                        <div className="space-y-3">
                          {disagreements.map((disagreement, idx) => {
                            // Icon now handled by AgentAvatar component
                            return (
                              <div key={idx} className="border rounded-lg p-4 bg-red-50/50 dark:bg-red-950/20">
                                <div className="flex items-start gap-3">
                                  <AgentAvatar 
                                    role={disagreement.agent}
                                    size="md"
                                    showName={false}
                                  />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="font-medium capitalize">{disagreement.agent}</span>
                                      <Badge variant="destructive" className="text-xs">{disagreement.type}</Badge>
                                    </div>
                                    <blockquote className="text-sm italic border-l-2 border-red-300 pl-3 text-muted-foreground">
                                      &ldquo;{disagreement.context}&rdquo;
                                    </blockquote>
                                    <p className="text-xs text-muted-foreground mt-2">
                                      Challenged: {disagreement.targetAgents.join(', ')}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    
                    {recommendations.length > 1 && (
                      <div>
                        <h4 className="font-medium mb-3 text-muted-foreground flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-blue-500" />
                          Competing Solutions
                        </h4>
                        <div className="space-y-3">
                          {recommendations.map((rec, idx) => {
                            // Icon now handled by AgentAvatar component
                            return (
                              <div key={idx} className="border rounded-lg p-4 bg-blue-50/50 dark:bg-blue-950/20">
                                <div className="flex items-start gap-3">
                                  <AgentAvatar 
                                    role={rec.agent}
                                    size="md"
                                    showName={false}
                                  />
                                  <div className="flex-1">
                                    <div className="font-medium capitalize mb-2">{rec.agent}&apos;s Approach:</div>
                                    {rec.recommendations.map((recommendation, ridx) => (
                                      <div key={ridx} className="text-sm text-muted-foreground mb-1">
                                        • {recommendation}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    
                    {disagreements.length === 0 && recommendations.length <= 1 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">No significant disagreements detected</p>
                        <p className="text-xs mt-1">Agents reached similar conclusions</p>
                      </div>
                    )}
                    
                    <div className="border-t pt-4 text-xs text-muted-foreground">
                      <p className="flex items-center gap-1">
                        <GitCompare className="w-3 h-3" />
                        Based on &ldquo;Chain-of-Debate&rdquo; research (Microsoft, 2024) - tracking WHY models disagree
                      </p>
                    </div>
                  </div>
                )
              })()}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="synthesis" className="space-y-4">
          {/* Show three-way comparison if all data available */}
          {session.comparisonResponse && session.consensusComparison && session.finalSynthesis ? (
            <ThreeWayComparison
              singleModel={session.comparisonResponse}
              consensus={{
                response: session.consensusComparison.response || (session.consensusComparison as any).unifiedAnswer || '',
                models: session.consensusComparison.models || [],
                confidence: session.consensusComparison.confidence || 0.75,
                tokensUsed: session.consensusComparison.tokensUsed || 0,
                responseTime: session.consensusComparison.responseTime || 0,
                cost: session.consensusComparison.cost || 0
              }}
              agentDebate={{
                response: (() => {
                  const conclusion = session.finalSynthesis.conclusion || session.finalSynthesis.content || '';
                  // Extract just the numbered list + first sentence for preview consistency
                  const numberedListMatch = conclusion.match(/((?:\d+\.\s+[^\n]+(?:\n|$))+)/);
                  if (numberedListMatch) {
                    const numberedList = numberedListMatch[1].trim();
                    const afterList = conclusion.substring(conclusion.indexOf(numberedList) + numberedList.length).trim();
                    const firstSentence = afterList.match(/^[^.!?]*[.!?]/)?.[0]?.trim() || '';
                    return numberedList + (firstSentence ? '\n\n' + firstSentence : '');
                  }
                  return conclusion;
                })(),
                agents: session.agents.map(a => {
                  // Handle both persona agents and simple model agents
                  const name = a.name || (a as any).persona?.name || (a as any).model || 'Unknown'
                  const role = a.role || (a as any).persona?.role || ''
                  return role ? `${name} (${role})` : name
                }),
                confidence: session.finalSynthesis.confidence || 80,
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
                confidence: session.finalSynthesis.confidence || 80,
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
          
          {session.finalSynthesis ? (
            <Card className="p-6 space-y-4">
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

      {/* Add Round Button */}
      {session.status === 'completed' && session.rounds.length < 3 && onAddRound && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold">Continue Debate</h4>
              <p className="text-sm text-muted-foreground">
                Add another round to deepen the discussion
              </p>
            </div>
            <Button 
              onClick={onAddRound}
              className="flex items-center gap-2"
            >
              <ArrowRight className="w-4 h-4" />
              Add Round {session.rounds.length + 1}
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
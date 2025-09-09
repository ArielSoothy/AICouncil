'use client'

import { DebateSession } from '@/lib/agents/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  AlertTriangle,
  Users,
  MessageSquare
} from 'lucide-react'
import { AgentAvatar } from '@/components/shared'

interface InsightsTabProps {
  session: DebateSession
}

export function InsightsTab({ session }: InsightsTabProps) {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        Why Agents Disagreed
        <Badge variant="outline" className="ml-2 text-xs">Research-Based</Badge>
      </h3>
      
      <div className="space-y-6">
        {/* Core disagreement detection */}
        {(() => {
          // Analyze messages for disagreement patterns
          const allMessages = session.rounds.flatMap(r => r.messages)
          const disagreements = []
          const recommendations = []
          
          // Look for disagreement patterns
          const disagreementKeywords = [
            { phrase: 'however', type: 'Counter-Argument' },
            { phrase: 'but', type: 'Contradiction' },
            { phrase: 'disagree', type: 'Direct Challenge' },
            { phrase: 'contrary', type: 'Opposition' },
            { phrase: 'on the other hand', type: 'Alternative View' },
            { phrase: 'contradicts', type: 'Evidence Conflict' }
          ]
          
          // Find disagreements
          allMessages.forEach(msg => {
            const otherAgents = session.agents.filter(a => a.id !== msg.agentId)
            
            disagreementKeywords.forEach(challenge => {
              const lowerContent = msg.content.toLowerCase()
              if (lowerContent.includes(challenge.phrase)) {
                // Find context around the disagreement
                const keywordIndex = lowerContent.indexOf(challenge.phrase)
                const contextStart = Math.max(0, keywordIndex - 100)
                const contextEnd = Math.min(msg.content.length, keywordIndex + 200)
                let context = msg.content.slice(contextStart, contextEnd)
                
                // Clean up the context to end at a complete word
                if (contextEnd < msg.content.length) {
                  const lastSpace = context.lastIndexOf(' ')
                  if (lastSpace > context.length - 20) {
                    context = context.slice(0, lastSpace) + '...'
                  }
                }
                
                if (context.length > 50) {
                  disagreements.push({
                    agent: msg.role,
                    type: challenge.type,
                    context: context,
                    targetAgents: otherAgents.map(a => a.role)
                  })
                }
              }
            })
          })
          
          // Extract recommendations (first paragraph of each agent's final message)
          const finalMessages = session.rounds[session.rounds.length - 1]?.messages || []
          finalMessages.forEach(msg => {
            const firstParagraph = msg.content.split('\n\n')[0] || msg.content.split('\n')[0] || ''
            
            if (firstParagraph.length > 50) {
              let preview = firstParagraph
              
              // If too long, truncate at sentence boundary
              if (preview.length > 400) {
                const sentences = preview.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0)
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
              
              recommendations.push({
                agent: msg.role,
                recommendations: [preview]
              })
            }
          })
          
          return (
            <>
              {/* Show disagreements if found */}
              {disagreements.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <h4 className="font-semibold text-lg">
                      Points of Conflict
                    </h4>
                  </div>
                  <div className="space-y-3">
                    {disagreements.map((disagreement, idx) => {
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
              
              {/* Show different approaches if found */}
              {recommendations.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="w-5 h-5 text-blue-500" />
                    <h4 className="font-semibold text-lg">
                      Competing Solutions
                    </h4>
                  </div>
                  <div className="space-y-3">
                    {recommendations.map((rec, idx) => {
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
              
              {/* No disagreements found */}
              {disagreements.length === 0 && recommendations.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No significant disagreements detected</p>
                  <p className="text-xs mt-1">Agents reached similar conclusions</p>
                </div>
              )}
              
              {/* Research attribution */}
              <div className="mt-6 pt-4 border-t border-muted">
                <div className="text-xs text-muted-foreground text-center">
                  <p>
                    Based on &ldquo;Chain-of-Debate&rdquo; research (Microsoft, 2024) - tracking WHY models disagree
                  </p>
                </div>
              </div>
            </>
          )
        })()}
      </div>
    </Card>
  )
}
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
import { DebateHeader, CostBreakdown, InsightsTab, SynthesisTab, RoundTab } from '@/components/debate'
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
      <DebateHeader 
        session={session}
        webSearchUsed={webSearchUsed}
        showCostBreakdown={showCostBreakdown}
        onToggleCostBreakdown={() => setShowCostBreakdown(!showCostBreakdown)}
      >
        {showCostBreakdown && <CostBreakdown session={session} />}
      </DebateHeader>

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
          <TabsContent key={`round-${round.roundNumber}`} value={`round-${round.roundNumber}`}>
            <RoundTab 
              round={round} 
              session={session} 
              renderMessage={renderMessage}
            />
          </TabsContent>
        ))}
        
        {/* Chain-of-Debate Insights */}
        <TabsContent value="insights">
          <InsightsTab session={session} />
        </TabsContent>

        <TabsContent value="synthesis">
          <SynthesisTab session={session} />
        </TabsContent>
      </Tabs>
      
      {/* Follow-up section (preserved from original) */}
      {onAddRound && session.status === 'completed' && session.rounds.length < 3 && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold">Continue the Debate</h4>
              <p className="text-sm text-muted-foreground">
                Add another round of discussion to explore the topic further.
              </p>
            </div>
            <Button onClick={onAddRound} variant="outline">
              <MessageSquare className="w-4 h-4 mr-2" />
              Add Round {session.rounds.length + 1}
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}

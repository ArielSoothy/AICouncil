'use client'

import { DebateSession } from '@/lib/agents/types'
import { Badge } from '@/components/ui/badge'
import { 
  Hash,
  DollarSign
} from 'lucide-react'
import { AgentAvatar } from '@/components/shared'

interface CostBreakdownProps {
  session: DebateSession
}

export function CostBreakdown({ session }: CostBreakdownProps) {
  // Model cost calculation helper
  const calculateMessageCost = (message: any): number => {
    const MODEL_COSTS: Record<string, { input: number, output: number }> = {
      'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-4o': { input: 0.01, output: 0.03 },
      'claude-opus-4-1-20250514': { input: 0.015, output: 0.075 },
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

  return (
    <div className="mt-4 p-4 bg-muted/30 rounded-lg">
      <div className="text-xs font-semibold text-muted-foreground mb-2">Per-Agent Costs:</div>
      {session.rounds.map((round) =>
        round.messages.map((message) => {
          const agent = session.agents.find(a => a.id === message.agentId)
          
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
        <div className="flex items-center justify-between py-1 px-2 bg-muted/30 rounded text-xs mt-1">
          <div className="flex items-center gap-2">
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
  )
}
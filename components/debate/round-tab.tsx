'use client'

import { DebateSession, DebateRound, AgentMessage } from '@/lib/agents/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Clock } from 'lucide-react'
import { CollapsibleMessageCard, AgentAvatar } from '@/components/shared'

interface RoundTabProps {
  round: DebateRound
  session: DebateSession
  renderMessage: (message: AgentMessage) => JSX.Element
}

export function RoundTab({ round, session, renderMessage }: RoundTabProps) {
  const formatDuration = (start: Date, end?: Date) => {
    if (!end) return 'In progress...'
    const duration = new Date(end).getTime() - new Date(start).getTime()
    const seconds = Math.floor(duration / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
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
    </div>
  )
}
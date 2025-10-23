'use client'

import { MessageSquare, User } from 'lucide-react'

export interface DebateMessage {
  id: string
  role: 'analyst' | 'critic' | 'synthesizer'
  modelName: string
  content: string
  timestamp: number
  round: 1 | 2
}

interface DebateTranscriptProps {
  messages: DebateMessage[]
  title?: string
}

export function DebateTranscript({
  messages,
  title = 'Agent Debate Transcript'
}: DebateTranscriptProps) {
  if (messages.length === 0) {
    return null
  }

  // Group messages by round
  const round1Messages = messages.filter(m => m.round === 1)
  const round2Messages = messages.filter(m => m.round === 2)

  return (
    <div className="bg-card rounded-lg border p-6">
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-lg">{title}</h3>
      </div>

      <div className="space-y-8">
        {/* Round 1 */}
        {round1Messages.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Round 1: Initial Positions
              </div>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="space-y-4">
              {round1Messages.map((message) => (
                <DebateMessageItem key={message.id} message={message} />
              ))}
            </div>
          </div>
        )}

        {/* Round 2 */}
        {round2Messages.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Round 2: Refinement & Final Decision
              </div>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="space-y-4">
              {round2Messages.map((message) => (
                <DebateMessageItem key={message.id} message={message} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function DebateMessageItem({ message }: { message: DebateMessage }) {
  const roleConfig = {
    analyst: {
      label: '📊 Analyst',
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      border: 'border-blue-200 dark:border-blue-900'
    },
    critic: {
      label: '🔍 Critic',
      color: 'text-orange-600',
      bg: 'bg-orange-50 dark:bg-orange-950/30',
      border: 'border-orange-200 dark:border-orange-900'
    },
    synthesizer: {
      label: '⚖️ Synthesizer',
      color: 'text-purple-600',
      bg: 'bg-purple-50 dark:bg-purple-950/30',
      border: 'border-purple-200 dark:border-purple-900'
    }
  }

  const config = roleConfig[message.role]

  return (
    <div className={`flex gap-3 p-4 rounded-lg border ${config.bg} ${config.border}`}>
      <div className={`flex-shrink-0 ${config.color}`}>
        <User className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-2">
          <span className={`text-sm font-semibold ${config.color}`}>
            {config.label}
          </span>
          <span className="text-xs text-muted-foreground">
            {message.modelName}
          </span>
          <span className="text-xs text-muted-foreground ml-auto">
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
        </div>
        <p className="text-sm leading-relaxed">{message.content}</p>
      </div>
    </div>
  )
}

// Utility function to create debate messages
export function createDebateMessage(
  role: DebateMessage['role'],
  modelName: string,
  content: string,
  round: 1 | 2
): DebateMessage {
  return {
    id: `${Date.now()}-${Math.random()}`,
    role,
    modelName,
    content,
    timestamp: Date.now(),
    round
  }
}

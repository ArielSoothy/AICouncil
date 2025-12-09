'use client'

import { DebateSession } from '@/lib/agents/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Clock,
  Hash,
  DollarSign,
  Globe,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

interface DebateHeaderProps {
  session: DebateSession
  webSearchUsed?: boolean
  showCostBreakdown: boolean
  onToggleCostBreakdown: () => void
  children?: React.ReactNode
}

export function DebateHeader({ 
  session, 
  webSearchUsed = false, 
  showCostBreakdown,
  onToggleCostBreakdown,
  children
}: DebateHeaderProps) {
  const formatDuration = (start: Date, end?: Date) => {
    if (!end) return 'In progress...'
    const duration = new Date(end).getTime() - new Date(start).getTime()
    const seconds = Math.floor(duration / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  return (
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
            onClick={onToggleCostBreakdown}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {showCostBreakdown ? (
              <>
                <ChevronUp className="w-3 h-3 mr-1" />
                Hide Cost Breakdown
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3 mr-1" />
                Show Cost Breakdown
              </>
            )}
          </Button>
          
          {/* Cost Breakdown Content (rendered by parent) */}
          {showCostBreakdown && children}
        </div>
      </div>
    </Card>
  )
}
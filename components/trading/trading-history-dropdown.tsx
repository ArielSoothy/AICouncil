'use client'

import { useState, useEffect, useCallback } from 'react'
import { History, Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SavedConversation, ConversationEvaluationData } from '@/lib/types/conversation'
import { useRouter } from 'next/navigation'

// Simple relative time formatter
function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

interface TradingHistoryDropdownProps {
  /**
   * Trading mode: 'trading-individual', 'trading-consensus', 'trading-debate'
   */
  mode: string
  /**
   * Maximum number of analyses to display (default: 5)
   */
  limit?: number
  /**
   * Callback when user clicks on a history item
   */
  onSelect?: (conversation: SavedConversation) => void
}

export function TradingHistoryDropdown({
  mode,
  limit = 5,
  onSelect
}: TradingHistoryDropdownProps) {
  const [analyses, setAnalyses] = useState<SavedConversation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  const fetchAnalyses = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/conversations?mode=${mode}`)

      if (!response.ok) {
        console.error('Failed to fetch trading analyses:', response.statusText)
        return
      }

      const data = await response.json()

      // Limit analyses
      const filtered = data.slice(0, limit)
      setAnalyses(filtered)
    } catch (error) {
      console.error('Error fetching trading analyses:', error)
    } finally {
      setIsLoading(false)
    }
  }, [mode, limit])

  // Fetch analyses when dropdown opens
  useEffect(() => {
    if (isOpen && analyses.length === 0) {
      fetchAnalyses()
    }
  }, [isOpen, analyses.length, fetchAnalyses])

  const handleAnalysisClick = (analysis: SavedConversation) => {
    if (onSelect) {
      onSelect(analysis)
    } else {
      // Default behavior: update URL with conversation ID
      const currentPath = window.location.pathname
      router.push(`${currentPath}?c=${analysis.id}`)
    }
    setIsOpen(false)
  }

  const truncateText = (text: string, maxLength: number = 30) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  const getActionIcon = (responses: any) => {
    // Extract action from responses based on mode
    let action = 'HOLD'

    if (responses.decisions && responses.decisions.length > 0) {
      // Individual mode
      action = responses.decisions[0]?.action || 'HOLD'
    } else if (responses.consensus) {
      // Consensus mode
      action = responses.consensus?.action || 'HOLD'
    } else if (responses.debate) {
      // Debate mode
      action = responses.debate?.finalDecision?.action || 'HOLD'
    }

    switch (action) {
      case 'BUY':
        return <TrendingUp className="h-3 w-3 text-green-600" />
      case 'SELL':
        return <TrendingDown className="h-3 w-3 text-red-600" />
      default:
        return <Minus className="h-3 w-3 text-yellow-600" />
    }
  }

  const getAnalysisLabel = (conversation: SavedConversation): string => {
    const evalData = conversation.evaluation_data
    const symbol = evalData?.target_symbol || evalData?.metadata?.targetSymbol
    const timeframe = evalData?.timeframe || evalData?.metadata?.timeframe || 'swing'

    if (symbol) {
      return `${symbol} • ${timeframe}`
    }
    return `Market Analysis • ${timeframe}`
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <History className="h-4 w-4 mr-2" />
          Trading History
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Recent Trading Analyses</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {isLoading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Loading analyses...
          </div>
        ) : analyses.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No saved analyses yet
          </div>
        ) : (
          <>
            {analyses.map((analysis) => (
              <DropdownMenuItem
                key={analysis.id}
                className="flex flex-col items-start gap-1 p-3 cursor-pointer"
                onClick={() => handleAnalysisClick(analysis)}
              >
                <div className="flex items-start justify-between w-full gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {getAnalysisLabel(analysis)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {getActionIcon(analysis.responses)}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>
                    {formatRelativeTime(new Date(analysis.created_at))}
                  </span>
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="justify-center text-sm font-medium text-primary cursor-pointer"
              onClick={() => {
                router.push('/history')
                setIsOpen(false)
              }}
            >
              See all trading history →
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

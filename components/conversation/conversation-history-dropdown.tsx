'use client'

import { useState, useEffect } from 'react'
import { History, Clock, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SavedConversation } from '@/lib/types/conversation'
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

interface ConversationHistoryDropdownProps {
  /**
   * Storage mode to filter conversations (e.g., 'ultra-mode', 'consensus', 'agent-debate')
   */
  mode?: string
  /**
   * Maximum number of conversations to display (default: 5)
   */
  limit?: number
}

export function ConversationHistoryDropdown({
  mode,
  limit = 5
}: ConversationHistoryDropdownProps) {
  const [conversations, setConversations] = useState<SavedConversation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  // Fetch conversations when dropdown opens
  useEffect(() => {
    if (isOpen && conversations.length === 0) {
      fetchConversations()
    }
  }, [isOpen])

  const fetchConversations = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/conversations')
      
      if (!response.ok) {
        console.error('Failed to fetch conversations:', response.statusText)
        return
      }

      const data = await response.json()
      
      // Filter and limit conversations
      const filtered = data.slice(0, limit)
      setConversations(filtered)
    } catch (error) {
      console.error('Error fetching conversations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleConversationClick = (conversation: SavedConversation) => {
    // Determine the route based on mode or current page
    const currentPath = window.location.pathname
    const targetPath = currentPath.includes('/ultra') ? '/ultra' :
                      currentPath.includes('/agents') ? '/agents' :
                      '/'
    
    // Navigate with conversation ID
    router.push(`${targetPath}?c=${conversation.id}`)
    setIsOpen(false)
  }

  const truncateQuery = (query: string, maxLength: number = 50) => {
    if (query.length <= maxLength) return query
    return query.substring(0, maxLength) + '...'
  }

  const getModelCount = (conversation: SavedConversation): number => {
    const responses = conversation.responses as any
    
    // Try to extract model count from responses
    if (responses?.models && Array.isArray(responses.models)) {
      return responses.models.length
    }
    
    // Fallback
    return 1
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <History className="h-4 w-4 mr-2" />
          History
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Recent Conversations</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {isLoading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Loading conversations...
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No saved conversations yet
          </div>
        ) : (
          <>
            {conversations.map((conversation) => (
              <DropdownMenuItem
                key={conversation.id}
                className="flex flex-col items-start gap-1 p-3 cursor-pointer"
                onClick={() => handleConversationClick(conversation)}
              >
                <div className="flex items-start justify-between w-full gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {truncateQuery(conversation.query)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <MessageSquare className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {getModelCount(conversation)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>
                    {formatRelativeTime(new Date(conversation.created_at))}
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
              See all history →
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/ui/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SavedConversation } from '@/lib/types/conversation'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import {
  History,
  Search,
  Trash2,
  ExternalLink,
  Filter,
  Clock,
  MessageSquare,
  Loader2,
  AlertCircle
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

// Format relative time
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
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`
  return `${Math.floor(diffDays / 365)}y ago`
}

// Detect conversation mode from query or responses
function detectMode(conversation: SavedConversation): string {
  // Try to detect from URL or responses structure
  const responses = conversation.responses as any

  if (responses?.rounds) return 'Agent Debate'
  if (responses?.models && responses.models.length > 5) return 'Ultra Mode'
  if (responses?.models) return 'Consensus'

  return 'Unknown'
}

// Get model count
function getModelCount(conversation: SavedConversation): number {
  const responses = conversation.responses as any

  if (responses?.models && Array.isArray(responses.models)) {
    return responses.models.length
  }

  if (responses?.rounds && Array.isArray(responses.rounds)) {
    // For agent debate, count unique agents
    const agents = new Set()
    responses.rounds.forEach((round: any) => {
      if (round.messages) {
        round.messages.forEach((msg: any) => {
          if (msg.agent?.name) agents.add(msg.agent.name)
        })
      }
    })
    return agents.size
  }

  return 1
}

// Truncate query
function truncateQuery(query: string, maxLength: number = 80): string {
  if (query.length <= maxLength) return query
  return query.substring(0, maxLength) + '...'
}

export default function HistoryPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [conversations, setConversations] = useState<SavedConversation[]>([])
  const [filteredConversations, setFilteredConversations] = useState<SavedConversation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [modeFilter, setModeFilter] = useState<string>('all')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    fetchConversations()
  }, [])

  useEffect(() => {
    filterAndSortConversations()
  }, [conversations, searchQuery, modeFilter, sortOrder])

  const fetchConversations = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/conversations')

      if (!response.ok) {
        throw new Error('Failed to fetch conversations')
      }

      const data = await response.json()
      setConversations(data)
    } catch (error) {
      console.error('Error fetching conversations:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load conversation history',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const filterAndSortConversations = () => {
    let filtered = [...conversations]

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(conv =>
        conv.query.toLowerCase().includes(query)
      )
    }

    // Apply mode filter
    if (modeFilter !== 'all') {
      filtered = filtered.filter(conv => {
        const mode = detectMode(conv)
        return mode.toLowerCase().includes(modeFilter.toLowerCase())
      })
    }

    // Apply sort
    filtered.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime()
      const dateB = new Date(b.created_at).getTime()
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB
    })

    setFilteredConversations(filtered)
    setCurrentPage(1) // Reset to first page when filters change
  }

  const handleDelete = async (id: string) => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/conversations/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete conversation')
      }

      // Remove from local state
      setConversations(prev => prev.filter(conv => conv.id !== id))

      toast({
        title: 'Deleted',
        description: 'Conversation deleted successfully',
      })
    } catch (error) {
      console.error('Error deleting conversation:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete conversation',
      })
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setConversationToDelete(null)
    }
  }

  const handleView = (conversation: SavedConversation) => {
    const mode = detectMode(conversation)
    let path = '/'

    if (mode === 'Ultra Mode') path = '/ultra'
    else if (mode === 'Agent Debate') path = '/agents'
    else if (mode === 'Consensus') path = '/'

    router.push(`${path}?c=${conversation.id}`)
  }

  const getModeColor = (mode: string) => {
    switch (mode) {
      case 'Ultra Mode': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100'
      case 'Agent Debate': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
      case 'Consensus': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100'
    }
  }

  // Pagination
  const totalPages = Math.ceil(filteredConversations.length / itemsPerPage)
  const paginatedConversations = filteredConversations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <History className="w-8 h-8 text-primary" />
              <h1 className="text-4xl font-bold tracking-tight">
                Conversation History
              </h1>
            </div>
            <p className="text-muted-foreground">
              View and manage all your saved conversations
            </p>
          </div>

          {/* Filters and Search */}
          <Card className="p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Mode Filter */}
              <Select value={modeFilter} onValueChange={setModeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modes</SelectItem>
                  <SelectItem value="ultra">Ultra Mode</SelectItem>
                  <SelectItem value="consensus">Consensus</SelectItem>
                  <SelectItem value="agent">Agent Debate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort and Stats */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {filteredConversations.length} conversation{filteredConversations.length !== 1 ? 's' : ''} found
              </div>
              <Select value={sortOrder} onValueChange={(value: 'newest' | 'oldest') => setSortOrder(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {/* Empty State */}
          {!isLoading && filteredConversations.length === 0 && (
            <Card className="p-12">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No conversations found</h3>
                <p className="text-muted-foreground mb-6">
                  {searchQuery || modeFilter !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Start a conversation to see it appear here'}
                </p>
                {!searchQuery && modeFilter === 'all' && (
                  <div className="flex justify-center gap-3">
                    <Button onClick={() => router.push('/ultra')}>
                      Try Ultra Mode
                    </Button>
                    <Button variant="outline" onClick={() => router.push('/')}>
                      Try Consensus
                    </Button>
                    <Button variant="outline" onClick={() => router.push('/agents')}>
                      Try Agent Debate
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Conversation List */}
          {!isLoading && paginatedConversations.length > 0 && (
            <div className="space-y-3">
              {paginatedConversations.map((conversation) => {
                const mode = detectMode(conversation)
                const modelCount = getModelCount(conversation)

                return (
                  <Card key={conversation.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getModeColor(mode)}>
                            {mode}
                          </Badge>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MessageSquare className="h-3 w-3" />
                            <span>{modelCount} model{modelCount !== 1 ? 's' : ''}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{formatRelativeTime(new Date(conversation.created_at))}</span>
                          </div>
                        </div>
                        <p className="text-sm font-medium mb-1">
                          {truncateQuery(conversation.query)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(conversation.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleView(conversation)}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setConversationToDelete(conversation.id)
                            setDeleteDialogOpen(true)
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {!isLoading && totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the conversation
              from your history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => conversationToDelete && handleDelete(conversationToDelete)}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import {
  Search,
  Filter,
  ChevronDown,
  Loader2,
  History,
  Brain,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { DecisionCard } from './DecisionCard'
import {
  Decision,
  DecisionDomain,
  OutcomeStatus,
  DecisionFilters,
  PaginatedResponse,
} from '@/lib/decisions/decision-types'

interface DecisionListProps {
  userId: string
  initialDecisions?: Decision[]
  onViewDetails?: (decision: Decision) => void
  className?: string
}

/**
 * DecisionList - Browse and filter past decisions
 */
export function DecisionList({
  userId,
  initialDecisions,
  onViewDetails,
  className,
}: DecisionListProps) {
  const [decisions, setDecisions] = useState<Decision[]>(initialDecisions || [])
  const [loading, setLoading] = useState(!initialDecisions)
  const [error, setError] = useState<string | null>(null)

  // Pagination
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [total, setTotal] = useState(0)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [domainFilter, setDomainFilter] = useState<DecisionDomain | ''>('')
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeStatus | ''>('')
  const [showFilters, setShowFilters] = useState(false)

  // Fetch decisions
  const fetchDecisions = async (resetPage = false) => {
    setLoading(true)
    setError(null)

    const currentPage = resetPage ? 1 : page

    try {
      const params = new URLSearchParams({
        user_id: userId,
        page: currentPage.toString(),
        limit: '20',
      })

      if (searchQuery) params.set('search', searchQuery)
      if (domainFilter) params.set('domain', domainFilter)
      if (outcomeFilter) params.set('outcome_status', outcomeFilter)

      const response = await fetch(`/api/decisions?${params}`)
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to load decisions')
      }

      if (resetPage) {
        setDecisions(result.data)
        setPage(1)
      } else {
        setDecisions((prev) =>
          currentPage === 1 ? result.data : [...prev, ...result.data]
        )
      }

      setTotal(result.total)
      setHasMore(result.has_more)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    if (!initialDecisions) {
      fetchDecisions(true)
    }
  }, [userId])

  // Refetch when filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDecisions(true)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, domainFilter, outcomeFilter])

  // Handle outcome update
  const handleUpdateOutcome = async (
    id: string,
    status: OutcomeStatus,
    notes?: string,
    rating?: number
  ) => {
    try {
      const response = await fetch(`/api/decisions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          outcome_status: status,
          outcome_notes: notes,
          outcome_rating: rating,
        }),
      })

      const result = await response.json()
      if (result.success) {
        setDecisions((prev) =>
          prev.map((d) => (d.id === id ? result.decision : d))
        )
      }
    } catch (err) {
      console.error('Error updating outcome:', err)
    }
  }

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this decision?')) return

    try {
      const response = await fetch(`/api/decisions/${id}?user_id=${userId}`, {
        method: 'DELETE',
      })

      const result = await response.json()
      if (result.success) {
        setDecisions((prev) => prev.filter((d) => d.id !== id))
        setTotal((prev) => prev - 1)
      }
    } catch (err) {
      console.error('Error deleting decision:', err)
    }
  }

  // Domain options
  const domainOptions: { value: DecisionDomain | ''; label: string }[] = [
    { value: '', label: 'All Domains' },
    { value: 'general', label: 'General' },
    { value: 'career', label: 'Career' },
    { value: 'trading', label: 'Trading' },
    { value: 'apartment', label: 'Apartment' },
    { value: 'vacation', label: 'Vacation' },
    { value: 'technology', label: 'Technology' },
    { value: 'finance', label: 'Finance' },
    { value: 'health', label: 'Health' },
  ]

  // Outcome options
  const outcomeOptions: { value: OutcomeStatus | ''; label: string }[] = [
    { value: '', label: 'All Outcomes' },
    { value: 'pending', label: 'Pending' },
    { value: 'good', label: 'Good' },
    { value: 'neutral', label: 'Neutral' },
    { value: 'bad', label: 'Bad' },
  ]

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Decision History</h2>
          <Badge variant="outline">{total} decisions</Badge>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search decisions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border rounded-lg bg-background"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(showFilters && 'bg-accent')}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
            <ChevronDown
              className={cn('w-4 h-4 ml-1 transition-transform', showFilters && 'rotate-180')}
            />
          </Button>
        </div>

        {/* Filter Options */}
        {showFilters && (
          <div className="flex gap-2 p-3 rounded-lg bg-muted/50">
            <select
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value as DecisionDomain | '')}
              className="px-3 py-1.5 border rounded-lg bg-background text-sm"
            >
              {domainOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <select
              value={outcomeFilter}
              onChange={(e) => setOutcomeFilter(e.target.value as OutcomeStatus | '')}
              className="px-3 py-1.5 border rounded-lg bg-background text-sm"
            >
              {outcomeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {(domainFilter || outcomeFilter || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDomainFilter('')
                  setOutcomeFilter('')
                  setSearchQuery('')
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300">
          {error}
          <Button variant="link" onClick={() => fetchDecisions(true)} className="ml-2">
            Retry
          </Button>
        </div>
      )}

      {/* Loading State */}
      {loading && decisions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin mb-4" />
          <p>Loading decisions...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && decisions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Brain className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="font-medium text-lg mb-1">No decisions yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Start a debate and save your first decision to build your history.
          </p>
          <Button variant="outline" asChild>
            <a href="/">Start a Debate</a>
          </Button>
        </div>
      )}

      {/* Decision List */}
      <div className="space-y-3">
        {decisions.map((decision) => (
          <DecisionCard
            key={decision.id}
            decision={decision}
            onUpdateOutcome={handleUpdateOutcome}
            onDelete={handleDelete}
            onViewDetails={onViewDetails}
          />
        ))}
      </div>

      {/* Load More */}
      {hasMore && decisions.length > 0 && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={() => {
              setPage((p) => p + 1)
              fetchDecisions()
            }}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                Load More
                <TrendingUp className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}

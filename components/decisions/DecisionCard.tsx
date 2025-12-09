'use client'

import { useState } from 'react'
import {
  Calendar,
  Brain,
  CheckCircle,
  XCircle,
  MinusCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Tag,
  Trash2,
  Star,
  MessageSquare,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Decision, OutcomeStatus } from '@/lib/decisions/decision-types'

interface DecisionCardProps {
  decision: Decision
  onUpdateOutcome?: (id: string, status: OutcomeStatus, notes?: string, rating?: number) => void
  onDelete?: (id: string) => void
  onViewDetails?: (decision: Decision) => void
  className?: string
  compact?: boolean
}

/**
 * Decision Card - Display a single decision with outcome tracking
 */
export function DecisionCard({
  decision,
  onUpdateOutcome,
  onDelete,
  onViewDetails,
  className,
  compact = false,
}: DecisionCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [showOutcomeForm, setShowOutcomeForm] = useState(false)
  const [outcomeNotes, setOutcomeNotes] = useState('')
  const [outcomeRating, setOutcomeRating] = useState<number>(0)

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  // Get outcome badge
  const getOutcomeBadge = () => {
    switch (decision.outcome_status) {
      case 'good':
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
            <CheckCircle className="w-3 h-3 mr-1" />
            Good Outcome
          </Badge>
        )
      case 'bad':
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
            <XCircle className="w-3 h-3 mr-1" />
            Bad Outcome
          </Badge>
        )
      case 'neutral':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
            <MinusCircle className="w-3 h-3 mr-1" />
            Neutral
          </Badge>
        )
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        )
    }
  }

  // Get domain badge color
  const getDomainColor = () => {
    const colors: Record<string, string> = {
      career: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      trading: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      apartment: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      vacation: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      technology: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
      finance: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
      general: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    }
    return colors[decision.domain] || colors.general
  }

  // Handle outcome submission
  const handleSubmitOutcome = (status: OutcomeStatus) => {
    if (onUpdateOutcome) {
      onUpdateOutcome(decision.id, status, outcomeNotes || undefined, outcomeRating || undefined)
    }
    setShowOutcomeForm(false)
    setOutcomeNotes('')
    setOutcomeRating(0)
  }

  // Render star rating
  const renderStars = () => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setOutcomeRating(star)}
            className={cn(
              'transition-colors',
              star <= outcomeRating ? 'text-yellow-500' : 'text-gray-300 dark:text-gray-600'
            )}
          >
            <Star className="w-5 h-5" fill={star <= outcomeRating ? 'currentColor' : 'none'} />
          </button>
        ))}
      </div>
    )
  }

  if (compact) {
    return (
      <div
        className={cn(
          'p-3 rounded-lg border hover:border-primary/50 cursor-pointer transition-all',
          'bg-card hover:bg-accent/50',
          className
        )}
        onClick={() => onViewDetails?.(decision)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{decision.title || decision.query}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">
                {formatDate(decision.created_at)}
              </span>
              <Badge variant="outline" className="text-xs">
                {decision.domain}
              </Badge>
            </div>
          </div>
          {getOutcomeBadge()}
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-lg border bg-card shadow-sm transition-all',
        expanded && 'ring-2 ring-primary/20',
        className
      )}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Title & Query */}
            <h3 className="font-semibold text-lg mb-1">
              {decision.title || 'Decision'}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {decision.query}
            </p>
          </div>

          {/* Outcome Badge */}
          <div className="flex-shrink-0">{getOutcomeBadge()}</div>
        </div>

        {/* Meta Info */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            {formatDate(decision.created_at)}
          </div>

          <Badge variant="outline" className={getDomainColor()}>
            {decision.domain}
          </Badge>

          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Brain className="w-3.5 h-3.5" />
            {decision.models_used?.length || 0} models
          </div>

          {decision.confidence_score && (
            <Badge variant="outline">
              {Math.round(decision.confidence_score * 100)}% confidence
            </Badge>
          )}
        </div>

        {/* Tags */}
        {decision.tags && decision.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {decision.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                <Tag className="w-3 h-3 mr-1" />
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Recommendation Preview */}
      {decision.final_recommendation && (
        <div className="px-4 pb-3">
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-sm font-medium mb-1">Recommendation</p>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {decision.final_recommendation}
            </p>
          </div>
        </div>
      )}

      {/* Expand/Collapse Button */}
      <div className="px-4 pb-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="w-full justify-center"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-4 h-4 mr-1" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4 mr-1" />
              Show More
            </>
          )}
        </Button>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t pt-4">
          {/* Key Agreements & Disagreements */}
          {(decision.key_agreements?.length || decision.key_disagreements?.length) && (
            <div className="grid md:grid-cols-2 gap-4">
              {decision.key_agreements && decision.key_agreements.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-2">
                    Key Agreements
                  </p>
                  <ul className="text-sm space-y-1">
                    {decision.key_agreements.slice(0, 3).map((item, i) => (
                      <li key={i} className="text-muted-foreground">
                        • {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {decision.key_disagreements && decision.key_disagreements.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-2">
                    Key Disagreements
                  </p>
                  <ul className="text-sm space-y-1">
                    {decision.key_disagreements.slice(0, 3).map((item, i) => (
                      <li key={i} className="text-muted-foreground">
                        • {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Models Used */}
          <div>
            <p className="text-sm font-medium mb-2">Models Used</p>
            <div className="flex flex-wrap gap-1">
              {decision.models_used?.map((model) => (
                <Badge key={model} variant="secondary" className="text-xs font-mono">
                  {model}
                </Badge>
              ))}
            </div>
          </div>

          {/* Outcome Notes */}
          {decision.outcome_notes && (
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm font-medium mb-1 flex items-center gap-1">
                <MessageSquare className="w-4 h-4" />
                Outcome Notes
              </p>
              <p className="text-sm text-muted-foreground">{decision.outcome_notes}</p>
            </div>
          )}

          {/* Outcome Rating */}
          {decision.outcome_rating && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rating:</span>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={cn(
                      'w-4 h-4',
                      star <= decision.outcome_rating!
                        ? 'text-yellow-500 fill-yellow-500'
                        : 'text-gray-300'
                    )}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Outcome Update Form */}
          {decision.outcome_status === 'pending' && onUpdateOutcome && (
            <div className="border-t pt-4">
              {!showOutcomeForm ? (
                <Button
                  variant="outline"
                  onClick={() => setShowOutcomeForm(true)}
                  className="w-full"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Record Outcome
                </Button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-medium">How did this decision turn out?</p>

                  {/* Rating */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Rating:</span>
                    {renderStars()}
                  </div>

                  {/* Notes */}
                  <textarea
                    placeholder="Add notes about the outcome (optional)..."
                    value={outcomeNotes}
                    onChange={(e) => setOutcomeNotes(e.target.value)}
                    className="w-full p-2 text-sm border rounded-lg resize-none"
                    rows={2}
                  />

                  {/* Outcome Buttons */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowOutcomeForm(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleSubmitOutcome('good')}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Good
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleSubmitOutcome('neutral')}
                      className="flex-1 bg-yellow-600 hover:bg-yellow-700"
                    >
                      <MinusCircle className="w-4 h-4 mr-1" />
                      Neutral
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleSubmitOutcome('bad')}
                      className="flex-1 bg-red-600 hover:bg-red-700"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Bad
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between items-center pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewDetails?.(decision)}
            >
              View Full Details
            </Button>

            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(decision.id)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Delete
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

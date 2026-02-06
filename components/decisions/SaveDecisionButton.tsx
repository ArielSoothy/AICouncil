'use client'

import { useState } from 'react'
import { Save, Check, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { DebateSession } from '@/lib/agents/types'
import { DecisionDomain } from '@/lib/decisions/decision-types'

interface SaveDecisionButtonProps {
  session: DebateSession
  userId?: string | null
  onSave?: (decisionId: string) => void
  className?: string
  variant?: 'default' | 'compact' | 'minimal'
}

/**
 * SaveDecisionButton - Button to save a debate decision to memory
 *
 * Appears after a debate is complete to let users save the decision
 * for future reference and outcome tracking.
 */
export function SaveDecisionButton({
  session,
  userId,
  onSave,
  className,
  variant = 'default',
}: SaveDecisionButtonProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)

  // Don't show if debate isn't complete
  if (session.status !== 'completed') {
    return null
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/decisions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          debate_session: session,
          user_id: userId || null,
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to save decision')
      }

      setSaved(true)
      setSavedId(result.decision.id)
      onSave?.(result.decision.id)

    } catch (err) {
      console.error('[SaveDecisionButton] Error:', err)
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  // Saved state
  if (saved) {
    if (variant === 'minimal') {
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
          <Check className="w-3 h-3 mr-1" />
          Saved
        </Badge>
      )
    }

    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
          <Check className="w-3.5 h-3.5 mr-1" />
          Decision Saved
        </Badge>
        <span className="text-xs text-muted-foreground">
          ID: {savedId?.slice(0, 8)}...
        </span>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Badge variant="destructive">
          <X className="w-3 h-3 mr-1" />
          {error}
        </Badge>
        <Button size="sm" variant="ghost" onClick={() => setError(null)}>
          Retry
        </Button>
      </div>
    )
  }

  // Minimal variant
  if (variant === 'minimal') {
    return (
      <Button
        size="sm"
        variant="ghost"
        onClick={handleSave}
        disabled={isSaving}
        className={className}
      >
        {isSaving ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Save className="w-4 h-4" />
        )}
      </Button>
    )
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={handleSave}
        disabled={isSaving}
        className={cn('gap-2', className)}
      >
        {isSaving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="w-4 h-4" />
            Save
          </>
        )}
      </Button>
    )
  }

  // Default variant
  return (
    <div
      className={cn(
        'p-4 rounded-lg border bg-card',
        'border-dashed border-muted-foreground/30',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">Save this decision</p>
          <p className="text-sm text-muted-foreground">
            Track the outcome and build your decision history
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Decision
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

/**
 * Auto-save wrapper that saves decisions automatically
 */
interface AutoSaveDecisionProps {
  session: DebateSession
  userId?: string | null
  enabled?: boolean
  onSaved?: (decisionId: string) => void
}

export function AutoSaveDecision({
  session,
  userId,
  enabled = true,
  onSaved,
}: AutoSaveDecisionProps) {
  const [savedId, setSavedId] = useState<string | null>(null)

  // Auto-save on mount when enabled and session is complete
  useState(() => {
    if (!enabled || session.status !== 'completed' || savedId) return

    const autoSave = async () => {
      try {
        const response = await fetch('/api/decisions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            debate_session: session,
            user_id: userId || null,
          }),
        })

        const result = await response.json()
        if (result.success) {
          setSavedId(result.decision.id)
          onSaved?.(result.decision.id)
        }
      } catch (err) {
        console.error('[AutoSaveDecision] Error:', err)
      }
    }

    autoSave()
  })

  if (!savedId) return null

  return (
    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-xs">
      <Check className="w-3 h-3 mr-1" />
      Auto-saved
    </Badge>
  )
}

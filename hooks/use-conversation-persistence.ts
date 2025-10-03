'use client'

/**
 * Custom hook for conversation persistence across page refreshes
 *
 * Features:
 * - URL parameter-based restoration (?c=conversation-id)
 * - localStorage fallback for last conversation
 * - Automatic restoration on mount
 * - Shareable URLs
 * - Browser history support
 *
 * Usage:
 * ```typescript
 * const { saveConversation, isRestoring, restoredData } = useConversationPersistence({
 *   storageKey: 'ultra-mode',
 *   onRestored: (conversation) => {
 *     setResult(conversation.responses)
 *     setPrompt(conversation.query)
 *   }
 * })
 *
 * // After saving conversation to database
 * saveConversation(conversationId)
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  SavedConversation,
  ConversationPersistenceOptions,
  ConversationPersistenceReturn,
} from '@/lib/types/conversation'

export function useConversationPersistence(
  options: ConversationPersistenceOptions
): ConversationPersistenceReturn {
  const {
    storageKey,
    onRestored,
    onError,
    autoRestore = true,
  } = options

  const router = useRouter()
  const searchParams = useSearchParams()
  const [isRestoring, setIsRestoring] = useState(false)
  const [restoredData, setRestoredData] = useState<SavedConversation | null>(null)
  const [error, setError] = useState<Error | null>(null)

  // Track if we've already attempted restoration to prevent duplicate attempts
  const hasAttemptedRestore = useRef(false)

  /**
   * Fetch conversation from API
   */
  const fetchConversation = useCallback(async (conversationId: string): Promise<SavedConversation | null> => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Conversation not found')
        }
        if (response.status === 401) {
          throw new Error('Unauthorized - please sign in')
        }
        throw new Error('Failed to fetch conversation')
      }

      const conversation = await response.json()
      return conversation as SavedConversation
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      console.error('Error fetching conversation:', error)
      throw error
    }
  }, [])

  /**
   * Restore conversation from ID
   */
  const restoreConversation = useCallback(async (conversationId: string) => {
    if (!conversationId) return

    setIsRestoring(true)
    setError(null)

    try {
      const conversation = await fetchConversation(conversationId)

      if (conversation) {
        setRestoredData(conversation)

        // Call user's onRestored callback
        if (onRestored) {
          onRestored(conversation)
        }

        // Save to localStorage as last conversation
        if (typeof window !== 'undefined') {
          localStorage.setItem(storageKey, conversationId)
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to restore conversation')
      setError(error)

      // Call user's onError callback
      if (onError) {
        onError(error)
      }
    } finally {
      setIsRestoring(false)
    }
  }, [fetchConversation, onRestored, onError, storageKey])

  /**
   * Save conversation ID and update URL/localStorage
   */
  const saveConversation = useCallback((conversationId: string) => {
    if (!conversationId) return

    // Update URL with conversation ID (without page reload)
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set('c', conversationId)
      router.replace(url.pathname + url.search, { scroll: false })

      // Save to localStorage
      localStorage.setItem(storageKey, conversationId)
    }
  }, [router, storageKey])

  /**
   * Auto-restore conversation on mount
   */
  useEffect(() => {
    // Only run on client-side and if auto-restore is enabled
    if (typeof window === 'undefined' || !autoRestore) return

    // Prevent duplicate restoration attempts
    if (hasAttemptedRestore.current) return
    hasAttemptedRestore.current = true

    // Priority 1: Check URL parameter
    const urlConversationId = searchParams?.get('c')

    if (urlConversationId) {
      restoreConversation(urlConversationId)
      return
    }

    // Priority 2: Check localStorage (fallback)
    const storedConversationId = localStorage.getItem(storageKey)

    if (storedConversationId) {
      restoreConversation(storedConversationId)
    }
  }, [autoRestore, searchParams, storageKey, restoreConversation])

  return {
    saveConversation,
    isRestoring,
    restoredData,
    error,
    restoreConversation,
  }
}

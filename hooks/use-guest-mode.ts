'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'

const GUEST_QUERIES_KEY = 'verdict_guest_queries'
const MAX_FREE_QUERIES = 2

export function useGuestMode() {
  const { user } = useAuth()
  const [queriesUsed, setQueriesUsed] = useState(0)
  const [isGuestLimitReached, setIsGuestLimitReached] = useState(false)

  // Load query count from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined' || user) return

    const stored = localStorage.getItem(GUEST_QUERIES_KEY)
    const count = stored ? parseInt(stored, 10) : 0
    setQueriesUsed(count)
    setIsGuestLimitReached(count >= MAX_FREE_QUERIES)
  }, [user])

  // Track a new query
  const trackQuery = () => {
    if (user) return // Logged-in users have no limits

    const newCount = queriesUsed + 1
    setQueriesUsed(newCount)
    setIsGuestLimitReached(newCount >= MAX_FREE_QUERIES)

    if (typeof window !== 'undefined') {
      localStorage.setItem(GUEST_QUERIES_KEY, newCount.toString())
    }
  }

  // Reset count (for testing or when user signs up)
  const resetGuestQueries = () => {
    setQueriesUsed(0)
    setIsGuestLimitReached(false)

    if (typeof window !== 'undefined') {
      localStorage.removeItem(GUEST_QUERIES_KEY)
    }
  }

  return {
    isGuest: !user,
    queriesUsed,
    queriesRemaining: Math.max(0, MAX_FREE_QUERIES - queriesUsed),
    isGuestLimitReached,
    maxFreeQueries: MAX_FREE_QUERIES,
    trackQuery,
    resetGuestQueries,
  }
}

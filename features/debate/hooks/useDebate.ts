// Custom hook for debate functionality
// Separates business logic from UI components

import { useState, useCallback, useRef } from 'react'
import { DebateConfig, DebateSession, StreamEvent, DebateStatus } from '../types'
import { DebateAPI } from '../api/debate-api'

export function useDebate() {
  const [status, setStatus] = useState<DebateStatus>('idle')
  const [session, setSession] = useState<DebateSession | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [streamEvents, setStreamEvents] = useState<StreamEvent[]>([])
  const abortControllerRef = useRef<AbortController | null>(null)

  const startDebate = useCallback(async (config: DebateConfig) => {
    // Clean up any previous debate
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Reset state
    setStatus('debating')
    setError(null)
    setStreamEvents([])
    setSession(null)

    // Create new abort controller for this debate
    abortControllerRef.current = new AbortController()

    try {
      const newSession = await DebateAPI.startDebate(
        config,
        (event: StreamEvent) => {
          // Handle streaming events
          setStreamEvents(prev => [...prev, event])
          
          // Update status based on event type
          switch (event.type) {
            case 'debate_completed':
              setStatus('completed')
              break
            case 'error':
              setStatus('error')
              setError(event.data?.message || 'Unknown error')
              break
          }
        }
      )

      setSession(newSession)
      setStatus('completed')
      return newSession
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Debate failed'
      setError(errorMessage)
      setStatus('error')
      throw err
    }
  }, [])

  const resetDebate = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setStatus('idle')
    setSession(null)
    setError(null)
    setStreamEvents([])
  }, [])

  const retryDebate = useCallback(async (config: DebateConfig) => {
    resetDebate()
    return startDebate(config)
  }, [resetDebate, startDebate])

  return {
    // State
    status,
    session,
    error,
    streamEvents,
    
    // Actions
    startDebate,
    resetDebate,
    retryDebate,
    
    // Computed
    isLoading: status === 'debating',
    isCompleted: status === 'completed',
    hasError: status === 'error'
  }
}
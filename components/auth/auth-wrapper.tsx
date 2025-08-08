'use client'

import React from 'react'
import { useAuth } from '@/contexts/auth-context'
import { AuthForms } from './auth-forms'

interface AuthWrapperProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  allowAnonymous?: boolean
}

export function AuthWrapper({ children, fallback, allowAnonymous = false }: AuthWrapperProps) {
  const { user, loading } = useAuth()
  const [showFallback, setShowFallback] = React.useState(false)

  // Add timeout to prevent infinite loading - after 2 seconds show fallback
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        console.log('Auth loading timeout, showing fallback')
        setShowFallback(true)
      }
    }, 2000) // Reduced from 3 seconds to 2 seconds
    
    return () => clearTimeout(timer)
  }, [loading])

  // If auth finishes or a user is present, ensure fallback is hidden
  React.useEffect(() => {
    if (!loading || user) {
      setShowFallback(false)
    }
  }, [loading, user])

  // If allowing anonymous access, don't block on loading
  if (allowAnonymous) return <>{children}</>

  // If signed in, always render children (ignore fallback state)
  if (user) return <>{children}</>

  // Otherwise, show loader briefly, then fallback
  if (loading && !showFallback) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return fallback || <AuthForms />
}
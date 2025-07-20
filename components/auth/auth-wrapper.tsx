'use client'

import { useAuth } from '@/contexts/auth-context'
import { AuthForms } from './auth-forms'

interface AuthWrapperProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function AuthWrapper({ children, fallback }: AuthWrapperProps) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return fallback || <AuthForms />
  }

  return <>{children}</>
}
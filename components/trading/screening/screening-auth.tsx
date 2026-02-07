'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { Lock } from 'lucide-react'

const SESSION_KEY = 'screening_auth_key'

interface ScreeningAuthProps {
  children: ReactNode
}

export function ScreeningAuth({ children }: ScreeningAuthProps) {
  const [authenticated, setAuthenticated] = useState(false)
  const [checking, setChecking] = useState(true)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    // Check if SCREENING_ACCESS_KEY is even configured by trying without a key
    // If the API returns data without a key, auth is not required
    const stored = sessionStorage.getItem(SESSION_KEY)
    if (stored) {
      validateKey(stored).then(valid => {
        if (valid) {
          setAuthenticated(true)
        } else {
          sessionStorage.removeItem(SESSION_KEY)
        }
        setChecking(false)
      })
    } else {
      // Try without a key - if it works, no auth needed
      validateKey('').then(valid => {
        if (valid) {
          setAuthenticated(true)
        }
        setChecking(false)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function validateKey(key: string): Promise<boolean> {
    try {
      const headers: Record<string, string> = {}
      if (key) {
        headers['x-screening-key'] = key
      }
      const res = await fetch('/api/trading/screening/results', { headers })
      // 401 means auth is required and key is wrong
      // 404 means auth passed but no data yet - that's fine
      return res.status !== 401
    } catch {
      // Network error - allow through (will fail later with better error)
      return true
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const valid = await validateKey(password)
    if (valid) {
      sessionStorage.setItem(SESSION_KEY, password)
      setAuthenticated(true)
    } else {
      setError('Invalid access key')
    }
  }

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (authenticated) {
    return <>{children}</>
  }

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-sm w-full">
        <div className="flex items-center justify-center mb-6">
          <div className="bg-blue-100 dark:bg-blue-900 rounded-full p-3">
            <Lock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <h2 className="text-xl font-semibold text-center mb-2 text-gray-900 dark:text-gray-100">
          Screening Access
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
          Enter your access key to view screening results
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Access key"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            autoFocus
          />
          {error && (
            <p className="text-red-500 text-sm mt-2">{error}</p>
          )}
          <button
            type="submit"
            className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Unlock
          </button>
        </form>
      </div>
    </div>
  )
}

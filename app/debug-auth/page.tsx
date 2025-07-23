'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'

export default function DebugAuthPage() {
  const { user, loading } = useAuth()
  const [authTestResult, setAuthTestResult] = useState<any>(null)
  const [conversationTestResult, setConversationTestResult] = useState<any>(null)

  const testAuth = async () => {
    try {
      const response = await fetch('/api/auth-test', {
        credentials: 'include'
      })
      const data = await response.json()
      setAuthTestResult({ status: response.status, data })
    } catch (error) {
      setAuthTestResult({ error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }

  const testConversations = async () => {
    try {
      const response = await fetch('/api/conversations', {
        credentials: 'include'
      })
      const data = await response.json()
      setConversationTestResult({ status: response.status, data })
    } catch (error) {
      setConversationTestResult({ error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Authentication Debug Page</h1>
      
      <div className="space-y-4">
        <div className="p-4 border rounded">
          <h2 className="text-lg font-semibold mb-2">Frontend Auth State</h2>
          <pre className="text-sm bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto">
            {JSON.stringify({
              user: user ? {
                id: user.id,
                email: user.email,
                created_at: user.created_at
              } : null,
              loading
            }, null, 2)}
          </pre>
        </div>

        <div className="space-x-4">
          <Button onClick={testAuth}>Test Auth API</Button>
          <Button onClick={testConversations}>Test Conversations API</Button>
        </div>

        {authTestResult && (
          <div className="p-4 border rounded">
            <h2 className="text-lg font-semibold mb-2">Auth API Test Result</h2>
            <pre className="text-sm bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto">
              {JSON.stringify(authTestResult, null, 2)}
            </pre>
          </div>
        )}

        {conversationTestResult && (
          <div className="p-4 border rounded">
            <h2 className="text-lg font-semibold mb-2">Conversations API Test Result</h2>
            <pre className="text-sm bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto">
              {JSON.stringify(conversationTestResult, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { AuthWrapper } from '@/components/auth/auth-wrapper'
import { Header } from '@/components/ui/header'
import { Button } from '@/components/ui/button'
import { Database } from '@/types/database'
import Link from 'next/link'

type Conversation = Database['public']['Tables']['conversations']['Row']

export default function DashboardPage() {
  return (
    <AuthWrapper>
      <DashboardContent />
    </AuthWrapper>
  )
}

function DashboardContent() {
  const { user, signOut } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchConversations()
  }, [])

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/conversations')
      if (response.ok) {
        const data = await response.json()
        setConversations(data)
      } else {
        setError('Failed to fetch conversations')
      }
    } catch (err) {
      setError('Error loading conversations')
    } finally {
      setLoading(false)
    }
  }

  const deleteConversation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this conversation?')) return

    try {
      const response = await fetch(`/api/conversations/${id}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        setConversations(conversations.filter(conv => conv.id !== id))
      } else {
        setError('Failed to delete conversation')
      }
    } catch (err) {
      setError('Error deleting conversation')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground">
                Welcome back, {user?.email}
              </p>
            </div>
            <div className="flex gap-4">
              <Link href="/">
                <Button variant="outline">New Query</Button>
              </Link>
              <Button
                variant="outline"
                onClick={signOut}
              >
                Sign Out
              </Button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          <div className="bg-white rounded-lg border">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Conversation History</h2>
              <p className="text-muted-foreground">
                Your past AI consensus queries and responses
              </p>
            </div>

            {conversations.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-muted-foreground mb-4">
                  No conversations yet. Start by creating your first query!
                </p>
                <Link href="/">
                  <Button>Create New Query</Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y">
                {conversations.map((conversation) => (
                  <div key={conversation.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {conversation.query}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {formatDate(conversation.created_at)}
                        </p>
                        <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                          <span>
                            {Array.isArray(conversation.responses?.models) 
                              ? `${conversation.responses.models.length} models` 
                              : 'Multiple models'}
                          </span>
                          <span>
                            Consensus: {
                              conversation.responses?.confidence || 
                              conversation.responses?.consensus?.score || 
                              'N/A'
                            }%
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            // Create a simple modal/alert to show conversation data
                            const responseData = JSON.stringify(conversation.responses, null, 2)
                            alert(`Query: ${conversation.query}\n\nResponse Data:\n${responseData.substring(0, 500)}...`)
                          }}
                        >
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteConversation(conversation.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
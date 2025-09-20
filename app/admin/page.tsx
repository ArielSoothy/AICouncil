'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart3, Users, MessageSquare, TrendingUp, Database } from 'lucide-react'

interface AnalyticsData {
  totalConversations: number
  totalFeedback: number
  averageRating: number
  recentQueries: Array<{
    id: string
    query: string
    created_at: string
    user_id: string | null
  }>
  savedConversations: Array<{
    id: string
    query: string
    responses: any
    created_at: string
    user_id: string | null
  }>
  dailyStats: Array<{
    date: string
    conversations: number
    feedback: number
  }>
}

export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Simple admin check - in MVP, just check if user email is admin
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)

  useEffect(() => {
    // Simple admin check for MVP
    const checkAdminAccess = async () => {
      try {
        // In development mode, bypass password prompt
        if (process.env.NODE_ENV === 'development') {
          setIsAdmin(true)
          loadAnalytics()
        } else {
          // Production: prompt for admin password
          const adminPassword = prompt('Enter admin password:')
          if (adminPassword === 'verdict2025') { // Simple MVP admin password
            setIsAdmin(true)
            loadAnalytics()
          } else {
            setError('Access denied. Admin access required.')
          }
        }
      } catch (error) {
        setError('Authentication failed')
      }
      setCheckingAuth(false)
    }

    checkAdminAccess()
  }, [])

  const loadAnalytics = async () => {
    try {
      const response = await fetch('/api/admin/analytics')
      if (!response.ok) {
        throw new Error('Failed to load analytics')
      }
      const data = await response.json()
      setAnalytics(data)
    } catch (error) {
      setError('Failed to load analytics data')
    } finally {
      setIsLoading(false)
    }
  }

  if (checkingAuth) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4">Checking admin access...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold">Admin Analytics Dashboard</h1>
            <p className="text-muted-foreground">Verdict AI usage analytics and feedback</p>
          </div>
        </div>
        <Badge variant="outline" className="bg-blue-50 text-blue-700">
          🔒 Admin Access
        </Badge>
      </div>

      {analytics && (
        <>
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Conversations</p>
                  <p className="text-2xl font-bold">{analytics.totalConversations}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-blue-600" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Feedback Received</p>
                  <p className="text-2xl font-bold">{analytics.totalFeedback}</p>
                </div>
                <Users className="h-8 w-8 text-green-600" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Average Rating</p>
                  <p className="text-2xl font-bold">{analytics.averageRating.toFixed(1)}/5</p>
                </div>
                <TrendingUp className="h-8 w-8 text-yellow-600" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Data Points</p>
                  <p className="text-2xl font-bold">{analytics.dailyStats.length}</p>
                </div>
                <Database className="h-8 w-8 text-purple-600" />
              </div>
            </Card>
          </div>

          {/* Recent Queries */}
          <Card className="p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Recent Queries</h2>
            <div className="space-y-3">
              {analytics.recentQueries.slice(0, 10).map((query) => (
                <div key={query.id} className="border-l-4 border-blue-500 pl-4 py-2">
                  <p className="font-medium truncate">{query.query}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <span>{new Date(query.created_at).toLocaleDateString()}</span>
                    <Badge variant="outline" className="text-xs">
                      {query.user_id ? 'Authenticated' : 'Guest'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Saved Conversations */}
          <Card className="p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Saved Conversations (Q&A)</h2>
            <div className="space-y-4">
              {analytics.savedConversations.slice(0, 10).map((conversation) => (
                <div key={conversation.id} className="border-l-4 border-green-500 pl-4 py-3">
                  <div className="mb-3">
                    <p className="font-medium text-sm text-muted-foreground mb-1">Question:</p>
                    <p className="font-medium">{conversation.query}</p>
                  </div>

                  {conversation.responses && (
                    <div className="mb-3">
                      <p className="font-medium text-sm text-muted-foreground mb-2">Answers:</p>
                      <div className="space-y-2 text-sm">
                        {typeof conversation.responses === 'object' && conversation.responses !== null ? (
                          Object.entries(conversation.responses).map(([provider, response]: [string, any]) => (
                            <div key={provider} className="bg-gray-50 p-2 rounded">
                              <div className="font-medium text-xs text-blue-600 mb-1">{provider.toUpperCase()}</div>
                              <div className="text-gray-700 line-clamp-3">
                                {typeof response === 'string'
                                  ? response.substring(0, 200) + (response.length > 200 ? '...' : '')
                                  : JSON.stringify(response).substring(0, 200) + '...'
                                }
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="bg-gray-50 p-2 rounded text-sm text-gray-700">
                            {String(conversation.responses).substring(0, 200)}...
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{new Date(conversation.created_at).toLocaleDateString()}</span>
                    <span>{new Date(conversation.created_at).toLocaleTimeString()}</span>
                    <Badge variant="outline" className="text-xs">
                      {conversation.user_id ? 'Authenticated' : 'Guest'}
                    </Badge>
                  </div>
                </div>
              ))}
              {analytics.savedConversations.length === 0 && (
                <p className="text-muted-foreground text-center py-4">No saved conversations yet</p>
              )}
            </div>
          </Card>

          {/* Daily Stats */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Daily Activity</h2>
            <div className="space-y-2">
              {analytics.dailyStats.slice(-7).map((day) => (
                <div key={day.date} className="flex items-center justify-between py-2 border-b">
                  <span className="font-medium">{new Date(day.date).toLocaleDateString()}</span>
                  <div className="flex gap-4 text-sm">
                    <span className="text-blue-600">{day.conversations} queries</span>
                    <span className="text-green-600">{day.feedback} feedback</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
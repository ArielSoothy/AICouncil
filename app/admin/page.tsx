'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Header } from '@/components/ui/header'
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
      <>
        <Header />
        <div className="container mx-auto py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4">Checking admin access...</p>
          </div>
        </div>
      </>
    )
  }

  if (!isAdmin) {
    return (
      <>
        <Header />
        <div className="container mx-auto py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
            <p className="text-muted-foreground">{error}</p>
          </div>
        </div>
      </>
    )
  }

  if (isLoading) {
    return (
      <>
        <Header />
        <div className="container mx-auto py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4">Loading analytics...</p>
          </div>
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <Header />
        <div className="container mx-auto py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
            <p className="text-muted-foreground">{error}</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header />
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
            {analytics.savedConversations.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No saved conversations yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                      <th className="py-3 pr-4">Prompt</th>
                      <th className="py-3 pr-4">Answer</th>
                      <th className="py-3 pr-4">User</th>
                      <th className="py-3 pr-4">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.savedConversations.slice(0, 20).map((conversation) => (
                      <tr key={conversation.id} className="border-b border-gray-100 dark:border-gray-700/50">
                        <td className="py-3 pr-4 align-top max-w-[400px]">
                          <div className="text-gray-900 dark:text-gray-100 line-clamp-2">{conversation.query}</div>
                        </td>
                        <td className="py-3 pr-4 align-top max-w-[500px]">
                          <div className="text-gray-700 dark:text-gray-300 line-clamp-2">
                            {(() => {
                              try {
                                // Extract answer from different response formats
                                if (typeof conversation.responses === 'object' && conversation.responses !== null) {
                                  // Check for consensus response format
                                  if (conversation.responses.consensus?.unifiedAnswer) {
                                    return conversation.responses.consensus.unifiedAnswer
                                  }
                                  // Check for agent debate format
                                  if (conversation.responses.finalSynthesis?.conclusion) {
                                    return conversation.responses.finalSynthesis.conclusion
                                  }
                                  // Fallback to first response in object
                                  const firstKey = Object.keys(conversation.responses)[0]
                                  if (firstKey && conversation.responses[firstKey]) {
                                    const response = conversation.responses[firstKey]
                                    return typeof response === 'string' ? response : JSON.stringify(response).substring(0, 150)
                                  }
                                }
                                return String(conversation.responses).substring(0, 150)
                              } catch {
                                return 'Response data available'
                              }
                            })() || <span className="italic text-gray-400">No answer saved</span>}
                          </div>
                        </td>
                        <td className="py-3 pr-4 align-top">
                          <Badge variant="outline" className="text-xs">
                            {conversation.user_id ? 'Auth' : 'Guest'}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4 align-top text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {new Date(conversation.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
    </>
  )
}
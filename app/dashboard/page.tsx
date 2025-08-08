'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { AuthWrapper } from '@/components/auth/auth-wrapper'
import { Header } from '@/components/ui/header'
import { Button } from '@/components/ui/button'
import { Database } from '@/types/database'
import { EnhancedConsensusResponse } from '@/types/consensus'
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
  const [conversations, setConversations] = useState<Conversation[] | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [viewing, setViewing] = useState<Conversation | null>(null)
  const [viewData, setViewData] = useState<EnhancedConsensusResponse | null>(null)
  const [viewLoading, setViewLoading] = useState<boolean>(false)

  const fetchConversations = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/conversations', { credentials: 'include' })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load conversations')
      }
      setConversations(data as Conversation[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations')
      setConversations(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConversations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDelete = async (id: string) => {
    const ok = window.confirm('Delete this conversation? This cannot be undone.')
    if (!ok) return
    try {
      const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE', credentials: 'include' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Failed to delete conversation')
      }
      setConversations(prev => (prev ? prev.filter(c => c.id !== id) : prev))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const extractUnifiedAnswer = (c: Conversation): string => {
    try {
      const data = typeof c.responses === 'string' ? JSON.parse(c.responses as unknown as string) : (c.responses as unknown)
      const typed = data as EnhancedConsensusResponse
      return typed?.consensus?.unifiedAnswer || ''
    } catch {
      return ''
    }
  }

  const viewConversation = async (id: string) => {
    try {
      setViewLoading(true)
      setViewing(conversations?.find(x => (x.id as unknown as string) === id) || null)
      setViewData(null)
      const res = await fetch(`/api/conversations/${id}`, { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to load conversation')
      }
      const convo = data as Conversation
      setViewing(convo)
      const parsed = typeof convo.responses === 'string' ? JSON.parse(convo.responses as unknown as string) : (convo.responses as unknown)
      setViewData(parsed as EnhancedConsensusResponse)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to load conversation')
      setViewing(null)
      setViewData(null)
    } finally {
      setViewLoading(false)
    }
  }


  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-400">
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
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Your Conversations</h2>
                <Button variant="outline" onClick={fetchConversations}>Refresh</Button>
              </div>

              {loading && (
                <div className="p-8 text-center text-gray-600 dark:text-gray-400">Loading...</div>
              )}

              {!loading && error && (
                <div className="p-4 mb-4 text-sm text-red-700 bg-red-50 dark:bg-red-950/40 dark:text-red-300 rounded">
                  {error}
                </div>
              )}

              {!loading && !error && (!conversations || conversations.length === 0) && (
                <div className="p-8 text-center text-gray-600 dark:text-gray-400">
                  No conversations yet. Run a query and your history will appear here.
                </div>
              )}

              {!loading && !error && conversations && conversations.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                        <th className="py-3 pr-4">Prompt</th>
                        <th className="py-3 pr-4">Answer</th>
                        <th className="py-3 pr-4">Created</th>
                        <th className="py-3 pr-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {conversations.map((c) => (
                        <tr key={c.id} className="border-b border-gray-100 dark:border-gray-700/50">
                          <td className="py-3 pr-4 align-top max-w-[600px]">
                            <div className="text-gray-900 dark:text-gray-100 line-clamp-2">{c.query}</div>
                          </td>
                          <td className="py-3 pr-4 align-top max-w-[600px]">
                            <div className="text-gray-700 dark:text-gray-300 line-clamp-2">
                              {extractUnifiedAnswer(c) || <span className="italic text-gray-400">No answer saved</span>}
                            </div>
                          </td>
                          <td className="py-3 pr-4 align-top text-gray-600 dark:text-gray-400 whitespace-nowrap">
                            {c.created_at ? new Date(c.created_at as unknown as string).toLocaleString() : ''}
                          </td>
                          <td className="py-3 pr-0 align-top">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" onClick={() => viewConversation(c.id as unknown as string)}>View</Button>
                              <Button variant="outline" onClick={() => navigator.clipboard.writeText(c.query || '')}>Copy</Button>
                              <Button variant="outline" onClick={() => handleDelete(c.id as unknown as string)}>Delete</Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Simple Modal for viewing conversation details */}
          {viewing && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => { setViewing(null); setViewData(null) }}>
              <div className="w-full max-w-3xl bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold">Conversation Details</h3>
                  <Button variant="outline" onClick={() => { setViewing(null); setViewData(null) }}>Close</Button>
                </div>
                <div className="p-4 space-y-4 max-h-[70vh] overflow-auto">
                  <div>
                    <div className="text-xs uppercase text-gray-500">Prompt</div>
                    <div className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{viewing.query}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-gray-500">Unified Answer</div>
                    <div className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                      {viewLoading ? 'Loading…' : (viewData?.consensus?.unifiedAnswer || '—')}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs uppercase text-gray-500">Confidence</div>
                      <div>{viewData?.consensus?.confidence ?? '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase text-gray-500">Created</div>
                      <div>{viewing.created_at ? new Date(viewing.created_at as unknown as string).toLocaleString() : ''}</div>
                    </div>
                  </div>
                  {viewData?.consensus?.agreements?.length ? (
                    <div>
                      <div className="text-xs uppercase text-gray-500">Agreements</div>
                      <ul className="list-disc pl-5 space-y-1 text-gray-800 dark:text-gray-200">
                        {viewData.consensus.agreements.map((a, i) => (
                          <li key={i}>{a}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {viewData?.responses?.length ? (
                    <div>
                      <div className="text-xs uppercase text-gray-500 mb-1">Model Responses</div>
                      <div className="space-y-3">
                        {viewData.responses.map((r, i) => (
                          <div key={i} className="p-3 rounded border border-gray-200 dark:border-gray-700">
                            <div className="text-xs text-gray-500 mb-1">{r.model}</div>
                            <div className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap line-clamp-4">{r.response}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
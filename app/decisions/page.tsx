'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/ui/header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/contexts/auth-context'
import {
  Brain,
  History,
  TrendingUp,
  Clock,
  Star,
  BarChart3,
  CheckCircle,
  XCircle,
  MinusCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { DecisionList } from '@/components/decisions/DecisionList'
import { Decision, ModelPerformance, UserDecisionSummary } from '@/lib/decisions/decision-types'

/**
 * Decisions Page - Browse decision history and analytics
 *
 * This is the main interface for the Decision Memory system.
 * Users can:
 * - Browse past decisions
 * - Track outcomes
 * - See model performance
 * - View personal insights
 */
export default function DecisionsPage() {
  const { user, loading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState('history')
  const [summary, setSummary] = useState<UserDecisionSummary | null>(null)
  const [modelPerformance, setModelPerformance] = useState<ModelPerformance[]>([])
  const [pendingDecisions, setPendingDecisions] = useState<Decision[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch analytics data
  useEffect(() => {
    if (!user?.id) return

    const fetchAnalytics = async () => {
      setLoading(true)
      try {
        // Fetch summary
        const summaryRes = await fetch(`/api/decisions/analytics?user_id=${user.id}&type=summary`)
        const summaryData = await summaryRes.json()
        if (summaryData.success) {
          setSummary(summaryData.summary)
        }

        // Fetch model performance
        const modelsRes = await fetch(`/api/decisions/analytics?user_id=${user.id}&type=models`)
        const modelsData = await modelsRes.json()
        if (modelsData.success) {
          setModelPerformance(modelsData.performance || [])
        }

        // Fetch pending outcomes
        const pendingRes = await fetch(`/api/decisions/analytics?user_id=${user.id}&type=pending`)
        const pendingData = await pendingRes.json()
        if (pendingData.success) {
          setPendingDecisions(pendingData.decisions || [])
        }
      } catch (err) {
        console.error('Error fetching analytics:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [user?.id])

  // Auth loading
  if (authLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
      </div>
    )
  }

  // Not logged in
  if (!user) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto p-8 text-center">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Sign in Required</h2>
            <p className="text-muted-foreground mb-4">
              Sign in to access your decision history and analytics.
            </p>
            <Button asChild>
              <a href="/auth">Sign In</a>
            </Button>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Brain className="w-8 h-8 text-primary" />
              <h1 className="text-4xl font-bold tracking-tight">Decision Memory</h1>
            </div>
            <p className="text-muted-foreground">
              Track your decisions, measure outcomes, and see which AI models perform best for you.
            </p>
          </div>

          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <History className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Total Decisions</span>
                </div>
                <p className="text-3xl font-bold">{summary.total_decisions}</p>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-muted-foreground">Good Outcomes</span>
                </div>
                <p className="text-3xl font-bold text-green-600">
                  {summary.decisions_by_outcome?.good || 0}
                </p>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm text-muted-foreground">Pending Review</span>
                </div>
                <p className="text-3xl font-bold text-yellow-600">
                  {summary.decisions_by_outcome?.pending || 0}
                </p>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">This Month</span>
                </div>
                <p className="text-3xl font-bold">{summary.decisions_this_month}</p>
              </Card>
            </div>
          )}

          {/* Pending Outcomes Alert */}
          {pendingDecisions.length > 0 && (
            <Card className="p-4 mb-6 border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">
                    {pendingDecisions.length} decision{pendingDecisions.length !== 1 ? 's' : ''} need outcome review
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    Track how your decisions turned out to build your model performance data.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={() => setActiveTab('history')}
                  >
                    Review Now
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="history" className="gap-2">
                <History className="w-4 h-4" />
                History
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-2">
                <BarChart3 className="w-4 h-4" />
                Model Analytics
              </TabsTrigger>
            </TabsList>

            {/* History Tab */}
            <TabsContent value="history">
              <DecisionList userId={user.id} />
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics">
              <div className="space-y-6">
                {/* Model Leaderboard */}
                <Card className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-semibold">Model Performance Leaderboard</h2>
                  </div>

                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : modelPerformance.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No model performance data yet.</p>
                      <p className="text-sm mt-1">
                        Record decision outcomes to see which models perform best.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {modelPerformance.map((model, index) => (
                        <div
                          key={model.model}
                          className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
                        >
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-mono text-sm font-medium truncate">
                              {model.model}
                            </p>
                            <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                              <span>{model.total_decisions} decisions</span>
                              <span className="text-green-600">
                                {model.good_outcomes} good
                              </span>
                              <span className="text-red-600">{model.bad_outcomes} bad</span>
                            </div>
                          </div>
                          <div className="text-right">
                            {model.success_rate !== null ? (
                              <div>
                                <p className="text-lg font-bold">
                                  {model.success_rate.toFixed(0)}%
                                </p>
                                <p className="text-xs text-muted-foreground">success rate</p>
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                Pending
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                {/* Domain Breakdown */}
                {summary && Object.keys(summary.decisions_by_domain || {}).length > 0 && (
                  <Card className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Star className="w-5 h-5 text-primary" />
                      <h2 className="text-lg font-semibold">Decisions by Domain</h2>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {Object.entries(summary.decisions_by_domain).map(([domain, count]) => (
                        <div
                          key={domain}
                          className="p-3 rounded-lg bg-muted/50 text-center"
                        >
                          <p className="text-2xl font-bold">{count}</p>
                          <p className="text-sm text-muted-foreground capitalize">{domain}</p>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Outcome Distribution */}
                {summary && (
                  <Card className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle className="w-5 h-5 text-primary" />
                      <h2 className="text-lg font-semibold">Outcome Distribution</h2>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-green-500" />
                        <span className="text-sm">
                          Good: {summary.decisions_by_outcome?.good || 0}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-yellow-500" />
                        <span className="text-sm">
                          Neutral: {summary.decisions_by_outcome?.neutral || 0}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-red-500" />
                        <span className="text-sm">
                          Bad: {summary.decisions_by_outcome?.bad || 0}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-gray-400" />
                        <span className="text-sm">
                          Pending: {summary.decisions_by_outcome?.pending || 0}
                        </span>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}

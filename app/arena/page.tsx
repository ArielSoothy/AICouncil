'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/ui/header'
import { Button } from '@/components/ui/button'
import { Trophy, Play, Settings, TrendingUp, TrendingDown, Award } from 'lucide-react'
import { ArenaModelSelector } from '@/components/arena/arena-model-selector'

interface ModelPerformance {
  rank: number
  model_id: string
  model_name: string
  provider: string
  total_pnl: string
  win_rate: string
  total_trades: number
  winning_trades: number
  losing_trades: number
  avg_win: string
  avg_loss: string
  sharpe_ratio: string
  last_trade_at: string
}

interface ArenaConfig {
  is_enabled: boolean
  schedule_frequency: string
  enabled_models: string[]
  max_position_size: string
  max_daily_loss: string
  last_run_at: string
}

export default function ArenaModePage() {
  const [leaderboard, setLeaderboard] = useState<ModelPerformance[]>([])
  const [config, setConfig] = useState<ArenaConfig | null>(null)
  const [loading, setLoading] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    fetchLeaderboard()
    fetchConfig()
  }, [])

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch('/api/arena/leaderboard')
      const data = await response.json()
      setLeaderboard(data.leaderboard || [])
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
    } finally {
      setLoadingData(false)
    }
  }

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/arena/config')
      const data = await response.json()
      setConfig(data.config)
    } catch (error) {
      console.error('Error fetching config:', error)
    }
  }

  const handleModelsChange = async (modelIds: string[]) => {
    if (!config) return

    // Optimistic update
    setConfig({ ...config, enabled_models: modelIds })

    // Save to API
    try {
      await fetch('/api/arena/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled_models: modelIds })
      })
    } catch (error) {
      console.error('Error updating config:', error)
      // Revert on error
      await fetchConfig()
    }
  }

  const executeArenaRun = async () => {
    setExecuting(true)
    try {
      const response = await fetch('/api/arena/execute', {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        alert(`Error: ${error.error}`)
        return
      }

      const data = await response.json()
      alert(`✅ Arena run complete! ${data.tradesExecuted}/${data.totalModels} trades executed`)

      // Refresh leaderboard after execution
      await fetchLeaderboard()
      await fetchConfig()
    } catch (error) {
      console.error('Error executing arena run:', error)
      alert('Failed to execute arena run')
    } finally {
      setExecuting(false)
    }
  }

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />
    if (rank === 2) return <Award className="w-5 h-5 text-gray-400" />
    if (rank === 3) return <Award className="w-5 h-5 text-amber-600" />
    return <span className="text-muted-foreground">#{rank}</span>
  }

  const getProviderColor = (provider: string) => {
    const colors: Record<string, string> = {
      anthropic: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200',
      openai: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200',
      google: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
      groq: 'bg-slate-100 text-slate-800 dark:bg-slate-950 dark:text-slate-200',
      mistral: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200',
      xai: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200',
    }
    return colors[provider] || 'bg-gray-100 text-gray-800 dark:bg-gray-950 dark:text-gray-200'
  }

  return (
    <div>
      <Header />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-10 h-10 text-primary" />
            <h1 className="text-4xl font-bold">Arena Mode</h1>
          </div>
          <p className="text-xl text-muted-foreground">
            Autonomous AI Trading Competition - Real-time Leaderboard
          </p>
        </div>

        {/* Model Selection */}
        <div className="mb-8 bg-card rounded-lg border p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-1">Select Competing Models</h2>
            <p className="text-sm text-muted-foreground">
              Choose which AI models will compete in Arena Mode. Click badges to swap models or add new ones.
            </p>
          </div>
          <ArenaModelSelector
            enabledModels={config?.enabled_models || []}
            onChange={handleModelsChange}
          />
        </div>

      {/* Arena Stats & Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Total Models */}
        <div className="bg-card rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Competing Models</p>
              <p className="text-3xl font-bold">{config?.enabled_models.length || 0}</p>
            </div>
            <Settings className="w-8 h-8 text-muted-foreground" />
          </div>
        </div>

        {/* Last Run */}
        <div className="bg-card rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Last Run</p>
              <p className="text-lg font-medium">
                {config?.last_run_at
                  ? new Date(config.last_run_at).toLocaleString()
                  : 'Never'}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-muted-foreground" />
          </div>
        </div>

        {/* Status */}
        <div className="bg-card rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="text-lg font-medium">
                {config?.is_enabled ? (
                  <span className="text-green-600">🟢 Active</span>
                ) : (
                  <span className="text-gray-500">⚪ Disabled</span>
                )}
              </p>
            </div>
            <Button
              onClick={executeArenaRun}
              disabled={executing || !config?.is_enabled}
              size="lg"
              className="gap-2"
            >
              {executing ? (
                <>Running...</>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Run Now
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="bg-card rounded-lg border">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold">Leaderboard</h2>
          <p className="text-sm text-muted-foreground">
            Model performance ranked by total P&L
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Model
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Total P&L
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Win Rate
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Trades
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Avg Win
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Avg Loss
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Sharpe
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loadingData ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                    Loading leaderboard...
                  </td>
                </tr>
              ) : leaderboard.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Trophy className="w-12 h-12 text-muted-foreground/50" />
                      <p className="text-lg font-medium">No trading data yet</p>
                      <p className="text-sm">Run Arena Mode to start the competition!</p>
                      <Button
                        onClick={executeArenaRun}
                        disabled={executing || !config?.is_enabled}
                        className="mt-4 gap-2"
                      >
                        <Play className="w-4 h-4" />
                        Start First Run
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                leaderboard.map((model) => (
                  <tr key={model.model_id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getRankBadge(model.rank)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="font-medium">{model.model_name}</div>
                        <div>
                          <span className={`text-xs px-2 py-1 rounded-full ${getProviderColor(model.provider)}`}>
                            {model.provider}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className={`flex items-center justify-end gap-1 font-semibold ${
                        parseFloat(model.total_pnl) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {parseFloat(model.total_pnl) >= 0 ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                        ${model.total_pnl}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-medium">
                      {model.win_rate}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-muted-foreground">
                      {model.total_trades}
                      <span className="text-xs ml-1">
                        ({model.winning_trades}W / {model.losing_trades}L)
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-green-600">
                      ${model.avg_win}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-red-600">
                      ${model.avg_loss}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-medium">
                      {model.sharpe_ratio}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Arena Info */}
      <div className="mt-8 bg-muted/30 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-2">How Arena Mode Works</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• AI models compete autonomously by executing paper trades</li>
          <li>• Each model analyzes the market independently and makes trading decisions</li>
          <li>• Performance is tracked with metrics: Total P&L, Win Rate, Sharpe Ratio, Profit Factor</li>
          <li>• Leaderboard updates in real-time based on trading results</li>
          <li>• Runs can be triggered manually or scheduled (hourly/daily/weekly)</li>
        </ul>
      </div>
      </div>
    </div>
  )
}

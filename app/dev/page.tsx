'use client'

import { useState, useEffect, useRef } from 'react'
import { Header } from '@/components/ui/header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TradingFlowDiagram } from '@/components/architecture/TradingFlowDiagram'
import { ComponentInspector } from '@/components/architecture/ComponentInspector'
import { ResearchTaxonomyView } from '@/components/architecture/ResearchTaxonomyView'
import {
  Layers,
  RefreshCw,
  AlertCircle,
  Server,
  Trash2,
  Play,
  Pause,
  Filter,
  Database,
  Brain,
  Wrench,
  Globe,
  MessageSquare,
  Scale,
  CheckCircle,
  Info,
  Bug,
  Search
} from 'lucide-react'

// ============================================================================
// ARCHITECTURE TAB TYPES & CONSTANTS
// ============================================================================

type TradingMode = 'consensus' | 'debate' | 'individual'

const STORAGE_KEYS = {
  consensus: 'lastConsensusResult',
  debate: 'lastDebateResult',
  individual: 'lastIndividualResult',
  portfolio: 'lastPortfolioData',
  research: 'lastResearchMetadata'
}

interface StoredTradingData {
  symbol?: string
  timeframe?: string
  models?: string[]
  decisions?: Array<{
    model: string
    modelId: string
    action: 'BUY' | 'SELL' | 'HOLD'
    confidence: number
    reasoning?: string
  }>
  consensus?: {
    action: 'BUY' | 'SELL' | 'HOLD'
    agreement: number
    votes: { BUY: number; SELL: number; HOLD: number }
  }
  research?: {
    totalToolCalls: number
    researchDuration: number
    technical?: { findings: string; toolCallCount: number }
    fundamental?: { findings: string; toolCallCount: number }
    sentiment?: { findings: string; toolCallCount: number }
    risk?: { findings: string; toolCallCount: number }
    cached?: boolean
    cacheAge?: number
  }
  deterministicScore?: {
    recommendation: 'BUY' | 'SELL' | 'HOLD'
    weightedScore: number
    confidence: number
    bullishFactors: string[]
    bearishFactors: string[]
  }
  timestamp?: string
}

interface InspectedComponent {
  name: string
  filePath: string
  keyFunctions: string[]
  description: string
}

// ============================================================================
// BACKEND TAB TYPES & CONSTANTS
// ============================================================================

type LogLevel = 'info' | 'success' | 'warning' | 'error' | 'debug'
type LogCategory = 'api' | 'research' | 'model' | 'cache' | 'broker' | 'tool' | 'debate' | 'consensus'

interface LogEntry {
  id: string
  timestamp: string
  level: LogLevel
  category: LogCategory
  message: string
  data?: Record<string, unknown>
  source?: string
}

interface LogStats {
  total: number
  byCategory: Record<string, number>
  byLevel: Record<string, number>
}

const CATEGORY_ICONS: Record<LogCategory, typeof Server> = {
  api: Globe,
  research: Brain,
  model: Brain,
  cache: Database,
  broker: Server,
  tool: Wrench,
  debate: MessageSquare,
  consensus: Scale
}

const CATEGORY_COLORS: Record<LogCategory, string> = {
  api: 'text-blue-600 bg-blue-50 dark:bg-blue-950',
  research: 'text-purple-600 bg-purple-50 dark:bg-purple-950',
  model: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950',
  cache: 'text-green-600 bg-green-50 dark:bg-green-950',
  broker: 'text-orange-600 bg-orange-50 dark:bg-orange-950',
  tool: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-950',
  debate: 'text-pink-600 bg-pink-50 dark:bg-pink-950',
  consensus: 'text-amber-600 bg-amber-50 dark:bg-amber-950'
}

const LEVEL_ICONS: Record<LogLevel, typeof Info> = {
  info: Info,
  success: CheckCircle,
  warning: AlertCircle,
  error: AlertCircle,
  debug: Bug
}

const LEVEL_COLORS: Record<LogLevel, string> = {
  info: 'text-blue-500',
  success: 'text-green-500',
  warning: 'text-amber-500',
  error: 'text-red-500',
  debug: 'text-gray-500'
}

// ============================================================================
// ARCHITECTURE TAB COMPONENT
// ============================================================================

function ArchitectureTab() {
  const [selectedMode, setSelectedMode] = useState<TradingMode>('consensus')
  const [tradingData, setTradingData] = useState<StoredTradingData | null>(null)
  const [portfolioData, setPortfolioData] = useState<{
    balance?: number
    buyingPower?: number
    positions?: Array<{ symbol: string; qty: number }>
    broker?: string
    environment?: string
  } | null>(null)
  const [inspectedComponent, setInspectedComponent] = useState<InspectedComponent | null>(null)
  const [dataLoadError, setDataLoadError] = useState<string | null>(null)

  useEffect(() => {
    loadTradingData()
  }, [selectedMode])

  useEffect(() => {
    fetch('/api/trading/portfolio')
      .then(res => res.json())
      .then(data => {
        setPortfolioData({
          balance: data.account?.equity,
          buyingPower: data.account?.buying_power,
          positions: data.positions,
          broker: data.broker?.name,
          environment: data.broker?.environment
        })
      })
      .catch(() => {
        setPortfolioData(null)
      })
  }, [])

  const loadTradingData = () => {
    try {
      const key = STORAGE_KEYS[selectedMode]
      const stored = localStorage.getItem(key)

      if (stored) {
        const parsed = JSON.parse(stored)
        setTradingData(parsed)
        setDataLoadError(null)
      } else {
        setTradingData(null)
        setDataLoadError(`No ${selectedMode} data found. Run a trading analysis first.`)
      }
    } catch {
      setDataLoadError('Error loading stored data')
      setTradingData(null)
    }
  }

  const handleComponentClick = (component: InspectedComponent) => {
    setInspectedComponent(component)
  }

  const handleRefresh = () => {
    loadTradingData()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="flex justify-center items-center gap-3 mb-2">
          <Layers className="w-8 h-8 text-blue-500" />
          <h2 className="text-2xl font-bold">Trading Architecture Visualizer</h2>
        </div>
        <p className="text-sm text-gray-400">
          Visual debugging tool showing the complete trading flow. Click any component to inspect.
        </p>
      </div>

      {/* Mode Selector */}
      <div className="flex justify-center gap-2">
        {(['consensus', 'debate', 'individual'] as TradingMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setSelectedMode(mode)}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              selectedMode === mode
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        ))}
        <button
          onClick={handleRefresh}
          className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-all"
          title="Refresh data"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* No Data Warning */}
      {dataLoadError && (
        <div className="bg-amber-950 border border-amber-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-100">{dataLoadError}</h3>
              <p className="text-sm text-amber-200 mt-1">
                Go to /trading and run a {selectedMode} analysis. The results will be stored and displayed here.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex gap-6">
        <div className="flex-1">
          <TradingFlowDiagram
            mode={selectedMode}
            tradingData={tradingData}
            portfolioData={portfolioData}
            onComponentClick={handleComponentClick}
          />
        </div>

        {inspectedComponent && (
          <div className="w-80 flex-shrink-0">
            <ComponentInspector
              component={inspectedComponent}
              onClose={() => setInspectedComponent(null)}
            />
          </div>
        )}
      </div>

      {tradingData?.timestamp && (
        <div className="text-center text-sm text-gray-500">
          Data from: {new Date(tradingData.timestamp).toLocaleString()}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// BACKEND TAB COMPONENT
// ============================================================================

function BackendTab() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [stats, setStats] = useState<LogStats | null>(null)
  const [isPolling, setIsPolling] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<LogCategory | 'all'>('all')
  const [selectedLevel, setSelectedLevel] = useState<LogLevel | 'all'>('all')
  const [autoScroll, setAutoScroll] = useState(true)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const lastTimestamp = useRef<string>('')

  const fetchLogs = async (since?: string) => {
    try {
      const params = new URLSearchParams()
      params.set('limit', '200')
      if (since) params.set('since', since)

      const res = await fetch(`/api/dev/logs?${params}`)
      if (!res.ok) return

      const data = await res.json()

      if (since && data.logs.length > 0) {
        setLogs(prev => [...prev, ...data.logs].slice(-500))
      } else if (!since) {
        setLogs(data.logs)
      }

      setStats(data.stats)

      if (data.logs.length > 0) {
        lastTimestamp.current = data.logs[data.logs.length - 1].timestamp
      }
    } catch (e) {
      console.error('Failed to fetch logs:', e)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  useEffect(() => {
    if (!isPolling) return

    const interval = setInterval(() => {
      fetchLogs(lastTimestamp.current)
    }, 1000)

    return () => clearInterval(interval)
  }, [isPolling])

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, autoScroll])

  const clearLogs = async () => {
    await fetch('/api/dev/logs', { method: 'DELETE' })
    setLogs([])
    lastTimestamp.current = ''
    fetchLogs()
  }

  const filteredLogs = logs.filter(log => {
    if (selectedCategory !== 'all' && log.category !== selectedCategory) return false
    if (selectedLevel !== 'all' && log.level !== selectedLevel) return false
    return true
  })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Server className="w-8 h-8 text-green-500" />
          <div>
            <h2 className="text-2xl font-bold">Backend Monitor</h2>
            <p className="text-sm text-gray-400">Real-time API & research activity</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {stats && (
            <div className="text-sm text-gray-400 mr-4">
              {stats.total} logs
            </div>
          )}

          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`px-3 py-1.5 rounded text-sm ${
              autoScroll ? 'bg-green-600' : 'bg-gray-700'
            }`}
          >
            Auto-scroll {autoScroll ? 'ON' : 'OFF'}
          </button>

          <button
            onClick={() => setIsPolling(!isPolling)}
            className={`p-2 rounded ${isPolling ? 'bg-green-600' : 'bg-gray-700'}`}
            title={isPolling ? 'Pause polling' : 'Resume polling'}
          >
            {isPolling ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          <button
            onClick={() => fetchLogs()}
            className="p-2 rounded bg-gray-700 hover:bg-gray-600"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={clearLogs}
            className="p-2 rounded bg-red-600 hover:bg-red-500"
            title="Clear logs"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as LogCategory | 'all')}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm"
          >
            <option value="all">All Categories</option>
            <option value="api">API</option>
            <option value="research">Research</option>
            <option value="model">Model</option>
            <option value="cache">Cache</option>
            <option value="broker">Broker</option>
            <option value="tool">Tool</option>
            <option value="debate">Debate</option>
            <option value="consensus">Consensus</option>
          </select>
        </div>

        <select
          value={selectedLevel}
          onChange={(e) => setSelectedLevel(e.target.value as LogLevel | 'all')}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm"
        >
          <option value="all">All Levels</option>
          <option value="info">Info</option>
          <option value="success">Success</option>
          <option value="warning">Warning</option>
          <option value="error">Error</option>
          <option value="debug">Debug</option>
        </select>

        <div className="flex gap-1 ml-4">
          {(Object.keys(CATEGORY_ICONS) as LogCategory[]).map(cat => {
            const Icon = CATEGORY_ICONS[cat]
            const count = stats?.byCategory[cat] || 0
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(selectedCategory === cat ? 'all' : cat)}
                className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${
                  selectedCategory === cat
                    ? CATEGORY_COLORS[cat]
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
                title={`${cat} (${count})`}
              >
                <Icon className="w-3 h-3" />
                {count > 0 && <span>{count}</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Logs */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="h-[calc(100vh-400px)] overflow-y-auto font-mono text-sm">
          {filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <Server className="w-12 h-12 mb-4 opacity-50" />
              <p>No logs yet</p>
              <p className="text-xs mt-2">Run a trading analysis to see backend activity</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {filteredLogs.map(log => {
                const CategoryIcon = CATEGORY_ICONS[log.category]
                const LevelIcon = LEVEL_ICONS[log.level]
                const levelColor = LEVEL_COLORS[log.level]
                const categoryColor = CATEGORY_COLORS[log.category]

                return (
                  <div
                    key={log.id}
                    className="px-4 py-2 hover:bg-gray-750 flex items-start gap-3"
                  >
                    <span className="text-gray-500 text-xs whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <LevelIcon className={`w-4 h-4 flex-shrink-0 ${levelColor}`} />
                    <span className={`px-2 py-0.5 rounded text-xs flex items-center gap-1 ${categoryColor}`}>
                      <CategoryIcon className="w-3 h-3" />
                      {log.category}
                    </span>
                    <span className="flex-1 text-gray-200">{log.message}</span>
                    {log.data && (
                      <span className="text-gray-500 text-xs max-w-md truncate">
                        {JSON.stringify(log.data)}
                      </span>
                    )}
                  </div>
                )
              })}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Footer status */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Showing {filteredLogs.length} of {logs.length} logs</span>
        <span className="flex items-center gap-2">
          {isPolling && (
            <>
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Polling every 1s
            </>
          )}
        </span>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function DevPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-gray-100">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="max-w-7xl mx-auto">
          {/* Recruiter Banner */}
          <div className="mb-6 bg-gradient-to-r from-blue-950 to-purple-950 border border-blue-800 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="bg-blue-500 rounded-full p-3">
                <Layers className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold mb-2">Developer Tools & System Architecture</h1>
                <p className="text-blue-100 mb-4">
                  This is the technical debugging and monitoring dashboard for Verdict AI.
                  Built to demonstrate production-grade tooling for AI automation systems.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <div className="text-blue-400 text-sm font-semibold mb-1">Architecture Tab</div>
                    <div className="text-xs text-gray-300">Visual flow diagrams showing how 46 AI models orchestrate across consensus, debate, and individual modes</div>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <div className="text-green-400 text-sm font-semibold mb-1">Backend Tab</div>
                    <div className="text-xs text-gray-300">Real-time monitoring of API calls, research agents, caching, and model execution (live production logs)</div>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <div className="text-purple-400 text-sm font-semibold mb-1">Research Taxonomy</div>
                    <div className="text-xs text-gray-300">Structured data pipeline showing market data, news, technical analysis, and SEC filings integration</div>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs text-blue-200">
                  <Info className="w-4 h-4" />
                  <span>
                    <strong>For recruiters/technical evaluation:</strong> This demonstrates internal tool development,
                    AI agent orchestration, workflow automation, and real-time monitoring - core skills for AI automation engineering.
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Tabs defaultValue="architecture" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 bg-gray-800">
              <TabsTrigger
                value="architecture"
                className="flex items-center gap-2 data-[state=active]:bg-blue-600"
              >
                <Layers className="w-4 h-4" />
                Architecture
              </TabsTrigger>
              <TabsTrigger
                value="backend"
                className="flex items-center gap-2 data-[state=active]:bg-green-600"
              >
                <Server className="w-4 h-4" />
                Backend
              </TabsTrigger>
              <TabsTrigger
                value="taxonomy"
                className="flex items-center gap-2 data-[state=active]:bg-purple-600"
              >
                <Search className="w-4 h-4" />
                Research Taxonomy
              </TabsTrigger>
            </TabsList>

            <TabsContent value="architecture" className="mt-6">
              <ArchitectureTab />
            </TabsContent>

            <TabsContent value="backend" className="mt-6">
              <BackendTab />
            </TabsContent>

            <TabsContent value="taxonomy" className="mt-6">
              <ResearchTaxonomyView />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Brain, Database, TestTube, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

interface MemoryStats {
  total_memories: number
  episodic_count: number
  semantic_count: number
  procedural_count: number
}

interface TestResult {
  step: string
  status: 'pending' | 'running' | 'success' | 'error'
  message: string
  duration?: number
}

export default function TestMemoryPage() {
  const [stats, setStats] = useState<MemoryStats | null>(null)
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)

  // Load memory stats on page load
  useEffect(() => {
    loadMemoryStats()
  }, [])

  const loadMemoryStats = async () => {
    try {
      const response = await fetch('/api/memory?action=stats')
      const data = await response.json()
      
      if (data.success) {
        setStats(data.stats)
        console.log('Memory stats loaded:', data.stats)
      } else {
        console.error('Failed to load memory stats:', data.error)
      }
    } catch (error) {
      console.error('Error loading memory stats:', error)
    }
  }

  const updateTestResult = (step: string, status: TestResult['status'], message: string, duration?: number) => {
    setTestResults(prev => {
      const existing = prev.find(r => r.step === step)
      if (existing) {
        return prev.map(r => r.step === step ? { step, status, message, duration } : r)
      } else {
        return [...prev, { step, status, message, duration }]
      }
    })
  }

  const runMemoryTests = async () => {
    setIsRunning(true)
    setTestResults([])

    // Test 1: API Connection
    updateTestResult('API Connection', 'running', 'Testing API endpoint...')
    
    try {
      const start = Date.now()
      const response = await fetch('/api/memory?action=stats')
      const data = await response.json()
      const duration = Date.now() - start

      if (data.success) {
        updateTestResult('API Connection', 'success', `Connected successfully (${duration}ms)`, duration)
      } else {
        updateTestResult('API Connection', 'error', data.error || 'Unknown error')
        setIsRunning(false)
        return
      }
    } catch (error) {
      updateTestResult('API Connection', 'error', `Connection failed: ${error}`)
      setIsRunning(false)
      return
    }

    // Test 2: Store Sample Episodic Memory
    updateTestResult('Store Episodic', 'running', 'Storing sample episodic memory...')
    
    try {
      const start = Date.now()
      const sampleEpisodic = {
        type: 'episodic',
        memory: {
          query: 'Test query: What is the best React framework?',
          agents_used: ['gpt-4', 'claude-3', 'gemini-pro'],
          consensus_reached: 'Next.js is widely considered the best React framework for production applications.',
          confidence_score: 85,
          disagreement_points: ['Performance vs Developer Experience'],
          total_tokens_used: 1500,
          estimated_cost: 0.05,
          response_time_ms: 3000
        }
      }

      const response = await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sampleEpisodic)
      })

      const data = await response.json()
      const duration = Date.now() - start

      if (data.success) {
        updateTestResult('Store Episodic', 'success', `Stored successfully (${duration}ms)`, duration)
      } else {
        updateTestResult('Store Episodic', 'error', data.error || 'Failed to store')
      }
    } catch (error) {
      updateTestResult('Store Episodic', 'error', `Store failed: ${error}`)
    }

    // Test 3: Store Sample Semantic Memory
    updateTestResult('Store Semantic', 'running', 'Storing sample semantic memory...')
    
    try {
      const start = Date.now()
      const sampleSemantic = {
        type: 'semantic',
        memory: {
          fact: 'Next.js provides excellent performance with built-in optimizations',
          category: 'domain_knowledge',
          source: 'AI consensus from multiple models',
          confidence: 85,
          validations: 1,
          contexts: ['React development', 'Web frameworks', 'Performance optimization']
        }
      }

      const response = await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sampleSemantic)
      })

      const data = await response.json()
      const duration = Date.now() - start

      if (data.success) {
        updateTestResult('Store Semantic', 'success', `Stored successfully (${duration}ms)`, duration)
      } else {
        updateTestResult('Store Semantic', 'error', data.error || 'Failed to store')
      }
    } catch (error) {
      updateTestResult('Store Semantic', 'error', `Store failed: ${error}`)
    }

    // Test 4: Refresh Stats
    updateTestResult('Refresh Stats', 'running', 'Refreshing memory statistics...')
    
    try {
      const start = Date.now()
      await loadMemoryStats()
      const duration = Date.now() - start
      updateTestResult('Refresh Stats', 'success', `Stats refreshed (${duration}ms)`, duration)
    } catch (error) {
      updateTestResult('Refresh Stats', 'error', `Refresh failed: ${error}`)
    }

    setIsRunning(false)
  }

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'running':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      default:
        return <TestTube className="w-4 h-4 text-gray-400" />
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Brain className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold">Memory System Test Interface</h1>
            <p className="text-muted-foreground">Testing AI Council memory infrastructure</p>
          </div>
        </div>
      </div>

      {/* Memory Statistics */}
      <Card className="p-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-5 h-5 text-blue-600" />
          <h2 className="text-xl font-semibold">Memory Statistics</h2>
        </div>
        
        {stats ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.total_memories}</div>
              <div className="text-sm text-muted-foreground">Total Memories</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.episodic_count}</div>
              <div className="text-sm text-muted-foreground">Episodic</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.semantic_count}</div>
              <div className="text-sm text-muted-foreground">Semantic</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.procedural_count}</div>
              <div className="text-sm text-muted-foreground">Procedural</div>
            </div>
          </div>
        ) : (
          <div className="text-center text-muted-foreground">Loading statistics...</div>
        )}
      </Card>

      {/* Test Runner */}
      <Card className="p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TestTube className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold">Memory System Tests</h2>
          </div>
          <Button 
            onClick={runMemoryTests} 
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Running Tests...
              </>
            ) : (
              <>
                <TestTube className="w-4 h-4" />
                Run Tests
              </>
            )}
          </Button>
        </div>

        <div className="space-y-3">
          {testResults.length === 0 && !isRunning && (
            <p className="text-muted-foreground text-center py-8">
              Click &ldquo;Run Tests&rdquo; to validate memory system functionality
            </p>
          )}
          
          {testResults.map((result, index) => (
            <div key={result.step} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              {getStatusIcon(result.status)}
              <div className="flex-1">
                <div className="font-medium">{result.step}</div>
                <div className="text-sm text-muted-foreground">{result.message}</div>
              </div>
              {result.duration && (
                <Badge variant="outline" className="text-xs">
                  {result.duration}ms
                </Badge>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Information */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-3">What These Tests Validate</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p><strong>API Connection:</strong> Verifies the memory service API is working</p>
          <p><strong>Store Episodic:</strong> Tests storing past debate outcomes and patterns</p>
          <p><strong>Store Semantic:</strong> Tests storing facts and knowledge learned</p>
          <p><strong>Refresh Stats:</strong> Confirms data is persisted and queryable</p>
        </div>
        
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Next Step:</strong> Once these tests pass, we&rsquo;ll connect the memory system to actual agent debates 
            so agents can remember and learn from past conversations.
          </p>
        </div>
      </Card>
    </div>
  )
}
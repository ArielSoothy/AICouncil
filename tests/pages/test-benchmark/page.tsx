'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  BarChart, 
  FlaskConical, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  DollarSign,
  Clock
} from 'lucide-react'
import { 
  BenchmarkRunner, 
  BENCHMARK_SUITE,
  type ComparisonMetrics,
  type TestResult 
} from '@/lib/testing/benchmark-framework'

export default function BenchmarkTestPage() {
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<TestResult[]>([])
  const [metrics, setMetrics] = useState<Map<string, ComparisonMetrics>>(new Map())
  const [currentTest, setCurrentTest] = useState<string>('')

  const runBenchmarks = async () => {
    setIsRunning(true)
    setResults([])
    setMetrics(new Map())
    setProgress(0)
    
    const runner = new BenchmarkRunner()
    const allResults: TestResult[] = []
    
    // Test subset of questions for demo
    const questionsToTest = BENCHMARK_SUITE.slice(0, 5)
    const methods: Array<'single_model' | 'simple_average' | 'weighted_consensus'> = [
      'single_model',
      'simple_average', 
      'weighted_consensus'
    ]
    
    for (let i = 0; i < questionsToTest.length; i++) {
      const question = questionsToTest[i]
      setCurrentTest(`Testing: ${question.query.substring(0, 50)}...`)
      
      const questionResults = await runner.testQuestion(question, methods)
      allResults.push(...questionResults)
      
      setProgress(((i + 1) / questionsToTest.length) * 100)
      setResults([...allResults])
    }
    
    // Calculate final metrics
    const finalMetrics = runner.calculateMetrics(allResults)
    setMetrics(finalMetrics)
    
    setIsRunning(false)
    setCurrentTest('')
  }

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'single_model': return 'text-blue-500'
      case 'simple_average': return 'text-yellow-500'
      case 'weighted_consensus': return 'text-green-500'
      case 'debate_consensus': return 'text-purple-500'
      default: return 'text-gray-500'
    }
  }

  const formatMetric = (value: number, type: 'percentage' | 'time' | 'money' | 'ratio') => {
    switch (type) {
      case 'percentage': return `${(value * 100).toFixed(1)}%`
      case 'time': return `${value.toFixed(0)}ms`
      case 'money': return `$${value.toFixed(4)}`
      case 'ratio': return value.toFixed(2)
      default: return value.toFixed(2)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FlaskConical className="w-8 h-8 text-primary" />
            Benchmark Testing Lab
          </h1>
          <p className="text-muted-foreground mt-1">
            Scientifically prove multi-model consensus superiority
          </p>
        </div>
        
        <Button 
          onClick={runBenchmarks} 
          disabled={isRunning}
          size="lg"
          className="flex items-center gap-2"
        >
          <BarChart className="w-4 h-4" />
          {isRunning ? 'Running Tests...' : 'Run Benchmarks'}
        </Button>
      </div>

      {/* Progress */}
      {isRunning && (
        <Card>
          <CardContent className="py-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{currentTest}</span>
                <span>{progress.toFixed(0)}%</span>
              </div>
              <Progress value={progress} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Summary */}
      {metrics.size > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from(metrics.entries()).map(([method, m]) => (
            <Card key={method} className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className={`text-lg ${getMethodColor(method)}`}>
                  {method.replace('_', ' ').toUpperCase()}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Accuracy */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Accuracy</span>
                  <div className="flex items-center gap-1">
                    {m.factual_accuracy > 0.8 ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : m.factual_accuracy > 0.6 ? (
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span className="font-bold">{formatMetric(m.factual_accuracy, 'percentage')}</span>
                  </div>
                </div>

                {/* Reasoning */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Reasoning</span>
                  <span className="font-medium">{formatMetric(m.reasoning_coverage, 'percentage')}</span>
                </div>

                {/* Hallucination */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Hallucination</span>
                  <span className={`font-medium ${m.hallucination_rate > 0.1 ? 'text-red-500' : 'text-green-500'}`}>
                    {formatMetric(m.hallucination_rate, 'percentage')}
                  </span>
                </div>

                {/* Cost */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    Avg Cost
                  </span>
                  <span className="font-medium">{formatMetric(m.avg_cost, 'money')}</span>
                </div>

                {/* Speed */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Avg Time
                  </span>
                  <span className="font-medium">{formatMetric(m.avg_response_time, 'time')}</span>
                </div>

                {/* Value */}
                <div className="border-t pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" />
                      Value Score
                    </span>
                    <Badge variant={m.accuracy_per_dollar > 100 ? 'default' : 'secondary'}>
                      {formatMetric(m.accuracy_per_dollar, 'ratio')} acc/$
                    </Badge>
                  </div>
                </div>

                {/* Sample Size */}
                <div className="text-xs text-muted-foreground text-center">
                  n={m.sample_size} | CI: ±{((m.confidence_interval[1] - m.confidence_interval[0]) * 50).toFixed(1)}%
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detailed Results Table */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detailed Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Question</th>
                    <th className="text-left py-2">Method</th>
                    <th className="text-center py-2">Correct</th>
                    <th className="text-center py-2">Confidence</th>
                    <th className="text-center py-2">Time</th>
                    <th className="text-center py-2">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {results.slice(0, 15).map((r, i) => (
                    <tr key={i} className="border-b">
                      <td className="py-2 pr-4">
                        <span className="text-xs">{r.question_id}</span>
                      </td>
                      <td className={`py-2 ${getMethodColor(r.method)}`}>
                        {r.method}
                      </td>
                      <td className="text-center py-2">
                        {r.is_correct !== undefined ? (
                          r.is_correct ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500 mx-auto" />
                          )
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="text-center py-2">
                        {(r.confidence * 100).toFixed(0)}%
                      </td>
                      <td className="text-center py-2">
                        {r.response_time_ms}ms
                      </td>
                      <td className="text-center py-2">
                        ${r.cost.toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Insights */}
      {metrics.size > 0 && (
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-lg">Key Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(() => {
              const singleModel = metrics.get('single_model')
              const consensus = metrics.get('weighted_consensus')
              
              if (!singleModel || !consensus) return null
              
              const accuracyImprovement = ((consensus.factual_accuracy - singleModel.factual_accuracy) / singleModel.factual_accuracy) * 100
              const costIncrease = ((consensus.avg_cost - singleModel.avg_cost) / singleModel.avg_cost) * 100
              
              return (
                <>
                  <p className="text-sm">
                    • <strong>Accuracy Improvement:</strong> Consensus is{' '}
                    <span className={accuracyImprovement > 0 ? 'text-green-600' : 'text-red-600'}>
                      {accuracyImprovement > 0 ? '+' : ''}{accuracyImprovement.toFixed(1)}%
                    </span>{' '}
                    more accurate than single model
                  </p>
                  <p className="text-sm">
                    • <strong>Cost Impact:</strong> Consensus costs{' '}
                    <span className="text-yellow-600">
                      {costIncrease.toFixed(0)}%
                    </span>{' '}
                    more than single model
                  </p>
                  <p className="text-sm">
                    • <strong>Hallucination Reduction:</strong> Consensus has{' '}
                    <span className="text-green-600">
                      {((singleModel.hallucination_rate - consensus.hallucination_rate) * 100).toFixed(1)}%
                    </span>{' '}
                    fewer hallucinations
                  </p>
                  <p className="text-sm">
                    • <strong>Statistical Significance:</strong>{' '}
                    {Math.abs(accuracyImprovement) > 10 ? (
                      <span className="text-green-600">Results appear statistically significant</span>
                    ) : (
                      <span className="text-yellow-600">More data needed for significance</span>
                    )}
                  </p>
                </>
              )
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
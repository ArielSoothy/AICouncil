'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { getSelectableModels, getModelGrade, getModelCostTier } from '@/lib/models/model-registry'
import { Loader2, CheckCircle, XCircle, AlertCircle, FlaskConical } from 'lucide-react'

interface TestResult {
  success: boolean
  modelId: string
  modelName: string
  provider: string
  error?: string
  decision?: {
    action: string
    symbol: string
    confidence: number
    reasoning: string
  }
  rawResponse?: string
  responseTime: number
  tokens?: {
    prompt: number
    completion: number
    total: number
  }
}

export function ModelTester() {
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<TestResult | null>(null)
  const [testingAll, setTestingAll] = useState(false)
  const [allResults, setAllResults] = useState<TestResult[]>([])

  // Get all selectable models grouped by provider
  const models = getSelectableModels()

  const testModel = async (modelId: string): Promise<TestResult> => {
    const response = await fetch('/api/trading/test-model', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modelId }),
    })
    return response.json()
  }

  const handleTestSingle = async () => {
    if (!selectedModel) return

    setTesting(true)
    setResult(null)

    try {
      const testResult = await testModel(selectedModel)
      setResult(testResult)
    } catch (error) {
      setResult({
        success: false,
        modelId: selectedModel,
        modelName: selectedModel,
        provider: 'unknown',
        error: error instanceof Error ? error.message : 'Test failed',
        responseTime: 0,
      })
    } finally {
      setTesting(false)
    }
  }

  const handleTestAll = async () => {
    setTestingAll(true)
    setAllResults([])

    const results: TestResult[] = []

    for (const model of models) {
      try {
        const testResult = await testModel(model.id)
        results.push(testResult)
        setAllResults([...results])
      } catch (error) {
        results.push({
          success: false,
          modelId: model.id,
          modelName: model.name,
          provider: model.provider,
          error: error instanceof Error ? error.message : 'Test failed',
          responseTime: 0,
        })
        setAllResults([...results])
      }
    }

    setTestingAll(false)
  }

  const passedCount = allResults.filter(r => r.success).length
  const failedCount = allResults.filter(r => !r.success).length

  return (
    <div className="bg-card rounded-lg border p-4 space-y-4">
      <div className="flex items-center gap-2">
        <FlaskConical className="w-5 h-5 text-purple-500" />
        <h3 className="font-semibold">Model Health Check</h3>
      </div>

      <p className="text-sm text-muted-foreground">
        Test individual models before running full consensus analysis
      </p>

      {/* Single Model Test */}
      <div className="flex gap-2">
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="flex-1 px-3 py-2 rounded-md border bg-background text-sm"
          disabled={testing || testingAll}
        >
          <option value="">Select a model to test...</option>
          {models.map((model) => {
            const grade = getModelGrade(model.id)
            const cost = getModelCostTier(model.id)
            return (
              <option key={model.id} value={model.id}>
                {model.name} ({model.provider}) - {grade.grade} {cost}
              </option>
            )
          })}
        </select>
        <Button
          onClick={handleTestSingle}
          disabled={!selectedModel || testing || testingAll}
          variant="outline"
        >
          {testing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Testing...
            </>
          ) : (
            'Test'
          )}
        </Button>
      </div>

      {/* Single Test Result */}
      {result && (
        <div className={`p-3 rounded-md border ${result.success ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' : 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800'}`}>
          <div className="flex items-center gap-2 mb-2">
            {result.success ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
            <span className="font-medium">{result.modelName}</span>
            <span className="text-xs text-muted-foreground">({result.provider})</span>
            <span className="text-xs text-muted-foreground ml-auto">{result.responseTime}ms</span>
          </div>

          {result.success && result.decision && (
            <div className="text-sm space-y-1">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  result.decision.action === 'BUY' ? 'bg-green-200 text-green-800' :
                  result.decision.action === 'SELL' ? 'bg-red-200 text-red-800' :
                  'bg-gray-200 text-gray-800'
                }`}>
                  {result.decision.action}
                </span>
                <span className="text-muted-foreground">
                  Confidence: {(result.decision.confidence * 100).toFixed(0)}%
                </span>
              </div>
              {result.tokens && (
                <div className="text-xs text-muted-foreground">
                  Tokens: {result.tokens.total} (prompt: {result.tokens.prompt}, completion: {result.tokens.completion})
                </div>
              )}
            </div>
          )}

          {!result.success && result.error && (
            <div className="text-sm text-red-600 dark:text-red-400">
              {result.error}
            </div>
          )}

          {result.rawResponse && (
            <details className="mt-2">
              <summary className="text-xs text-muted-foreground cursor-pointer">Raw response</summary>
              <pre className="text-xs mt-1 p-2 bg-muted rounded overflow-x-auto">
                {result.rawResponse}
              </pre>
            </details>
          )}
        </div>
      )}

      {/* Test All Button */}
      <div className="pt-2 border-t">
        <Button
          onClick={handleTestAll}
          disabled={testing || testingAll}
          variant="secondary"
          className="w-full"
        >
          {testingAll ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Testing {allResults.length}/{models.length} models...
            </>
          ) : (
            <>
              <FlaskConical className="w-4 h-4 mr-2" />
              Test All {models.length} Models
            </>
          )}
        </Button>

        {/* All Results Summary */}
        {allResults.length > 0 && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle className="w-4 h-4" />
                {passedCount} passed
              </span>
              <span className="flex items-center gap-1 text-red-600">
                <XCircle className="w-4 h-4" />
                {failedCount} failed
              </span>
            </div>

            {/* Failed Models List */}
            {failedCount > 0 && (
              <div className="text-sm">
                <div className="flex items-center gap-1 text-red-600 mb-1">
                  <AlertCircle className="w-4 h-4" />
                  Failed models:
                </div>
                <div className="space-y-1">
                  {allResults.filter(r => !r.success).map((r) => (
                    <div key={r.modelId} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <XCircle className="w-3 h-3 text-red-500" />
                      <span>{r.modelName}</span>
                      <span className="text-red-500">{r.error?.substring(0, 50)}...</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

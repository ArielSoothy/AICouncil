'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { TrendingUp, TrendingDown, Minus, AlertCircle, RotateCcw } from 'lucide-react'
import { getModelDisplayName } from '@/lib/trading/models-config'
import { ProviderBadge } from '@/components/shared/model-badge'
import { ActionBadge } from './consensus-results'
import type { TradingDecision, ReasoningDetails, FallbackMessage } from './types'

// --- Fallback Notifications ---

interface FallbackNotificationsProps {
  fallbackMessages: FallbackMessage[]
}

export function FallbackNotifications({ fallbackMessages }: FallbackNotificationsProps) {
  if (fallbackMessages.length === 0) return null

  return (
    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 space-y-2">
      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-medium text-sm">
        <AlertCircle className="h-4 w-4" />
        Model Fallbacks ({fallbackMessages.length})
      </div>
      <div className="space-y-1">
        {fallbackMessages.map((fb, i) => (
          <div key={i} className="text-sm text-amber-600 dark:text-amber-500 flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/50 rounded text-xs font-mono">
              {fb.category}
            </span>
            <span>
              {fb.from} failed ({fb.reason}) -&gt; using {fb.to}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// --- Research Activity Summary (Hybrid Research Mode) ---

interface ResearchActivitySummaryProps {
  decisions: TradingDecision[]
}

export function ResearchActivitySummary({ decisions }: ResearchActivitySummaryProps) {
  if (decisions.length === 0 || !decisions.some(d => d.toolsUsed)) return null

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg border border-blue-200 dark:border-blue-800 p-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">&#x1F50D;</span>
        <h3 className="text-lg font-semibold">AI Research Activity</h3>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="bg-white/50 dark:bg-black/20 rounded-lg p-3">
          <div className="text-muted-foreground text-xs mb-1">Models with Tools</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {decisions.filter(d => d.toolsUsed).length}
          </div>
          <div className="text-xs text-muted-foreground">
            of {decisions.length} total
          </div>
        </div>
        <div className="bg-white/50 dark:bg-black/20 rounded-lg p-3">
          <div className="text-muted-foreground text-xs mb-1">Total Tool Calls</div>
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {decisions.reduce((sum, d) => sum + (d.toolCallCount || 0), 0)}
          </div>
          <div className="text-xs text-muted-foreground">
            research queries
          </div>
        </div>
        <div className="col-span-2 bg-white/50 dark:bg-black/20 rounded-lg p-3">
          <div className="text-muted-foreground text-xs mb-1">Tools Used</div>
          <div className="flex flex-wrap gap-1 mt-1">
            {Array.from(new Set(decisions.flatMap(d => d.toolNames || []))).map((tool, i) => (
              <span key={i} className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
                {tool.replace('_', ' ')}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// --- Individual Model Decisions ---

interface IndividualDecisionsProps {
  decisions: TradingDecision[]
}

export function IndividualDecisions({ decisions }: IndividualDecisionsProps) {
  if (decisions.length === 0) return null

  return (
    <div className="bg-card rounded-lg border p-6">
      <h3 className="text-xl font-semibold mb-4">Individual Model Decisions</h3>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {decisions.map((decision, index) => (
          <TradingDecisionCard key={index} decision={decision} />
        ))}
      </div>
    </div>
  )
}

function TradingDecisionCard({ decision }: { decision: TradingDecision }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const modelName = decision.model ? getModelDisplayName(decision.model) : 'Unknown Model'

  const getReasoningPreview = (reasoning: string | ReasoningDetails): string => {
    if (typeof reasoning === 'string') {
      return reasoning.length > 150 ? reasoning.substring(0, 150) + '...' : reasoning
    }
    // For structured reasoning, show bullish case preview
    if (typeof reasoning === 'object' && reasoning.bullishCase) {
      return reasoning.bullishCase.substring(0, 150) + '...'
    }
    return 'No reasoning provided'
  }

  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-card">
      {/* Model Name & Action Badge */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-sm truncate">{modelName}</h4>
            <ProviderBadge providerType={decision.providerType} />
          </div>
          {decision.toolsUsed && (
            <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
              <span>&#x1F50D;</span>
              <span className="font-medium">{decision.toolCallCount} research {decision.toolCallCount === 1 ? 'call' : 'calls'}</span>
            </div>
          )}
        </div>
        <ActionBadge action={decision.action} />
      </div>

      {/* Trade Details */}
      {decision.action !== 'HOLD' && decision.symbol && (
        <div className="space-y-2 mb-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Symbol:</span>
            <span className="font-mono font-medium">{decision.symbol}</span>
          </div>
          {decision.quantity && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Quantity:</span>
              <span className="font-medium">{decision.quantity} shares</span>
            </div>
          )}
        </div>
      )}

      {/* Confidence */}
      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-muted-foreground">Confidence:</span>
          <span className="font-medium">{Math.round(decision.confidence * 100)}%</span>
        </div>
        <Progress value={decision.confidence * 100} className="h-1.5" />
      </div>

      {/* Reasoning Preview */}
      <div className="text-sm">
        <div className="text-muted-foreground mb-1">Reasoning:</div>
        <div className="text-xs leading-relaxed">
          {isExpanded ? (
            !decision.reasoning ? (
              <div className="text-muted-foreground italic">No reasoning provided</div>
            ) : typeof decision.reasoning === 'string' ? (
              <div className="whitespace-pre-wrap">{decision.reasoning}</div>
            ) : (
              <div className="space-y-2">
                {decision.reasoning.bullishCase && (
                  <div>
                    <div className="font-medium text-green-600">Bullish:</div>
                    <div className="text-muted-foreground">{decision.reasoning.bullishCase}</div>
                  </div>
                )}
                {decision.reasoning.bearishCase && (
                  <div>
                    <div className="font-medium text-red-600">Bearish:</div>
                    <div className="text-muted-foreground">{decision.reasoning.bearishCase}</div>
                  </div>
                )}
                {decision.reasoning.technicalAnalysis && (
                  <div>
                    <div className="font-medium">Technical:</div>
                    <div className="text-muted-foreground">{decision.reasoning.technicalAnalysis}</div>
                  </div>
                )}
              </div>
            )
          ) : (
            <div className="text-muted-foreground">
              {getReasoningPreview(decision.reasoning)}
            </div>
          )}
        </div>

        {/* Show More/Less Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
        >
          {isExpanded ? (
            <>
              <Minus className="h-3 w-3" />
              Show Less
            </>
          ) : (
            <>
              <TrendingUp className="h-3 w-3" />
              Show More
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// --- Portfolio Analysis Results ---

interface PortfolioAnalysisResultsProps {
  portfolioAnalysis: any
  onStartNew: () => void
}

export function PortfolioAnalysisResults({ portfolioAnalysis, onStartNew }: PortfolioAnalysisResultsProps) {
  if (!portfolioAnalysis) return null

  return (
    <div className="bg-card rounded-lg border p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">Portfolio Analysis</h3>
          <p className="text-sm text-muted-foreground">
            {portfolioAnalysis.portfolio?.positionCount || 0} positions - ${(portfolioAnalysis.portfolio?.totalValue || 0).toLocaleString()}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onStartNew} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Start New
        </Button>
      </div>

      {/* Portfolio Summary */}
      {portfolioAnalysis.portfolio && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Total Value</div>
            <div className="text-2xl font-bold">${portfolioAnalysis.portfolio.totalValue.toLocaleString()}</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Cash Available</div>
            <div className="text-2xl font-bold">${portfolioAnalysis.portfolio.cashBalance.toLocaleString()}</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Positions</div>
            <div className="text-2xl font-bold">{portfolioAnalysis.portfolio.positionCount}</div>
          </div>
        </div>
      )}

      {/* AI Analysis Results */}
      {portfolioAnalysis.analyses && portfolioAnalysis.analyses.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-semibold">AI Analysis</h4>
          {portfolioAnalysis.analyses.map((analysis: any, idx: number) => (
            <div key={idx} className="bg-muted/30 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">{analysis.modelName}</span>
                {analysis.error ? (
                  <span className="text-xs text-red-500">{analysis.error}</span>
                ) : (
                  <span className="text-xs text-muted-foreground">{analysis.duration}ms</span>
                )}
              </div>
              {analysis.analysis && (
                <>
                  {/* Health & Diversification Scores */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Portfolio Health</div>
                      <div className="flex items-center gap-2">
                        <div className="text-lg font-bold">{analysis.analysis.portfolioHealth?.score || 'N/A'}/10</div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{analysis.analysis.portfolioHealth?.summary}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Diversification</div>
                      <div className="text-lg font-bold">{analysis.analysis.diversification?.score || 'N/A'}/10</div>
                      <div className="text-xs text-muted-foreground mt-1">{analysis.analysis.diversification?.recommendation}</div>
                    </div>
                  </div>
                  {/* Recommendations */}
                  {analysis.analysis.recommendations?.immediate && analysis.analysis.recommendations.immediate.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-orange-600 mb-1">Immediate Actions</div>
                      <ul className="text-xs space-y-1">
                        {analysis.analysis.recommendations.immediate.map((rec: string, i: number) => (
                          <li key={i} className="flex items-start gap-1">
                            <span className="text-orange-500">&#8226;</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

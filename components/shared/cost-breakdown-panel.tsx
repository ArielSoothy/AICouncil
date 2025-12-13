'use client';

/**
 * Cost Breakdown Panel
 *
 * Expanded view showing detailed cost breakdown:
 * - Pre-analysis estimate with per-model breakdown
 * - Current analysis progress with model-by-model costs
 * - Session summary with provider totals
 */

import React from 'react';
import { Trash2 } from 'lucide-react';
import { formatCost, formatTokens, getSessionSummary } from '@/lib/services/cost-tracker';
import type { CostEstimate, AnalysisSession } from '@/types/cost-tracking';

interface CostBreakdownPanelProps {
  estimatedCost: CostEstimate | null;
  currentAnalysis: AnalysisSession | null;
  sessionTotal: number;
  sessionTokens: number;
  analysisCount: number;
  onClearSession: () => void;
}

export function CostBreakdownPanel({
  estimatedCost,
  currentAnalysis,
  sessionTotal,
  sessionTokens,
  analysisCount,
  onClearSession,
}: CostBreakdownPanelProps) {
  const sessionSummary = getSessionSummary();

  return (
    <div className="border-b bg-muted/30 max-h-[50vh] overflow-y-auto">
      <div className="p-4 space-y-4">
        {/* Pre-Analysis Estimate */}
        {estimatedCost && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground">Pre-Analysis Estimate</h4>
            <div className="bg-background rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">
                  {estimatedCost.breakdown.length} models selected
                </span>
                <span className="text-sm font-medium">
                  {formatCost(estimatedCost.minimum)} - {formatCost(estimatedCost.maximum)}
                </span>
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground">
                {estimatedCost.freeModelsCount > 0 && (
                  <span className="text-green-600 dark:text-green-400">
                    Free: {estimatedCost.freeModelsCount}
                  </span>
                )}
                {estimatedCost.paidModelsCount > 0 && (
                  <span>Paid: {estimatedCost.paidModelsCount}</span>
                )}
              </div>

              {/* Per-model breakdown */}
              <div className="pt-2 border-t space-y-1">
                {estimatedCost.breakdown.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground truncate max-w-[200px]">
                      {item.modelId}
                    </span>
                    <span className={item.isFree ? 'text-green-600 dark:text-green-400' : ''}>
                      {item.isFree ? 'FREE' : formatCost(item.estimatedCost)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Current Analysis */}
        {currentAnalysis && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground">
              Current Analysis
              {currentAnalysis.context && (
                <span className="ml-2 font-normal">- {currentAnalysis.context}</span>
              )}
            </h4>
            <div className="bg-background rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm capitalize">
                  {currentAnalysis.analysisType.replace(/-/g, ' ')}
                </span>
                <div className="flex items-center gap-2">
                  {currentAnalysis.status === 'running' && (
                    <span className="text-xs text-amber-600 dark:text-amber-400 animate-pulse">
                      Running...
                    </span>
                  )}
                  <span className="text-sm font-medium">
                    {formatCost(currentAnalysis.totalCost)}
                  </span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {formatTokens(currentAnalysis.totalTokens)} tokens used
              </div>

              {/* Per-model breakdown for current analysis */}
              {currentAnalysis.records.length > 0 && (
                <div className="pt-2 border-t space-y-1">
                  {currentAnalysis.records.map((record, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground truncate max-w-[180px]">
                        {record.modelId}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          {formatTokens(record.tokens.total)}
                        </span>
                        <span className={record.cost === 0 ? 'text-green-600 dark:text-green-400' : ''}>
                          {record.cost === 0 ? 'FREE' : formatCost(record.cost)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Session Summary */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-muted-foreground">Session Summary</h4>
            {sessionTotal > 0 && (
              <button
                onClick={onClearSession}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                Clear
              </button>
            )}
          </div>
          <div className="bg-background rounded-lg p-3 space-y-2">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-semibold">{formatCost(sessionTotal)}</div>
                <div className="text-xs text-muted-foreground">Total Cost</div>
              </div>
              <div>
                <div className="text-lg font-semibold">{formatTokens(sessionTokens)}</div>
                <div className="text-xs text-muted-foreground">Tokens</div>
              </div>
              <div>
                <div className="text-lg font-semibold">{analysisCount}</div>
                <div className="text-xs text-muted-foreground">Analyses</div>
              </div>
            </div>

            {/* By Provider breakdown */}
            {Object.keys(sessionSummary.byProvider).length > 0 && (
              <div className="pt-2 border-t">
                <div className="text-xs text-muted-foreground mb-1">By Provider</div>
                <div className="space-y-1">
                  {Object.entries(sessionSummary.byProvider)
                    .sort(([, a], [, b]) => b - a)
                    .map(([provider, cost]) => (
                      <div key={provider} className="flex items-center justify-between text-xs">
                        <span className="capitalize">{provider}</span>
                        <span className={cost === 0 ? 'text-green-600 dark:text-green-400' : ''}>
                          {cost === 0 ? 'FREE' : formatCost(cost)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* By Model breakdown (top 5) */}
            {Object.keys(sessionSummary.byModel).length > 0 && (
              <div className="pt-2 border-t">
                <div className="text-xs text-muted-foreground mb-1">Top Models</div>
                <div className="space-y-1">
                  {Object.entries(sessionSummary.byModel)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 5)
                    .map(([model, cost]) => (
                      <div key={model} className="flex items-center justify-between text-xs">
                        <span className="truncate max-w-[180px] text-muted-foreground">{model}</span>
                        <span className={cost === 0 ? 'text-green-600 dark:text-green-400' : ''}>
                          {cost === 0 ? 'FREE' : formatCost(cost)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

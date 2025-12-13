'use client';

/**
 * Cost Monitoring Footer
 *
 * Sticky footer that shows real-time cost tracking:
 * - Pre-analysis estimate (before running)
 * - Running cost (during analysis)
 * - Session total (cumulative)
 *
 * All costs are calculated from real pricing in lib/model-metadata.ts
 */

import React from 'react';
import { ChevronUp, ChevronDown, DollarSign, Zap, Activity, Trash2 } from 'lucide-react';
import { useCostTrackerOptional } from '@/contexts/cost-tracker-context';
import { formatCost, formatTokens } from '@/lib/services/cost-tracker';
import { CostBreakdownPanel } from './cost-breakdown-panel';

export function CostMonitoringFooter() {
  const costTracker = useCostTrackerOptional();

  // Don't render if context not available or footer hidden
  if (!costTracker || !costTracker.state.isFooterVisible) {
    return null;
  }

  const { state, toggleFooter, clearSession } = costTracker;
  const {
    estimatedCost,
    currentAnalysis,
    sessionTotal,
    sessionTokens,
    analysisCount,
    isFooterExpanded,
  } = state;

  const runningCost = currentAnalysis?.totalCost || 0;
  const runningTokens = currentAnalysis?.totalTokens || 0;
  const isRunning = currentAnalysis?.status === 'running';

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t shadow-lg">
      {/* Expanded Panel */}
      {isFooterExpanded && (
        <CostBreakdownPanel
          estimatedCost={estimatedCost}
          currentAnalysis={currentAnalysis}
          sessionTotal={sessionTotal}
          sessionTokens={sessionTokens}
          analysisCount={analysisCount}
          onClearSession={clearSession}
        />
      )}

      {/* Minimized Bar */}
      <div
        className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={toggleFooter}
      >
        <div className="flex items-center gap-6">
          {/* Estimate */}
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Est:</span>
            <span className="text-sm font-medium">
              {estimatedCost
                ? `${formatCost(estimatedCost.minimum)} - ${formatCost(estimatedCost.maximum)}`
                : '--'}
            </span>
            {estimatedCost && estimatedCost.freeModelsCount > 0 && (
              <span className="text-xs text-green-600 dark:text-green-400">
                ({estimatedCost.freeModelsCount} free)
              </span>
            )}
          </div>

          {/* Running Cost */}
          <div className="flex items-center gap-2">
            <Activity
              className={`w-4 h-4 ${
                isRunning ? 'text-amber-500 animate-pulse' : 'text-muted-foreground'
              }`}
            />
            <span className="text-sm text-muted-foreground">Running:</span>
            <span className={`text-sm font-medium ${isRunning ? 'text-amber-600 dark:text-amber-400' : ''}`}>
              {formatCost(runningCost)}
            </span>
            {isRunning && runningTokens > 0 && (
              <span className="text-xs text-muted-foreground">
                ({formatTokens(runningTokens)} tokens)
              </span>
            )}
          </div>

          {/* Session Total */}
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Session:</span>
            <span className="text-sm font-medium">{formatCost(sessionTotal)}</span>
            {analysisCount > 0 && (
              <span className="text-xs text-muted-foreground">
                ({analysisCount} {analysisCount === 1 ? 'analysis' : 'analyses'})
              </span>
            )}
          </div>
        </div>

        {/* Expand/Collapse Button */}
        <div className="flex items-center gap-2">
          {sessionTotal > 0 && !isFooterExpanded && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearSession();
              }}
              className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
              title="Clear session"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          {isFooterExpanded ? (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      </div>
    </div>
  );
}

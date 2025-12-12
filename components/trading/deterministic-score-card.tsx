/**
 * Deterministic Score Card Component
 *
 * Displays the algorithmic trading score with visual breakdown.
 * Shows the deterministic recommendation before AI analysis.
 *
 * Features:
 * - Color-coded recommendation badges
 * - Category score breakdown
 * - Risk/reward display
 * - Expandable factors list
 *
 * Created: December 11, 2025
 */

'use client';

import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Shield,
  Hash,
  BarChart3,
  FileText,
  MessageSquare,
  Activity,
  CheckCircle,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface DeterministicScoreData {
  recommendation: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
  weightedScore: number;
  confidence: number;
  inputHash: string;
  technical: { signal: string; strength: string; score: number };
  fundamental: { signal: string; strength: string; score: number };
  sentiment: { signal: string; strength: string; score: number };
  trend: { signal: string; strength: string; score: number };
  bullishFactors: string[];
  bearishFactors: string[];
  suggestedStopLoss: number;
  suggestedTakeProfit: number;
  riskRewardRatio: string;
}

interface DeterministicScoreCardProps {
  score: DeterministicScoreData | null;
  symbol?: string;
  className?: string;
  defaultExpanded?: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getRecommendationStyle(rec: string) {
  switch (rec) {
    case 'STRONG_BUY':
      return {
        bg: 'bg-green-500',
        text: 'text-white',
        icon: TrendingUp,
        label: 'STRONG BUY',
      };
    case 'BUY':
      return {
        bg: 'bg-green-400',
        text: 'text-white',
        icon: TrendingUp,
        label: 'BUY',
      };
    case 'HOLD':
      return {
        bg: 'bg-yellow-500',
        text: 'text-white',
        icon: Minus,
        label: 'HOLD',
      };
    case 'SELL':
      return {
        bg: 'bg-red-400',
        text: 'text-white',
        icon: TrendingDown,
        label: 'SELL',
      };
    case 'STRONG_SELL':
      return {
        bg: 'bg-red-500',
        text: 'text-white',
        icon: TrendingDown,
        label: 'STRONG SELL',
      };
    default:
      return {
        bg: 'bg-gray-500',
        text: 'text-white',
        icon: Minus,
        label: rec,
      };
  }
}

function getSignalColor(signal: string) {
  if (signal.includes('BULLISH')) return 'text-green-600';
  if (signal.includes('BEARISH')) return 'text-red-600';
  return 'text-yellow-600';
}

function getCategoryIcon(category: string) {
  switch (category) {
    case 'technical':
      return BarChart3;
    case 'fundamental':
      return FileText;
    case 'sentiment':
      return MessageSquare;
    case 'trend':
      return Activity;
    default:
      return BarChart3;
  }
}

function formatScore(score: number): string {
  const sign = score >= 0 ? '+' : '';
  return `${sign}${(score * 100).toFixed(0)}%`;
}

// ============================================================================
// SCORE BAR COMPONENT
// ============================================================================

interface ScoreBarProps {
  score: number;
  label: string;
  signal: string;
  icon: React.ComponentType<{ className?: string }>;
}

function ScoreBar({ score, label, signal, icon: Icon }: ScoreBarProps) {
  // Score range: -1 to +1, map to 0-100 for bar width
  const normalizedScore = ((score + 1) / 2) * 100;
  const isPositive = score >= 0;

  return (
    <div className="flex items-center gap-3">
      <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <div className="flex-1">
        <div className="flex justify-between text-xs mb-1">
          <span className="font-medium">{label}</span>
          <span className={getSignalColor(signal)}>
            {signal} ({formatScore(score)})
          </span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              isPositive ? 'bg-green-500' : 'bg-red-500'
            )}
            style={{ width: `${normalizedScore}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DeterministicScoreCard({
  score,
  symbol,
  className,
  defaultExpanded = false,
}: DeterministicScoreCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [showFactors, setShowFactors] = useState(false);

  if (!score) {
    return null;
  }

  const recStyle = getRecommendationStyle(score.recommendation);
  const RecIcon = recStyle.icon;

  return (
    <div className={cn('rounded-lg border bg-card overflow-hidden', className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Target className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="font-semibold">Deterministic Score</div>
              <div className="text-sm text-muted-foreground">
                {symbol && `${symbol} - `}Algorithmic Analysis
              </div>
            </div>
          </div>

          {/* Recommendation badge */}
          <div
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-sm',
              recStyle.bg,
              recStyle.text
            )}
          >
            <RecIcon className="w-4 h-4" />
            {recStyle.label}
          </div>
        </div>

        {/* Score summary */}
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="text-center p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <div className="text-2xl font-bold">
              {score.weightedScore >= 0 ? '+' : ''}
              {(score.weightedScore * 100).toFixed(0)}%
            </div>
            <div className="text-xs text-muted-foreground">Weighted Score</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <div className="text-2xl font-bold">{(score.confidence * 100).toFixed(0)}%</div>
            <div className="text-xs text-muted-foreground">Confidence</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <div className="text-2xl font-bold">{score.riskRewardRatio}</div>
            <div className="text-xs text-muted-foreground">Risk:Reward</div>
          </div>
        </div>
      </div>

      {/* Category breakdown */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-b"
      >
        <span className="text-sm font-medium">Category Breakdown</span>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="p-4 space-y-4">
          <ScoreBar
            score={score.technical.score}
            label="Technical"
            signal={score.technical.signal}
            icon={getCategoryIcon('technical')}
          />
          <ScoreBar
            score={score.fundamental.score}
            label="Fundamental"
            signal={score.fundamental.signal}
            icon={getCategoryIcon('fundamental')}
          />
          <ScoreBar
            score={score.sentiment.score}
            label="Sentiment"
            signal={score.sentiment.signal}
            icon={getCategoryIcon('sentiment')}
          />
          <ScoreBar
            score={score.trend.score}
            label="Trend"
            signal={score.trend.signal}
            icon={getCategoryIcon('trend')}
          />
        </div>
      )}

      {/* Factors */}
      <button
        onClick={() => setShowFactors(!showFactors)}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-t"
      >
        <span className="text-sm font-medium">Key Factors</span>
        {showFactors ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {showFactors && (
        <div className="p-4 grid sm:grid-cols-2 gap-4">
          {/* Bullish factors */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-green-600">
              <CheckCircle className="w-4 h-4" />
              Bullish Factors ({score.bullishFactors.length})
            </div>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {score.bullishFactors.length > 0 ? (
                score.bullishFactors.map((factor, idx) => (
                  <div
                    key={idx}
                    className="text-xs p-2 rounded bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200"
                  >
                    {factor}
                  </div>
                ))
              ) : (
                <div className="text-xs text-muted-foreground italic">None identified</div>
              )}
            </div>
          </div>

          {/* Bearish factors */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-red-600">
              <XCircle className="w-4 h-4" />
              Bearish Factors ({score.bearishFactors.length})
            </div>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {score.bearishFactors.length > 0 ? (
                score.bearishFactors.map((factor, idx) => (
                  <div
                    key={idx}
                    className="text-xs p-2 rounded bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200"
                  >
                    {factor}
                  </div>
                ))
              ) : (
                <div className="text-xs text-muted-foreground italic">None identified</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer with risk levels and hash */}
      <div className="p-3 border-t bg-gray-50 dark:bg-gray-800/30">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3 h-3 text-red-500" />
              <span>Stop: ${score.suggestedStopLoss.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Target className="w-3 h-3 text-green-500" />
              <span>Target: ${score.suggestedTakeProfit.toFixed(2)}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Hash className="w-3 h-3" />
            <span className="font-mono">{score.inputHash}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPACT VERSION
// ============================================================================

interface DeterministicScoreCompactProps {
  score: DeterministicScoreData | null;
  className?: string;
}

export function DeterministicScoreCompact({ score, className }: DeterministicScoreCompactProps) {
  if (!score) return null;

  const recStyle = getRecommendationStyle(score.recommendation);
  const RecIcon = recStyle.icon;

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg border bg-card',
        className
      )}
    >
      <Target className="w-4 h-4 text-blue-500" />
      <span className="text-sm font-medium">Score:</span>
      <span className="text-sm">
        {score.weightedScore >= 0 ? '+' : ''}
        {(score.weightedScore * 100).toFixed(0)}%
      </span>
      <div
        className={cn(
          'flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold',
          recStyle.bg,
          recStyle.text
        )}
      >
        <RecIcon className="w-3 h-3" />
        {recStyle.label}
      </div>
      <span className="text-xs text-muted-foreground">
        ({(score.confidence * 100).toFixed(0)}% conf)
      </span>
    </div>
  );
}

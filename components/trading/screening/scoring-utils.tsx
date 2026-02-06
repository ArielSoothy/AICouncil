import type { ScoreDisplay } from './types'

// Gap % scoring thresholds
export function getGapScore(gapPercent: number): ScoreDisplay {
  const absGap = Math.abs(gapPercent)
  if (absGap > 20) return { points: 2, maxPoints: 2, color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/40', threshold: '>20% EXPLOSIVE' }
  if (absGap > 10) return { points: 1, maxPoints: 2, color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/40', threshold: '>10% STRONG' }
  return { points: 0, maxPoints: 2, color: 'text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-700', threshold: '<10%' }
}

// PM Volume scoring thresholds
export function getVolumeScore(volume: number): ScoreDisplay {
  if (volume > 1_000_000) return { points: 1, maxPoints: 1, color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/40', threshold: '>1M HEAVY' }
  if (volume > 500_000) return { points: 0, maxPoints: 1, color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/40', threshold: '>500K OK' }
  return { points: 0, maxPoints: 1, color: 'text-red-500', bgColor: 'bg-red-100 dark:bg-red-900/40', threshold: '<500K LOW' }
}

// Float scoring thresholds (lower = better for squeeze)
export function getFloatScore(floatShares: number | undefined): ScoreDisplay | null {
  if (!floatShares) return null
  if (floatShares < 5_000_000) return { points: 3, maxPoints: 3, color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/40', threshold: '<5M SUPERNOVA' }
  if (floatShares < 10_000_000) return { points: 2, maxPoints: 3, color: 'text-green-500', bgColor: 'bg-green-100 dark:bg-green-900/40', threshold: '<10M ULTRA LOW' }
  if (floatShares < 20_000_000) return { points: 1, maxPoints: 3, color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/40', threshold: '<20M LOW' }
  if (floatShares < 30_000_000) return { points: 0, maxPoints: 3, color: 'text-orange-500', bgColor: 'bg-orange-100 dark:bg-orange-900/40', threshold: '<30M MOD' }
  return { points: 0, maxPoints: 3, color: 'text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-700', threshold: '>30M HIGH' }
}

// Borrow Fee scoring (higher = better for squeeze)
export function getBorrowFeeScore(feeRate: number | undefined): ScoreDisplay | null {
  if (feeRate === undefined) return null
  if (feeRate > 50) return { points: 2, maxPoints: 2, color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/40', threshold: '>50% EXTREME' }
  if (feeRate > 20) return { points: 1, maxPoints: 2, color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/40', threshold: '>20% HIGH' }
  if (feeRate > 10) return { points: 0, maxPoints: 2, color: 'text-orange-500', bgColor: 'bg-orange-100 dark:bg-orange-900/40', threshold: '>10% ELEVATED' }
  return { points: 0, maxPoints: 2, color: 'text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-700', threshold: '<10% NORMAL' }
}

// Shortable Shares scoring (lower = better for squeeze)
export function getShortableScore(shares: number | undefined): ScoreDisplay | null {
  if (shares === undefined) return null
  if (shares < 50_000) return { points: 1, maxPoints: 1, color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/40', threshold: '<50K VERY HARD' }
  if (shares < 100_000) return { points: 0, maxPoints: 1, color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/40', threshold: '<100K HARD' }
  if (shares < 1_000_000) return { points: 0, maxPoints: 1, color: 'text-orange-500', bgColor: 'bg-orange-100 dark:bg-orange-900/40', threshold: '<1M MODERATE' }
  return { points: 0, maxPoints: 1, color: 'text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-700', threshold: '>1M EASY' }
}

// Borrow Difficulty scoring
export function getBorrowDifficultyScore(difficulty: string | undefined): ScoreDisplay | null {
  if (!difficulty) return null
  if (difficulty === 'Very Hard') return { points: 1, maxPoints: 1, color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/40', threshold: 'SQUEEZE FUEL' }
  if (difficulty === 'Hard') return { points: 1, maxPoints: 1, color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/40', threshold: 'SQUEEZE POTENTIAL' }
  if (difficulty === 'Moderate') return { points: 0, maxPoints: 1, color: 'text-orange-500', bgColor: 'bg-orange-100 dark:bg-orange-900/40', threshold: 'WATCHABLE' }
  return { points: 0, maxPoints: 1, color: 'text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-700', threshold: 'EASY TO SHORT' }
}

// Relative Volume scoring
export function getRelativeVolumeScore(relVol: number | undefined): ScoreDisplay | null {
  if (relVol === undefined || relVol <= 0) return null
  if (relVol > 5) return { points: 1, maxPoints: 1, color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/40', threshold: '>5x UNUSUAL' }
  if (relVol > 2) return { points: 0, maxPoints: 1, color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/40', threshold: '>2x IN PLAY' }
  return { points: 0, maxPoints: 1, color: 'text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-700', threshold: '<2x NORMAL' }
}

// Score badge component
export function ScoreBadge({ score }: { score: ScoreDisplay }) {
  return (
    <span className={`ml-2 text-xs px-1.5 py-0.5 rounded font-medium ${score.bgColor} ${score.color}`}>
      +{score.points}/{score.maxPoints} {score.threshold}
    </span>
  )
}

// Format share counts (volume, float, etc.) - NO $ prefix
export function formatNumber(num: number): string {
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return num.toLocaleString()
}

// Format dollar amounts (price, market cap) - WITH $ prefix
export function formatCurrency(num: number): string {
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(2)}B`
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`
  return `$${num.toLocaleString()}`
}

export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600 dark:text-green-400'
  if (score >= 60) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-600 dark:text-red-400'
}

export function getDifficultyColor(difficulty?: string): string {
  if (!difficulty) return 'text-gray-500'
  if (difficulty.toLowerCase().includes('easy')) return 'text-green-600 dark:text-green-400'
  if (difficulty.toLowerCase().includes('hard')) return 'text-red-600 dark:text-red-400'
  return 'text-yellow-600 dark:text-yellow-400'
}

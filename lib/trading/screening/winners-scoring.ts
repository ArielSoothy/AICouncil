/**
 * Winners Strategy Scoring Engine
 *
 * Synthesized from research by Claude, GPT, Gemini, and Grok:
 * - docs/trading/Winners_Strategy/*
 *
 * TWO PLAYBOOKS (GPT insight - don't mix them):
 * 1. MOMENTUM SCORE - Trend day candidates (catalyst + volume)
 * 2. SQUEEZE SCORE - Explosive extension candidates (trapped shorts)
 *
 * Combined Winners Score (10 pts max):
 * - Float <10M: +3 | <20M: +2 | <30M: +1
 * - Borrow Fee >50%: +2 | >20%: +1
 * - Short Ratio (DTC) >5: +2 | >3: +1
 * - Gap >20%: +2 | >10%: +1
 * - Relative Volume >5x: +1
 */

export interface StockData {
  symbol: string
  // Core data (always available from scanner)
  gap_percent: number
  gap_direction: 'up' | 'down'
  pre_market_price: number
  previous_close: number
  pre_market_volume: number

  // Squeeze data (may be missing - needs TWS calls)
  float_shares?: number
  borrow_fee_rate?: number       // Annualized percentage
  short_ratio?: number           // Days to cover
  short_interest?: number        // Percentage of float
  shortable_shares?: number      // Available to short

  // Calculated/derived
  relative_volume?: number       // Current vs 20-day average
  average_volume?: number        // 20-day average daily volume
  float_rotation?: number        // (PM vol / float) - how many times float traded

  // Additional context
  market_cap?: number
  borrow_difficulty?: 'EASY' | 'MEDIUM' | 'HARD' | 'VERY_HARD'
  vwap?: number                  // Volume-weighted average price
}

export interface ScoreBreakdown {
  category: string
  points: number
  maxPoints: number
  value: string | number | null
  threshold: string
  met: boolean
}

export interface MomentumScore {
  total: number
  maxPossible: number
  breakdown: ScoreBreakdown[]
  signal: 'STRONG' | 'MODERATE' | 'WEAK'
}

export interface SqueezeScore {
  total: number
  maxPossible: number
  breakdown: ScoreBreakdown[]
  signal: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE'
}

export interface WinnersScore {
  // Combined score
  total: number
  maxPossible: number
  maxTotal: number         // Always 10
  conviction: 'HIGH' | 'MEDIUM' | 'LOW' | 'SKIP'
  emoji: string

  // Separate playbook scores (GPT insight)
  momentum: MomentumScore
  squeeze: SqueezeScore

  // Details
  breakdown: ScoreBreakdown[]
  missingData: string[]
  recommendation: string
  entryTrigger: string     // What to watch for entry
}

/**
 * Calculate Momentum Score (Trend Day Candidate)
 * Based on: Gap + Volume + Relative Volume
 */
function calculateMomentumScore(stock: StockData): MomentumScore {
  const breakdown: ScoreBreakdown[] = []
  let total = 0
  let maxPossible = 0

  // === GAP PERCENT (2 points) ===
  maxPossible += 2
  {
    const absGap = Math.abs(stock.gap_percent)
    let points = 0
    let threshold = ''

    if (absGap > 20) {
      points = 2
      threshold = '>20% (EXPLOSIVE momentum)'
    } else if (absGap > 10) {
      points = 1
      threshold = '>10% (STRONG)'
    } else if (absGap > 5) {
      threshold = '>5% (MODERATE)'
    } else {
      threshold = '<5% (WEAK - may not trend)'
    }

    total += points
    breakdown.push({
      category: 'Gap %',
      points,
      maxPoints: 2,
      value: `${stock.gap_percent > 0 ? '+' : ''}${stock.gap_percent.toFixed(1)}%`,
      threshold,
      met: points > 0,
    })
  }

  // === PRE-MARKET VOLUME (1 point) ===
  maxPossible += 1
  {
    let points = 0
    let threshold = ''

    if (stock.pre_market_volume > 1_000_000) {
      points = 1
      threshold = '>1M (HEAVY interest)'
    } else if (stock.pre_market_volume > 500_000) {
      threshold = '>500K (GOOD liquidity)'
    } else {
      threshold = '<500K (LOW - risky)'
    }

    total += points
    breakdown.push({
      category: 'PM Volume',
      points,
      maxPoints: 1,
      value: formatNumber(stock.pre_market_volume),
      threshold,
      met: points > 0,
    })
  }

  // === RELATIVE VOLUME (1 point) ===
  if (stock.relative_volume !== undefined && stock.relative_volume > 0) {
    maxPossible += 1
    let points = 0
    let threshold = ''

    if (stock.relative_volume > 5) {
      points = 1
      threshold = '>5x (UNUSUAL activity)'
    } else if (stock.relative_volume > 2) {
      threshold = '>2x (IN PLAY)'
    } else {
      threshold = '<2x (NORMAL - may fade)'
    }

    total += points
    breakdown.push({
      category: 'Rel. Volume',
      points,
      maxPoints: 1,
      value: `${stock.relative_volume.toFixed(1)}x`,
      threshold,
      met: points > 0,
    })
  }

  // Determine signal strength
  const ratio = maxPossible > 0 ? total / maxPossible : 0
  let signal: 'STRONG' | 'MODERATE' | 'WEAK'
  if (ratio >= 0.75) signal = 'STRONG'
  else if (ratio >= 0.5) signal = 'MODERATE'
  else signal = 'WEAK'

  return { total, maxPossible, breakdown, signal }
}

/**
 * Calculate Squeeze Score (Explosive Extension Candidate)
 * Based on: Float + Borrow Fee + Short Ratio + Borrow Difficulty
 */
function calculateSqueezeScore(stock: StockData): SqueezeScore {
  const breakdown: ScoreBreakdown[] = []
  let total = 0
  let maxPossible = 0

  // === FLOAT (3 points) ===
  if (stock.float_shares !== undefined && stock.float_shares > 0) {
    maxPossible += 3
    let points = 0
    let threshold = ''

    if (stock.float_shares < 5_000_000) {
      points = 3
      threshold = '<5M (SUPERNOVA potential)'
    } else if (stock.float_shares < 10_000_000) {
      points = 2
      threshold = '<10M (ULTRA LOW)'
    } else if (stock.float_shares < 20_000_000) {
      points = 1
      threshold = '<20M (LOW)'
    } else if (stock.float_shares < 30_000_000) {
      threshold = '<30M (MODERATE)'
    } else {
      threshold = '>30M (HIGH - harder to squeeze)'
    }

    total += points
    breakdown.push({
      category: 'Float',
      points,
      maxPoints: 3,
      value: formatNumber(stock.float_shares),
      threshold,
      met: points > 0,
    })
  }

  // === BORROW FEE (2 points) ===
  if (stock.borrow_fee_rate !== undefined && stock.borrow_fee_rate >= 0) {
    maxPossible += 2
    let points = 0
    let threshold = ''

    if (stock.borrow_fee_rate > 50) {
      points = 2
      threshold = '>50% (EXTREME - shorts desperate)'
    } else if (stock.borrow_fee_rate > 20) {
      points = 1
      threshold = '>20% (HIGH squeeze fuel)'
    } else if (stock.borrow_fee_rate > 10) {
      threshold = '>10% (ELEVATED)'
    } else {
      threshold = '<10% (NORMAL)'
    }

    total += points
    breakdown.push({
      category: 'Borrow Fee',
      points,
      maxPoints: 2,
      value: `${stock.borrow_fee_rate.toFixed(1)}%`,
      threshold,
      met: points > 0,
    })
  }

  // === SHORT RATIO / DAYS TO COVER (2 points) ===
  if (stock.short_ratio !== undefined && stock.short_ratio > 0) {
    maxPossible += 2
    let points = 0
    let threshold = ''

    if (stock.short_ratio > 5) {
      points = 2
      threshold = '>5 days (VERY HIGH - can\'t exit fast)'
    } else if (stock.short_ratio > 3) {
      points = 1
      threshold = '>3 days (HIGH)'
    } else {
      threshold = '<3 days (NORMAL)'
    }

    total += points
    breakdown.push({
      category: 'Days to Cover',
      points,
      maxPoints: 2,
      value: `${stock.short_ratio.toFixed(1)} days`,
      threshold,
      met: points > 0,
    })
  }

  // === SHORTABLE SHARES BONUS (1 point) ===
  if (stock.shortable_shares !== undefined) {
    maxPossible += 1
    let points = 0
    let threshold = ''

    if (stock.shortable_shares < 50_000) {
      points = 1
      threshold = '<50K (VERY HARD to short)'
    } else if (stock.shortable_shares < 100_000) {
      threshold = '<100K (HARD)'
    } else {
      threshold = '>100K (AVAILABLE)'
    }

    total += points
    breakdown.push({
      category: 'Shortable',
      points,
      maxPoints: 1,
      value: formatNumber(stock.shortable_shares),
      threshold,
      met: points > 0,
    })
  }

  // === BORROW DIFFICULTY BONUS (1 point) ===
  if (stock.borrow_difficulty) {
    maxPossible += 1
    let points = 0
    const threshold = stock.borrow_difficulty

    if (stock.borrow_difficulty === 'VERY_HARD' || stock.borrow_difficulty === 'HARD') {
      points = 1
    }

    total += points
    breakdown.push({
      category: 'Borrow Difficulty',
      points,
      maxPoints: 1,
      value: stock.borrow_difficulty,
      threshold: points > 0 ? 'HARD+ (Squeeze fuel)' : 'Borrowable',
      met: points > 0,
    })
  }

  // Determine signal strength
  const ratio = maxPossible > 0 ? total / maxPossible : 0
  let signal: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE'
  if (ratio >= 0.7) signal = 'HIGH'
  else if (ratio >= 0.4) signal = 'MEDIUM'
  else if (ratio > 0) signal = 'LOW'
  else signal = 'NONE'

  return { total, maxPossible, breakdown, signal }
}

/**
 * Calculate combined Winners Strategy score
 */
export function calculateWinnersScore(stock: StockData): WinnersScore {
  // Calculate separate scores
  const momentum = calculateMomentumScore(stock)
  const squeeze = calculateSqueezeScore(stock)

  // Combine all breakdown items
  const breakdown = [...momentum.breakdown, ...squeeze.breakdown]

  // Track missing data
  const missingData: string[] = []
  if (stock.float_shares === undefined) missingData.push('Float')
  if (stock.borrow_fee_rate === undefined) missingData.push('Borrow Fee')
  if (stock.short_ratio === undefined) missingData.push('Days to Cover')
  if (stock.relative_volume === undefined) missingData.push('Relative Volume')
  if (stock.shortable_shares === undefined) missingData.push('Shortable Shares')

  // Combined score (max 10)
  const total = momentum.total + squeeze.total
  const maxPossible = momentum.maxPossible + squeeze.maxPossible

  // Determine conviction
  const scoreRatio = maxPossible > 0 ? total / maxPossible : 0
  let conviction: 'HIGH' | 'MEDIUM' | 'LOW' | 'SKIP'
  let emoji: string

  if (total >= 8 || (maxPossible >= 6 && scoreRatio >= 0.8)) {
    conviction = 'HIGH'
    emoji = '🔥'
  } else if (total >= 5 || (maxPossible >= 4 && scoreRatio >= 0.6)) {
    conviction = 'MEDIUM'
    emoji = '👀'
  } else if (total >= 3 || scoreRatio >= 0.4) {
    conviction = 'LOW'
    emoji = '⚠️'
  } else {
    conviction = 'SKIP'
    emoji = '❌'
  }

  // Generate recommendation
  let recommendation: string
  if (momentum.signal === 'STRONG' && squeeze.signal === 'HIGH') {
    recommendation = '🚀 PRIME CANDIDATE - Strong momentum + high squeeze potential'
  } else if (momentum.signal === 'STRONG') {
    recommendation = '📈 MOMENTUM PLAY - Trend day candidate, watch for VWAP hold'
  } else if (squeeze.signal === 'HIGH' || squeeze.signal === 'MEDIUM') {
    recommendation = '💥 SQUEEZE WATCH - Needs momentum catalyst to trigger'
  } else if (momentum.signal === 'MODERATE') {
    recommendation = '👀 WATCH - Wait for volume confirmation at open'
  } else {
    recommendation = '❌ SKIP - Does not meet Winners Strategy criteria'
  }

  if (missingData.length > 2) {
    recommendation += ` [Note: Missing ${missingData.length} data points]`
  }

  // Generate entry trigger based on data
  let entryTrigger: string
  if (stock.gap_percent > 0) {
    entryTrigger = `Break above pre-market high with volume. Stop below ${stock.vwap ? 'VWAP' : 'gap low'}.`
  } else {
    entryTrigger = 'Wait for reversal confirmation. Gap-downs often fade further.'
  }

  return {
    total,
    maxPossible,
    maxTotal: 10,
    conviction,
    emoji,
    momentum,
    squeeze,
    breakdown,
    missingData,
    recommendation,
    entryTrigger,
  }
}

/**
 * Format large numbers for display
 */
function formatNumber(num: number): string {
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`
  return num.toLocaleString()
}

/**
 * Check if stock passes minimum Winners Strategy filters
 */
export function passesWinnersFilters(stock: StockData): {
  passes: boolean
  reasons: string[]
} {
  const reasons: string[] = []
  let passes = true

  // Gap must be >10%
  if (Math.abs(stock.gap_percent) < 10) {
    reasons.push(`Gap ${stock.gap_percent.toFixed(1)}% < 10% minimum`)
    passes = false
  }

  // Pre-market volume must be >500K
  if (stock.pre_market_volume < 500_000) {
    reasons.push(`PM Volume ${formatNumber(stock.pre_market_volume)} < 500K minimum`)
    passes = false
  }

  // Float warning (not a failure)
  if (stock.float_shares && stock.float_shares > 50_000_000) {
    reasons.push(`Float ${formatNumber(stock.float_shares)} > 50M (very hard to move)`)
  }

  return { passes, reasons }
}

/**
 * Rank stocks by Winners Strategy score
 */
export function rankByWinnersScore(stocks: StockData[]): Array<StockData & { winnersScore: WinnersScore }> {
  return stocks
    .map(stock => ({
      ...stock,
      winnersScore: calculateWinnersScore(stock),
    }))
    .sort((a, b) => {
      // First by conviction
      const convictionOrder = { HIGH: 0, MEDIUM: 1, LOW: 2, SKIP: 3 }
      const convDiff = convictionOrder[a.winnersScore.conviction] - convictionOrder[b.winnersScore.conviction]
      if (convDiff !== 0) return convDiff

      // Then by total score
      return b.winnersScore.total - a.winnersScore.total
    })
}

/**
 * Generate summary for AI analysis prompt
 */
export function generateScoreSummaryForPrompt(score: WinnersScore): string {
  const lines = [
    `=== WINNERS STRATEGY ANALYSIS ===`,
    `Score: ${score.total}/${score.maxPossible} → ${score.emoji} ${score.conviction}`,
    '',
    `Momentum Signal: ${score.momentum.signal} (${score.momentum.total}/${score.momentum.maxPossible} pts)`,
    `Squeeze Signal: ${score.squeeze.signal} (${score.squeeze.total}/${score.squeeze.maxPossible} pts)`,
    '',
    'Score Breakdown:',
  ]

  for (const item of score.breakdown) {
    const status = item.met ? '✓' : '✗'
    lines.push(`  ${status} ${item.category}: ${item.value} → ${item.points}/${item.maxPoints} pts`)
  }

  if (score.missingData.length > 0) {
    lines.push('')
    lines.push(`Missing: ${score.missingData.join(', ')}`)
  }

  lines.push('')
  lines.push(`Recommendation: ${score.recommendation}`)
  lines.push(`Entry: ${score.entryTrigger}`)

  return lines.join('\n')
}

/**
 * Calculate float rotation (how many times float has traded)
 * Higher = more explosive potential
 */
export function calculateFloatRotation(pmVolume: number, floatShares: number): number {
  if (floatShares <= 0) return 0
  return pmVolume / floatShares
}

/**
 * Calculate relative volume (current vs average)
 */
export function calculateRelativeVolume(currentVolume: number, avgVolume: number): number {
  if (avgVolume <= 0) return 0
  return currentVolume / avgVolume
}

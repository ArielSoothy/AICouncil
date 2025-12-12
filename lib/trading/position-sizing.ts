/**
 * Position Sizing - Kelly Criterion & Risk-Based Position Calculations
 *
 * Provides deterministic position sizing based on:
 * - Kelly Criterion (optimal bet sizing)
 * - Fixed Fractional (% of portfolio)
 * - Volatility-Adjusted (ATR-based)
 * - Risk-Based (max $ risk per trade)
 *
 * All functions are PURE (deterministic) - same inputs = same outputs.
 *
 * Philosophy:
 * "Position sizing is MORE important than entry signals"
 * - Good entries with bad sizing = losses
 * - Average entries with good sizing = profits
 *
 * @see docs/architecture/TRADING_DATA_TAXONOMY.md
 * Created: December 11, 2025
 */

import type { TradingTimeframe } from '@/components/trading/timeframe-selector';

// ============================================================================
// TYPES
// ============================================================================

export interface PositionSizeResult {
  shares: number;              // Number of shares to buy
  dollarAmount: number;        // Total position value
  portfolioPercent: number;    // % of portfolio allocated
  riskAmount: number;          // Maximum $ at risk
  riskPercent: number;         // % of portfolio at risk
  method: string;              // Sizing method used
  reasoning: string;           // Explanation
}

export interface KellyResult {
  fullKelly: number;           // Full Kelly fraction (aggressive)
  halfKelly: number;           // Half Kelly (recommended)
  quarterKelly: number;        // Quarter Kelly (conservative)
  recommended: number;         // Recommended position size
  reasoning: string;
}

export interface TradingStats {
  winRate: number;             // Probability of winning (0-1)
  avgWin: number;              // Average winning trade %
  avgLoss: number;             // Average losing trade %
  profitFactor: number;        // Gross profit / Gross loss
  expectancy: number;          // Expected value per trade
}

// ============================================================================
// KELLY CRITERION
// ============================================================================

/**
 * Calculate Kelly Criterion Position Size
 *
 * Kelly Formula: f* = (p * b - q) / b
 *
 * Where:
 *   f* = fraction of bankroll to bet
 *   p = probability of winning
 *   b = odds ratio (avg_win / avg_loss)
 *   q = probability of losing (1 - p)
 *
 * IMPORTANT: Full Kelly is aggressive and can cause large drawdowns.
 * Most traders use Half Kelly (0.5x) or Quarter Kelly (0.25x).
 *
 * @param winRate - Historical win rate (0-1, e.g., 0.55 = 55%)
 * @param avgWinPercent - Average winning trade % (e.g., 0.10 = 10%)
 * @param avgLossPercent - Average losing trade % (e.g., 0.05 = 5%)
 * @returns Kelly calculation results
 */
export function calculateKelly(
  winRate: number,
  avgWinPercent: number,
  avgLossPercent: number
): KellyResult {
  // Validate inputs
  if (winRate <= 0 || winRate >= 1) {
    return {
      fullKelly: 0,
      halfKelly: 0,
      quarterKelly: 0,
      recommended: 0,
      reasoning: 'Invalid win rate (must be between 0 and 1)',
    };
  }

  if (avgWinPercent <= 0 || avgLossPercent <= 0) {
    return {
      fullKelly: 0,
      halfKelly: 0,
      quarterKelly: 0,
      recommended: 0,
      reasoning: 'Invalid win/loss percentages',
    };
  }

  const p = winRate;
  const q = 1 - winRate;
  const b = avgWinPercent / avgLossPercent; // Win/Loss ratio

  // Kelly formula
  const kelly = (p * b - q) / b;

  // If Kelly is negative, the edge is negative - don't trade
  if (kelly <= 0) {
    return {
      fullKelly: 0,
      halfKelly: 0,
      quarterKelly: 0,
      recommended: 0,
      reasoning: `Negative edge (${(kelly * 100).toFixed(1)}%). Do not trade - system has no edge.`,
    };
  }

  // Cap Kelly at 25% maximum (risk management)
  const fullKelly = Math.min(kelly, 0.25);
  const halfKelly = fullKelly * 0.5;
  const quarterKelly = fullKelly * 0.25;

  // Recommended: Half Kelly is the sweet spot
  const recommended = halfKelly;

  const reasoning = `
Win Rate: ${(winRate * 100).toFixed(1)}%
Avg Win: ${(avgWinPercent * 100).toFixed(1)}% | Avg Loss: ${(avgLossPercent * 100).toFixed(1)}%
Win/Loss Ratio: ${b.toFixed(2)}
Full Kelly suggests ${(kelly * 100).toFixed(1)}% of portfolio.
Using Half Kelly (${(halfKelly * 100).toFixed(1)}%) for safety.
  `.trim();

  return {
    fullKelly: Math.round(fullKelly * 1000) / 1000,
    halfKelly: Math.round(halfKelly * 1000) / 1000,
    quarterKelly: Math.round(quarterKelly * 1000) / 1000,
    recommended: Math.round(recommended * 1000) / 1000,
    reasoning,
  };
}

/**
 * Calculate expectancy (expected value per trade)
 *
 * Expectancy = (Win Rate × Avg Win) - (Loss Rate × Avg Loss)
 *
 * Positive expectancy = profitable system over time
 */
export function calculateExpectancy(
  winRate: number,
  avgWinPercent: number,
  avgLossPercent: number
): number {
  const lossRate = 1 - winRate;
  return (winRate * avgWinPercent) - (lossRate * avgLossPercent);
}

/**
 * Calculate profit factor
 *
 * Profit Factor = Gross Profit / Gross Loss
 *
 * > 1.0 = Profitable
 * > 1.5 = Good
 * > 2.0 = Excellent
 */
export function calculateProfitFactor(
  winRate: number,
  avgWinPercent: number,
  avgLossPercent: number
): number {
  const grossProfit = winRate * avgWinPercent;
  const grossLoss = (1 - winRate) * avgLossPercent;

  if (grossLoss === 0) return 0;

  return grossProfit / grossLoss;
}

// ============================================================================
// FIXED FRACTIONAL POSITION SIZING
// ============================================================================

/**
 * Calculate position size using Fixed Fractional method
 *
 * This is the most common method:
 * 1. Determine max % of portfolio to risk
 * 2. Calculate position size based on stop loss distance
 *
 * @param portfolioValue - Total portfolio value
 * @param riskPercent - Max % of portfolio to risk (e.g., 0.02 = 2%)
 * @param entryPrice - Entry price per share
 * @param stopLoss - Stop loss price
 * @returns Position size result
 */
export function calculateFixedFractional(
  portfolioValue: number,
  riskPercent: number,
  entryPrice: number,
  stopLoss: number
): PositionSizeResult {
  // Max dollar risk
  const maxRiskDollars = portfolioValue * riskPercent;

  // Risk per share
  const riskPerShare = Math.abs(entryPrice - stopLoss);

  if (riskPerShare === 0) {
    return {
      shares: 0,
      dollarAmount: 0,
      portfolioPercent: 0,
      riskAmount: 0,
      riskPercent: 0,
      method: 'Fixed Fractional',
      reasoning: 'Stop loss equals entry price - cannot calculate position size',
    };
  }

  // Shares to buy
  const shares = Math.floor(maxRiskDollars / riskPerShare);

  // Total position value
  const dollarAmount = shares * entryPrice;

  // Actual portfolio allocation
  const portfolioPercent = (dollarAmount / portfolioValue) * 100;

  // Actual risk
  const riskAmount = shares * riskPerShare;

  return {
    shares,
    dollarAmount: Math.round(dollarAmount * 100) / 100,
    portfolioPercent: Math.round(portfolioPercent * 100) / 100,
    riskAmount: Math.round(riskAmount * 100) / 100,
    riskPercent: Math.round(riskPercent * 100 * 100) / 100,
    method: 'Fixed Fractional',
    reasoning: `Risking ${(riskPercent * 100).toFixed(1)}% of portfolio ($${maxRiskDollars.toFixed(2)}) with $${riskPerShare.toFixed(2)} risk per share`,
  };
}

// ============================================================================
// VOLATILITY-ADJUSTED POSITION SIZING
// ============================================================================

/**
 * Calculate position size adjusted for volatility (ATR-based)
 *
 * Higher volatility = smaller position (to maintain consistent risk)
 * Lower volatility = larger position (can handle larger size)
 *
 * @param portfolioValue - Total portfolio value
 * @param entryPrice - Entry price per share
 * @param atr - Current Average True Range
 * @param riskPercent - Max % of portfolio to risk
 * @param atrMultiplier - ATR multiplier for stop (default 2x)
 */
export function calculateVolatilityAdjusted(
  portfolioValue: number,
  entryPrice: number,
  atr: number,
  riskPercent: number = 0.02,
  atrMultiplier: number = 2
): PositionSizeResult {
  // ATR-based stop loss distance
  const stopDistance = atr * atrMultiplier;

  // Calculate position using fixed fractional with ATR-based stop
  const stopLoss = entryPrice - stopDistance;

  const result = calculateFixedFractional(
    portfolioValue,
    riskPercent,
    entryPrice,
    stopLoss
  );

  // Override method and reasoning
  return {
    ...result,
    method: 'Volatility-Adjusted (ATR)',
    reasoning: `ATR: $${atr.toFixed(2)} × ${atrMultiplier} = $${stopDistance.toFixed(2)} stop distance. Position sized to risk ${(riskPercent * 100).toFixed(1)}% of portfolio.`,
  };
}

// ============================================================================
// TIMEFRAME-BASED RECOMMENDATIONS
// ============================================================================

/**
 * Get recommended risk parameters by timeframe
 *
 * Different timeframes have different risk tolerances:
 * - Day trading: Small risk (1-2%), tight stops
 * - Swing trading: Medium risk (2-3%), ATR-based stops
 * - Position trading: Higher risk (3-5%), support-based stops
 * - Long-term: Highest risk tolerance (5-10%), fundamental stops
 */
export function getTimeframeRiskParams(timeframe: TradingTimeframe): {
  maxRiskPercent: number;
  atrMultiplier: number;
  maxPositionPercent: number;
  description: string;
} {
  switch (timeframe) {
    case 'day':
      return {
        maxRiskPercent: 0.01,      // 1% risk per trade
        atrMultiplier: 1.5,        // Tight stops
        maxPositionPercent: 0.10,  // Max 10% per position
        description: 'Day trading: Tight risk management, quick exits',
      };

    case 'swing':
      return {
        maxRiskPercent: 0.02,      // 2% risk per trade
        atrMultiplier: 2.0,        // Standard ATR stops
        maxPositionPercent: 0.15,  // Max 15% per position
        description: 'Swing trading: Balanced risk, ATR-based stops',
      };

    case 'position':
      return {
        maxRiskPercent: 0.03,      // 3% risk per trade
        atrMultiplier: 2.5,        // Wider stops
        maxPositionPercent: 0.20,  // Max 20% per position
        description: 'Position trading: Higher risk tolerance, support-based stops',
      };

    case 'longterm':
      return {
        maxRiskPercent: 0.05,      // 5% risk per trade
        atrMultiplier: 3.0,        // Wide stops for volatility
        maxPositionPercent: 0.25,  // Max 25% per position
        description: 'Long-term: Fundamental focus, wide stops for volatility',
      };
  }
}

// ============================================================================
// MAIN POSITION SIZE CALCULATOR
// ============================================================================

/**
 * Calculate optimal position size with all methods
 *
 * This is the main function that returns comprehensive position sizing.
 *
 * @param portfolioValue - Total portfolio value
 * @param entryPrice - Entry price per share
 * @param stopLoss - Stop loss price
 * @param atr - Current ATR (optional, for volatility-adjusted sizing)
 * @param timeframe - Trading timeframe
 * @param tradingStats - Historical trading statistics (optional, for Kelly)
 * @returns Position size recommendation
 */
export function calculateOptimalPositionSize(
  portfolioValue: number,
  entryPrice: number,
  stopLoss: number,
  atr: number | null = null,
  timeframe: TradingTimeframe = 'swing',
  tradingStats: TradingStats | null = null
): PositionSizeResult {
  const params = getTimeframeRiskParams(timeframe);

  // Primary method: Fixed Fractional (most reliable)
  const fixedFractional = calculateFixedFractional(
    portfolioValue,
    params.maxRiskPercent,
    entryPrice,
    stopLoss
  );

  // If ATR available, also calculate volatility-adjusted
  let volatilityAdjusted: PositionSizeResult | null = null;
  if (atr && atr > 0) {
    volatilityAdjusted = calculateVolatilityAdjusted(
      portfolioValue,
      entryPrice,
      atr,
      params.maxRiskPercent,
      params.atrMultiplier
    );
  }

  // If trading stats available, calculate Kelly
  let kellyResult: KellyResult | null = null;
  if (tradingStats && tradingStats.winRate > 0) {
    kellyResult = calculateKelly(
      tradingStats.winRate,
      tradingStats.avgWin,
      tradingStats.avgLoss
    );
  }

  // Choose the most conservative position size
  let recommended = fixedFractional;
  let recommendedShares = fixedFractional.shares;

  if (volatilityAdjusted && volatilityAdjusted.shares < recommendedShares) {
    recommended = volatilityAdjusted;
    recommendedShares = volatilityAdjusted.shares;
  }

  // Apply Kelly cap if available
  if (kellyResult && kellyResult.recommended > 0) {
    const kellyMaxPosition = portfolioValue * kellyResult.recommended;
    const kellyMaxShares = Math.floor(kellyMaxPosition / entryPrice);

    if (kellyMaxShares < recommendedShares) {
      recommendedShares = kellyMaxShares;
      recommended = {
        ...recommended,
        shares: kellyMaxShares,
        dollarAmount: kellyMaxShares * entryPrice,
        portfolioPercent: (kellyMaxShares * entryPrice / portfolioValue) * 100,
        method: 'Kelly-Capped',
        reasoning: `Position capped by Half Kelly (${(kellyResult.halfKelly * 100).toFixed(1)}%)`,
      };
    }
  }

  // Apply maximum position size cap
  const maxPositionDollars = portfolioValue * params.maxPositionPercent;
  const maxSharesByPosition = Math.floor(maxPositionDollars / entryPrice);

  if (recommendedShares > maxSharesByPosition) {
    recommendedShares = maxSharesByPosition;
    recommended = {
      ...recommended,
      shares: maxSharesByPosition,
      dollarAmount: maxSharesByPosition * entryPrice,
      portfolioPercent: params.maxPositionPercent * 100,
      reasoning: `Position capped at ${(params.maxPositionPercent * 100).toFixed(0)}% max for ${timeframe} trading`,
    };
  }

  // Recalculate risk with final share count
  const riskPerShare = Math.abs(entryPrice - stopLoss);
  const finalRiskAmount = recommendedShares * riskPerShare;
  const finalRiskPercent = (finalRiskAmount / portfolioValue) * 100;

  return {
    shares: recommendedShares,
    dollarAmount: Math.round(recommendedShares * entryPrice * 100) / 100,
    portfolioPercent: Math.round((recommendedShares * entryPrice / portfolioValue) * 100 * 100) / 100,
    riskAmount: Math.round(finalRiskAmount * 100) / 100,
    riskPercent: Math.round(finalRiskPercent * 100) / 100,
    method: recommended.method,
    reasoning: `${params.description}. ${recommended.reasoning}`,
  };
}

/**
 * Format position size for display in prompts
 */
export function formatPositionSizeForPrompt(
  result: PositionSizeResult,
  symbol: string,
  entryPrice: number
): string {
  return `
📊 POSITION SIZE FOR ${symbol}:

RECOMMENDED POSITION:
- Shares: ${result.shares}
- Position Value: $${result.dollarAmount.toLocaleString()}
- Portfolio Allocation: ${result.portfolioPercent.toFixed(1)}%

RISK ANALYSIS:
- Max Risk: $${result.riskAmount.toLocaleString()} (${result.riskPercent.toFixed(2)}% of portfolio)
- Method: ${result.method}

REASONING:
${result.reasoning}

⚠️ IMPORTANT:
- Never risk more than 2% of portfolio on any single trade
- Adjust position size based on conviction level
- Consider correlation with existing positions
`;
}

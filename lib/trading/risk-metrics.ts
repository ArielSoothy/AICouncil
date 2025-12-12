/**
 * Risk Metrics - Volatility and Risk Measurement Tools
 *
 * Provides deterministic calculations for:
 * - ATR (Average True Range) - volatility-based stop losses
 * - Standard Deviation - price volatility
 * - Value at Risk (VaR) - potential loss estimation
 * - Maximum Drawdown - historical risk assessment
 * - Sharpe Ratio - risk-adjusted returns
 * - Sortino Ratio - downside risk-adjusted returns
 *
 * All functions are PURE (deterministic) - same inputs = same outputs.
 *
 * @see docs/architecture/TRADING_DATA_TAXONOMY.md
 * Created: December 11, 2025
 */

import type { PriceBar } from '@/lib/data-providers/types';

// ============================================================================
// TYPES
// ============================================================================

export interface RiskMetrics {
  atr: number;                  // Average True Range (volatility)
  atrPercent: number;           // ATR as % of current price
  standardDeviation: number;    // Price volatility (std dev of returns)
  historicalVolatility: number; // Annualized volatility
  valueAtRisk95: number;        // 95% VaR (daily)
  valueAtRisk99: number;        // 99% VaR (daily)
  maxDrawdown: number;          // Maximum drawdown %
  sharpeRatio: number | null;   // Risk-adjusted return (null if insufficient data)
  sortinoRatio: number | null;  // Downside risk-adjusted return
}

export interface StopLossLevels {
  atrStop: number;       // ATR-based stop (2x ATR below entry)
  percentStop: number;   // Percentage-based stop
  supportStop: number;   // Support level stop
  recommended: number;   // Best stop for timeframe
  riskAmount: number;    // Dollar risk per share
  riskPercent: number;   // Risk as % of entry price
}

export interface TakeProfitLevels {
  target1x: number;      // 1:1 risk/reward
  target2x: number;      // 2:1 risk/reward
  target3x: number;      // 3:1 risk/reward
  resistanceTarget: number; // Resistance level target
  recommended: number;   // Best target for timeframe
  rewardAmount: number;  // Dollar reward per share
  riskRewardRatio: string; // e.g., "2.5:1"
}

// ============================================================================
// ATR (Average True Range) - Volatility Measurement
// ============================================================================

/**
 * Calculate Average True Range (ATR)
 *
 * ATR measures market volatility by decomposing the entire range of an asset price.
 * True Range = MAX(High - Low, |High - PrevClose|, |Low - PrevClose|)
 * ATR = Average of True Ranges over period
 *
 * @param bars - Historical price bars (need at least period + 1 bars)
 * @param period - ATR period (default 14 days, standard)
 * @returns ATR value or 0 if insufficient data
 */
export function calculateATR(bars: PriceBar[], period: number = 14): number {
  if (bars.length < period + 1) {
    console.warn(`ATR requires ${period + 1} bars, got ${bars.length}`);
    return 0;
  }

  const trueRanges: number[] = [];

  for (let i = 1; i < bars.length; i++) {
    const current = bars[i];
    const previous = bars[i - 1];

    // True Range = MAX of:
    // 1. High - Low (current bar range)
    // 2. |High - Previous Close| (gap up consideration)
    // 3. |Low - Previous Close| (gap down consideration)
    const trueRange = Math.max(
      current.high - current.low,
      Math.abs(current.high - previous.close),
      Math.abs(current.low - previous.close)
    );

    trueRanges.push(trueRange);
  }

  // Calculate average of last 'period' true ranges
  const relevantRanges = trueRanges.slice(-period);
  const atr = relevantRanges.reduce((sum, tr) => sum + tr, 0) / relevantRanges.length;

  return atr;
}

/**
 * Calculate ATR as percentage of price
 * Useful for comparing volatility across different priced stocks
 */
export function calculateATRPercent(bars: PriceBar[], period: number = 14): number {
  if (bars.length === 0) return 0;

  const atr = calculateATR(bars, period);
  const currentPrice = bars[bars.length - 1].close;

  return currentPrice > 0 ? (atr / currentPrice) * 100 : 0;
}

// ============================================================================
// STANDARD DEVIATION & VOLATILITY
// ============================================================================

/**
 * Calculate daily returns from price bars
 */
export function calculateDailyReturns(bars: PriceBar[]): number[] {
  const returns: number[] = [];

  for (let i = 1; i < bars.length; i++) {
    const dailyReturn = (bars[i].close - bars[i - 1].close) / bars[i - 1].close;
    returns.push(dailyReturn);
  }

  return returns;
}

/**
 * Calculate Standard Deviation of returns
 *
 * Measures the dispersion of returns from their mean.
 * Higher std dev = more volatile = higher risk.
 *
 * @param returns - Array of daily returns (as decimals, e.g., 0.02 = 2%)
 * @returns Standard deviation
 */
export function calculateStandardDeviation(returns: number[]): number {
  if (returns.length < 2) return 0;

  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const squaredDiffs = returns.map(r => Math.pow(r - mean, 2));
  const variance = squaredDiffs.reduce((sum, sq) => sum + sq, 0) / (returns.length - 1);

  return Math.sqrt(variance);
}

/**
 * Calculate Historical Volatility (annualized)
 *
 * Annualizes daily standard deviation assuming 252 trading days/year.
 *
 * @param bars - Price bars
 * @param period - Days to analyze (default 30)
 * @returns Annualized volatility as decimal (e.g., 0.25 = 25%)
 */
export function calculateHistoricalVolatility(bars: PriceBar[], period: number = 30): number {
  if (bars.length < period + 1) {
    console.warn(`Historical volatility requires ${period + 1} bars`);
    return 0;
  }

  const relevantBars = bars.slice(-period - 1);
  const returns = calculateDailyReturns(relevantBars);
  const dailyStdDev = calculateStandardDeviation(returns);

  // Annualize: multiply by sqrt(252 trading days)
  const annualizedVol = dailyStdDev * Math.sqrt(252);

  return annualizedVol;
}

// ============================================================================
// VALUE AT RISK (VaR)
// ============================================================================

/**
 * Calculate Value at Risk (VaR) using Historical Simulation
 *
 * VaR answers: "What is the maximum loss with X% confidence?"
 * 95% VaR means: "95% of the time, daily loss won't exceed this amount"
 *
 * @param returns - Array of daily returns
 * @param confidence - Confidence level (0.95 = 95%, 0.99 = 99%)
 * @returns VaR as a positive decimal (e.g., 0.02 = 2% potential loss)
 */
export function calculateValueAtRisk(returns: number[], confidence: number = 0.95): number {
  if (returns.length < 10) {
    console.warn('VaR requires at least 10 data points for reliability');
    return 0;
  }

  // Sort returns ascending (worst to best)
  const sorted = [...returns].sort((a, b) => a - b);

  // VaR is the return at the (1 - confidence) percentile
  // For 95% confidence, we want the 5th percentile (worst 5%)
  const percentile = 1 - confidence;
  const index = Math.floor(sorted.length * percentile);

  // Return as positive number (it's a loss)
  return Math.abs(sorted[index]);
}

/**
 * Calculate VaR in dollar terms
 */
export function calculateVaRDollars(
  portfolioValue: number,
  returns: number[],
  confidence: number = 0.95
): number {
  const varPercent = calculateValueAtRisk(returns, confidence);
  return portfolioValue * varPercent;
}

// ============================================================================
// MAXIMUM DRAWDOWN
// ============================================================================

/**
 * Calculate Maximum Drawdown
 *
 * Maximum drawdown = largest peak-to-trough decline in value.
 * Measures the worst-case historical loss.
 *
 * @param bars - Price bars
 * @returns Maximum drawdown as positive decimal (e.g., 0.15 = 15% decline)
 */
export function calculateMaxDrawdown(bars: PriceBar[]): number {
  if (bars.length < 2) return 0;

  let maxDrawdown = 0;
  let peak = bars[0].close;

  for (const bar of bars) {
    if (bar.close > peak) {
      peak = bar.close;
    }

    const drawdown = (peak - bar.close) / peak;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  return maxDrawdown;
}

// ============================================================================
// SHARPE & SORTINO RATIOS
// ============================================================================

/**
 * Calculate Sharpe Ratio
 *
 * Sharpe = (Return - Risk-Free Rate) / Standard Deviation
 *
 * Measures risk-adjusted return. Higher = better.
 * - > 1.0 = Good
 * - > 2.0 = Very Good
 * - > 3.0 = Excellent
 *
 * @param returns - Daily returns
 * @param riskFreeRate - Annual risk-free rate (default 5% = 0.05)
 * @returns Annualized Sharpe ratio or null if insufficient data
 */
export function calculateSharpeRatio(
  returns: number[],
  riskFreeRate: number = 0.05
): number | null {
  if (returns.length < 30) {
    return null; // Need at least 30 days for meaningful Sharpe
  }

  const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const stdDev = calculateStandardDeviation(returns);

  if (stdDev === 0) return null;

  // Daily risk-free rate
  const dailyRf = riskFreeRate / 252;

  // Daily Sharpe
  const dailySharpe = (meanReturn - dailyRf) / stdDev;

  // Annualize: multiply by sqrt(252)
  return dailySharpe * Math.sqrt(252);
}

/**
 * Calculate Sortino Ratio
 *
 * Sortino = (Return - Risk-Free Rate) / Downside Deviation
 *
 * Like Sharpe but only penalizes downside volatility.
 * Better for assets with asymmetric returns.
 *
 * @param returns - Daily returns
 * @param riskFreeRate - Annual risk-free rate
 * @returns Annualized Sortino ratio or null if insufficient data
 */
export function calculateSortinoRatio(
  returns: number[],
  riskFreeRate: number = 0.05
): number | null {
  if (returns.length < 30) {
    return null;
  }

  const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const dailyRf = riskFreeRate / 252;

  // Only consider negative returns for downside deviation
  const negativeReturns = returns.filter(r => r < 0);

  if (negativeReturns.length === 0) {
    return null; // No downside = undefined Sortino
  }

  // Downside deviation (std dev of negative returns only)
  const downsideDev = calculateStandardDeviation(negativeReturns);

  if (downsideDev === 0) return null;

  const dailySortino = (meanReturn - dailyRf) / downsideDev;

  return dailySortino * Math.sqrt(252);
}

// ============================================================================
// STOP LOSS & TAKE PROFIT CALCULATIONS
// ============================================================================

/**
 * Calculate ATR-based stop loss levels
 *
 * ATR stops adjust to market volatility:
 * - High volatility = wider stops (avoid whipsaws)
 * - Low volatility = tighter stops (protect profits)
 *
 * @param entryPrice - Entry price
 * @param atr - Current ATR value
 * @param support - Support level (optional)
 * @param multiplier - ATR multiplier (default 2x, can be 1.5-3x)
 * @param timeframe - Trading timeframe for recommendations
 */
export function calculateStopLossLevels(
  entryPrice: number,
  atr: number,
  support: number = 0,
  multiplier: number = 2,
  timeframe: 'day' | 'swing' | 'position' | 'longterm' = 'swing'
): StopLossLevels {
  // ATR-based stop (most reliable for volatile markets)
  const atrStop = entryPrice - (atr * multiplier);

  // Percentage-based stop (fallback)
  const percentStops = {
    day: 0.02,      // 2% for day trading
    swing: 0.04,    // 4% for swing trading
    position: 0.08, // 8% for position trading
    longterm: 0.15, // 15% for long-term
  };
  const percentStop = entryPrice * (1 - percentStops[timeframe]);

  // Support-based stop (slightly below support)
  const supportStop = support > 0 ? support * 0.99 : percentStop;

  // Recommended stop based on timeframe
  // Day trading: Use tighter of ATR or percent
  // Swing/Position: Use ATR-based
  // Long-term: Use support if available, else percent
  let recommended: number;
  switch (timeframe) {
    case 'day':
      recommended = Math.max(atrStop, percentStop); // Tighter
      break;
    case 'swing':
    case 'position':
      recommended = atrStop;
      break;
    case 'longterm':
      recommended = support > 0 ? supportStop : percentStop;
      break;
  }

  const riskAmount = entryPrice - recommended;
  const riskPercent = (riskAmount / entryPrice) * 100;

  return {
    atrStop: Math.round(atrStop * 100) / 100,
    percentStop: Math.round(percentStop * 100) / 100,
    supportStop: Math.round(supportStop * 100) / 100,
    recommended: Math.round(recommended * 100) / 100,
    riskAmount: Math.round(riskAmount * 100) / 100,
    riskPercent: Math.round(riskPercent * 100) / 100,
  };
}

/**
 * Calculate take profit levels based on risk/reward ratios
 */
export function calculateTakeProfitLevels(
  entryPrice: number,
  stopLoss: number,
  resistance: number = 0,
  timeframe: 'day' | 'swing' | 'position' | 'longterm' = 'swing'
): TakeProfitLevels {
  const riskAmount = entryPrice - stopLoss;

  // Standard risk/reward targets
  const target1x = entryPrice + riskAmount;         // 1:1
  const target2x = entryPrice + (riskAmount * 2);   // 2:1
  const target3x = entryPrice + (riskAmount * 3);   // 3:1

  // Resistance target
  const resistanceTarget = resistance > entryPrice ? resistance : target2x;

  // Recommended R:R by timeframe
  const recommendedRR = {
    day: 2,         // Day traders: 2:1 R:R
    swing: 2.5,     // Swing: 2.5:1 R:R
    position: 3,    // Position: 3:1 R:R
    longterm: 5,    // Long-term: 5:1 R:R
  };

  const rrMultiplier = recommendedRR[timeframe];
  const recommended = entryPrice + (riskAmount * rrMultiplier);

  const rewardAmount = recommended - entryPrice;
  const riskRewardRatio = `${rrMultiplier.toFixed(1)}:1`;

  return {
    target1x: Math.round(target1x * 100) / 100,
    target2x: Math.round(target2x * 100) / 100,
    target3x: Math.round(target3x * 100) / 100,
    resistanceTarget: Math.round(resistanceTarget * 100) / 100,
    recommended: Math.round(recommended * 100) / 100,
    rewardAmount: Math.round(rewardAmount * 100) / 100,
    riskRewardRatio,
  };
}

// ============================================================================
// MAIN RISK METRICS CALCULATOR
// ============================================================================

/**
 * Calculate all risk metrics for a stock
 *
 * This is the main function that returns comprehensive risk analysis.
 *
 * @param bars - Historical price bars (minimum 30 recommended)
 * @param currentPrice - Current stock price
 * @returns Complete risk metrics
 */
export function calculateRiskMetrics(bars: PriceBar[], currentPrice: number): RiskMetrics {
  const atr = calculateATR(bars);
  const atrPercent = currentPrice > 0 ? (atr / currentPrice) * 100 : 0;

  const returns = calculateDailyReturns(bars);
  const standardDeviation = calculateStandardDeviation(returns);
  const historicalVolatility = calculateHistoricalVolatility(bars);

  const valueAtRisk95 = calculateValueAtRisk(returns, 0.95);
  const valueAtRisk99 = calculateValueAtRisk(returns, 0.99);

  const maxDrawdown = calculateMaxDrawdown(bars);

  const sharpeRatio = calculateSharpeRatio(returns);
  const sortinoRatio = calculateSortinoRatio(returns);

  return {
    atr: Math.round(atr * 100) / 100,
    atrPercent: Math.round(atrPercent * 100) / 100,
    standardDeviation: Math.round(standardDeviation * 10000) / 10000, // 4 decimals
    historicalVolatility: Math.round(historicalVolatility * 100) / 100, // As %
    valueAtRisk95: Math.round(valueAtRisk95 * 10000) / 10000,
    valueAtRisk99: Math.round(valueAtRisk99 * 10000) / 10000,
    maxDrawdown: Math.round(maxDrawdown * 100) / 100, // As %
    sharpeRatio: sharpeRatio ? Math.round(sharpeRatio * 100) / 100 : null,
    sortinoRatio: sortinoRatio ? Math.round(sortinoRatio * 100) / 100 : null,
  };
}

/**
 * Format risk metrics for display in prompts
 */
export function formatRiskMetricsForPrompt(metrics: RiskMetrics, symbol: string): string {
  const volatilityLevel =
    metrics.atrPercent > 5 ? 'HIGH' :
    metrics.atrPercent > 2.5 ? 'MODERATE' : 'LOW';

  const riskAssessment =
    metrics.valueAtRisk95 > 0.04 ? 'HIGH RISK' :
    metrics.valueAtRisk95 > 0.02 ? 'MODERATE RISK' : 'LOW RISK';

  return `
📊 RISK METRICS FOR ${symbol}:

VOLATILITY:
- ATR: $${metrics.atr} (${metrics.atrPercent.toFixed(1)}% of price) → ${volatilityLevel} volatility
- Historical Volatility: ${(metrics.historicalVolatility * 100).toFixed(1)}% annualized
- Daily Std Dev: ${(metrics.standardDeviation * 100).toFixed(2)}%

VALUE AT RISK:
- 95% VaR: ${(metrics.valueAtRisk95 * 100).toFixed(2)}% (1-in-20 day potential loss)
- 99% VaR: ${(metrics.valueAtRisk99 * 100).toFixed(2)}% (1-in-100 day potential loss)
- Max Historical Drawdown: ${(metrics.maxDrawdown * 100).toFixed(1)}%

RISK ASSESSMENT: ${riskAssessment}
${metrics.sharpeRatio !== null ? `Sharpe Ratio: ${metrics.sharpeRatio.toFixed(2)} (${metrics.sharpeRatio > 1 ? 'Good' : metrics.sharpeRatio > 0 ? 'Acceptable' : 'Poor'})` : ''}
${metrics.sortinoRatio !== null ? `Sortino Ratio: ${metrics.sortinoRatio.toFixed(2)}` : ''}
`;
}

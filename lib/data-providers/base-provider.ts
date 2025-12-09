/**
 * Base Data Provider - Shared Logic for All Providers
 *
 * This abstract class provides common functionality used by all data providers:
 * - Technical indicator calculations
 * - Trend analysis
 * - Error handling patterns
 *
 * Design Pattern: Template Method Pattern
 * - Common calculations are implemented here
 * - Each provider only needs to implement raw data fetching
 *
 * Why Abstract Class vs Interface?
 * - Shares code (technical indicator calculations) across providers
 * - Enforces implementation of core methods (fetchMarketData)
 * - Provides helper methods all providers can use
 */

import type {
  IDataProvider,
  SharedTradingData,
  TechnicalIndicators,
  TrendAnalysis,
  PriceLevels,
  PriceBar,
  DataProviderError,
} from './types';

/**
 * Abstract base class for all data providers
 */
export abstract class BaseDataProvider implements IDataProvider {
  abstract readonly name: string;

  /**
   * Each provider must implement how to fetch market data
   */
  abstract fetchMarketData(symbol: string): Promise<SharedTradingData>;

  /**
   * Each provider must implement health check
   */
  abstract healthCheck(): Promise<boolean>;

  /**
   * Calculate Simple Moving Average (SMA)
   *
   * @param values - Array of numbers
   * @param period - Number of periods
   * @returns SMA value
   */
  protected calculateSMA(values: number[], period: number): number {
    if (values.length < period) {
      return values[values.length - 1] || 0;
    }
    const slice = values.slice(-period);
    return slice.reduce((sum, val) => sum + val, 0) / period;
  }

  /**
   * Calculate Exponential Moving Average (EMA)
   *
   * @param values - Array of numbers
   * @param period - Number of periods
   * @returns EMA value
   */
  protected calculateEMA(values: number[], period: number): number {
    if (values.length < period) {
      return values[values.length - 1] || 0;
    }

    const multiplier = 2 / (period + 1);
    let ema = this.calculateSMA(values.slice(0, period), period);

    for (let i = period; i < values.length; i++) {
      ema = (values[i] - ema) * multiplier + ema;
    }

    return ema;
  }

  /**
   * Calculate Relative Strength Index (RSI)
   *
   * @param prices - Array of closing prices
   * @param period - RSI period (typically 14)
   * @returns RSI value (0-100)
   */
  protected calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) {
      return 50; // Neutral default
    }

    const changes: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      changes.push(prices[i] - prices[i - 1]);
    }

    const recentChanges = changes.slice(-period);
    const gains = recentChanges.map(c => (c > 0 ? c : 0));
    const losses = recentChanges.map(c => (c < 0 ? Math.abs(c) : 0));

    const avgGain = gains.reduce((sum, val) => sum + val, 0) / period;
    const avgLoss = losses.reduce((sum, val) => sum + val, 0) / period;

    if (avgLoss === 0) return 100;

    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }

  /**
   * Calculate MACD (Moving Average Convergence Divergence)
   *
   * @param prices - Array of closing prices
   * @returns MACD object with line, signal, and histogram
   */
  protected calculateMACD(prices: number[]): {
    MACD: number;
    signal: number;
    histogram: number;
  } {
    if (prices.length < 26) {
      return { MACD: 0, signal: 0, histogram: 0 };
    }

    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    const macdLine = ema12 - ema26;

    // Calculate signal line (9-period EMA of MACD)
    const macdValues: number[] = [];
    for (let i = 26; i <= prices.length; i++) {
      const slice = prices.slice(0, i);
      const e12 = this.calculateEMA(slice, 12);
      const e26 = this.calculateEMA(slice, 26);
      macdValues.push(e12 - e26);
    }

    const signalLine = this.calculateEMA(macdValues, 9);
    const histogram = macdLine - signalLine;

    return {
      MACD: macdLine,
      signal: signalLine,
      histogram: histogram,
    };
  }

  /**
   * Calculate Bollinger Bands
   *
   * @param prices - Array of closing prices
   * @param period - Period (typically 20)
   * @param stdDev - Standard deviation multiplier (typically 2)
   * @returns Bollinger Bands object
   */
  protected calculateBollingerBands(
    prices: number[],
    period: number = 20,
    stdDev: number = 2
  ): { upper: number; middle: number; lower: number } {
    if (prices.length < period) {
      const current = prices[prices.length - 1] || 100;
      return {
        upper: current * 1.02,
        middle: current,
        lower: current * 0.98,
      };
    }

    const sma = this.calculateSMA(prices, period);
    const slice = prices.slice(-period);

    // Calculate standard deviation
    const squaredDiffs = slice.map(price => Math.pow(price - sma, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / period;
    const standardDeviation = Math.sqrt(variance);

    return {
      upper: sma + standardDeviation * stdDev,
      middle: sma,
      lower: sma - standardDeviation * stdDev,
    };
  }

  /**
   * Calculate technical indicators from price bars
   *
   * @param bars - Array of price bars
   * @param currentPrice - Current price for Bollinger Band position
   * @returns Complete technical indicators object
   */
  protected calculateTechnicalIndicators(
    bars: PriceBar[],
    currentPrice: number
  ): TechnicalIndicators {
    const closePrices = bars.map(b => b.close);

    // Calculate all indicators
    const rsi = this.calculateRSI(closePrices, 14);
    const macd = this.calculateMACD(closePrices);
    const ema20 = this.calculateEMA(closePrices, 20);
    const sma50 = this.calculateSMA(closePrices, 50);
    const sma200 =
      closePrices.length >= 200
        ? this.calculateSMA(closePrices, 200)
        : closePrices[closePrices.length - 1];
    const bb = this.calculateBollingerBands(closePrices, 20, 2);

    // Determine RSI signal
    const rsiSignal: 'Overbought' | 'Oversold' | 'Neutral' =
      rsi > 70 ? 'Overbought' : rsi < 30 ? 'Oversold' : 'Neutral';

    // Determine MACD trend
    const macdTrend: 'Bullish' | 'Bearish' | 'Neutral' =
      macd.histogram > 0 ? 'Bullish' : macd.histogram < 0 ? 'Bearish' : 'Neutral';

    // Determine Bollinger Band position
    const bbPosition: 'Above Upper' | 'Below Lower' | 'Within Bands' =
      currentPrice > bb.upper
        ? 'Above Upper'
        : currentPrice < bb.lower
        ? 'Below Lower'
        : 'Within Bands';

    return {
      rsi,
      rsiSignal,
      macd: {
        MACD: macd.MACD,
        signal: macd.signal,
        histogram: macd.histogram,
        trend: macdTrend,
      },
      ema20,
      sma50,
      sma200,
      bollingerBands: {
        upper: bb.upper,
        middle: bb.middle,
        lower: bb.lower,
        position: bbPosition,
      },
    };
  }

  /**
   * Calculate support and resistance levels from price bars
   *
   * @param bars - Array of price bars (at least 30 days)
   * @returns Price levels object
   */
  protected calculatePriceLevels(bars: PriceBar[]): PriceLevels {
    const last30Bars = bars.slice(-30);
    const allBars = bars;

    const last30Highs = last30Bars.map(b => b.high);
    const last30Lows = last30Bars.map(b => b.low);
    const allHighs = allBars.map(b => b.high);
    const allLows = allBars.map(b => b.low);

    return {
      support: Math.min(...last30Lows),
      resistance: Math.max(...last30Highs),
      yearHigh: Math.max(...allHighs),
      yearLow: Math.min(...allLows),
      month30High: Math.max(...last30Highs),
      month30Low: Math.min(...last30Lows),
    };
  }

  /**
   * Determine trend from price action and moving averages
   *
   * @param bars - Price bars (last 30 days)
   * @param ema20 - 20-period EMA
   * @param sma50 - 50-period SMA
   * @param sma200 - 200-period SMA
   * @param currentPrice - Current price
   * @returns Trend analysis object
   */
  protected determineTrend(
    bars: PriceBar[],
    ema20: number,
    sma50: number,
    sma200: number,
    currentPrice: number
  ): TrendAnalysis {
    const last30Days = bars.slice(-30);
    const startPrice = last30Days[0]?.close || currentPrice;
    const priceChange = ((currentPrice - startPrice) / startPrice) * 100;

    // Determine direction
    let direction: 'Uptrend' | 'Downtrend' | 'Sideways';
    if (currentPrice > ema20 && ema20 > sma50 && sma50 > sma200) {
      direction = 'Uptrend';
    } else if (currentPrice < ema20 && ema20 < sma50 && sma50 < sma200) {
      direction = 'Downtrend';
    } else {
      direction = 'Sideways';
    }

    // Determine strength
    let strength: 'Strong' | 'Moderate' | 'Weak';
    if (Math.abs(priceChange) > 10) {
      strength = 'Strong';
    } else if (Math.abs(priceChange) > 5) {
      strength = 'Moderate';
    } else {
      strength = 'Weak';
    }

    // Generate analysis
    const analysis = `${direction} (${strength}): Price ${
      priceChange > 0 ? 'up' : 'down'
    } ${Math.abs(priceChange).toFixed(1)}% over last 30 days. Current price ${
      currentPrice > ema20 ? 'above' : 'below'
    } 20-day EMA ($${ema20.toFixed(2)}).`;

    return {
      direction,
      strength,
      analysis,
    };
  }

  /**
   * Helper to log provider activity
   */
  protected log(message: string, data?: any): void {
    console.log(`[${this.name}] ${message}`, data || '');
  }

  /**
   * Helper to log errors
   */
  protected logError(message: string, error?: Error): void {
    console.error(`[${this.name}] ❌ ${message}`, error || '');
  }
}

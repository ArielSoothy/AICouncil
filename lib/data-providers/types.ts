/**
 * Shared Data Provider Types
 *
 * This file defines the common interfaces and types used by all data providers
 * (Alpaca, Yahoo Finance, IBKR, etc.). This ensures consistency and makes it
 * easy to swap providers without changing the rest of the application.
 *
 * Design Pattern: Interface Segregation Principle (ISP)
 * - Each provider implements the same interface
 * - Consumer code doesn't need to know which provider is being used
 * - Easy to test with mock providers
 */

/**
 * Real-time or near-real-time stock quote data
 */
export interface QuoteData {
  price: number;           // Current or last close price
  volume: number;          // Trading volume
  bid: number;            // Bid price (or approximation)
  ask: number;            // Ask price (or approximation)
  spread: number;         // Bid-ask spread
  timestamp: string;      // ISO timestamp of quote
}

/**
 * Historical price bar (candlestick) data
 */
export interface PriceBar {
  date: string;           // Date of the bar (YYYY-MM-DD)
  open: number;           // Opening price
  high: number;           // Highest price
  low: number;            // Lowest price
  close: number;          // Closing price
  volume: number;         // Trading volume
}

/**
 * Technical indicator values calculated from price data
 */
export interface TechnicalIndicators {
  rsi: number;                                              // Relative Strength Index (0-100)
  rsiSignal: 'Overbought' | 'Oversold' | 'Neutral';        // RSI interpretation
  macd: {
    MACD: number;                                           // MACD line
    signal: number;                                         // Signal line
    histogram: number;                                      // MACD histogram
    trend: 'Bullish' | 'Bearish' | 'Neutral';              // MACD trend
  };
  ema20: number;                                            // 20-period EMA
  sma50: number;                                            // 50-period SMA
  sma200: number;                                           // 200-period SMA
  bollingerBands: {
    upper: number;                                          // Upper band
    middle: number;                                         // Middle band (20-period SMA)
    lower: number;                                          // Lower band
    position: 'Above Upper' | 'Below Lower' | 'Within Bands'; // Current position
  };
}

/**
 * Support and resistance price levels
 */
export interface PriceLevels {
  support: number;         // Support level (price floor)
  resistance: number;      // Resistance level (price ceiling)
  yearHigh: number;       // 52-week high
  yearLow: number;        // 52-week low
  month30High: number;    // 30-day high
  month30Low: number;     // 30-day low
}

/**
 * News article about the stock
 */
export interface NewsArticle {
  headline: string;        // Article headline
  summary: string;         // Brief summary
  source: string;          // News source
  timestamp: string;       // Publication timestamp
  url: string;            // Link to full article
}

/**
 * Trend analysis from price action
 */
export interface TrendAnalysis {
  direction: 'Uptrend' | 'Downtrend' | 'Sideways';  // Overall trend direction
  strength: 'Strong' | 'Moderate' | 'Weak';         // Trend strength
  analysis: string;                                  // Human-readable analysis
}

/**
 * Fundamental data for valuation analysis
 * Source: Yahoo Finance (free)
 *
 * These metrics are CRITICAL for:
 * - Position trading (medium-term)
 * - Long-term investing
 * - Valuation-based decisions
 */
export interface FundamentalData {
  // Valuation Metrics
  pe: number | null;              // Price/Earnings ratio (trailing 12 months)
  forwardPe: number | null;       // Forward P/E (based on estimates)
  pegRatio: number | null;        // PEG ratio (P/E / growth rate)
  priceToBook: number | null;     // Price/Book ratio

  // Earnings & Profitability
  eps: number | null;             // Earnings per share (trailing 12 months)
  epsForward: number | null;      // Forward EPS estimate

  // Company Size & Liquidity
  marketCap: number | null;       // Market capitalization
  avgVolume: number | null;       // Average volume (3 month)
  sharesOutstanding: number | null; // Total shares outstanding

  // Dividends
  dividendYield: number | null;   // Annual dividend yield (%)
  dividendRate: number | null;    // Annual dividend per share ($)

  // Risk Metrics
  beta: number | null;            // Market correlation (1.0 = market average)

  // Events
  earningsDate: string | null;    // Next earnings date (ISO string)
  exDividendDate: string | null;  // Ex-dividend date (ISO string)

  // 52-week performance
  fiftyTwoWeekHigh: number | null;   // 52-week high price
  fiftyTwoWeekLow: number | null;    // 52-week low price
  fiftyTwoWeekChange: number | null; // 52-week price change (%)

  // Analyst data (if available)
  targetPrice: number | null;     // Mean analyst target price
  recommendationKey: string | null; // 'buy', 'hold', 'sell', etc.
}

/**
 * Fundamental signal interpretation
 */
export interface FundamentalSignal {
  signal: 'Bullish' | 'Bearish' | 'Neutral';
  confidence: number; // 0-1
  factors: {
    valuation: 'Undervalued' | 'Overvalued' | 'Fair';
    earnings: 'Growing' | 'Declining' | 'Stable';
    dividend: 'Attractive' | 'None' | 'Low';
    risk: 'High' | 'Medium' | 'Low';
  };
  summary: string;
}

/**
 * Complete market data package for a stock
 * This is what gets shared across all AI models
 */
export interface SharedTradingData {
  symbol: string;                  // Stock ticker symbol
  timestamp: string;               // When data was fetched
  quote: QuoteData;               // Current/latest quote
  technical: TechnicalIndicators; // Technical indicators
  levels: PriceLevels;            // Support/resistance levels
  news: NewsArticle[];            // Recent news articles
  bars: PriceBar[];               // Historical price bars (last 30 days)
  trend: TrendAnalysis;           // Trend analysis
  fundamentals?: FundamentalData; // Fundamental data (P/E, EPS, etc.) - NEW
}

/**
 * Configuration for data provider
 */
export interface ProviderConfig {
  provider: 'alpaca' | 'yahoo' | 'ibkr';  // Which provider to use
  apiKey?: string;                         // API key (if required)
  apiSecret?: string;                      // API secret (if required)
  baseUrl?: string;                        // Base URL (for Alpaca)
  paper?: boolean;                         // Paper trading mode (for Alpaca)
}

/**
 * Base interface that all data providers must implement
 *
 * This ensures all providers can be used interchangeably
 */
export interface IDataProvider {
  /**
   * Provider name for logging/debugging
   */
  readonly name: string;

  /**
   * Fetch complete market data for a stock symbol
   *
   * @param symbol - Stock ticker symbol (e.g., "TSLA", "AAPL")
   * @returns Complete market data package
   * @throws Error if data cannot be fetched
   */
  fetchMarketData(symbol: string): Promise<SharedTradingData>;

  /**
   * Health check to verify provider is working
   *
   * @returns true if provider is accessible and configured correctly
   */
  healthCheck(): Promise<boolean>;
}

/**
 * Error thrown when data provider fails
 */
export class DataProviderError extends Error {
  constructor(
    message: string,
    public provider: string,
    public symbol?: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'DataProviderError';
  }
}

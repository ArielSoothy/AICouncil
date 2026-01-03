/**
 * Pre-Market Stock Screening Types
 *
 * Data structures for stock screening, scanner results, and sentiment analysis
 */

/**
 * Screening criteria configuration
 */
export interface ScreeningCriteria {
  // Price & Volume filters
  minPrice?: number;
  maxPrice?: number;
  minVolume?: number;
  minMarketCap?: number;

  // Pre-market specific
  minPreMarketGap?: number; // Minimum % gap (e.g., 3.0 = 3%)
  minPreMarketVolume?: number; // Minimum pre-market volume

  // Technical filters
  minRSI?: number;
  maxRSI?: number;

  // Fundamental filters
  sectors?: string[]; // e.g., ['Technology', 'Healthcare']
  excludeSectors?: string[];

  // News & Events
  hasEarningsToday?: boolean;
  hasRecentNews?: boolean;

  // Sentiment (when available)
  minSentimentScore?: number; // e.g., 0.6 = 60% positive

  // Result limits
  maxResults?: number; // Default: 20
}

/**
 * Individual stock scan result
 */
export interface ScanResult {
  symbol: string;
  companyName?: string;

  // Price data
  price: number;
  preMarketPrice?: number;
  previousClose: number;
  gapPercent: number; // % gap from previous close

  // Volume data
  volume: number;
  preMarketVolume?: number;
  avgVolume30Day?: number;
  relativeVolume?: number; // Volume vs 30-day average

  // Market data
  marketCap?: number;
  sector?: string;

  // Technical indicators (if available)
  rsi?: number;
  macd?: {
    value: number;
    signal: number;
    histogram: number;
  };

  // News & Events
  hasEarningsToday?: boolean;
  newsCount?: number;
  latestNewsHeadline?: string;

  // Sentiment (when available)
  sentimentScore?: number; // 0-1 scale
  sentimentLabel?: 'bullish' | 'bearish' | 'neutral';
  sentimentSources?: string[]; // e.g., ['finnhub', 'reddit']

  // Metadata
  scannedAt: Date;
  scanSource: 'ibkr' | 'yahoo' | 'alpaca';
}

/**
 * Scanner API response from IBKR
 */
export interface IBKRScannerResult {
  conid: number; // Contract ID
  contractDesc?: string;
  symbol?: string;
  companyName?: string;
  secType?: string;

  // Price fields (field IDs from IBKR API)
  31?: number; // Last price
  84?: number; // Bid
  86?: number; // Ask
  7295?: number; // Previous close

  // Volume fields
  87?: number; // Volume
  7741?: number; // Avg volume
}

/**
 * IBKR Scanner Parameters Response
 */
export interface IBKRScannerParams {
  scan_type_list?: Array<{
    display_name: string;
    code: string;
    instruments: string[];
  }>;
  location_tree?: Array<{
    display_name: string;
    type: string;
    locations: Array<{
      type: string;
      location_code: string;
      display_name: string;
    }>;
  }>;
  filter_list?: Array<{
    group: string;
    display_name: string;
    code: string;
    type: string;
  }>;
}

/**
 * IBKR Scanner Subscription Request
 */
export interface IBKRScannerSubscription {
  instrument: string; // e.g., 'STK' for stocks
  locationCode: string; // e.g., 'STK.US.MAJOR'
  scanCode: string; // e.g., 'TOP_PERC_GAIN'

  // Optional filters
  abovePrice?: number;
  belowPrice?: number;
  aboveVolume?: number;
  marketCapAbove?: number;
  numberOfRows?: number; // Max 50 for IBKR API
}

/**
 * Sentiment data from external API (Finnhub, Reddit, etc.)
 */
export interface SentimentData {
  symbol: string;
  score: number; // -1 to 1 scale (Finnhub) or 0-1 (Reddit)
  label: 'bullish' | 'bearish' | 'neutral';

  // Source-specific data
  source: 'finnhub' | 'reddit' | 'stocktwits';
  buzzScore?: number; // Social media mentions
  articleCount?: number;

  // Detailed sentiment breakdown
  positive?: number;
  negative?: number;
  neutral?: number;

  // Timestamp
  timestamp: Date;
}

/**
 * Complete screening results with metadata
 */
export interface ScreeningResults {
  results: ScanResult[];
  criteria: ScreeningCriteria;
  timestamp: Date;

  // Metadata
  totalScanned: number;
  resultsReturned: number;
  scanDurationMs: number;

  // Data sources used
  sources: {
    scanner: 'ibkr' | 'yahoo' | 'alpaca';
    sentiment?: 'finnhub' | 'reddit' | 'stocktwits';
  };

  // Any errors or warnings
  warnings?: string[];
  errors?: string[];
}

/**
 * Screening service configuration
 */
export interface ScreeningConfig {
  ibkrGatewayUrl?: string;
  finnhubApiKey?: string;
  useIBKR?: boolean;
  useFinnhub?: boolean;
  useReddit?: boolean;

  // Cache settings
  cacheTTL?: number; // TTL in minutes (default: 15 for pre-market)
}

/**
 * Pre-Market Gap Scanner - Specific configuration
 */
export interface PreMarketGapScannerConfig {
  minGapPercent: number; // e.g., 3.0 = 3%
  minPreMarketVolume: number; // e.g., 100000
  minPrice: number; // e.g., 5.0 (filter penny stocks)
  maxPrice?: number; // Optional upper bound
  maxResults: number; // e.g., 20

  // Optional filters
  sectors?: string[];
  minMarketCap?: number;
  requireNews?: boolean; // Only stocks with recent news
  requireSentiment?: boolean; // Only stocks with sentiment data
}

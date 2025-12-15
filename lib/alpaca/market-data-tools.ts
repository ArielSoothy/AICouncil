/**
 * Alpaca Market Data Tools for AI Trading Research
 *
 * Provides 11 trading tools that AI models can use to research stocks:
 *
 * Alpaca Tools (Real-time market data):
 * 1. get_stock_quote - Real-time price data
 * 2. get_price_bars - Historical candlestick data
 * 3. get_stock_news - Latest news articles
 * 4. calculate_rsi - Relative Strength Index
 * 5. calculate_macd - MACD indicator
 * 6. get_volume_profile - Volume analysis
 * 7. get_support_resistance - Key price levels
 * 8. check_earnings_date - Upcoming earnings
 *
 * SEC EDGAR Tools (Fundamental data - especially for obscure stocks):
 * 9. get_10k_data - Annual report financials
 * 10. get_company_filings - Recent SEC filings
 * 11. get_rnd_spending - R&D spending analysis (biotech/pharma)
 */

import Alpaca from '@alpacahq/alpaca-trade-api';
import { tool, Tool } from 'ai';
import { z } from 'zod';
// faker import removed - get_stock_quote now uses real Yahoo Finance data
import { secEdgarTools } from './sec-edgar-tools';
import { IBKRBroker } from '../brokers/ibkr-broker';
import { BrokerBar } from '../brokers/types';

// TypeScript workaround for AI SDK v5 deep type inference with Zod
// The AI SDK v5 has extremely complex type inference that causes TypeScript to exceed
// its instantiation depth limit. We need to cast at call sites to avoid this.
type AnyTool = Tool<any, any>;

// Helper function to bypass deep type inference
function createTool(config: any): AnyTool {
  return tool(config) as unknown as AnyTool;
}

// Initialize Alpaca client
function getAlpacaClient(): Alpaca {
  return new Alpaca({
    keyId: process.env.ALPACA_API_KEY!,
    secretKey: process.env.ALPACA_SECRET_KEY!,
    paper: true,
    baseUrl: process.env.ALPACA_BASE_URL || 'https://paper-api.alpaca.markets',
  });
}

// IBKR broker instance (singleton)
let ibkrBroker: IBKRBroker | null = null;

function getIBKRBroker(): IBKRBroker {
  if (!ibkrBroker) {
    ibkrBroker = new IBKRBroker();
  }
  return ibkrBroker;
}

/**
 * Get historical price bars with IBKR-first fallback to Alpaca
 *
 * Priority:
 * 1. Try IBKR (user authenticated with full data access)
 * 2. Fall back to Alpaca if IBKR fails
 * 3. Return error if both fail
 *
 * @param symbol Stock ticker
 * @param timeframe Bar size ('1Min', '5Min', '1Hour', '1Day')
 * @param start Start date
 * @param end End date
 * @param limit Max bars to return
 */
async function getBarsWithFallback(
  symbol: string,
  timeframe: string,
  start: Date,
  end: Date,
  limit: number
): Promise<{ bars: BrokerBar[]; source: 'ibkr' | 'alpaca'; error?: string }> {
  const symbolUpper = symbol.toUpperCase();

  // Try IBKR first (has full data access when authenticated)
  try {
    const ibkr = getIBKRBroker();
    const isConnected = await ibkr.isConnected();

    if (isConnected) {
      console.log(`[MarketData] Trying IBKR for ${symbolUpper} bars...`);
      const bars = await ibkr.getBars(symbolUpper, timeframe, start, end);

      if (bars && bars.length > 0) {
        console.log(`[MarketData] ✅ IBKR returned ${bars.length} bars for ${symbolUpper}`);
        return { bars: bars.slice(-limit), source: 'ibkr' };
      }
    }
  } catch (ibkrError) {
    console.log(`[MarketData] IBKR failed for ${symbolUpper}: ${ibkrError instanceof Error ? ibkrError.message : 'Unknown'}`);
  }

  // Fall back to Alpaca
  try {
    console.log(`[MarketData] Trying Alpaca for ${symbolUpper} bars...`);
    const alpaca = getAlpacaClient();

    const barsGenerator = alpaca.getBarsV2(symbolUpper, {
      start: start.toISOString(),
      end: end.toISOString(),
      timeframe,
      limit,
    });

    const bars: BrokerBar[] = [];
    for await (const bar of barsGenerator) {
      bars.push({
        symbol: symbolUpper,
        timestamp: new Date(bar.Timestamp),
        open: bar.OpenPrice,
        high: bar.HighPrice,
        low: bar.LowPrice,
        close: bar.ClosePrice,
        volume: bar.Volume,
      });
    }

    if (bars.length > 0) {
      console.log(`[MarketData] ✅ Alpaca returned ${bars.length} bars for ${symbolUpper}`);
      return { bars: bars.slice(-limit), source: 'alpaca' };
    }

    return { bars: [], source: 'alpaca', error: 'No data returned' };
  } catch (alpacaError) {
    const errorMsg = alpacaError instanceof Error ? alpacaError.message : 'Unknown error';
    console.log(`[MarketData] ❌ Alpaca failed for ${symbolUpper}: ${errorMsg}`);

    // Check if it's a 403 subscription error
    if (errorMsg.includes('403') || errorMsg.includes('subscription')) {
      return {
        bars: [],
        source: 'alpaca',
        error: `Historical data requires market data subscription. IBKR not connected and Alpaca returned 403. Error: ${errorMsg}`
      };
    }

    return { bars: [], source: 'alpaca', error: errorMsg };
  }
}

import { get_stock_quote } from '../trading/get_stock_quote';

/**
 * Tool 1: Get Real-Time Stock Quote
 * Returns current price, bid/ask, volume from Yahoo Finance
 *
 * @see Feature #54 - Now uses real Yahoo Finance data instead of Faker.js
 */
export const getStockQuoteTool: AnyTool = createTool({
  description: 'Get real-time stock quote with current price, bid/ask spread, and volume. Use this to check current market price before making trading decisions.',
  inputSchema: z.object({
    symbol: z.string().describe('Stock ticker symbol (e.g., TSLA, AAPL, NVDA)'),
  }),
  execute: async ({ symbol }: { symbol: string }) => {
    try {
      // Now uses REAL Yahoo Finance data (async)
      const quote = await get_stock_quote(symbol.toUpperCase());
      return {
        symbol: symbol.toUpperCase(),
        price: quote.price,
        bid: quote.bid,
        ask: quote.ask,
        volume: quote.volume,
        exchange: quote.exchange,
        timestamp: quote.lastUpdated,
        success: true
      };
    } catch (error) {
      return {
        symbol: symbol.toUpperCase(),
        error: error instanceof Error ? error.message : 'Failed to fetch quote',
        success: false
      };
    }
  },
});

/**
 * Tool 2: Get Historical Price Bars
 * Returns candlestick data for technical analysis
 *
 * Uses IBKR-first fallback: tries IBKR (if authenticated), then Alpaca
 */
export const getPriceBarsTool: AnyTool = createTool({
  description: 'Get historical price bars (candlesticks) for technical analysis. Returns OHLC (Open, High, Low, Close) data with volume. Use this to analyze price trends, patterns, and support/resistance levels.',
  inputSchema: z.object({
    symbol: z.string().describe('Stock ticker symbol'),
    timeframe: z.enum(['1Min', '5Min', '15Min', '1Hour', '1Day']).describe('Bar timeframe'),
    limit: z.number().min(1).max(100).describe('Number of bars to fetch (max 100)'),
  }),
  execute: async ({ symbol, timeframe, limit }: { symbol: string; timeframe: string; limit: number }) => {
    // Calculate start date based on timeframe and limit
    const end = new Date();
    const start = new Date();

    if (timeframe === '1Min') {
      start.setMinutes(start.getMinutes() - (limit * 2)); // Extra buffer
    } else if (timeframe === '5Min') {
      start.setMinutes(start.getMinutes() - (limit * 10)); // Extra buffer
    } else if (timeframe === '15Min') {
      start.setMinutes(start.getMinutes() - (limit * 30)); // Extra buffer
    } else if (timeframe === '1Hour') {
      start.setHours(start.getHours() - (limit * 2)); // Extra buffer
    } else if (timeframe === '1Day') {
      start.setDate(start.getDate() - (limit * 2)); // Extra buffer
    }

    // Use IBKR-first fallback
    const result = await getBarsWithFallback(symbol, timeframe, start, end, limit);

    if (result.error) {
      return {
        symbol: symbol.toUpperCase(),
        error: result.error,
        success: false
      };
    }

    const formattedBars = result.bars.map(bar => ({
      timestamp: bar.timestamp.toISOString(),
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
      volume: bar.volume,
    }));

    return {
      symbol: symbol.toUpperCase(),
      timeframe,
      bars: formattedBars,
      count: formattedBars.length,
      source: result.source,
      success: true
    };
  },
});

/**
 * Tool 3: Get Latest Stock News
 * Returns recent news articles that might affect the stock
 */
export const getStockNewsTool: AnyTool = createTool({
  description: 'Get latest news articles for a stock. Use this to understand recent catalysts, earnings announcements, or market sentiment affecting the stock price.',
  inputSchema: z.object({
    symbol: z.string().describe('Stock ticker symbol'),
    limit: z.number().min(1).max(10).default(5).describe('Number of news articles to fetch (max 10)'),
  }),
  execute: async ({ symbol, limit }: { symbol: string; limit: number }) => {
    try {
      const alpaca = getAlpacaClient();
      const news = await alpaca.getNews({
        symbols: [symbol.toUpperCase()],
        limit,
      });

      const formattedNews = news.map((article: any) => ({
        headline: article.headline,
        summary: article.summary,
        author: article.author,
        created_at: article.created_at,
        url: article.url,
        symbols: article.symbols,
      }));

      return {
        symbol: symbol.toUpperCase(),
        news: formattedNews,
        count: formattedNews.length,
        success: true
      };
    } catch (error) {
      return {
        symbol: symbol.toUpperCase(),
        error: error instanceof Error ? error.message : 'Failed to fetch news',
        success: false
      };
    }
  },
});

/**
 * Tool 4: Calculate RSI (Relative Strength Index)
 * Returns RSI indicator for overbought/oversold analysis
 *
 * Uses IBKR-first fallback: tries IBKR (if authenticated), then Alpaca
 */
export const calculateRSITool: AnyTool = createTool({
  description: 'Calculate RSI (Relative Strength Index) indicator. RSI values: >70 = overbought (potential sell), <30 = oversold (potential buy), 40-60 = neutral. Use this to identify potential reversal points.',
  inputSchema: z.object({
    symbol: z.string().describe('Stock ticker symbol'),
    period: z.number().min(5).max(50).default(14).describe('RSI period (default 14)'),
  }),
  execute: async ({ symbol, period }: { symbol: string; period: number }) => {
    // Calculate start date for enough historical data
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - (period + 30)); // Extra buffer for accurate calculation

    // Use IBKR-first fallback
    const result = await getBarsWithFallback(symbol, '1Day', start, end, period + 30);

    if (result.error) {
      return {
        symbol: symbol.toUpperCase(),
        error: result.error,
        success: false
      };
    }

    const bars = result.bars;

    if (bars.length < period + 1) {
      return {
        symbol: symbol.toUpperCase(),
        error: `Not enough data to calculate RSI (need ${period + 1} bars, got ${bars.length})`,
        success: false
      };
    }

    // Calculate RSI
    const closes = bars.map(bar => bar.close);
    const gains: number[] = [];
    const losses: number[] = [];

    for (let i = 1; i < closes.length; i++) {
      const change = closes[i] - closes[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    // Calculate average gain and loss
    const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
    const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    let interpretation = '';
    if (rsi > 70) {
      interpretation = 'Overbought - Potential sell signal';
    } else if (rsi < 30) {
      interpretation = 'Oversold - Potential buy signal';
    } else if (rsi >= 40 && rsi <= 60) {
      interpretation = 'Neutral - No clear signal';
    } else if (rsi > 60) {
      interpretation = 'Bullish momentum';
    } else {
      interpretation = 'Bearish momentum';
    }

    return {
      symbol: symbol.toUpperCase(),
      rsi: Math.round(rsi * 100) / 100,
      interpretation,
      period,
      source: result.source,
      success: true
    };
  },
});

/**
 * Tool 5: Calculate MACD Indicator
 * Returns MACD line, signal line, and histogram for trend analysis
 *
 * Uses IBKR-first fallback: tries IBKR (if authenticated), then Alpaca
 */
export const calculateMACDTool: AnyTool = createTool({
  description: 'Calculate MACD (Moving Average Convergence Divergence) indicator. Positive MACD = bullish trend, negative = bearish. Crossovers indicate trend changes. Use this to identify trend direction and momentum.',
  inputSchema: z.object({
    symbol: z.string().describe('Stock ticker symbol'),
  }),
  execute: async ({ symbol }: { symbol: string }) => {
    // Calculate start date for 60 days of data
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 60);

    // Use IBKR-first fallback
    const result = await getBarsWithFallback(symbol, '1Day', start, end, 60);

    if (result.error) {
      return {
        symbol: symbol.toUpperCase(),
        error: result.error,
        success: false
      };
    }

    const bars = result.bars;

    if (bars.length < 26) {
      return {
        symbol: symbol.toUpperCase(),
        error: 'Not enough data to calculate MACD (need 26+ bars)',
        success: false
      };
    }

    const closes = bars.map(bar => bar.close);

    // Calculate EMAs
    const ema12 = calculateEMA(closes, 12);
    const ema26 = calculateEMA(closes, 26);
    const macdLine = ema12 - ema26;

    // Calculate signal line (9-period EMA of MACD)
    const macdHistory = [];
    for (let i = 0; i < closes.length - 26; i++) {
      const shortEMA = calculateEMA(closes.slice(0, i + 26), 12);
      const longEMA = calculateEMA(closes.slice(0, i + 26), 26);
      macdHistory.push(shortEMA - longEMA);
    }

    const signalLine = calculateEMA(macdHistory, 9);
    const histogram = macdLine - signalLine;

    let interpretation = '';
    if (macdLine > signalLine && histogram > 0) {
      interpretation = 'Bullish - MACD above signal line';
    } else if (macdLine < signalLine && histogram < 0) {
      interpretation = 'Bearish - MACD below signal line';
    } else if (histogram > 0) {
      interpretation = 'Bullish momentum building';
    } else {
      interpretation = 'Bearish momentum building';
    }

    return {
      symbol: symbol.toUpperCase(),
      macd: Math.round(macdLine * 100) / 100,
      signal: Math.round(signalLine * 100) / 100,
      histogram: Math.round(histogram * 100) / 100,
      interpretation,
      source: result.source,
      success: true
    };
  },
});

// Helper function to calculate EMA
function calculateEMA(data: number[], period: number): number {
  const k = 2 / (period + 1);
  let ema = data[0];

  for (let i = 1; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
  }

  return ema;
}

/**
 * Tool 6: Get Volume Profile
 * Analyzes trading volume patterns
 *
 * Uses IBKR-first fallback: tries IBKR (if authenticated), then Alpaca
 */
export const getVolumeProfileTool: AnyTool = createTool({
  description: 'Analyze trading volume patterns. High volume = strong interest/conviction. Use this to confirm trend strength or identify potential reversals.',
  inputSchema: z.object({
    symbol: z.string().describe('Stock ticker symbol'),
    days: z.number().min(5).max(30).default(20).describe('Number of days to analyze (default 20)'),
  }),
  execute: async ({ symbol, days }: { symbol: string; days: number }) => {
    // Calculate start date
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - (days + 5)); // Extra buffer

    // Use IBKR-first fallback
    const result = await getBarsWithFallback(symbol, '1Day', start, end, days + 5);

    if (result.error) {
      return {
        symbol: symbol.toUpperCase(),
        error: result.error,
        success: false
      };
    }

    const bars = result.bars;

    if (bars.length < 5) {
      return {
        symbol: symbol.toUpperCase(),
        error: 'Not enough data for volume analysis',
        success: false
      };
    }

    const volumes = bars.map(bar => bar.volume);
    const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    const currentVolume = volumes[volumes.length - 1];
    const volumeRatio = currentVolume / avgVolume;

    let interpretation = '';
    if (volumeRatio > 2) {
      interpretation = 'Very high volume - Strong interest';
    } else if (volumeRatio > 1.5) {
      interpretation = 'Above average volume - Increased activity';
    } else if (volumeRatio < 0.5) {
      interpretation = 'Low volume - Weak interest';
    } else {
      interpretation = 'Normal volume';
    }

    return {
      symbol: symbol.toUpperCase(),
      currentVolume: Math.round(currentVolume),
      averageVolume: Math.round(avgVolume),
      volumeRatio: Math.round(volumeRatio * 100) / 100,
      interpretation,
      source: result.source,
      success: true
    };
  },
});

/**
 * Tool 7: Get Support and Resistance Levels
 * Identifies key price levels from recent price action
 *
 * Uses IBKR-first fallback: tries IBKR (if authenticated), then Alpaca
 */
export const getSupportResistanceTool: AnyTool = createTool({
  description: 'Identify support and resistance levels from recent price action. Support = price floor where buying pressure emerges. Resistance = price ceiling where selling pressure emerges. Use these for entry/exit planning.',
  inputSchema: z.object({
    symbol: z.string().describe('Stock ticker symbol'),
    days: z.number().min(10).max(90).default(30).describe('Number of days to analyze (10-90 days, default 30)'),
  }),
  execute: async ({ symbol, days }: { symbol: string; days: number }) => {
    // Calculate start date
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - (days + 10)); // Extra buffer

    // Use IBKR-first fallback
    const result = await getBarsWithFallback(symbol, '1Day', start, end, days + 10);

    if (result.error) {
      return {
        symbol: symbol.toUpperCase(),
        error: result.error,
        success: false
      };
    }

    const bars = result.bars;

    if (bars.length < 10) {
      return {
        symbol: symbol.toUpperCase(),
        error: 'Not enough data for support/resistance analysis',
        success: false
      };
    }

    const highs = bars.map(bar => bar.high);
    const lows = bars.map(bar => bar.low);
    const currentPrice = bars[bars.length - 1].close;

    // Find resistance (recent highs)
    const sortedHighs = [...highs].sort((a, b) => b - a);
    const resistance = sortedHighs[Math.floor(sortedHighs.length * 0.1)]; // Top 10% high

    // Find support (recent lows)
    const sortedLows = [...lows].sort((a, b) => a - b);
    const support = sortedLows[Math.floor(sortedLows.length * 0.1)]; // Bottom 10% low

    const distanceToResistance = ((resistance - currentPrice) / currentPrice) * 100;
    const distanceToSupport = ((currentPrice - support) / currentPrice) * 100;

    let interpretation = '';
    if (distanceToResistance < 2) {
      interpretation = 'Near resistance - Potential sell zone';
    } else if (distanceToSupport < 2) {
      interpretation = 'Near support - Potential buy zone';
    } else if (distanceToResistance < distanceToSupport) {
      interpretation = 'Closer to resistance than support';
    } else {
      interpretation = 'Closer to support than resistance';
    }

    return {
      symbol: symbol.toUpperCase(),
      currentPrice: Math.round(currentPrice * 100) / 100,
      resistance: Math.round(resistance * 100) / 100,
      support: Math.round(support * 100) / 100,
      distanceToResistance: Math.round(distanceToResistance * 100) / 100 + '%',
      distanceToSupport: Math.round(distanceToSupport * 100) / 100 + '%',
      interpretation,
      source: result.source,
      success: true
    };
  },
});

/**
 * Tool 8: Check Earnings Date
 * Returns upcoming earnings date if available
 */
export const checkEarningsDateTool: AnyTool = createTool({
  description: 'Check if the stock has upcoming earnings announcement. Earnings can cause significant price volatility. Use this to avoid or capitalize on earnings-related moves.',
  inputSchema: z.object({
    symbol: z.string().describe('Stock ticker symbol'),
  }),
  execute: async ({ symbol }: { symbol: string }) => {
    // HONEST ERROR - Alpaca's free tier doesn't provide earnings calendar
    // NO MOCK DATA - Return failure instead of pretending to succeed
    return {
      symbol: symbol.toUpperCase(),
      error: 'Earnings calendar not available - Alpaca free tier does not provide this data.',
      suggestion: 'Check company investor relations page, Yahoo Finance, or financial news for earnings date.',
      success: false  // CRITICAL: Return FALSE when data unavailable
    };
  },
});

/**
 * Export all tools as a tools object for Vercel AI SDK
 *
 * Includes:
 * - 8 Alpaca market data tools (real-time prices, technicals)
 * - 3 SEC EDGAR tools (fundamentals for obscure stocks)
 */
export const alpacaTools = {
  // Alpaca tools (real-time market data)
  get_stock_quote: getStockQuoteTool,
  get_price_bars: getPriceBarsTool,
  get_stock_news: getStockNewsTool,
  calculate_rsi: calculateRSITool,
  calculate_macd: calculateMACDTool,
  get_volume_profile: getVolumeProfileTool,
  get_support_resistance: getSupportResistanceTool,
  check_earnings_date: checkEarningsDateTool,

  // SEC EDGAR tools (fundamental data for obscure stocks)
  ...secEdgarTools,
};

/**
 * Tool call tracker for rate limiting
 */
export class ToolCallTracker {
  private callsPerMinute: number[] = [];
  private callHistory: Array<{ tool: string; symbol: string; timestamp: Date }> = [];

  logCall(toolName: string, symbol: string) {
    const now = new Date();
    this.callHistory.push({ tool: toolName, symbol, timestamp: now });

    // Track calls in current minute
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    this.callsPerMinute = this.callsPerMinute.filter(time => time > oneMinuteAgo.getTime());
    this.callsPerMinute.push(now.getTime());
  }

  getCallsThisMinute(): number {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    this.callsPerMinute = this.callsPerMinute.filter(time => time > oneMinuteAgo.getTime());
    return this.callsPerMinute.length;
  }

  isNearLimit(): boolean {
    return this.getCallsThisMinute() > 150; // Warn at 75% of limit
  }

  getHistory(): Array<{ tool: string; symbol: string; timestamp: Date }> {
    return this.callHistory;
  }

  getTotalCalls(): number {
    return this.callHistory.length;
  }
}

// Global tracker instance
export const toolTracker = new ToolCallTracker();

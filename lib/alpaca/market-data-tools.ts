/**
 * Market Data Tools for AI Trading Research (Yahoo Finance-based)
 *
 * Provides 8 trading tools that AI models can use to research stocks:
 * 1. get_stock_quote - Real-time price data
 * 2. get_price_bars - Historical candlestick data
 * 3. get_stock_news - Latest news articles
 * 4. calculate_rsi - Relative Strength Index
 * 5. calculate_macd - MACD indicator
 * 6. get_volume_profile - Volume analysis
 * 7. get_support_resistance - Key price levels
 * 8. check_earnings_date - Upcoming earnings
 *
 * DATA SOURCE: Yahoo Finance (FREE, no API key required)
 * Previously used Alpaca API but free tier doesn't include SIP data (403 errors)
 * Yahoo Finance provides all the data we need for technical/fundamental analysis
 */

import { tool } from 'ai';
import { z } from 'zod';
import { YahooFinanceProvider } from '../data-providers/yahoo-finance-provider';

// Initialize Yahoo Finance provider (FREE, no API key needed!)
function getYahooProvider(): YahooFinanceProvider {
  return new YahooFinanceProvider();
}

/**
 * Tool 1: Get Real-Time Stock Quote
 * Returns current price, bid/ask, volume (Yahoo Finance)
 */
export const getStockQuoteTool = tool({
  description: 'Get real-time stock quote with current price, bid/ask spread, and volume. Use this to check current market price before making trading decisions.',
  parameters: z.object({
    symbol: z.string().describe('Stock ticker symbol (e.g., TSLA, AAPL, NVDA)'),
  }),
  execute: async ({ symbol }) => {
    try {
      console.log(`📊 [get_stock_quote] Fetching quote for ${symbol} from Yahoo Finance...`);
      const yahoo = getYahooProvider();
      const data = await yahoo.fetchMarketData(symbol.toUpperCase());

      console.log(`✅ [get_stock_quote] Retrieved: $${data.quote.price.toFixed(2)}, volume: ${data.quote.volume.toLocaleString()}`);

      return {
        symbol: data.symbol,
        price: data.quote.price,
        bid: data.quote.bid,
        ask: data.quote.ask,
        spread: data.quote.spread,
        volume: data.quote.volume,
        timestamp: data.quote.timestamp,
        success: true
      };
    } catch (error) {
      console.error(`❌ [get_stock_quote] ERROR for ${symbol}:`, error);
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
 */
export const getPriceBarsTool = tool({
  description: 'Get historical price bars (candlesticks) for technical analysis. Returns OHLC (Open, High, Low, Close) data with volume. Use this to analyze price trends, patterns, and support/resistance levels.',
  parameters: z.object({
    symbol: z.string().describe('Stock ticker symbol'),
    timeframe: z.enum(['1Min', '5Min', '15Min', '1Hour', '1Day']).describe('Bar timeframe'),
    limit: z.number().min(1).max(100).describe('Number of bars to fetch (max 100)'),
  }),
  execute: async ({ symbol, timeframe, limit }) => {
    try {
      console.log(`🔍 [get_price_bars] Fetching ${limit} bars for ${symbol} (Yahoo Finance)`);
      const yahoo = getYahooProvider();
      const data = await yahoo.fetchMarketData(symbol.toUpperCase());

      // Yahoo Finance provides daily bars by default
      // For intraday timeframes (1Min, 5Min, etc.), we return daily bars
      // This is a limitation of free data but still useful for analysis
      const bars = data.bars.slice(-limit).map(bar => ({
        date: bar.date,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume
      }));

      console.log(`✅ [get_price_bars] Retrieved ${bars.length} daily bars for ${symbol}`);

      return {
        symbol: data.symbol,
        timeframe: '1Day', // Yahoo Finance provides daily data
        bars,
        count: bars.length,
        note: 'Yahoo Finance provides daily bars (free tier)',
        success: true
      };
    } catch (error) {
      console.error(`❌ [get_price_bars] ERROR for ${symbol}:`, error);

      return {
        symbol: symbol.toUpperCase(),
        error: error instanceof Error ? error.message : 'Failed to fetch bars',
        success: false
      };
    }
  },
});

/**
 * Tool 3: Get Latest Stock News (Yahoo Finance)
 * Returns recent news articles that might affect the stock
 */
export const getStockNewsTool = tool({
  description: 'Get latest news articles for a stock. Use this to understand recent catalysts, earnings announcements, or market sentiment affecting the stock price.',
  parameters: z.object({
    symbol: z.string().describe('Stock ticker symbol'),
    limit: z.number().min(1).max(10).default(5).describe('Number of news articles to fetch (max 10)'),
  }),
  execute: async ({ symbol, limit }) => {
    try {
      console.log(`📰 [get_stock_news] Fetching news for ${symbol} (Yahoo Finance)`);
      const yahoo = getYahooProvider();
      const data = await yahoo.fetchMarketData(symbol.toUpperCase());

      const news = data.news.slice(0, limit).map(article => ({
        headline: article.headline,
        summary: article.summary,
        source: article.source,
        timestamp: article.timestamp,
        url: article.url
      }));

      console.log(`✅ [get_stock_news] Retrieved ${news.length} news articles for ${symbol}`);

      return {
        symbol: data.symbol,
        news,
        count: news.length,
        success: true
      };
    } catch (error) {
      console.error(`❌ [get_stock_news] ERROR for ${symbol}:`, error);
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
 */
export const calculateRSITool = tool({
  description: 'Calculate RSI (Relative Strength Index) indicator. RSI values: >70 = overbought (potential sell), <30 = oversold (potential buy), 40-60 = neutral. Use this to identify potential reversal points.',
  parameters: z.object({
    symbol: z.string().describe('Stock ticker symbol'),
    period: z.number().min(5).max(50).default(14).describe('RSI period (default 14)'),
  }),
  execute: async ({ symbol, period }) => {
    try {
      console.log(`📈 [calculate_rsi] Calculating RSI for ${symbol} (Yahoo Finance)`);
      const yahoo = getYahooProvider();
      const data = await yahoo.fetchMarketData(symbol.toUpperCase());

      // Yahoo Finance already calculates RSI for us!
      const rsi = data.technical.rsi;
      const signal = data.technical.rsiSignal;

      let interpretation = '';
      if (signal === 'Overbought') {
        interpretation = 'Overbought - Potential sell signal';
      } else if (signal === 'Oversold') {
        interpretation = 'Oversold - Potential buy signal';
      } else {
        interpretation = 'Neutral zone';
      }

      console.log(`✅ [calculate_rsi] RSI: ${rsi.toFixed(2)} (${signal})`);

      return {
        symbol: data.symbol,
        rsi: Math.round(rsi * 100) / 100,
        interpretation,
        signal,
        period: 14, // Yahoo Finance uses standard 14-period RSI
        success: true
      };
    } catch (error) {
      console.error(`❌ [calculate_rsi] ERROR for ${symbol}:`, error);

      return {
        symbol: symbol.toUpperCase(),
        error: error instanceof Error ? error.message : 'Failed to calculate RSI',
        success: false
      };
    }
  },
});

/**
 * Tool 5: Calculate MACD Indicator (Yahoo Finance)
 * Returns MACD line, signal line, and histogram for trend analysis
 */
export const calculateMACDTool = tool({
  description: 'Calculate MACD (Moving Average Convergence Divergence) indicator. Positive MACD = bullish trend, negative = bearish. Crossovers indicate trend changes. Use this to identify trend direction and momentum.',
  parameters: z.object({
    symbol: z.string().describe('Stock ticker symbol'),
  }),
  execute: async ({ symbol }) => {
    try {
      console.log(`📉 [calculate_macd] Calculating MACD for ${symbol} (Yahoo Finance)`);
      const yahoo = getYahooProvider();
      const data = await yahoo.fetchMarketData(symbol.toUpperCase());

      // Yahoo Finance already calculates MACD for us!
      const macd = data.technical.macd;

      console.log(`✅ [calculate_macd] MACD: ${macd.MACD.toFixed(3)}, Signal: ${macd.signal.toFixed(3)} (${macd.trend})`);

      return {
        symbol: data.symbol,
        macd: Math.round(macd.MACD * 1000) / 1000,
        signal: Math.round(macd.signal * 1000) / 1000,
        histogram: Math.round(macd.histogram * 1000) / 1000,
        trend: macd.trend,
        interpretation: macd.trend === 'Bullish' ? 'Bullish - MACD above signal line' : 'Bearish - MACD below signal line',
        success: true
      };
    } catch (error) {
      console.error(`❌ [calculate_macd] ERROR for ${symbol}:`, error);
      return {
        symbol: symbol.toUpperCase(),
        error: error instanceof Error ? error.message : 'Failed to calculate MACD',
        success: false
      };
    }
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
 * Tool 6: Get Volume Profile (Yahoo Finance)
 * Analyzes trading volume patterns
 */
export const getVolumeProfileTool = tool({
  description: 'Analyze trading volume patterns. High volume = strong interest/conviction. Use this to confirm trend strength or identify potential reversals.',
  parameters: z.object({
    symbol: z.string().describe('Stock ticker symbol'),
    days: z.number().min(5).max(30).default(20).describe('Number of days to analyze (default 20)'),
  }),
  execute: async ({ symbol, days }) => {
    try {
      console.log(`📊 [get_volume_profile] Analyzing volume for ${symbol} (Yahoo Finance)`);
      const yahoo = getYahooProvider();
      const data = await yahoo.fetchMarketData(symbol.toUpperCase());

      const bars = data.bars.slice(-days);
      const volumes = bars.map(bar => bar.volume);
      const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
      const currentVolume = data.quote.volume;
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

      console.log(`✅ [get_volume_profile] Volume ratio: ${volumeRatio.toFixed(2)}x (${interpretation})`);

      return {
        symbol: data.symbol,
        currentVolume: Math.round(currentVolume),
        averageVolume: Math.round(avgVolume),
        volumeRatio: Math.round(volumeRatio * 100) / 100,
        interpretation,
        success: true
      };
    } catch (error) {
      console.error(`❌ [get_volume_profile] ERROR for ${symbol}:`, error);
      return {
        symbol: symbol.toUpperCase(),
        error: error instanceof Error ? error.message : 'Failed to analyze volume',
        success: false
      };
    }
  },
});

/**
 * Tool 7: Get Support and Resistance Levels (Yahoo Finance)
 * Identifies key price levels from recent price action
 */
export const getSupportResistanceTool = tool({
  description: 'Identify support and resistance levels from recent price action. Support = price floor where buying pressure emerges. Resistance = price ceiling where selling pressure emerges. Use these for entry/exit planning.',
  parameters: z.object({
    symbol: z.string().describe('Stock ticker symbol'),
    days: z.number().min(10).max(90).default(30).describe('Number of days to analyze (10-90 days, default 30)'),
  }),
  execute: async ({ symbol, days }) => {
    try {
      console.log(`🎯 [get_support_resistance] Finding levels for ${symbol} (Yahoo Finance)`);
      const yahoo = getYahooProvider();
      const data = await yahoo.fetchMarketData(symbol.toUpperCase());

      // Yahoo Finance already calculates support/resistance for us!
      const support = data.levels.support;
      const resistance = data.levels.resistance;
      const currentPrice = data.quote.price;

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

      console.log(`✅ [get_support_resistance] Support: $${support.toFixed(2)}, Resistance: $${resistance.toFixed(2)}`);

      return {
        symbol: data.symbol,
        currentPrice: Math.round(currentPrice * 100) / 100,
        resistance: Math.round(resistance * 100) / 100,
        support: Math.round(support * 100) / 100,
        yearHigh: Math.round(data.levels.yearHigh * 100) / 100,
        yearLow: Math.round(data.levels.yearLow * 100) / 100,
        distanceToResistance: Math.round(distanceToResistance * 100) / 100 + '%',
        distanceToSupport: Math.round(distanceToSupport * 100) / 100 + '%',
        interpretation,
        success: true
      };
    } catch (error) {
      console.error(`❌ [get_support_resistance] ERROR for ${symbol}:`, error);
      return {
        symbol: symbol.toUpperCase(),
        error: error instanceof Error ? error.message : 'Failed to find support/resistance',
        success: false
      };
    }
  },
});

/**
 * Tool 8: Check Earnings Date
 * Returns upcoming earnings date if available
 */
export const checkEarningsDateTool = tool({
  description: 'Check if the stock has upcoming earnings announcement. Earnings can cause significant price volatility. Use this to avoid or capitalize on earnings-related moves.',
  parameters: z.object({
    symbol: z.string().describe('Stock ticker symbol'),
  }),
  execute: async ({ symbol }) => {
    // Note: Alpaca's free tier doesn't provide earnings calendar
    // This is a placeholder that would need a different data source
    // For now, we'll return a message indicating this limitation

    return {
      symbol: symbol.toUpperCase(),
      message: 'Earnings calendar requires additional data source. Alpaca free tier does not provide this data.',
      suggestion: 'Check company investor relations page or financial news for earnings date.',
      success: true
    };
  },
});

/**
 * Export all tools as a tools object for Vercel AI SDK
 */
export const alpacaTools = {
  get_stock_quote: getStockQuoteTool,
  get_price_bars: getPriceBarsTool,
  get_stock_news: getStockNewsTool,
  calculate_rsi: calculateRSITool,
  calculate_macd: calculateMACDTool,
  get_volume_profile: getVolumeProfileTool,
  get_support_resistance: getSupportResistanceTool,
  check_earnings_date: checkEarningsDateTool,
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

    console.log(`🔧 Tool Call: ${toolName}(${symbol}) - ${this.callsPerMinute.length}/200 calls this minute`);
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

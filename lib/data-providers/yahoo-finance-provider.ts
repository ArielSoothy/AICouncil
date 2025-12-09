/**
 * Yahoo Finance Data Provider
 *
 * FREE real-time market data provider using Yahoo Finance's public API
 *
 * Pros:
 * - ✅ Completely free, no API key required
 * - ✅ Real-time data (15-min delay for some exchanges)
 * - ✅ Comprehensive data: quotes, historical prices, news
 * - ✅ Easy to use, no account setup
 * - ✅ Generous rate limits for our use case
 *
 * Cons:
 * - ⚠️ Unofficial API (could change, but stable for years)
 * - ⚠️ 15-minute delay on some intraday data (EOD is real-time)
 *
 * Data Sources:
 * - Quote & Bars: query1.finance.yahoo.com/v8/finance/chart
 * - News: query2.finance.yahoo.com/v1/finance/search
 *
 * Rate Limits: ~2,000 requests/hour (generous for our use case)
 */

import { BaseDataProvider } from './base-provider';
import type {
  SharedTradingData,
  QuoteData,
  PriceBar,
  NewsArticle,
  DataProviderError,
} from './types';

/**
 * Yahoo Finance API response types
 */
interface YahooChartResponse {
  chart: {
    result: Array<{
      meta: {
        regularMarketPrice: number;
        previousClose: number;
        regularMarketVolume: number;
        regularMarketTime: number;
      };
      timestamp: number[];
      indicators: {
        quote: Array<{
          open: number[];
          high: number[];
          low: number[];
          close: number[];
          volume: number[];
        }>;
      };
    }>;
    error: any;
  };
}

interface YahooNewsResponse {
  news?: Array<{
    title: string;
    publisher: string;
    link: string;
    providerPublishTime: number;
  }>;
}

export class YahooFinanceProvider extends BaseDataProvider {
  readonly name = 'Yahoo Finance';
  private readonly baseUrl = 'https://query1.finance.yahoo.com';
  private readonly newsUrl = 'https://query2.finance.yahoo.com';

  /**
   * Fetch complete market data for a symbol
   *
   * @param symbol - Stock ticker (e.g., "TSLA", "AAPL")
   * @returns Complete market data package
   */
  async fetchMarketData(symbol: string): Promise<SharedTradingData> {
    const symbolUpper = symbol.toUpperCase();
    this.log(`Fetching market data for ${symbolUpper}...`);

    try {
      // Fetch quote and historical bars in parallel
      const [chartData, newsData] = await Promise.all([
        this.fetchChartData(symbolUpper),
        this.fetchNews(symbolUpper),
      ]);

      // Extract quote from chart data
      const quote = this.extractQuote(chartData);

      // Extract price bars (last 90 days for TA calculations, return last 30)
      const allBars = this.extractBars(chartData);
      const last30Bars = allBars.slice(-30);

      // Calculate technical indicators
      const currentPrice = quote.price;
      const technical = this.calculateTechnicalIndicators(allBars, currentPrice);

      // Calculate support/resistance levels
      const levels = this.calculatePriceLevels(allBars);

      // Determine trend
      const trend = this.determineTrend(
        last30Bars,
        technical.ema20,
        technical.sma50,
        technical.sma200,
        currentPrice
      );

      this.log(
        `✅ Data fetched: $${currentPrice.toFixed(2)}, RSI ${technical.rsi.toFixed(
          2
        )}, ${newsData.length} news articles`
      );

      return {
        symbol: symbolUpper,
        timestamp: new Date().toISOString(),
        quote,
        technical,
        levels,
        news: newsData,
        bars: last30Bars,
        trend,
      };
    } catch (error) {
      this.logError(`Failed to fetch data for ${symbolUpper}`, error as Error);
      throw new Error(
        `Yahoo Finance error for ${symbolUpper}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Fetch chart data (quote + historical bars)
   *
   * @param symbol - Stock ticker
   * @returns Yahoo Finance chart response
   */
  private async fetchChartData(symbol: string): Promise<YahooChartResponse> {
    // Fetch 90 days of daily data
    const range = '3mo'; // 3 months
    const interval = '1d'; // Daily bars

    const url = `${this.baseUrl}/v8/finance/chart/${symbol}?range=${range}&interval=${interval}&includePrePost=false`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0', // Yahoo Finance requires user agent
      },
    });

    if (!response.ok) {
      throw new Error(`Yahoo Finance API error: ${response.status} ${response.statusText}`);
    }

    const data: YahooChartResponse = await response.json();

    if (data.chart.error) {
      throw new Error(`Yahoo Finance chart error: ${JSON.stringify(data.chart.error)}`);
    }

    if (!data.chart.result || data.chart.result.length === 0) {
      throw new Error(`No chart data found for ${symbol}`);
    }

    return data;
  }

  /**
   * Fetch recent news for symbol
   *
   * @param symbol - Stock ticker
   * @returns Array of news articles
   */
  private async fetchNews(symbol: string): Promise<NewsArticle[]> {
    try {
      // Yahoo Finance search endpoint returns news
      const url = `${this.newsUrl}/v1/finance/search?q=${symbol}&newsCount=5`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
      });

      if (!response.ok) {
        this.logError(`News fetch failed: ${response.status}`);
        return []; // Return empty array on failure (non-critical)
      }

      const data: YahooNewsResponse = await response.json();

      if (!data.news || data.news.length === 0) {
        return [];
      }

      return data.news.slice(0, 5).map(article => ({
        headline: article.title,
        summary: article.title, // Yahoo doesn't provide summaries in this endpoint
        source: article.publisher,
        timestamp: new Date(article.providerPublishTime * 1000).toISOString(),
        url: article.link,
      }));
    } catch (error) {
      this.logError('News fetch failed (non-critical)', error as Error);
      return []; // Return empty array - news is not critical
    }
  }

  /**
   * Extract quote data from chart response
   *
   * @param chartData - Yahoo Finance chart response
   * @returns Quote data object
   */
  private extractQuote(chartData: YahooChartResponse): QuoteData {
    const result = chartData.chart.result[0];
    const meta = result.meta;

    // Get latest price
    const price = meta.regularMarketPrice || meta.previousClose;
    const volume = meta.regularMarketVolume || 0;

    // Yahoo doesn't provide bid/ask in free tier, approximate from day's high/low
    const quotes = result.indicators.quote[0];
    const latestIndex = quotes.close.length - 1;
    const latestHigh = quotes.high[latestIndex] || price * 1.01;
    const latestLow = quotes.low[latestIndex] || price * 0.99;

    const ask = latestHigh;
    const bid = latestLow;
    const spread = ask - bid;

    return {
      price,
      volume,
      bid,
      ask,
      spread,
      timestamp: new Date(meta.regularMarketTime * 1000).toISOString(),
    };
  }

  /**
   * Extract price bars from chart response
   *
   * @param chartData - Yahoo Finance chart response
   * @returns Array of price bars
   */
  private extractBars(chartData: YahooChartResponse): PriceBar[] {
    const result = chartData.chart.result[0];
    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];

    const bars: PriceBar[] = [];

    for (let i = 0; i < timestamps.length; i++) {
      // Skip bars with null values
      if (
        quotes.open[i] === null ||
        quotes.high[i] === null ||
        quotes.low[i] === null ||
        quotes.close[i] === null
      ) {
        continue;
      }

      bars.push({
        date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
        open: quotes.open[i],
        high: quotes.high[i],
        low: quotes.low[i],
        close: quotes.close[i],
        volume: quotes.volume[i] || 0,
      });
    }

    return bars;
  }

  /**
   * Health check - verify Yahoo Finance API is accessible
   *
   * @returns true if API is working
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Try to fetch AAPL as a health check
      const response = await fetch(
        `${this.baseUrl}/v8/finance/chart/AAPL?range=1d&interval=1d`,
        {
          headers: { 'User-Agent': 'Mozilla/5.0' },
        }
      );
      return response.ok;
    } catch (error) {
      this.logError('Health check failed', error as Error);
      return false;
    }
  }
}

/**
 * Yahoo Finance Client - Stock Quotes & Fundamentals
 *
 * Provides FREE data that IBKR API doesn't offer:
 * - Real-time stock quotes
 * - Fundamental metrics (P/E, EPS, Market Cap)
 * - Company information (sector, industry)
 *
 * Data Source: Yahoo Finance (free, no API key required)
 * Documentation: docs/trading/IBKR_DATA_AVAILABILITY.md
 *
 * Why Yahoo Finance?
 * - IBKR snapshot API returns 0 fields (requires paid subscription)
 * - IBKR fundamentals endpoint returns 404 (doesn't exist)
 * - Yahoo Finance is free and reliable for screening purposes
 */

export interface YahooQuote {
  symbol: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  volume: number;
  avgVolume: number;
  marketCap?: number;
  bid?: number;
  ask?: number;
  dayHigh?: number;
  dayLow?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
}

export interface YahooFundamentals {
  symbol: string;
  companyName?: string;
  sector?: string;
  industry?: string;
  marketCap?: number;
  peRatio?: number;
  eps?: number;
  beta?: number;
  sharesOutstanding?: number;
  floatShares?: number;
  dividendYield?: number;
  trailingPE?: number;
  forwardPE?: number;
  priceToBook?: number;
  debtToEquity?: number;
}

export interface YahooEnrichedData {
  symbol: string;
  quote: YahooQuote;
  fundamentals: YahooFundamentals;
  timestamp: Date;
}

/**
 * Yahoo Finance Client
 *
 * Uses yahoo-finance2 npm package for reliable data access
 *
 * Key Features:
 * ✅ Real-time quotes (price, volume, change)
 * ✅ Fundamental metrics (P/E, EPS, Market Cap)
 * ✅ Company info (sector, industry)
 * ✅ Batch requests for multiple symbols
 * ✅ No API key required (free tier)
 */
export class YahooFinanceClient {
  private yahooFinance: any;

  constructor() {
    // Lazy load yahoo-finance2
    this.initYahooFinance();
  }

  private async initYahooFinance() {
    if (!this.yahooFinance) {
      const YahooFinance = (await import('yahoo-finance2')).default;
      // Create new YahooFinance instance (v3 API requirement)
      // Suppress survey notices to prevent URL popup loops
      this.yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
    }
  }
  /**
   * Get real-time quote for a single symbol
   *
   * Returns current price, volume, change, and market data
   *
   * Example:
   * ```typescript
   * const quote = await yahoo.getQuote('AAPL');
   * console.log(quote.price, quote.changePercent);
   * ```
   */
  async getQuote(symbol: string): Promise<YahooQuote | null> {
    try {
      await this.initYahooFinance();
      const result = await this.yahooFinance.quote(symbol);

      if (!result) return null;

      return {
        symbol: result.symbol || symbol,
        price: result.regularMarketPrice || 0,
        previousClose: result.regularMarketPreviousClose || 0,
        change: result.regularMarketChange || 0,
        changePercent: result.regularMarketChangePercent || 0,
        volume: result.regularMarketVolume || 0,
        avgVolume: result.averageDailyVolume3Month || result.averageDailyVolume10Day || 0,
        marketCap: result.marketCap,
        bid: result.bid,
        ask: result.ask,
        dayHigh: result.regularMarketDayHigh,
        dayLow: result.regularMarketDayLow,
        fiftyTwoWeekHigh: result.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: result.fiftyTwoWeekLow,
      };
    } catch (e) {
      console.error(`[Yahoo Finance] Failed to get quote for ${symbol}:`, e);
      return null;
    }
  }

  /**
   * Get fundamental data for a single symbol
   *
   * Returns P/E, EPS, Market Cap, sector, and other metrics
   *
   * Example:
   * ```typescript
   * const fundamentals = await yahoo.getFundamentals('TSLA');
   * console.log(fundamentals.peRatio, fundamentals.sector);
   * ```
   */
  async getFundamentals(symbol: string): Promise<YahooFundamentals | null> {
    try {
      await this.initYahooFinance();
      const result = await this.yahooFinance.quoteSummary(symbol, {
        modules: ['summaryDetail', 'defaultKeyStatistics', 'assetProfile', 'price']
      });

      if (!result) return null;

      const summary = result.summaryDetail;
      const keyStats = result.defaultKeyStatistics;
      const profile = result.assetProfile;
      const price = result.price;

      return {
        symbol: price?.symbol || symbol,
        companyName: price?.longName || price?.shortName,
        sector: profile?.sector,
        industry: profile?.industry,
        marketCap: price?.marketCap,
        peRatio: summary?.trailingPE,
        eps: keyStats?.trailingEps,
        beta: keyStats?.beta,
        sharesOutstanding: keyStats?.sharesOutstanding,
        floatShares: keyStats?.floatShares,
        dividendYield: summary?.dividendYield,
        trailingPE: summary?.trailingPE,
        forwardPE: summary?.forwardPE,
        priceToBook: keyStats?.priceToBook,
        debtToEquity: keyStats?.debtToEquity,
      };
    } catch (e) {
      console.error(`[Yahoo Finance] Failed to get fundamentals for ${symbol}:`, e);
      return null;
    }
  }

  /**
   * Get both quote and fundamentals in a single call
   *
   * More efficient than calling getQuote() and getFundamentals() separately
   *
   * Example:
   * ```typescript
   * const data = await yahoo.getEnrichedData('NVDA');
   * console.log(data.quote.price, data.fundamentals.peRatio);
   * ```
   */
  async getEnrichedData(symbol: string): Promise<YahooEnrichedData | null> {
    try {
      const [quote, fundamentals] = await Promise.all([
        this.getQuote(symbol),
        this.getFundamentals(symbol)
      ]);

      if (!quote || !fundamentals) return null;

      return {
        symbol,
        quote,
        fundamentals,
        timestamp: new Date()
      };
    } catch (e) {
      console.error(`[Yahoo Finance] Failed to enrich data for ${symbol}:`, e);
      return null;
    }
  }

  /**
   * Batch enrich multiple symbols
   *
   * Efficiently fetch quotes + fundamentals for multiple stocks
   *
   * Example:
   * ```typescript
   * const enriched = await yahoo.enrichBatch(['AAPL', 'TSLA', 'NVDA']);
   * enriched.forEach(data => {
   *   console.log(data.symbol, data.quote.price, data.fundamentals.sector);
   * });
   * ```
   */
  async enrichBatch(symbols: string[]): Promise<YahooEnrichedData[]> {
    console.log(`[Yahoo Finance] Enriching ${symbols.length} symbols...`);

    const results = await Promise.allSettled(
      symbols.map(symbol => this.getEnrichedData(symbol))
    );

    const enriched: YahooEnrichedData[] = [];

    results.forEach((result, i) => {
      if (result.status === 'fulfilled' && result.value) {
        enriched.push(result.value);
      } else {
        console.warn(`[Yahoo Finance] Failed to enrich ${symbols[i]}`);
      }
    });

    console.log(`[Yahoo Finance] Successfully enriched ${enriched.length}/${symbols.length} symbols`);
    return enriched;
  }

  /**
   * Get quotes for multiple symbols (batch request)
   *
   * More efficient than calling getQuote() multiple times
   *
   * Example:
   * ```typescript
   * const quotes = await yahoo.getQuoteBatch(['AAPL', 'MSFT', 'GOOGL']);
   * ```
   */
  async getQuoteBatch(symbols: string[]): Promise<YahooQuote[]> {
    try {
      await this.initYahooFinance();
      const results = await this.yahooFinance.quote(symbols);

      if (!results || !Array.isArray(results)) return [];

      return results.map(result => ({
        symbol: result.symbol || '',
        price: result.regularMarketPrice || 0,
        previousClose: result.regularMarketPreviousClose || 0,
        change: result.regularMarketChange || 0,
        changePercent: result.regularMarketChangePercent || 0,
        volume: result.regularMarketVolume || 0,
        avgVolume: result.averageDailyVolume3Month || result.averageDailyVolume10Day || 0,
        marketCap: result.marketCap,
        bid: result.bid,
        ask: result.ask,
        dayHigh: result.regularMarketDayHigh,
        dayLow: result.regularMarketDayLow,
        fiftyTwoWeekHigh: result.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: result.fiftyTwoWeekLow,
      })).filter(q => q.symbol); // Filter out invalid results
    } catch (e) {
      console.error(`[Yahoo Finance] Batch quote failed:`, e);
      return [];
    }
  }
}

/**
 * Create Yahoo Finance client instance
 *
 * Usage:
 * ```typescript
 * const yahoo = createYahooFinanceClient();
 * const quote = await yahoo.getQuote('AAPL');
 * const fundamentals = await yahoo.getFundamentals('TSLA');
 * const enriched = await yahoo.enrichBatch(['AAPL', 'TSLA', 'NVDA']);
 * ```
 */
export function createYahooFinanceClient(): YahooFinanceClient {
  return new YahooFinanceClient();
}

/**
 * Real Stock Quote Provider - Yahoo Finance Integration
 *
 * REPLACES Faker.js fake data with REAL Yahoo Finance quotes.
 *
 * Why this matters:
 * - Fake data generated random prices ($100-$300) on every call
 * - Models saw 87% variance in 5 minutes → "suspicious data" errors
 * - Real quotes ensure consistent, accurate market data
 *
 * @see Feature #54: Research Findings Pipeline Fix
 */

export interface StockQuote {
  price: number;
  volume: number;
  bid: number;
  ask: number;
  exchange: string;
  lastUpdated: string;
}

/**
 * Yahoo Finance Chart API Response Type
 */
interface YahooChartResponse {
  chart: {
    result: Array<{
      meta: {
        symbol: string;
        regularMarketPrice: number;
        previousClose: number;
        regularMarketVolume: number;
        regularMarketTime: number;
        exchangeName: string;
      };
      indicators: {
        quote: Array<{
          high: number[];
          low: number[];
        }>;
      };
    }>;
    error: { code: string; description: string } | null;
  };
}

/**
 * Fetch real-time stock quote from Yahoo Finance API
 *
 * @param symbol - Stock ticker (e.g., "TSLA", "AAPL")
 * @returns Real market data from Yahoo Finance
 * @throws Error if Yahoo Finance API fails
 */
export async function get_stock_quote(symbol: string): Promise<StockQuote> {
  const symbolUpper = symbol.toUpperCase();

  try {
    // Yahoo Finance direct API - no API key required
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbolUpper}?interval=1d&range=1d`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      },
    });

    if (!response.ok) {
      throw new Error(`Yahoo Finance API error: ${response.status} ${response.statusText}`);
    }

    const data: YahooChartResponse = await response.json();

    if (data.chart.error) {
      throw new Error(`Yahoo Finance error: ${data.chart.error.description}`);
    }

    const result = data.chart.result?.[0];
    if (!result) {
      throw new Error(`No data returned for symbol: ${symbolUpper}`);
    }

    const meta = result.meta;
    const price = meta.regularMarketPrice || meta.previousClose;
    const volume = meta.regularMarketVolume || 0;

    // Yahoo doesn't provide bid/ask in free tier
    // Approximate from day's high/low (like YahooFinanceProvider does)
    const quotes = result.indicators?.quote?.[0];
    const latestIndex = quotes ? quotes.high.length - 1 : 0;
    const latestHigh = quotes?.high?.[latestIndex] ?? price * 1.01;
    const latestLow = quotes?.low?.[latestIndex] ?? price * 0.99;

    const ask = latestHigh;
    const bid = latestLow;

    const quote: StockQuote = {
      price: parseFloat(price.toFixed(2)),
      volume: Math.round(volume),
      bid: parseFloat(bid.toFixed(2)),
      ask: parseFloat(ask.toFixed(2)),
      exchange: meta.exchangeName || 'UNKNOWN',
      lastUpdated: new Date(meta.regularMarketTime * 1000).toISOString(),
    };

    console.log(
      `[get_stock_quote] REAL data for ${symbolUpper}: $${quote.price} @ ${quote.exchange}, Vol: ${quote.volume.toLocaleString()}`
    );

    return quote;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[get_stock_quote] ERROR for ${symbolUpper}: ${errorMessage}`);

    // Throw error instead of returning fake data
    // Decision models should know when data is unavailable
    throw new Error(`Failed to fetch quote for ${symbolUpper}: ${errorMessage}`);
  }
}

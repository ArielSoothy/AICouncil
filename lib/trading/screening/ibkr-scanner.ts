/**
 * IBKR Scanner Client - Pre-Market Stock Screening
 *
 * Uses IBKR Client Portal API for:
 * - Stock scanning (563 scan types available)
 * - Pre-market historical bars (4am-9:30am ET)
 * - Gap detection and volume breakouts
 *
 * Data Source: IBKR Client Portal Gateway (localhost:5050)
 * Documentation: docs/trading/IBKR_DATA_AVAILABILITY.md
 */

import https from 'https';
import {
  IBKRScannerParams,
  IBKRScannerResult,
  IBKRScannerSubscription,
  ScanResult,
  PreMarketGapScannerConfig
} from './types';

export interface IBKRScannerConfig {
  gatewayUrl?: string; // Default: https://localhost:5050
  timeoutMs?: number;  // Default: 15000
}

export interface IBKRHistoricalBar {
  t: number;  // Unix timestamp (ms)
  o: number;  // Open
  h: number;  // High
  l: number;  // Low
  c: number;  // Close
  v: number;  // Volume
}

export interface IBKRHistoricalResponse {
  symbol?: string;
  data: IBKRHistoricalBar[];
  startTime?: string;
  endTime?: string;
}

/**
 * IBKR Scanner Client
 *
 * Provides programmatic access to IBKR's market scanning capabilities
 *
 * Key Capabilities (Validated October 2025):
 * ✅ 563 scanner types (TOP_PERC_GAIN, MOST_ACTIVE, etc.)
 * ✅ Pre-market historical bars (outsideRth=true)
 * ✅ Volume and price filters
 * ✅ Contract ID lookup
 *
 * Limitations (API vs Web UI):
 * ❌ No real-time quotes (use Yahoo Finance)
 * ❌ No fundamentals (use SEC EDGAR)
 * ❌ No social sentiment (use Finnhub)
 * ❌ No news feed (use Alpaca)
 */
export class IBKRScanner {
  private baseUrl: string;
  private timeout: number;

  constructor(config: IBKRScannerConfig = {}) {
    this.baseUrl = config.gatewayUrl || 'https://localhost:5050';
    this.timeout = config.timeoutMs || 15000;
  }

  /**
   * Make authenticated request to IBKR Gateway
   *
   * Pattern from lib/brokers/ibkr-broker.ts:
   * - Use 127.0.0.1 instead of 'localhost' for hostname
   * - Include Content-Length header for POST requests
   * - Set rejectUnauthorized: false for self-signed certs
   */
  private async request<T>(
    endpoint: string,
    method: string = 'GET',
    body?: any
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const bodyStr = body ? JSON.stringify(body) : undefined;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 VerdictAI/1.0',
        'Accept': 'application/json',
      };

      if (bodyStr) {
        headers['Content-Length'] = Buffer.byteLength(bodyStr).toString();
      }

      const url = new URL(endpoint, this.baseUrl);
      const options: https.RequestOptions = {
        hostname: url.hostname === 'localhost' ? '127.0.0.1' : url.hostname,
        port: url.port || 5050,
        path: url.pathname + url.search,
        method,
        headers,
        rejectUnauthorized: false
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`IBKR API error: ${res.statusCode} - ${data}`));
            return;
          }

          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Failed to parse IBKR response: ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(this.timeout, () => reject(new Error('Request timeout')));

      if (bodyStr) {
        req.write(bodyStr);
      }

      req.end();
    });
  }

  /**
   * Get scanner parameters
   * Returns available scan types, locations, filters
   *
   * Endpoint: GET /v1/api/iserver/scanner/params
   * Validated: ✅ 563 scan types available
   */
  async getScannerParams(): Promise<IBKRScannerParams> {
    return this.request<IBKRScannerParams>('/v1/api/iserver/scanner/params');
  }

  /**
   * Run market scanner
   *
   * Endpoint: POST /v1/api/iserver/scanner/run
   * Max Results: 50 (IBKR API limit)
   *
   * Common scan codes (from 563 available):
   * - TOP_PERC_GAIN: Stocks with highest % gain
   * - TOP_PERC_LOSE: Stocks with highest % loss
   * - MOST_ACTIVE: Most active by volume
   * - HOT_BY_PRICE: Highest price movers
   * - HOT_BY_VOLUME: Highest volume spikes
   * - TOP_TRADE_COUNT: Most trades
   */
  async runScanner(subscription: IBKRScannerSubscription): Promise<IBKRScannerResult[]> {
    const payload = {
      instrument: subscription.instrument,
      locations: subscription.locationCode,
      scanCode: subscription.scanCode,
      secType: subscription.instrument,
      filters: this.buildFilters(subscription)
    };

    const response = await this.request<any>('/v1/api/iserver/scanner/run', 'POST', payload);

    // Scanner returns { Contracts: [...] } format
    return response.Contracts || [];
  }

  /**
   * Build scanner filters from subscription
   */
  private buildFilters(subscription: IBKRScannerSubscription): any[] {
    const filters: any[] = [];

    if (subscription.abovePrice !== undefined) {
      filters.push({ code: 'priceAbove', value: subscription.abovePrice });
    }

    if (subscription.belowPrice !== undefined) {
      filters.push({ code: 'priceBelow', value: subscription.belowPrice });
    }

    if (subscription.aboveVolume !== undefined) {
      filters.push({ code: 'volumeAbove', value: subscription.aboveVolume });
    }

    if (subscription.marketCapAbove !== undefined) {
      filters.push({ code: 'marketCapAbove1e6', value: subscription.marketCapAbove / 1e6 });
    }

    return filters;
  }

  /**
   * Get contract ID for a symbol
   * Required for historical data and market data requests
   *
   * Endpoint: POST /v1/api/iserver/secdef/search?symbol=SYMBOL
   */
  async getContractId(symbol: string): Promise<number | null> {
    try {
      const results = await this.request<any[]>(
        `/v1/api/iserver/secdef/search?symbol=${symbol}&name=false`,
        'POST'
      );

      // Return first result's contract ID
      return results[0]?.conid || null;
    } catch (e) {
      console.error(`Failed to get contract ID for ${symbol}:`, e);
      return null;
    }
  }

  /**
   * Get historical bars including pre-market data
   *
   * Endpoint: GET /v1/api/iserver/marketdata/history
   * Validated: ✅ 36/192 bars from extended hours (4am-9:30am ET)
   *
   * Parameters:
   * - conid: Contract ID from getContractId()
   * - period: '1d', '1w', '1m', '1y'
   * - bar: '1min', '5min', '15min', '1h', '1d'
   * - outsideRth: true = include pre/post market, false = regular hours only
   *
   * Pre-market hours: 4:00 AM - 9:30 AM ET
   * After-hours: 4:00 PM - 8:00 PM ET
   */
  async getHistoricalBars(
    conid: number,
    options: {
      period?: string;
      bar?: string;
      outsideRth?: boolean;
    } = {}
  ): Promise<IBKRHistoricalResponse> {
    const params = new URLSearchParams({
      conid: conid.toString(),
      period: options.period || '1d',
      bar: options.bar || '5min',
      outsideRth: String(options.outsideRth !== false) // Default true for pre-market
    });

    return this.request<IBKRHistoricalResponse>(
      `/v1/api/iserver/marketdata/history?${params.toString()}`
    );
  }

  /**
   * Pre-market gap scanner - Primary use case
   *
   * Finds stocks with significant pre-market price gaps
   *
   * Process:
   * 1. Run IBKR scanner for top % gainers/losers
   * 2. Get pre-market historical bars for each result
   * 3. Calculate gap % from previous close
   * 4. Filter by minimum gap threshold
   *
   * Returns: Stocks sorted by gap % with pre-market data
   */
  async scanPreMarketGaps(config: PreMarketGapScannerConfig): Promise<ScanResult[]> {
    console.log('[IBKR Scanner] Starting pre-market gap scan...', config);

    // Step 1: Run scanner for top gainers
    const scanSubscription: IBKRScannerSubscription = {
      instrument: 'STK',
      locationCode: 'STK.US.MAJOR',
      scanCode: 'TOP_PERC_GAIN',
      abovePrice: config.minPrice,
      belowPrice: config.maxPrice,
      aboveVolume: config.minPreMarketVolume,
      numberOfRows: Math.min(config.maxResults, 50) // IBKR API limit
    };

    let scanResults: IBKRScannerResult[];
    try {
      scanResults = await this.runScanner(scanSubscription);
      console.log(`[IBKR Scanner] Found ${scanResults.length} candidates from scanner`);
    } catch (e) {
      console.error('[IBKR Scanner] Scanner failed:', e);
      return [];
    }

    // Step 2: Get pre-market bars for each stock
    const results: ScanResult[] = [];

    for (const scanResult of scanResults) {
      try {
        const symbol = scanResult.symbol;
        const conid = scanResult.conid;

        if (!symbol || !conid) continue;

        // Get pre-market bars (4am-9:30am ET)
        const bars = await this.getHistoricalBars(conid, {
          period: '1d',
          bar: '5min',
          outsideRth: true
        });

        if (!bars.data || bars.data.length === 0) {
          console.warn(`[IBKR Scanner] No bars for ${symbol}`);
          continue;
        }

        // Filter for pre-market bars only (before 9:30 AM ET)
        const premarketBars = bars.data.filter(bar => {
          const date = new Date(bar.t);
          const hour = date.getUTCHours();
          const minute = date.getUTCMinutes();
          // Assuming ET timezone offset handling elsewhere
          return hour < 9 || (hour === 9 && minute < 30);
        });

        if (premarketBars.length === 0) continue;

        // Calculate gap metrics
        const previousClose = bars.data[0]?.c || 0; // First bar of day is previous close
        const preMarketPrice = premarketBars[premarketBars.length - 1].c;
        const gapPercent = ((preMarketPrice - previousClose) / previousClose) * 100;

        // Calculate pre-market volume
        const preMarketVolume = premarketBars.reduce((sum, bar) => sum + bar.v, 0);

        // Filter by minimum gap threshold
        if (Math.abs(gapPercent) < config.minGapPercent) continue;

        // Build scan result
        results.push({
          symbol,
          companyName: scanResult.companyName,
          price: preMarketPrice,
          preMarketPrice,
          previousClose,
          gapPercent,
          volume: preMarketVolume,
          preMarketVolume,
          scannedAt: new Date(),
          scanSource: 'ibkr'
        });

      } catch (e) {
        console.error(`[IBKR Scanner] Failed to process ${scanResult.symbol}:`, e);
        continue;
      }
    }

    // Sort by absolute gap %
    results.sort((a, b) => Math.abs(b.gapPercent) - Math.abs(a.gapPercent));

    console.log(`[IBKR Scanner] Completed scan: ${results.length} stocks with ${config.minGapPercent}%+ gap`);
    return results.slice(0, config.maxResults);
  }
}

/**
 * Create IBKR Scanner instance
 *
 * Usage:
 * ```typescript
 * const scanner = createIBKRScanner();
 * const gappers = await scanner.scanPreMarketGaps({
 *   minGapPercent: 3.0,
 *   minPreMarketVolume: 100000,
 *   minPrice: 5.0,
 *   maxResults: 20
 * });
 * ```
 */
export function createIBKRScanner(config?: IBKRScannerConfig): IBKRScanner {
  return new IBKRScanner(config);
}

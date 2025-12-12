/**
 * CIK Mapper Service
 *
 * Maps stock ticker symbols to SEC CIK (Central Index Key) numbers.
 * Uses SEC's company_tickers.json as primary source with 24-hour cache.
 *
 * Rate Limit: 10 requests/second (SEC EDGAR fair use policy)
 * User-Agent: Required by SEC for all requests
 *
 * @see https://www.sec.gov/search-filings/edgar-application-programming-interfaces
 */

import type { SecCompanyTickersResponse } from './types';

/**
 * CIK Mapper - Maps ticker symbols to SEC CIK numbers
 */
class CikMapper {
  private cache = new Map<string, string>();
  private reverseCache = new Map<string, string>(); // CIK → ticker
  private lastCacheRefresh = 0;
  private isRefreshing = false;
  private refreshPromise: Promise<void> | null = null;

  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly SEC_TICKERS_URL = 'https://www.sec.gov/files/company_tickers.json';
  // SEC requires User-Agent with company name and email
  private readonly USER_AGENT = 'AICouncil/1.0 (contact@aicouncil.app)';

  /**
   * Get CIK for a ticker symbol
   * Returns 10-digit zero-padded CIK string, or null if not found
   *
   * @example
   * const cik = await cikMapper.getCik('AAPL'); // "0000320193"
   * const cik = await cikMapper.getCik('RLMD'); // "0001475922"
   */
  async getCik(ticker: string): Promise<string | null> {
    const upperTicker = ticker.toUpperCase().trim();

    // Check cache first
    if (this.cache.has(upperTicker) && !this.isCacheStale()) {
      return this.cache.get(upperTicker)!;
    }

    // Refresh cache if stale (only one refresh at a time)
    if (this.isCacheStale()) {
      await this.ensureCacheRefreshed();
    }

    return this.cache.get(upperTicker) || null;
  }

  /**
   * Get ticker for a CIK number (reverse lookup)
   */
  async getTicker(cik: string): Promise<string | null> {
    const paddedCik = cik.padStart(10, '0');

    if (this.reverseCache.has(paddedCik) && !this.isCacheStale()) {
      return this.reverseCache.get(paddedCik)!;
    }

    if (this.isCacheStale()) {
      await this.ensureCacheRefreshed();
    }

    return this.reverseCache.get(paddedCik) || null;
  }

  /**
   * Check if a ticker has a CIK (is a US public company)
   */
  async isPublicCompany(ticker: string): Promise<boolean> {
    const cik = await this.getCik(ticker);
    return cik !== null;
  }

  /**
   * Get all cached mappings count (for debugging)
   */
  getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * Force cache refresh (for testing or manual update)
   */
  async forceRefresh(): Promise<void> {
    this.lastCacheRefresh = 0;
    await this.refreshCache();
  }

  /**
   * Ensure cache is refreshed (thread-safe)
   */
  private async ensureCacheRefreshed(): Promise<void> {
    if (this.isRefreshing && this.refreshPromise) {
      // Another refresh is in progress, wait for it
      await this.refreshPromise;
      return;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.refreshCache();

    try {
      await this.refreshPromise;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  /**
   * Refresh the ticker-to-CIK mapping cache from SEC
   */
  private async refreshCache(): Promise<void> {
    try {
      console.log('[CIK Mapper] Refreshing cache from SEC...');

      const response = await fetch(this.SEC_TICKERS_URL, {
        headers: {
          'User-Agent': this.USER_AGENT,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`SEC API error: ${response.status} ${response.statusText}`);
      }

      const data: SecCompanyTickersResponse = await response.json();

      // Clear old caches
      this.cache.clear();
      this.reverseCache.clear();

      // Build new caches from SEC data
      // Format: { "0": { "cik_str": 320193, "ticker": "AAPL", "title": "Apple Inc." }, ... }
      for (const key of Object.keys(data)) {
        const entry = data[key];
        const ticker = entry.ticker?.toUpperCase();
        const cik = String(entry.cik_str).padStart(10, '0');

        if (ticker) {
          this.cache.set(ticker, cik);
          this.reverseCache.set(cik, ticker);
        }
      }

      this.lastCacheRefresh = Date.now();
      console.log(`[CIK Mapper] Cache refreshed: ${this.cache.size} mappings loaded`);
    } catch (error) {
      console.error('[CIK Mapper] Failed to refresh cache:', error);
      // Keep using stale cache if available
      if (this.cache.size === 0) {
        throw new Error('CIK Mapper: No cached data available and refresh failed');
      }
    }
  }

  /**
   * Check if cache is stale
   */
  private isCacheStale(): boolean {
    if (this.cache.size === 0) return true;
    return Date.now() - this.lastCacheRefresh > this.CACHE_TTL;
  }
}

// Export singleton instance
export const cikMapper = new CikMapper();

// Export class for testing
export { CikMapper };

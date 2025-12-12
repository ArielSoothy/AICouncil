/**
 * SEC EDGAR Data Provider
 *
 * Fetches fundamental data from SEC EDGAR API (FREE, no API key required)
 *
 * API Endpoints:
 * - Company Facts (XBRL): https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json
 * - Submissions: https://data.sec.gov/submissions/CIK{cik}.json
 *
 * Rate Limit: 10 requests/second (USER-AGENT REQUIRED)
 * Coverage: ALL US public companies
 *
 * IMPORTANT: SEC EDGAR does NOT provide real-time prices.
 * This provider is for FUNDAMENTALS ONLY.
 * Use in combination with Yahoo Finance for complete data.
 *
 * @see https://www.sec.gov/search-filings/edgar-application-programming-interfaces
 */

import { BaseDataProvider } from '../base-provider';
import type { SharedTradingData } from '../types';
import type {
  SecFundamentalData,
  SecFiling,
  SecCompanyFactsResponse,
  SecSubmissionsResponse,
} from './types';
import { cikMapper } from './cik-mapper';
import { parseXbrlFacts } from './xbrl-parser';

/**
 * SEC EDGAR Data Provider
 */
export class SecEdgarProvider extends BaseDataProvider {
  readonly name = 'SEC EDGAR';
  private readonly baseUrl = 'https://data.sec.gov';
  // SEC requires User-Agent with company name and email
  private readonly USER_AGENT = 'AICouncil/1.0 (contact@aicouncil.app)';

  // Rate limiting: 10 req/sec max
  private lastRequestTime = 0;
  private readonly MIN_REQUEST_INTERVAL = 100; // 100ms = 10 req/sec

  /**
   * SEC EDGAR does NOT provide real-time prices.
   * This method throws an error - use fetchFundamentals() instead.
   *
   * For complete market data, use Yahoo Finance as primary and
   * enhance with SEC EDGAR fundamentals when Yahoo data is sparse.
   */
  async fetchMarketData(_symbol: string): Promise<SharedTradingData> {
    throw new Error(
      'SEC EDGAR does not provide real-time market data. ' +
      'Use fetchFundamentals() instead, combined with Yahoo Finance for prices.'
    );
  }

  /**
   * Fetch fundamental data from SEC EDGAR
   * This is the primary method for SEC data
   *
   * @param symbol - Stock ticker symbol (e.g., "RLMD", "AAPL")
   * @returns Parsed fundamental data or null if not available
   */
  async fetchFundamentals(symbol: string): Promise<SecFundamentalData | null> {
    const upperSymbol = symbol.toUpperCase().trim();

    try {
      const cik = await cikMapper.getCik(upperSymbol);

      if (!cik) {
        this.log(`No CIK found for ${upperSymbol} - may not be a US public company`);
        return null;
      }

      this.log(`Fetching SEC data for ${upperSymbol} (CIK: ${cik})`);

      // Fetch company facts (XBRL data)
      await this.enforceRateLimit();
      const factsUrl = `${this.baseUrl}/api/xbrl/companyfacts/CIK${cik}.json`;
      const factsResponse = await this.fetchWithUserAgent(factsUrl);

      if (!factsResponse.ok) {
        if (factsResponse.status === 404) {
          this.log(`No XBRL data for ${upperSymbol} (CIK: ${cik})`);
          return null;
        }
        throw new Error(`SEC API error: ${factsResponse.status}`);
      }

      const factsData: SecCompanyFactsResponse = await factsResponse.json();

      // Parse XBRL facts into structured fundamental data
      const fundamentals = parseXbrlFacts(factsData);

      // Fetch recent filings for context
      await this.enforceRateLimit();
      const filings = await this.fetchRecentFilings(cik, 5);

      // Find most recent 10-K or 10-Q
      const recentAnnual = filings.find(f => f.form === '10-K');
      const recentQuarterly = filings.find(f => f.form === '10-Q');
      const mostRecent = filings[0];

      if (recentAnnual) {
        fundamentals.lastFilingDate = recentAnnual.filingDate;
        fundamentals.lastFilingType = recentAnnual.form;
      } else if (mostRecent) {
        fundamentals.lastFilingDate = mostRecent.filingDate;
        fundamentals.lastFilingType = mostRecent.form;
      }

      this.log(
        `SEC data fetched: Revenue ${this.formatCurrency(fundamentals.revenue)}, ` +
        `Net Income ${this.formatCurrency(fundamentals.netIncome)}, ` +
        `EPS ${fundamentals.eps?.toFixed(2) ?? 'N/A'}`
      );

      return fundamentals;
    } catch (error) {
      this.logError(`Failed to fetch SEC data for ${upperSymbol}`, error as Error);
      return null;
    }
  }

  /**
   * Fetch recent SEC filings (10-K, 10-Q, 8-K)
   *
   * @param cik - 10-digit CIK number
   * @param limit - Maximum number of filings to return
   * @returns Array of filing metadata
   */
  async fetchRecentFilings(cik: string, limit: number = 10): Promise<SecFiling[]> {
    try {
      await this.enforceRateLimit();

      const url = `${this.baseUrl}/submissions/CIK${cik}.json`;
      const response = await this.fetchWithUserAgent(url);

      if (!response.ok) {
        this.logError(`Failed to fetch submissions for CIK ${cik}: ${response.status}`);
        return [];
      }

      const data: SecSubmissionsResponse = await response.json();
      const recentFilings: SecFiling[] = [];

      const filings = data.filings?.recent;
      if (!filings) return [];

      const count = Math.min(limit, filings.form?.length || 0);

      for (let i = 0; i < count; i++) {
        recentFilings.push({
          accessionNumber: filings.accessionNumber[i],
          filingDate: filings.filingDate[i],
          reportDate: filings.reportDate?.[i] || filings.filingDate[i],
          form: filings.form[i],
          primaryDocument: filings.primaryDocument[i],
          description: filings.primaryDocDescription?.[i] || '',
        });
      }

      return recentFilings;
    } catch (error) {
      this.logError('Failed to fetch SEC filings', error as Error);
      return [];
    }
  }

  /**
   * Fetch filings filtered by form type
   *
   * @param symbol - Stock ticker symbol
   * @param formType - Form type to filter (e.g., '10-K', '10-Q', '8-K')
   * @param limit - Maximum number of filings
   */
  async fetchFilingsByType(
    symbol: string,
    formType: string,
    limit: number = 5
  ): Promise<SecFiling[]> {
    const cik = await cikMapper.getCik(symbol.toUpperCase());
    if (!cik) return [];

    const allFilings = await this.fetchRecentFilings(cik, 50);
    return allFilings
      .filter(f => f.form === formType || f.form.startsWith(formType))
      .slice(0, limit);
  }

  /**
   * Get company info from SEC
   */
  async getCompanyInfo(symbol: string): Promise<{
    name: string;
    cik: string;
    sic: string;
    sicDescription: string;
    fiscalYearEnd: string;
    exchanges: string[];
  } | null> {
    const cik = await cikMapper.getCik(symbol.toUpperCase());
    if (!cik) return null;

    try {
      await this.enforceRateLimit();

      const url = `${this.baseUrl}/submissions/CIK${cik}.json`;
      const response = await this.fetchWithUserAgent(url);

      if (!response.ok) return null;

      const data: SecSubmissionsResponse = await response.json();

      return {
        name: data.name,
        cik: data.cik,
        sic: data.sic,
        sicDescription: data.sicDescription,
        fiscalYearEnd: data.fiscalYearEnd,
        exchanges: data.exchanges,
      };
    } catch {
      return null;
    }
  }

  /**
   * Health check - verify SEC EDGAR API is accessible
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Test with Apple (known good CIK)
      const response = await this.fetchWithUserAgent(
        `${this.baseUrl}/submissions/CIK0000320193.json`
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Check if SEC data is available for a symbol
   */
  async isAvailable(symbol: string): Promise<boolean> {
    const cik = await cikMapper.getCik(symbol.toUpperCase());
    return cik !== null;
  }

  /**
   * Fetch with required User-Agent header (SEC requirement)
   */
  private async fetchWithUserAgent(url: string): Promise<Response> {
    return fetch(url, {
      headers: {
        'User-Agent': this.USER_AGENT,
        'Accept': 'application/json',
      },
    });
  }

  /**
   * Enforce SEC rate limit (10 req/sec)
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      const waitTime = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Format currency for logging
   */
  private formatCurrency(value: number | undefined): string {
    if (value === undefined) return 'N/A';
    if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return `$${value.toLocaleString()}`;
  }
}

// Export singleton instance
export const secEdgarProvider = new SecEdgarProvider();

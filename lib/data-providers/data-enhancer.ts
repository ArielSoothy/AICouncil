/**
 * Data Enhancer - Combines Multiple Data Sources
 *
 * Implements intelligent fallback:
 * 1. Yahoo Finance for real-time prices (primary)
 * 2. SEC EDGAR for fundamentals when Yahoo is sparse
 * 3. Merge results into unified SharedTradingData
 *
 * This module is the bridge between sparse data detection
 * and SEC EDGAR fallback.
 */

import type { SharedTradingData, FundamentalData } from './types';
import type { SecFundamentalData, DataSourceInfo } from './sec-edgar/types';
import { secEdgarProvider } from './sec-edgar';
import { detectSparseData, shouldTriggerSecFallback } from './sparse-data-detector';

// ============================================================================
// Extended SharedTradingData with Source Tracking
// ============================================================================

/**
 * SharedTradingData enhanced with SEC data and source tracking
 */
export interface EnhancedTradingData extends SharedTradingData {
  dataSource: DataSourceInfo;
  secEnhanced?: {
    revenue?: number;
    netIncome?: number;
    totalAssets?: number;
    totalLiabilities?: number;
    cash?: number;
    longTermDebt?: number;
    researchAndDevelopment?: number;
    debtToEquity?: number;
    currentRatio?: number;
    returnOnEquity?: number;
    returnOnAssets?: number;
    lastFilingDate?: string;
    lastFilingType?: string;
  };
}

// ============================================================================
// Main Enhancement Function
// ============================================================================

/**
 * Enhance market data with SEC EDGAR fallback
 *
 * Strategy:
 * 1. Check if Yahoo data is sparse
 * 2. If sparse, fetch SEC EDGAR data
 * 3. Merge SEC data into fundamentals
 * 4. Track data sources for transparency
 *
 * @param yahooData - SharedTradingData from Yahoo Finance
 * @returns Enhanced data with SEC fallback if needed
 */
export async function enhanceWithSecFallback(
  yahooData: SharedTradingData
): Promise<EnhancedTradingData> {
  // Check if we need SEC fallback
  const sparseCheck = detectSparseData(yahooData);

  console.log(
    `[Data Enhancer] ${yahooData.symbol} completeness: ${sparseCheck.completenessScore}% ` +
    `(${sparseCheck.recommendation})`
  );

  // If data is sufficient, return as-is with source tracking
  if (!shouldTriggerSecFallback(yahooData)) {
    console.log(`[Data Enhancer] Yahoo data sufficient, skipping SEC fallback`);
    return {
      ...yahooData,
      dataSource: {
        price: 'yahoo',
        fundamentals: 'yahoo',
        news: 'yahoo',
        fallbackUsed: false,
      },
    };
  }

  // Fetch SEC EDGAR data
  console.log(`[Data Enhancer] Sparse data detected, fetching SEC EDGAR...`);
  console.log(`[Data Enhancer] Missing fields: ${sparseCheck.sparseFields.join(', ')}`);

  const secData = await secEdgarProvider.fetchFundamentals(yahooData.symbol);

  if (!secData) {
    console.log(`[Data Enhancer] No SEC data available for ${yahooData.symbol}, using Yahoo data as-is`);
    return {
      ...yahooData,
      dataSource: {
        price: 'yahoo',
        fundamentals: 'yahoo',
        news: 'yahoo',
        fallbackUsed: false,
        fallbackReason: 'SEC data not available',
      },
    };
  }

  // Merge SEC data into fundamentals
  const enhancedFundamentals = mergeFundamentals(yahooData.fundamentals, secData);

  console.log(
    `[Data Enhancer] SEC data merged successfully - ` +
    `EPS: ${enhancedFundamentals.eps ?? 'N/A'}, ` +
    `Revenue: ${formatCurrency(secData.revenue)}`
  );

  return {
    ...yahooData,
    fundamentals: enhancedFundamentals,
    secEnhanced: {
      revenue: secData.revenue,
      netIncome: secData.netIncome,
      totalAssets: secData.totalAssets,
      totalLiabilities: secData.totalLiabilities,
      cash: secData.cash,
      longTermDebt: secData.longTermDebt,
      researchAndDevelopment: secData.researchAndDevelopment,
      debtToEquity: secData.debtToEquity,
      currentRatio: secData.currentRatio,
      returnOnEquity: secData.returnOnEquity,
      returnOnAssets: secData.returnOnAssets,
      lastFilingDate: secData.lastFilingDate,
      lastFilingType: secData.lastFilingType,
    },
    dataSource: {
      price: 'yahoo',
      fundamentals: 'combined',
      news: 'yahoo',
      fallbackUsed: true,
      fallbackReason: `Yahoo completeness: ${sparseCheck.completenessScore}%`,
    },
  };
}

// ============================================================================
// Merge Functions
// ============================================================================

/**
 * Merge Yahoo and SEC fundamental data
 * SEC data fills gaps, Yahoo data takes precedence for shared fields
 *
 * @param yahoo - FundamentalData from Yahoo Finance (may be undefined)
 * @param sec - SecFundamentalData from SEC EDGAR
 * @returns Merged FundamentalData
 */
function mergeFundamentals(
  yahoo: FundamentalData | undefined,
  sec: SecFundamentalData
): FundamentalData {
  // Start with Yahoo data or empty object
  const base: FundamentalData = yahoo || {
    pe: null,
    forwardPe: null,
    pegRatio: null,
    priceToBook: null,
    eps: null,
    epsForward: null,
    marketCap: null,
    avgVolume: null,
    sharesOutstanding: null,
    dividendYield: null,
    dividendRate: null,
    beta: null,
    earningsDate: null,
    exDividendDate: null,
    fiftyTwoWeekHigh: null,
    fiftyTwoWeekLow: null,
    fiftyTwoWeekChange: null,
    targetPrice: null,
    recommendationKey: null,
  };

  // Fill gaps with SEC data
  // Use nullish coalescing to only fill when Yahoo value is null/undefined
  return {
    ...base,

    // EPS - prefer SEC if Yahoo is missing (from actual filings)
    eps: base.eps ?? sec.eps ?? null,

    // Shares outstanding - prefer SEC
    sharesOutstanding: base.sharesOutstanding ?? sec.sharesOutstanding ?? null,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if SEC fallback is available for a symbol
 */
export async function isSecFallbackAvailable(symbol: string): Promise<boolean> {
  return secEdgarProvider.isAvailable(symbol);
}

/**
 * Get SEC company info (name, CIK, industry)
 */
export async function getSecCompanyInfo(symbol: string) {
  return secEdgarProvider.getCompanyInfo(symbol);
}

/**
 * Format currency for logging
 */
function formatCurrency(value: number | undefined): string {
  if (value === undefined) return 'N/A';
  if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return `$${value.toLocaleString()}`;
}

// ============================================================================
// Exports
// ============================================================================

export { detectSparseData, shouldTriggerSecFallback } from './sparse-data-detector';

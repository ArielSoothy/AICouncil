/**
 * SEC EDGAR Module - Public API
 *
 * This module provides access to SEC EDGAR data for US public companies.
 * It fetches fundamentals from 10-K/10-Q filings when Yahoo Finance
 * data is sparse or unavailable.
 *
 * Usage:
 * ```typescript
 * import { secEdgarProvider, cikMapper } from '@/lib/data-providers/sec-edgar';
 *
 * // Get fundamentals for a stock
 * const fundamentals = await secEdgarProvider.fetchFundamentals('RLMD');
 *
 * // Check if SEC data is available
 * const cik = await cikMapper.getCik('RLMD');
 * ```
 */

// Main provider
export { secEdgarProvider, SecEdgarProvider } from './sec-edgar-provider';

// CIK mapping service
export { cikMapper, CikMapper } from './cik-mapper';

// XBRL parsing utilities
export { parseXbrlFacts, getHistoricalValues, getQuarterlyValues } from './xbrl-parser';

// Types
export type {
  SecCompany,
  SecFiling,
  SecFormType,
  SecFinancialFact,
  SecFactValue,
  SecFundamentalData,
  SparseDataResult,
  DataSourceInfo,
  SecCompanyTickersResponse,
  SecCompanyFactsResponse,
  SecSubmissionsResponse,
} from './types';

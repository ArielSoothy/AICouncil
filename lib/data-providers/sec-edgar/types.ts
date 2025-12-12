/**
 * SEC EDGAR API Types
 *
 * SEC uses CIK (Central Index Key) numbers, not ticker symbols.
 * All filings are identified by CIK and accession number.
 *
 * API Documentation: https://www.sec.gov/search-filings/edgar-application-programming-interfaces
 */

// ============================================================================
// Company Identification
// ============================================================================

/**
 * SEC Company identification
 */
export interface SecCompany {
  cik: string;           // 10-digit CIK (padded with zeros)
  name: string;          // Company name
  ticker?: string;       // Optional ticker symbol
  sic?: string;          // SIC industry code
  fiscalYearEnd?: string; // e.g., "1231" for December 31
}

// ============================================================================
// Filing Types
// ============================================================================

/**
 * SEC Filing metadata
 */
export interface SecFiling {
  accessionNumber: string;  // Unique filing identifier (e.g., "0001193125-24-012345")
  filingDate: string;       // Date filed with SEC (YYYY-MM-DD)
  reportDate: string;       // Period end date for the report
  form: SecFormType;        // Filing form type
  primaryDocument: string;  // Main document filename
  description: string;      // Filing description
}

/**
 * Common SEC form types
 */
export type SecFormType =
  | '10-K'      // Annual report
  | '10-Q'      // Quarterly report
  | '8-K'       // Current report (material events)
  | '10-K/A'    // Amended annual report
  | '10-Q/A'    // Amended quarterly report
  | 'DEF 14A'   // Proxy statement
  | 'S-1'       // Registration statement
  | '4'         // Insider trading
  | '13F-HR'    // Institutional holdings
  | string;     // Other form types

// ============================================================================
// XBRL Financial Facts
// ============================================================================

/**
 * XBRL Financial Fact structure from SEC Company Facts API
 */
export interface SecFinancialFact {
  label: string;
  description: string;
  units: {
    [unit: string]: SecFactValue[];
  };
}

/**
 * Individual fact value with period information
 */
export interface SecFactValue {
  val: number;         // The value
  accn: string;        // Accession number
  fy: number;          // Fiscal year
  fp: string;          // Fiscal period (Q1, Q2, Q3, FY)
  form: string;        // Filing form
  filed: string;       // Filing date
  start?: string;      // Period start date
  end: string;         // Period end date
  frame?: string;      // CY/CIK frame (e.g., "CY2024Q1")
}

// ============================================================================
// Parsed Fundamental Data
// ============================================================================

/**
 * Parsed fundamental data from SEC EDGAR filings
 * This is the structured output from parsing XBRL data
 */
export interface SecFundamentalData {
  // Income Statement
  revenue?: number;
  netIncome?: number;
  operatingIncome?: number;
  grossProfit?: number;
  researchAndDevelopment?: number;

  // Balance Sheet - Assets
  totalAssets?: number;
  currentAssets?: number;
  cash?: number;

  // Balance Sheet - Liabilities
  totalLiabilities?: number;
  currentLiabilities?: number;
  longTermDebt?: number;

  // Equity
  totalEquity?: number;

  // Per Share Data
  eps?: number;
  epsBasic?: number;
  epsDiluted?: number;
  bookValuePerShare?: number;

  // Shares
  sharesOutstanding?: number;
  sharesOutstandingDiluted?: number;

  // Calculated Ratios
  debtToEquity?: number;
  currentRatio?: number;
  returnOnEquity?: number;
  returnOnAssets?: number;

  // Metadata
  fiscalYearEnd: string;
  lastFilingDate: string;
  lastFilingType: string;
  dataSource: 'SEC-EDGAR';
}

// ============================================================================
// Sparse Data Detection
// ============================================================================

/**
 * Result of sparse data detection
 */
export interface SparseDataResult {
  isSparse: boolean;
  sparseFields: string[];
  completenessScore: number;  // 0-100
  recommendation: 'use-as-is' | 'enhance-with-sec' | 'sec-only';
}

/**
 * Field weights for completeness scoring
 */
export interface FieldWeight {
  field: string;
  weight: number;
  critical: boolean;
}

// ============================================================================
// Data Source Tracking
// ============================================================================

/**
 * Track where each piece of data came from
 */
export interface DataSourceInfo {
  price: 'yahoo' | 'alpaca' | 'ibkr';
  fundamentals: 'yahoo' | 'sec-edgar' | 'combined';
  news: 'yahoo' | 'alpaca' | 'sec-edgar';
  fallbackUsed: boolean;
  fallbackReason?: string;
}

// ============================================================================
// SEC API Response Types
// ============================================================================

/**
 * SEC Company Tickers response structure
 * From: https://www.sec.gov/files/company_tickers.json
 */
export interface SecCompanyTickersResponse {
  [index: string]: {
    cik_str: number;
    ticker: string;
    title: string;
  };
}

/**
 * SEC Company Facts response structure
 * From: https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json
 */
export interface SecCompanyFactsResponse {
  cik: number;
  entityName: string;
  facts: {
    'us-gaap'?: Record<string, SecFinancialFact>;
    'dei'?: Record<string, SecFinancialFact>;
    'ifrs-full'?: Record<string, SecFinancialFact>;
  };
}

/**
 * SEC Submissions response structure
 * From: https://data.sec.gov/submissions/CIK{cik}.json
 */
export interface SecSubmissionsResponse {
  cik: string;
  entityType: string;
  sic: string;
  sicDescription: string;
  name: string;
  tickers: string[];
  exchanges: string[];
  fiscalYearEnd: string;
  filings: {
    recent: {
      accessionNumber: string[];
      filingDate: string[];
      reportDate: string[];
      form: string[];
      primaryDocument: string[];
      primaryDocDescription: string[];
    };
  };
}

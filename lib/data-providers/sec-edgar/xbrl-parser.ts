/**
 * XBRL Parser for SEC EDGAR Company Facts
 *
 * SEC provides financial data in XBRL (eXtensible Business Reporting Language).
 * This parser extracts key metrics from the standardized US GAAP taxonomy.
 *
 * GAAP Taxonomy Reference:
 * - us-gaap: US Generally Accepted Accounting Principles
 * - dei: Document and Entity Information
 * - ifrs-full: International Financial Reporting Standards (non-US companies)
 *
 * @see https://www.sec.gov/structureddata/osdinteractivedatatestsuite
 */

import type { SecFundamentalData, SecCompanyFactsResponse, SecFinancialFact } from './types';

// ============================================================================
// XBRL Concept Mappings
// ============================================================================

/**
 * Mapping of XBRL concepts to our data structure
 * Multiple concepts may map to the same field (companies use different taxonomy elements)
 */
const REVENUE_CONCEPTS = [
  'Revenues',
  'RevenueFromContractWithCustomerExcludingAssessedTax',
  'SalesRevenueNet',
  'SalesRevenueGoodsNet',
  'RevenueFromContractWithCustomerIncludingAssessedTax',
  'TotalRevenuesAndOtherIncome',
];

const NET_INCOME_CONCEPTS = [
  'NetIncomeLoss',
  'ProfitLoss',
  'NetIncomeLossAttributableToParent',
  'NetIncomeLossAvailableToCommonStockholdersBasic',
];

const OPERATING_INCOME_CONCEPTS = [
  'OperatingIncomeLoss',
  'IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest',
];

const GROSS_PROFIT_CONCEPTS = [
  'GrossProfit',
];

const RND_CONCEPTS = [
  'ResearchAndDevelopmentExpense',
  'ResearchAndDevelopmentExpenseExcludingAcquiredInProcessCost',
];

const TOTAL_ASSETS_CONCEPTS = [
  'Assets',
];

const CURRENT_ASSETS_CONCEPTS = [
  'AssetsCurrent',
];

const CASH_CONCEPTS = [
  'CashAndCashEquivalentsAtCarryingValue',
  'Cash',
  'CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents',
];

const TOTAL_LIABILITIES_CONCEPTS = [
  'Liabilities',
  'LiabilitiesAndStockholdersEquity', // Some companies report this way
];

const CURRENT_LIABILITIES_CONCEPTS = [
  'LiabilitiesCurrent',
];

const LONG_TERM_DEBT_CONCEPTS = [
  'LongTermDebt',
  'LongTermDebtNoncurrent',
  'LongTermDebtAndCapitalLeaseObligations',
];

const TOTAL_EQUITY_CONCEPTS = [
  'StockholdersEquity',
  'StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest',
];

const EPS_BASIC_CONCEPTS = [
  'EarningsPerShareBasic',
];

const EPS_DILUTED_CONCEPTS = [
  'EarningsPerShareDiluted',
];

const SHARES_OUTSTANDING_CONCEPTS = [
  'CommonStockSharesOutstanding',
  'EntityCommonStockSharesOutstanding', // dei namespace
  'WeightedAverageNumberOfSharesOutstandingBasic',
];

const SHARES_DILUTED_CONCEPTS = [
  'WeightedAverageNumberOfDilutedSharesOutstanding',
];

// ============================================================================
// Parser Functions
// ============================================================================

/**
 * Parse SEC EDGAR Company Facts (XBRL) into structured data
 */
export function parseXbrlFacts(data: SecCompanyFactsResponse): SecFundamentalData {
  const result: SecFundamentalData = {
    fiscalYearEnd: '',
    lastFilingDate: '',
    lastFilingType: '',
    dataSource: 'SEC-EDGAR',
  };

  const facts = data.facts;
  if (!facts) return result;

  // Get us-gaap and dei namespaces
  const usGaap = facts['us-gaap'] || {};
  const dei = facts['dei'] || {};

  // Parse each category
  result.revenue = findMostRecentValue(usGaap, REVENUE_CONCEPTS, 'FY');
  result.netIncome = findMostRecentValue(usGaap, NET_INCOME_CONCEPTS, 'FY');
  result.operatingIncome = findMostRecentValue(usGaap, OPERATING_INCOME_CONCEPTS, 'FY');
  result.grossProfit = findMostRecentValue(usGaap, GROSS_PROFIT_CONCEPTS, 'FY');
  result.researchAndDevelopment = findMostRecentValue(usGaap, RND_CONCEPTS, 'FY');

  result.totalAssets = findMostRecentValue(usGaap, TOTAL_ASSETS_CONCEPTS, 'FY');
  result.currentAssets = findMostRecentValue(usGaap, CURRENT_ASSETS_CONCEPTS, 'FY');
  result.cash = findMostRecentValue(usGaap, CASH_CONCEPTS, 'FY');

  result.totalLiabilities = findMostRecentValue(usGaap, TOTAL_LIABILITIES_CONCEPTS, 'FY');
  result.currentLiabilities = findMostRecentValue(usGaap, CURRENT_LIABILITIES_CONCEPTS, 'FY');
  result.longTermDebt = findMostRecentValue(usGaap, LONG_TERM_DEBT_CONCEPTS, 'FY');

  result.totalEquity = findMostRecentValue(usGaap, TOTAL_EQUITY_CONCEPTS, 'FY');

  result.epsBasic = findMostRecentValue(usGaap, EPS_BASIC_CONCEPTS, 'FY');
  result.epsDiluted = findMostRecentValue(usGaap, EPS_DILUTED_CONCEPTS, 'FY');

  // Shares - try both us-gaap and dei
  result.sharesOutstanding = findMostRecentValue(usGaap, SHARES_OUTSTANDING_CONCEPTS, 'FY')
    || findMostRecentValue(dei, ['EntityCommonStockSharesOutstanding'], 'FY');
  result.sharesOutstandingDiluted = findMostRecentValue(usGaap, SHARES_DILUTED_CONCEPTS, 'FY');

  // Set EPS (prefer diluted, fallback to basic)
  result.eps = result.epsDiluted ?? result.epsBasic;

  // Calculate derived ratios
  if (result.totalLiabilities && result.totalEquity && result.totalEquity !== 0) {
    result.debtToEquity = result.totalLiabilities / result.totalEquity;
  }

  if (result.currentAssets && result.currentLiabilities && result.currentLiabilities !== 0) {
    result.currentRatio = result.currentAssets / result.currentLiabilities;
  }

  if (result.netIncome && result.totalEquity && result.totalEquity !== 0) {
    result.returnOnEquity = result.netIncome / result.totalEquity;
  }

  if (result.netIncome && result.totalAssets && result.totalAssets !== 0) {
    result.returnOnAssets = result.netIncome / result.totalAssets;
  }

  // Get fiscal year end from dei facts
  const fiscalYearEndFact = dei['EntityFiscalYearEndDate'] || dei['CurrentFiscalYearEndDate'];
  if (fiscalYearEndFact?.units?.['']?.[0]?.val) {
    result.fiscalYearEnd = String(fiscalYearEndFact.units[''][0].val);
  }

  return result;
}

/**
 * Find the most recent value for a concept from annual filings
 */
function findMostRecentValue(
  facts: Record<string, SecFinancialFact>,
  concepts: string[],
  fiscalPeriod: 'FY' | 'Q1' | 'Q2' | 'Q3' | 'Q4'
): number | undefined {
  for (const concept of concepts) {
    const fact = facts[concept];
    if (!fact?.units) continue;

    const value = getMostRecentValue(fact, fiscalPeriod);
    if (value !== null) {
      return value;
    }
  }

  return undefined;
}

/**
 * Get most recent value for a specific fiscal period type
 */
function getMostRecentValue(fact: SecFinancialFact, fiscalPeriod: string): number | null {
  // Try USD first, then shares, then pure (ratios), then any other unit
  const units = fact.units;
  const values = units['USD'] || units['shares'] || units['pure'] || Object.values(units)[0];

  if (!values || values.length === 0) return null;

  // Filter to requested fiscal period and 10-K forms, sort by date descending
  const filtered = values
    .filter(v => {
      // Accept FY period or 10-K form
      if (fiscalPeriod === 'FY') {
        return v.fp === 'FY' || v.form === '10-K';
      }
      return v.fp === fiscalPeriod;
    })
    .sort((a, b) => {
      // Sort by end date descending (most recent first)
      const dateA = new Date(a.end).getTime();
      const dateB = new Date(b.end).getTime();
      return dateB - dateA;
    });

  return filtered[0]?.val ?? null;
}

/**
 * Get all values for a concept over time (for trend analysis)
 */
export function getHistoricalValues(
  data: SecCompanyFactsResponse,
  concept: string,
  namespace: 'us-gaap' | 'dei' = 'us-gaap',
  limit: number = 5
): Array<{ value: number; period: string; filed: string }> {
  const facts = data.facts?.[namespace]?.[concept];
  if (!facts?.units) return [];

  const values = facts.units['USD'] || facts.units['shares'] || Object.values(facts.units)[0];
  if (!values) return [];

  // Filter to annual values and sort by date
  return values
    .filter(v => v.fp === 'FY' || v.form === '10-K')
    .sort((a, b) => new Date(b.end).getTime() - new Date(a.end).getTime())
    .slice(0, limit)
    .map(v => ({
      value: v.val,
      period: v.end,
      filed: v.filed,
    }));
}

/**
 * Get quarterly values for a concept (for recent performance)
 */
export function getQuarterlyValues(
  data: SecCompanyFactsResponse,
  concept: string,
  limit: number = 4
): Array<{ value: number; period: string; quarter: string }> {
  const facts = data.facts?.['us-gaap']?.[concept];
  if (!facts?.units) return [];

  const values = facts.units['USD'] || facts.units['shares'] || Object.values(facts.units)[0];
  if (!values) return [];

  // Filter to quarterly values
  return values
    .filter(v => ['Q1', 'Q2', 'Q3', 'Q4'].includes(v.fp))
    .sort((a, b) => new Date(b.end).getTime() - new Date(a.end).getTime())
    .slice(0, limit)
    .map(v => ({
      value: v.val,
      period: v.end,
      quarter: v.fp,
    }));
}

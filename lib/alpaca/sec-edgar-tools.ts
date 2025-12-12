/**
 * SEC EDGAR Tools for AI Research Agents
 *
 * Extends the existing 8 Alpaca tools with 3 SEC-specific tools:
 * 9. get_10k_data - Latest 10-K annual report data
 * 10. get_company_filings - Recent SEC filings list
 * 11. get_rnd_spending - R&D spending analysis (biotech/pharma)
 *
 * These tools are particularly useful for:
 * - Obscure small-cap stocks with sparse Yahoo Finance data
 * - Biotech/pharma companies (R&D spending is key metric)
 * - Deep fundamental analysis beyond price data
 *
 * SEC EDGAR API is FREE with no API key required.
 */

import { tool, Tool } from 'ai';
import { z } from 'zod';
import { secEdgarProvider, cikMapper } from '@/lib/data-providers/sec-edgar';

// TypeScript workaround for AI SDK v5 deep type inference
type AnyTool = Tool<any, any>;

function createTool(config: any): AnyTool {
  return tool(config) as unknown as AnyTool;
}

// ============================================================================
// Tool 9: Get 10-K Annual Report Data
// ============================================================================

/**
 * Tool 9: Get 10-K Annual Report Data
 * Fetches fundamental financial data from SEC EDGAR filings
 */
export const get10KDataTool: AnyTool = createTool({
  description:
    "Get financial data from the company's latest 10-K annual report filed with the SEC. " +
    'Returns revenue, net income, total assets, liabilities, cash, debt, and key financial ratios. ' +
    'Use this for comprehensive fundamental analysis, especially for obscure stocks where Yahoo Finance data is sparse. ' +
    'This uses official SEC EDGAR data (free, no API key required).',
  inputSchema: z.object({
    symbol: z.string().describe('Stock ticker symbol (e.g., RLMD, AAPL, TSLA)'),
  }),
  execute: async ({ symbol }: { symbol: string }) => {
    try {
      const fundamentals = await secEdgarProvider.fetchFundamentals(symbol.toUpperCase());

      if (!fundamentals) {
        return {
          symbol: symbol.toUpperCase(),
          error: `No SEC EDGAR data found for ${symbol}. This stock may not be a US public company, or may not have filed 10-K reports.`,
          success: false,
        };
      }

      return {
        symbol: symbol.toUpperCase(),
        dataSource: 'SEC EDGAR 10-K/10-Q',

        // Income Statement
        revenue: fundamentals.revenue,
        revenueFormatted: formatCurrency(fundamentals.revenue),
        netIncome: fundamentals.netIncome,
        netIncomeFormatted: formatCurrency(fundamentals.netIncome),
        operatingIncome: fundamentals.operatingIncome,

        // Balance Sheet
        totalAssets: fundamentals.totalAssets,
        totalAssetsFormatted: formatCurrency(fundamentals.totalAssets),
        totalLiabilities: fundamentals.totalLiabilities,
        totalEquity: fundamentals.totalEquity,
        cash: fundamentals.cash,
        cashFormatted: formatCurrency(fundamentals.cash),
        longTermDebt: fundamentals.longTermDebt,

        // Per Share
        eps: fundamentals.eps,
        sharesOutstanding: fundamentals.sharesOutstanding,

        // Key Ratios
        debtToEquity: fundamentals.debtToEquity?.toFixed(2),
        currentRatio: fundamentals.currentRatio?.toFixed(2),
        returnOnEquity: fundamentals.returnOnEquity
          ? (fundamentals.returnOnEquity * 100).toFixed(1) + '%'
          : null,
        returnOnAssets: fundamentals.returnOnAssets
          ? (fundamentals.returnOnAssets * 100).toFixed(1) + '%'
          : null,

        // Metadata
        lastFilingDate: fundamentals.lastFilingDate,
        lastFilingType: fundamentals.lastFilingType,

        success: true,
      };
    } catch (error) {
      return {
        symbol: symbol.toUpperCase(),
        error: error instanceof Error ? error.message : 'Failed to fetch SEC data',
        success: false,
      };
    }
  },
});

// ============================================================================
// Tool 10: Get Recent SEC Filings
// ============================================================================

/**
 * Tool 10: Get Recent SEC Filings
 * Lists recent filings with links to full documents
 */
export const getCompanyFilingsTool: AnyTool = createTool({
  description:
    'Get list of recent SEC filings for a company (10-K, 10-Q, 8-K, etc.). ' +
    'Use this to find recent material events, earnings reports, or corporate announcements. ' +
    '10-K = Annual report, 10-Q = Quarterly report, 8-K = Material event (merger, CFO change, etc).',
  inputSchema: z.object({
    symbol: z.string().describe('Stock ticker symbol'),
    limit: z
      .number()
      .min(1)
      .max(20)
      .default(5)
      .describe('Number of filings to return (1-20, default 5)'),
  }),
  execute: async ({ symbol, limit }: { symbol: string; limit: number }) => {
    try {
      const cik = await cikMapper.getCik(symbol.toUpperCase());

      if (!cik) {
        return {
          symbol: symbol.toUpperCase(),
          error: `No CIK found for ${symbol}. This stock may not be a US public company.`,
          success: false,
        };
      }

      const filings = await secEdgarProvider.fetchRecentFilings(cik, limit);

      if (filings.length === 0) {
        return {
          symbol: symbol.toUpperCase(),
          cik,
          error: 'No recent filings found',
          success: false,
        };
      }

      return {
        symbol: symbol.toUpperCase(),
        cik,
        filings: filings.map(f => ({
          form: f.form,
          filingDate: f.filingDate,
          reportDate: f.reportDate,
          description: f.description || getFormDescription(f.form),
          // Direct link to SEC EDGAR filing
          documentUrl:
            `https://www.sec.gov/Archives/edgar/data/${parseInt(cik)}/` +
            `${f.accessionNumber.replace(/-/g, '')}/${f.primaryDocument}`,
        })),
        count: filings.length,
        success: true,
      };
    } catch (error) {
      return {
        symbol: symbol.toUpperCase(),
        error: error instanceof Error ? error.message : 'Failed to fetch filings',
        success: false,
      };
    }
  },
});

// ============================================================================
// Tool 11: Get R&D Spending (Biotech/Pharma Focus)
// ============================================================================

/**
 * Tool 11: Get R&D Spending
 * Critical metric for biotech and pharma companies
 */
export const getRnDSpendingTool: AnyTool = createTool({
  description:
    'Get Research & Development spending from SEC filings. ' +
    'Critical for biotech and pharma companies where R&D is the primary value driver. ' +
    'Returns R&D spending, R&D as % of revenue, and interpretation of R&D intensity.',
  inputSchema: z.object({
    symbol: z.string().describe('Stock ticker symbol'),
  }),
  execute: async ({ symbol }: { symbol: string }) => {
    try {
      const fundamentals = await secEdgarProvider.fetchFundamentals(symbol.toUpperCase());

      if (!fundamentals) {
        return {
          symbol: symbol.toUpperCase(),
          error: `No SEC data found for ${symbol}`,
          success: false,
        };
      }

      const rnd = fundamentals.researchAndDevelopment;
      const revenue = fundamentals.revenue;

      // Calculate R&D as % of revenue (key biotech metric)
      let rndRatio: string | null = null;
      if (rnd != null && revenue != null && revenue > 0) {
        rndRatio = ((rnd / revenue) * 100).toFixed(1) + '%';
      }

      // Interpret R&D intensity
      let interpretation = 'Unable to calculate R&D ratio';
      if (rndRatio) {
        const ratioValue = parseFloat(rndRatio);
        if (ratioValue > 100) {
          interpretation =
            'Extremely high R&D focus - Pre-revenue biotech/pharma spending heavily on development';
        } else if (ratioValue > 50) {
          interpretation =
            'Very high R&D focus - Typical for early-stage biotech, may have limited commercial products';
        } else if (ratioValue > 30) {
          interpretation = 'High R&D investment - Strong focus on innovation and pipeline development';
        } else if (ratioValue > 15) {
          interpretation = 'Significant R&D investment - Balanced between R&D and commercial operations';
        } else if (ratioValue > 5) {
          interpretation = 'Moderate R&D spending - More mature company with established products';
        } else {
          interpretation = 'Low R&D spending - May be a value/dividend company or non-tech sector';
        }
      }

      // Check if company has no revenue (common for pre-commercial biotech)
      const isPreRevenue = revenue == null || revenue <= 0;

      return {
        symbol: symbol.toUpperCase(),
        researchAndDevelopment: rnd,
        rndFormatted: formatCurrency(rnd),
        revenue: revenue,
        revenueFormatted: formatCurrency(revenue),
        rndAsPercentOfRevenue: rndRatio,
        isPreRevenue,
        interpretation,

        // Additional context for biotech
        cashPosition: fundamentals.cash,
        cashFormatted: formatCurrency(fundamentals.cash),
        burnRateContext: isPreRevenue && rnd && fundamentals.cash
          ? `At current R&D spending, cash runway: ~${Math.floor(fundamentals.cash / rnd)} years`
          : null,

        success: true,
      };
    } catch (error) {
      return {
        symbol: symbol.toUpperCase(),
        error: error instanceof Error ? error.message : 'Failed to fetch R&D data',
        success: false,
      };
    }
  },
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format currency for display
 */
function formatCurrency(value: number | undefined): string {
  if (value === undefined || value === null) return 'N/A';
  if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (Math.abs(value) >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
  return `$${value.toLocaleString()}`;
}

/**
 * Get human-readable description for SEC form types
 */
function getFormDescription(form: string): string {
  const descriptions: Record<string, string> = {
    '10-K': 'Annual Report',
    '10-Q': 'Quarterly Report',
    '8-K': 'Current Report (Material Event)',
    '10-K/A': 'Amended Annual Report',
    '10-Q/A': 'Amended Quarterly Report',
    'DEF 14A': 'Proxy Statement',
    'S-1': 'Registration Statement',
    '4': 'Insider Trading Report',
    '13F-HR': 'Institutional Holdings',
  };
  return descriptions[form] || form;
}

// ============================================================================
// Export SEC Tools
// ============================================================================

/**
 * SEC EDGAR tools object for merging with Alpaca tools
 */
export const secEdgarTools = {
  get_10k_data: get10KDataTool,
  get_company_filings: getCompanyFilingsTool,
  get_rnd_spending: getRnDSpendingTool,
};

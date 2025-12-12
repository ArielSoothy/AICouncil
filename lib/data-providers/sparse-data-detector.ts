/**
 * Sparse Data Detector
 *
 * Determines when Yahoo Finance data is insufficient and SEC EDGAR
 * fallback should be triggered.
 *
 * Sparse Data Indicators:
 * 1. Missing P/E ratio (null or undefined)
 * 2. Missing EPS (null or undefined)
 * 3. Missing market cap (null or undefined)
 * 4. No news articles returned
 * 5. Very low trading volume (< 10,000 daily average)
 * 6. Missing analyst data (target price, recommendation)
 *
 * Completeness Score: 0-100
 * - >= 80: Use as-is (Yahoo data sufficient)
 * - 50-79: Enhance with SEC (supplement missing fundamentals)
 * - < 50: SEC-only (Yahoo data too sparse for reliable analysis)
 */

import type { SharedTradingData } from './types';
import type { SparseDataResult } from './sec-edgar/types';

// ============================================================================
// Field Weights Configuration
// ============================================================================

/**
 * Weights for each data field (sums to 100)
 * Higher weights = more important fields
 */
const FIELD_WEIGHTS: Record<string, { weight: number; critical: boolean }> = {
  // Essential - must have for any analysis
  price: { weight: 15, critical: true },
  volume: { weight: 10, critical: false },

  // Key fundamentals
  pe: { weight: 12, critical: false },
  eps: { weight: 12, critical: false },
  marketCap: { weight: 10, critical: false },

  // Market sentiment
  news: { weight: 8, critical: false },
  targetPrice: { weight: 8, critical: false },
  recommendation: { weight: 5, critical: false },

  // Secondary metrics
  dividendYield: { weight: 5, critical: false },
  beta: { weight: 5, critical: false },
  earningsDate: { weight: 5, critical: false },

  // Technical analysis prerequisites
  priceHistory: { weight: 5, critical: false },
};

// ============================================================================
// Detection Functions
// ============================================================================

/**
 * Analyze market data for sparseness
 *
 * @param data - SharedTradingData from Yahoo Finance
 * @returns SparseDataResult with completeness score and recommendation
 */
export function detectSparseData(data: SharedTradingData): SparseDataResult {
  const sparseFields: string[] = [];
  let totalWeight = 0;
  let achievedWeight = 0;

  // Check each field
  const checks = getFieldChecks(data);

  // Calculate completeness score
  for (const [field, config] of Object.entries(FIELD_WEIGHTS)) {
    totalWeight += config.weight;

    const check = checks[field];
    if (check === true) {
      achievedWeight += config.weight;
    } else {
      sparseFields.push(field);
    }
  }

  const completenessScore = Math.round((achievedWeight / totalWeight) * 100);

  // Determine recommendation
  let recommendation: SparseDataResult['recommendation'];

  if (completenessScore >= 80) {
    recommendation = 'use-as-is';
  } else if (completenessScore >= 50) {
    recommendation = 'enhance-with-sec';
  } else {
    recommendation = 'sec-only';
  }

  // Special case: No price data means we NEED a fallback
  if (!checks.price) {
    recommendation = 'sec-only';
  }

  return {
    isSparse: completenessScore < 80,
    sparseFields,
    completenessScore,
    recommendation,
  };
}

/**
 * Get check results for each field
 */
function getFieldChecks(data: SharedTradingData): Record<string, boolean> {
  return {
    price: data.quote?.price != null && data.quote.price > 0,
    volume: data.quote?.volume != null && data.quote.volume >= 10000,
    pe: data.fundamentals?.pe != null,
    eps: data.fundamentals?.eps != null,
    marketCap: data.fundamentals?.marketCap != null,
    news: (data.news?.length || 0) > 0,
    targetPrice: data.fundamentals?.targetPrice != null,
    recommendation: data.fundamentals?.recommendationKey != null,
    dividendYield: data.fundamentals?.dividendYield != null,
    beta: data.fundamentals?.beta != null,
    earningsDate: data.fundamentals?.earningsDate != null,
    priceHistory: (data.bars?.length || 0) >= 20,
  };
}

/**
 * Quick check - is data too sparse for reliable analysis?
 *
 * @param data - SharedTradingData from Yahoo Finance
 * @returns true if data completeness is below 80%
 */
export function isDataTooSparse(data: SharedTradingData): boolean {
  const result = detectSparseData(data);
  return result.isSparse;
}

/**
 * Check if fundamental data specifically is sparse
 * (triggers SEC EDGAR fetch)
 *
 * @param data - SharedTradingData from Yahoo Finance
 * @returns true if 2+ critical fundamental fields are missing
 */
export function isFundamentalDataSparse(data: SharedTradingData): boolean {
  const fundamentals = data.fundamentals;

  // If no fundamentals at all, definitely sparse
  if (!fundamentals) return true;

  // Check key fundamental fields
  const criticalFields = [
    fundamentals.pe,
    fundamentals.eps,
    fundamentals.marketCap,
  ];

  const missingCritical = criticalFields.filter(f => f == null).length;

  // If 2+ critical fields missing, consider sparse
  return missingCritical >= 2;
}

/**
 * Get human-readable summary of sparse data analysis
 */
export function getSparseDataSummary(data: SharedTradingData): string {
  const result = detectSparseData(data);

  const lines = [
    `Data Completeness: ${result.completenessScore}%`,
    `Status: ${result.isSparse ? '⚠️ Sparse' : '✅ Complete'}`,
    `Recommendation: ${result.recommendation}`,
  ];

  if (result.sparseFields.length > 0) {
    lines.push(`Missing Fields: ${result.sparseFields.join(', ')}`);
  }

  return lines.join('\n');
}

/**
 * Determine if SEC EDGAR fallback should be triggered
 *
 * @param data - SharedTradingData from Yahoo Finance
 * @returns true if SEC EDGAR should be used to enhance data
 */
export function shouldTriggerSecFallback(data: SharedTradingData): boolean {
  const result = detectSparseData(data);
  return result.recommendation === 'enhance-with-sec' || result.recommendation === 'sec-only';
}

// ============================================================================
// Exports
// ============================================================================

export type { SparseDataResult };

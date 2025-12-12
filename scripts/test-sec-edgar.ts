/**
 * Test Script for SEC EDGAR Integration
 *
 * Tests:
 * 1. CIK Mapper - Can map RLMD ticker to CIK
 * 2. SEC EDGAR Provider - Can fetch fundamentals
 * 3. Sparse Data Detector - Can detect sparse Yahoo data
 * 4. Data Enhancer - Can enhance sparse data with SEC
 *
 * Run: npx tsx scripts/test-sec-edgar.ts
 */

import { cikMapper } from '../lib/data-providers/sec-edgar/cik-mapper';
import { secEdgarProvider } from '../lib/data-providers/sec-edgar/sec-edgar-provider';
import { detectSparseData } from '../lib/data-providers/sparse-data-detector';
import type { SharedTradingData } from '../lib/data-providers/types';

async function testSECEdgar() {
  console.log('='.repeat(60));
  console.log('SEC EDGAR Integration Test');
  console.log('='.repeat(60));

  // Test 1: CIK Mapper
  console.log('\n📋 Test 1: CIK Mapper');
  console.log('-'.repeat(40));

  const testTickers = ['AAPL', 'RLMD', 'TSLA', 'INVALID123'];

  for (const ticker of testTickers) {
    const cik = await cikMapper.getCik(ticker);
    console.log(`  ${ticker}: ${cik || 'NOT FOUND'}`);
  }

  console.log(`  Cache size: ${cikMapper.getCacheSize()} tickers`);

  // Test 2: SEC EDGAR Provider - Fetch fundamentals for RLMD
  console.log('\n📊 Test 2: SEC EDGAR Provider - RLMD');
  console.log('-'.repeat(40));

  const rlmdFundamentals = await secEdgarProvider.fetchFundamentals('RLMD');

  if (rlmdFundamentals) {
    console.log('  ✅ Successfully fetched RLMD fundamentals:');
    console.log(`     Revenue: ${formatCurrency(rlmdFundamentals.revenue)}`);
    console.log(`     Net Income: ${formatCurrency(rlmdFundamentals.netIncome)}`);
    console.log(`     R&D Spending: ${formatCurrency(rlmdFundamentals.researchAndDevelopment)}`);
    console.log(`     Total Assets: ${formatCurrency(rlmdFundamentals.totalAssets)}`);
    console.log(`     Cash: ${formatCurrency(rlmdFundamentals.cash)}`);
    console.log(`     EPS: ${rlmdFundamentals.eps?.toFixed(2) ?? 'N/A'}`);
    console.log(`     Debt/Equity: ${rlmdFundamentals.debtToEquity?.toFixed(2) ?? 'N/A'}`);
    console.log(`     Last Filing: ${rlmdFundamentals.lastFilingType} on ${rlmdFundamentals.lastFilingDate}`);
  } else {
    console.log('  ❌ Failed to fetch RLMD fundamentals');
  }

  // Test 3: SEC EDGAR Provider - Fetch fundamentals for AAPL (comparison)
  console.log('\n📊 Test 3: SEC EDGAR Provider - AAPL (comparison)');
  console.log('-'.repeat(40));

  const aaplFundamentals = await secEdgarProvider.fetchFundamentals('AAPL');

  if (aaplFundamentals) {
    console.log('  ✅ Successfully fetched AAPL fundamentals:');
    console.log(`     Revenue: ${formatCurrency(aaplFundamentals.revenue)}`);
    console.log(`     Net Income: ${formatCurrency(aaplFundamentals.netIncome)}`);
    console.log(`     EPS: ${aaplFundamentals.eps?.toFixed(2) ?? 'N/A'}`);
  } else {
    console.log('  ❌ Failed to fetch AAPL fundamentals');
  }

  // Test 4: Sparse Data Detector
  console.log('\n🔍 Test 4: Sparse Data Detector');
  console.log('-'.repeat(40));

  // Simulate sparse Yahoo data for RLMD
  const sparseRLMDData: SharedTradingData = {
    symbol: 'RLMD',
    timestamp: new Date().toISOString(),
    quote: { price: 2.50, volume: 5000, bid: 2.49, ask: 2.51, spread: 0.02, timestamp: new Date().toISOString() },
    technical: {
      rsi: 50, rsiSignal: 'Neutral',
      macd: { MACD: 0, signal: 0, histogram: 0, trend: 'Neutral' },
      ema20: 2.50, sma50: 2.50, sma200: 2.50,
      bollingerBands: { upper: 2.60, middle: 2.50, lower: 2.40, position: 'Within Bands' }
    },
    levels: { support: 2.00, resistance: 3.00, yearHigh: 5.00, yearLow: 1.00, month30High: 3.00, month30Low: 2.00 },
    news: [], // No news
    bars: [],
    trend: { direction: 'Sideways', strength: 'Weak', analysis: 'No clear trend' },
    // Missing fundamentals - this is what triggers SEC fallback
    fundamentals: undefined
  };

  const sparseResult = detectSparseData(sparseRLMDData);
  console.log(`  RLMD (simulated sparse data):`);
  console.log(`     Completeness: ${sparseResult.completenessScore}%`);
  console.log(`     Is Sparse: ${sparseResult.isSparse ? '⚠️ YES' : '✅ NO'}`);
  console.log(`     Missing Fields: ${sparseResult.sparseFields.join(', ')}`);
  console.log(`     Recommendation: ${sparseResult.recommendation}`);

  // Simulate complete Yahoo data for AAPL
  const completeAAPLData: SharedTradingData = {
    symbol: 'AAPL',
    timestamp: new Date().toISOString(),
    quote: { price: 190.50, volume: 50000000, bid: 190.49, ask: 190.51, spread: 0.02, timestamp: new Date().toISOString() },
    technical: {
      rsi: 55, rsiSignal: 'Neutral',
      macd: { MACD: 1.5, signal: 1.2, histogram: 0.3, trend: 'Bullish' },
      ema20: 188.00, sma50: 185.00, sma200: 175.00,
      bollingerBands: { upper: 195.00, middle: 188.00, lower: 181.00, position: 'Within Bands' }
    },
    levels: { support: 180.00, resistance: 200.00, yearHigh: 198.00, yearLow: 150.00, month30High: 195.00, month30Low: 182.00 },
    news: [{ headline: 'Apple announces new product', summary: 'Summary', source: 'Reuters', timestamp: new Date().toISOString(), url: 'http://example.com' }],
    bars: Array(30).fill({ date: '2024-01-01', open: 190, high: 191, low: 189, close: 190, volume: 50000000 }),
    trend: { direction: 'Uptrend', strength: 'Moderate', analysis: 'Trending up' },
    fundamentals: {
      pe: 28.5, forwardPe: 25.0, pegRatio: 1.5, priceToBook: 45.0,
      eps: 6.68, epsForward: 7.20, marketCap: 3000000000000, avgVolume: 50000000,
      sharesOutstanding: 15500000000, dividendYield: 0.5, dividendRate: 0.96,
      beta: 1.2, earningsDate: '2024-02-01', exDividendDate: '2024-01-15',
      fiftyTwoWeekHigh: 198.00, fiftyTwoWeekLow: 150.00, fiftyTwoWeekChange: 25.0,
      targetPrice: 210.00, recommendationKey: 'buy'
    }
  };

  const completeResult = detectSparseData(completeAAPLData);
  console.log(`\n  AAPL (complete data):`);
  console.log(`     Completeness: ${completeResult.completenessScore}%`);
  console.log(`     Is Sparse: ${completeResult.isSparse ? '⚠️ YES' : '✅ NO'}`);
  console.log(`     Recommendation: ${completeResult.recommendation}`);

  // Test 5: Get recent filings for RLMD
  console.log('\n📁 Test 5: Recent SEC Filings - RLMD');
  console.log('-'.repeat(40));

  const rlmdCik = await cikMapper.getCik('RLMD');
  if (rlmdCik) {
    const filings = await secEdgarProvider.fetchRecentFilings(rlmdCik, 5);
    console.log(`  Found ${filings.length} recent filings:`);
    for (const filing of filings) {
      console.log(`     ${filing.form} - ${filing.filingDate} - ${filing.description || 'No description'}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ All tests completed!');
  console.log('='.repeat(60));
}

function formatCurrency(value: number | undefined): string {
  if (value === undefined) return 'N/A';
  if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return `$${value.toLocaleString()}`;
}

// Run tests
testSECEdgar().catch(console.error);

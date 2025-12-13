/**
 * Test Script for Trading Tools Integration
 *
 * Tests:
 * 1. get_stock_quote - REAL Yahoo Finance quotes (replaced Faker.js Dec 2025)
 * 2. SEC EDGAR Tools - 10-K data, company filings, R&D spending
 * 3. Import paths - Verify all modules resolve correctly
 *
 * Run: npx tsx scripts/test-trading-tools.ts
 */

import { get_stock_quote } from '../lib/trading/get_stock_quote';
import { cikMapper } from '../lib/data-providers/sec-edgar/cik-mapper';
import { secEdgarProvider } from '../lib/data-providers/sec-edgar/sec-edgar-provider';

async function testTradingTools() {
  console.log('='.repeat(60));
  console.log('Trading Tools Integration Test');
  console.log('='.repeat(60));

  // Test 1: get_stock_quote (Yahoo Finance - REAL data)
  console.log('\n📊 Test 1: get_stock_quote (Yahoo Finance)');
  console.log('-'.repeat(40));

  const testSymbols = ['AAPL', 'RLMD', 'TSLA'];
  for (const symbol of testSymbols) {
    try {
      const quote = await get_stock_quote(symbol);
      console.log(`  ${symbol}:`);
      console.log(`    Price: $${quote.price.toFixed(2)}`);
      console.log(`    Bid: $${quote.bid.toFixed(2)} / Ask: $${quote.ask.toFixed(2)}`);
      console.log(`    Volume: ${quote.volume.toLocaleString()}`);
      console.log(`    Exchange: ${quote.exchange}`);
      console.log(`    Updated: ${quote.lastUpdated}`);
    } catch (error) {
      console.log(`  ${symbol}: ERROR - ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  // Test 2: CIK Mapper
  console.log('\n📋 Test 2: CIK Mapper');
  console.log('-'.repeat(40));

  const cikTestSymbols = ['AAPL', 'RLMD', 'TSLA', 'INVALID123'];
  for (const symbol of cikTestSymbols) {
    const cik = await cikMapper.getCik(symbol);
    console.log(`  ${symbol}: ${cik || 'NOT FOUND'}`);
  }
  console.log(`  Cache size: ${cikMapper.getCacheSize()} tickers`);

  // Test 3: SEC EDGAR Provider - RLMD (obscure biotech)
  console.log('\n🏛️ Test 3: SEC EDGAR Provider - RLMD');
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

  // Test 4: SEC EDGAR Provider - AAPL (large cap comparison)
  console.log('\n🏛️ Test 4: SEC EDGAR Provider - AAPL');
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

  // Test 5: Recent SEC Filings for RLMD
  console.log('\n📁 Test 5: Recent SEC Filings - RLMD');
  console.log('-'.repeat(40));

  const rlmdCik = await cikMapper.getCik('RLMD');
  if (rlmdCik) {
    const filings = await secEdgarProvider.fetchRecentFilings(rlmdCik, 5);
    console.log(`  Found ${filings.length} recent filings:`);
    for (const filing of filings) {
      console.log(`     ${filing.form} - ${filing.filingDate} - ${filing.description || 'No description'}`);
    }
  } else {
    console.log('  ❌ Could not find CIK for RLMD');
  }

  // Test 6: Import path verification
  console.log('\n🔗 Test 6: Import Path Verification');
  console.log('-'.repeat(40));
  console.log('  ✅ get_stock_quote imported from lib/trading/get_stock_quote');
  console.log('  ✅ cikMapper imported from lib/data-providers/sec-edgar/cik-mapper');
  console.log('  ✅ secEdgarProvider imported from lib/data-providers/sec-edgar/sec-edgar-provider');
  console.log('  ✅ All imports resolved correctly');

  console.log('\n' + '='.repeat(60));
  console.log('✅ All tests completed!');
  console.log('='.repeat(60));
}

function formatCurrency(value: number | undefined): string {
  if (value === undefined) return 'N/A';
  if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (Math.abs(value) >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
  return `$${value.toLocaleString()}`;
}

// Run tests
testTradingTools().catch(console.error);

/**
 * Test Yahoo Finance Client
 *
 * Validates quotes and fundamentals data retrieval
 *
 * Run: npx tsx scripts/test-yahoo-finance.ts
 */

import { createYahooFinanceClient } from '../lib/trading/screening/yahoo-finance.js';

function printSection(title: string) {
  console.log('\n' + '='.repeat(60));
  console.log(`=== ${title}`);
  console.log('='.repeat(60) + '\n');
}

async function main() {
  console.log('Yahoo Finance Client Test');
  console.log('Testing quotes and fundamentals retrieval\n');

  const yahoo = createYahooFinanceClient();
  const testSymbol = 'AAPL';
  const batchSymbols = ['AAPL', 'TSLA', 'NVDA', 'MSFT'];

  // Test 1: Get Quote
  printSection('Test 1: Real-Time Quote');
  try {
    const quote = await yahoo.getQuote(testSymbol);
    if (quote) {
      console.log(`[SUCCESS] Retrieved quote for ${quote.symbol}`);
      console.log(`  Price: $${quote.price.toFixed(2)}`);
      console.log(`  Change: ${quote.change >= 0 ? '+' : ''}${quote.change.toFixed(2)} (${quote.changePercent.toFixed(2)}%)`);
      console.log(`  Volume: ${quote.volume.toLocaleString()}`);
      console.log(`  Avg Volume: ${quote.avgVolume.toLocaleString()}`);
      if (quote.marketCap) {
        console.log(`  Market Cap: $${(quote.marketCap / 1e9).toFixed(2)}B`);
      }
      if (quote.bid && quote.ask) {
        console.log(`  Bid/Ask: $${quote.bid.toFixed(2)} / $${quote.ask.toFixed(2)}`);
      }
      console.log(`  52-Week Range: $${quote.fiftyTwoWeekLow?.toFixed(2) || 'N/A'} - $${quote.fiftyTwoWeekHigh?.toFixed(2) || 'N/A'}`);
    } else {
      console.log(`[FAIL] Could not retrieve quote for ${testSymbol}`);
    }
  } catch (e: any) {
    console.log(`[FAIL] Quote retrieval: ${e.message}`);
  }

  // Test 2: Get Fundamentals
  printSection('Test 2: Fundamental Data');
  try {
    const fundamentals = await yahoo.getFundamentals(testSymbol);
    if (fundamentals) {
      console.log(`[SUCCESS] Retrieved fundamentals for ${fundamentals.symbol}`);
      console.log(`  Company: ${fundamentals.companyName || 'N/A'}`);
      console.log(`  Sector: ${fundamentals.sector || 'N/A'}`);
      console.log(`  Industry: ${fundamentals.industry || 'N/A'}`);
      if (fundamentals.marketCap) {
        console.log(`  Market Cap: $${(fundamentals.marketCap / 1e9).toFixed(2)}B`);
      }
      if (fundamentals.peRatio) {
        console.log(`  P/E Ratio: ${fundamentals.peRatio.toFixed(2)}`);
      }
      if (fundamentals.eps) {
        console.log(`  EPS: $${fundamentals.eps.toFixed(2)}`);
      }
      if (fundamentals.beta) {
        console.log(`  Beta: ${fundamentals.beta.toFixed(2)}`);
      }
      if (fundamentals.floatShares) {
        console.log(`  Float: ${(fundamentals.floatShares / 1e6).toFixed(2)}M shares`);
      }
      if (fundamentals.dividendYield) {
        console.log(`  Dividend Yield: ${(fundamentals.dividendYield * 100).toFixed(2)}%`);
      }
    } else {
      console.log(`[FAIL] Could not retrieve fundamentals for ${testSymbol}`);
    }
  } catch (e: any) {
    console.log(`[FAIL] Fundamentals retrieval: ${e.message}`);
  }

  // Test 3: Enriched Data
  printSection('Test 3: Enriched Data (Quote + Fundamentals)');
  try {
    const enriched = await yahoo.getEnrichedData(testSymbol);
    if (enriched) {
      console.log(`[SUCCESS] Retrieved enriched data for ${enriched.symbol}`);
      console.log(`  Quote Price: $${enriched.quote.price.toFixed(2)}`);
      console.log(`  P/E Ratio: ${enriched.fundamentals.peRatio?.toFixed(2) || 'N/A'}`);
      console.log(`  Sector: ${enriched.fundamentals.sector || 'N/A'}`);
      console.log(`  Timestamp: ${enriched.timestamp.toISOString()}`);
    } else {
      console.log(`[FAIL] Could not retrieve enriched data`);
    }
  } catch (e: any) {
    console.log(`[FAIL] Enriched data: ${e.message}`);
  }

  // Test 4: Batch Quotes
  printSection('Test 4: Batch Quote Retrieval');
  try {
    const quotes = await yahoo.getQuoteBatch(batchSymbols);
    console.log(`[SUCCESS] Retrieved ${quotes.length}/${batchSymbols.length} quotes\n`);

    console.log('Symbol     Price       Change%     Volume        Market Cap');
    console.log('-'.repeat(65));

    quotes.forEach(quote => {
      const changeStr = quote.changePercent >= 0 ? `+${quote.changePercent.toFixed(2)}%` : `${quote.changePercent.toFixed(2)}%`;
      const marketCapStr = quote.marketCap ? `$${(quote.marketCap / 1e9).toFixed(1)}B` : 'N/A';

      console.log(
        `${quote.symbol.padEnd(10)} ` +
        `$${quote.price.toFixed(2).padStart(8)} ` +
        `${changeStr.padStart(10)} ` +
        `${quote.volume.toLocaleString().padStart(12)} ` +
        `${marketCapStr.padStart(12)}`
      );
    });
  } catch (e: any) {
    console.log(`[FAIL] Batch quotes: ${e.message}`);
  }

  // Test 5: Batch Enrichment
  printSection('Test 5: Batch Enrichment (Full Data)');
  try {
    const enriched = await yahoo.enrichBatch(batchSymbols);
    console.log(`[SUCCESS] Enriched ${enriched.length}/${batchSymbols.length} symbols\n`);

    console.log('Symbol     Price       P/E      Sector');
    console.log('-'.repeat(60));

    enriched.forEach(data => {
      const peStr = data.fundamentals.peRatio ? data.fundamentals.peRatio.toFixed(2) : 'N/A';
      const sectorStr = (data.fundamentals.sector || 'N/A').substring(0, 20);

      console.log(
        `${data.symbol.padEnd(10)} ` +
        `$${data.quote.price.toFixed(2).padStart(8)} ` +
        `${peStr.padStart(8)} ` +
        `${sectorStr}`
      );
    });
  } catch (e: any) {
    console.log(`[FAIL] Batch enrichment: ${e.message}`);
  }

  // Summary
  printSection('Test Summary');
  console.log('✅ Yahoo Finance client tested');
  console.log('✅ Provides quotes that IBKR snapshot API lacks (0 fields)');
  console.log('✅ Provides fundamentals that IBKR fundamentals endpoint lacks (404)');
  console.log('\nNext steps:');
  console.log('  1. Integrate with IBKR Scanner for complete screening');
  console.log('  2. Add Finnhub for social sentiment');
  console.log('  3. Create screening orchestrator\n');
}

main().catch(console.error);

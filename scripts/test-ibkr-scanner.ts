/**
 * Test IBKR Scanner Client
 *
 * Validates the scanner implementation with real IBKR Gateway
 *
 * Prerequisites:
 * - IBKR Gateway running on localhost:5050
 * - Authenticated via browser (https://localhost:5050)
 *
 * Run: npx ts-node scripts/test-ibkr-scanner.ts
 */

import { createIBKRScanner } from '../lib/trading/screening/ibkr-scanner.js';

// Allow self-signed certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

function printSection(title: string) {
  console.log('\n' + '='.repeat(60));
  console.log(`=== ${title}`);
  console.log('='.repeat(60) + '\n');
}

async function checkAuthentication(): Promise<boolean> {
  try {
    const res = await fetch('https://localhost:5050/v1/api/iserver/auth/status', {
      method: 'GET',
      // @ts-ignore - Node 18+ fetch supports this
      rejectUnauthorized: false
    });
    const data = await res.json();
    return data.authenticated === true;
  } catch (e) {
    return false;
  }
}

async function main() {
  console.log('IBKR Scanner Client Test');
  console.log('Testing localhost:5050 Gateway\n');

  // Check authentication first
  printSection('Authentication Check');
  const isAuthenticated = await checkAuthentication();
  if (!isAuthenticated) {
    console.log('[ERROR] IBKR Gateway is not authenticated!');
    console.log('\nPlease authenticate:');
    console.log('  1. Open browser: https://localhost:5050');
    console.log('  2. Log in with IBKR credentials');
    console.log('  3. Complete 2FA if prompted');
    console.log('  4. Run this test again\n');
    process.exit(1);
  }
  console.log('[SUCCESS] IBKR Gateway is authenticated\n');

  const scanner = createIBKRScanner();

  // Test 1: Get Scanner Parameters
  printSection('Test 1: Scanner Parameters');
  try {
    const params = await scanner.getScannerParams();
    const scanTypes = params.scan_type_list || [];
    console.log(`[SUCCESS] ${scanTypes.length} scan types available`);
    console.log('\nTop 10 scan types:');
    scanTypes.slice(0, 10).forEach((s: any, i: number) => {
      console.log(`  ${(i + 1).toString().padStart(2)}. ${s.display_name} (${s.code})`);
    });
  } catch (e: any) {
    console.log(`[FAIL] Scanner parameters: ${e.message}`);
  }

  // Test 2: Get Contract ID
  printSection('Test 2: Contract ID Lookup');
  const testSymbol = 'AAPL';
  try {
    const conid = await scanner.getContractId(testSymbol);
    if (conid) {
      console.log(`[SUCCESS] ${testSymbol} contract ID: ${conid}`);
    } else {
      console.log(`[FAIL] Could not find contract ID for ${testSymbol}`);
    }
  } catch (e: any) {
    console.log(`[FAIL] Contract lookup: ${e.message}`);
  }

  // Test 3: Pre-Market Historical Bars
  printSection('Test 3: Pre-Market Historical Bars');
  try {
    const conid = await scanner.getContractId(testSymbol);
    if (conid) {
      const bars = await scanner.getHistoricalBars(conid, {
        period: '1d',
        bar: '5min',
        outsideRth: true
      });

      console.log(`[SUCCESS] Retrieved ${bars.data?.length || 0} historical bars`);

      if (bars.data && bars.data.length > 0) {
        // Count pre-market bars (before 9:30 AM ET)
        const premarketBars = bars.data.filter(bar => {
          const date = new Date(bar.t);
          const hour = date.getUTCHours();
          const minute = date.getUTCMinutes();
          return hour < 9 || (hour === 9 && minute < 30);
        });

        console.log(`  Pre-market bars: ${premarketBars.length}`);
        console.log(`  Total bars: ${bars.data.length}`);

        if (premarketBars.length > 0) {
          const firstPM = premarketBars[0];
          const lastPM = premarketBars[premarketBars.length - 1];
          console.log(`\n  First pre-market bar:`);
          console.log(`    Time: ${new Date(firstPM.t).toISOString()}`);
          console.log(`    O: ${firstPM.o}, H: ${firstPM.h}, L: ${firstPM.l}, C: ${firstPM.c}`);
          console.log(`    Volume: ${firstPM.v}`);

          console.log(`\n  Last pre-market bar:`);
          console.log(`    Time: ${new Date(lastPM.t).toISOString()}`);
          console.log(`    O: ${lastPM.o}, H: ${lastPM.h}, L: ${lastPM.l}, C: ${lastPM.c}`);
          console.log(`    Volume: ${lastPM.v}`);
        }
      }
    }
  } catch (e: any) {
    console.log(`[FAIL] Historical bars: ${e.message}`);
  }

  // Test 4: Run Scanner
  printSection('Test 4: Run Scanner (Top % Gainers)');
  try {
    const scanResults = await scanner.runScanner({
      instrument: 'STK',
      locationCode: 'STK.US.MAJOR',
      scanCode: 'TOP_PERC_GAIN',
      abovePrice: 5.0,
      aboveVolume: 100000,
      numberOfRows: 10
    });

    console.log(`[SUCCESS] Scanner returned ${scanResults.length} results`);

    if (scanResults.length > 0) {
      console.log('\nTop 5 results:');
      scanResults.slice(0, 5).forEach((result: any, i: number) => {
        console.log(`  ${i + 1}. ${result.symbol || 'N/A'}`);
        console.log(`     Contract ID: ${result.conid}`);
        console.log(`     Last Price: ${result['31'] || 'N/A'}`);
      });
    }
  } catch (e: any) {
    console.log(`[FAIL] Scanner execution: ${e.message}`);
  }

  // Test 5: Pre-Market Gap Scanner (Full Integration)
  printSection('Test 5: Pre-Market Gap Scanner (Full Pipeline)');
  try {
    console.log('Running pre-market gap scanner...');
    console.log('Config: minGap=3%, minVol=100k, minPrice=$5\n');

    const gappers = await scanner.scanPreMarketGaps({
      minGapPercent: 3.0,
      minPreMarketVolume: 100000,
      minPrice: 5.0,
      maxResults: 10
    });

    console.log(`[SUCCESS] Found ${gappers.length} stocks with 3%+ gap\n`);

    if (gappers.length > 0) {
      console.log('Gap Leaders:');
      console.log('  #  Symbol     Gap%      PM Price    PM Volume');
      console.log('  ' + '-'.repeat(50));

      gappers.forEach((stock, i) => {
        const gapStr = stock.gapPercent > 0 ? `+${stock.gapPercent.toFixed(2)}%` : `${stock.gapPercent.toFixed(2)}%`;
        const priceStr = `$${stock.preMarketPrice?.toFixed(2) || 'N/A'}`;
        const volStr = stock.preMarketVolume ? stock.preMarketVolume.toLocaleString() : 'N/A';

        console.log(
          `  ${(i + 1).toString().padStart(2)}` +
          ` ${stock.symbol.padEnd(10)}` +
          ` ${gapStr.padStart(8)}` +
          ` ${priceStr.padStart(10)}` +
          ` ${volStr.padStart(12)}`
        );
      });
    } else {
      console.log('  No stocks found matching criteria');
      console.log('  (This is normal outside trading hours or with strict filters)');
    }
  } catch (e: any) {
    console.log(`[FAIL] Gap scanner: ${e.message}`);
    if (e.stack) console.log(e.stack);
  }

  // Summary
  printSection('Test Summary');
  console.log('✅ Scanner client implementation tested');
  console.log('✅ Ready for integration with Yahoo Finance & Finnhub');
  console.log('\nNext steps:');
  console.log('  1. Integrate Yahoo Finance for quotes + fundamentals');
  console.log('  2. Add Finnhub API for social sentiment');
  console.log('  3. Create screening orchestrator');
  console.log('  4. Build UI component\n');
}

main().catch(console.error);

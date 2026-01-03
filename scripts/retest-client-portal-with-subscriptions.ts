/**
 * Re-Test IBKR Client Portal Snapshot API with NEW Market Data Subscriptions
 *
 * User just subscribed to:
 * - US Securities Snapshot Bundle ($10/mo)
 * - US Equity Streaming Add-on ($4.50/mo)
 *
 * The previous "0 fields" result might have been BEFORE these subscriptions!
 *
 * This script will re-test the snapshot API to see if we now get:
 * - Bid/Ask/Last Price (fields 31, 84, 86)
 * - Volume (field 87, 7762)
 * - Change/Change % (fields 82, 83)
 * - High/Low (fields 70, 71)
 * - Market Cap (field 7289)
 * - P/E Ratio (field 7290)
 * - EPS (field 7291)
 * - Shortable Shares (field 7636)
 * - Short Fee Rate (field 7637)
 * - And potentially ALL 100+ documented fields!
 *
 * Prerequisites:
 * - IBKR Gateway authenticated (https://localhost:5050)
 * - New market data subscriptions active
 *
 * Run: npx tsx scripts/retest-client-portal-with-subscriptions.ts
 */

import https from 'https';

// Allow self-signed certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// All documented field IDs from IBKR API docs
const ALL_FIELDS = [
  // Basic fields
  '31', // Last price
  '55', // Symbol
  '70', '71', // High, Low
  '82', '83', // Change, Change %
  '84', '85', '86', '87', '88', // Bid, Ask Size, Ask, Volume, Bid Size

  // Advanced market data
  '6004', // Exchange
  '6008', // Conid
  '6070', // SecType
  '7051', // Company name
  '7057', '7058', '7059', '7068', // Exchange data

  // Technical indicators
  '7084', '7085', '7086', // Implied Vol, Put/Call Interest, Put/Call Volume
  '7087', '7088', '7089', // Historical volatility

  // Volume & Stats
  '7282', // Average Volume (90 days)
  '7284', // Historic Volume (30d)
  '7285', // Put/Call Ratio
  '7762', // Volume Long (high precision)

  // Fundamentals
  '7286', '7287', '7288', // Dividend Amount, Yield, Ex-date
  '7289', // Market Cap
  '7290', // P/E
  '7291', // EPS
  '7293', '7294', // 52-week High/Low
  '7295', '7296', // Open, Close

  // Greeks (options)
  '7308', '7309', '7310', '7311', // Delta, Gamma, Theta, Vega

  // Industry/Sector
  '7280', // Industry
  '7281', // Category

  // Short selling - CRITICAL FOR PRE-MARKET SCREENING!
  '7636', // Shortable Shares
  '7637', // Fee Rate
  '7644', // Shortable difficulty

  // Technical EMAs
  '7674', '7675', '7676', '7677', // EMA 200, 100, 50, 20
  '7678', '7679', '7680', '7681', // Price/EMA ratios

  // Events (requires Wall Street Horizon subscription)
  '7683', '7684', '7685', '7686', '7687', // Upcoming events
  '7688', '7689', '7690', // Recent events

  // Other
  '7718', // Beta
  '7741', // Prior Close
  '7655', // Morningstar Rating
];

interface FieldMapping {
  [key: string]: string;
}

const FIELD_NAMES: FieldMapping = {
  '31': 'Last Price',
  '55': 'Symbol',
  '70': 'High',
  '71': 'Low',
  '82': 'Change',
  '83': 'Change %',
  '84': 'Bid',
  '85': 'Ask Size',
  '86': 'Ask',
  '87': 'Volume',
  '88': 'Bid Size',
  '7051': 'Company Name',
  '7282': 'Average Volume (90d)',
  '7284': 'Historic Volume (30d)',
  '7285': 'Put/Call Ratio',
  '7289': 'Market Cap',
  '7290': 'P/E',
  '7291': 'EPS',
  '7293': '52-Week High',
  '7294': '52-Week Low',
  '7295': 'Open',
  '7296': 'Close',
  '7636': 'Shortable Shares ⭐',
  '7637': 'Short Fee Rate ⭐',
  '7644': 'Shortable Difficulty ⭐',
  '7741': 'Prior Close',
  '7762': 'Volume (precise)',
  '7280': 'Industry',
  '7281': 'Category',
  '7718': 'Beta',
  '7674': 'EMA 200',
  '7675': 'EMA 100',
  '7676': 'EMA 50',
  '7677': 'EMA 20',
};

function makeRequest(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : undefined;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 VerdictAI/1.0',
      'Accept': 'application/json',
    };

    if (bodyStr) {
      headers['Content-Length'] = Buffer.byteLength(bodyStr).toString();
    }

    const options: https.RequestOptions = {
      hostname: '127.0.0.1',
      port: 5050,
      path: endpoint,
      method,
      headers,
      rejectUnauthorized: false
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(15000, () => reject(new Error('Request timeout')));

    if (bodyStr) {
      req.write(bodyStr);
    }

    req.end();
  });
}

async function checkAuthentication(): Promise<boolean> {
  try {
    const status = await makeRequest('/v1/api/iserver/auth/status');
    return status.authenticated === true;
  } catch (e) {
    return false;
  }
}

async function main() {
  console.log('='.repeat(80));
  console.log('RE-TEST: IBKR Client Portal Snapshot API with NEW Subscriptions');
  console.log('='.repeat(80));
  console.log('\nUser just subscribed to:');
  console.log('  - US Securities Snapshot Bundle ($10/mo)');
  console.log('  - US Equity Streaming Add-on ($4.50/mo)');
  console.log('\nPrevious result: 0 fields returned');
  console.log('Expected now: Many fields with real data!\n');

  // Check authentication
  console.log('[1] Checking authentication...');
  const isAuthed = await checkAuthentication();
  if (!isAuthed) {
    console.log('[ERROR] Not authenticated!');
    console.log('\nPlease authenticate:');
    console.log('  1. Open https://localhost:5050');
    console.log('  2. Log in with IBKR credentials');
    console.log('  3. Run this script again\n');
    process.exit(1);
  }
  console.log('[SUCCESS] ✅ Authenticated\n');

  // Get contract ID
  console.log('[2] Getting AAPL contract ID...');
  const search = await makeRequest('/v1/api/iserver/secdef/search?symbol=AAPL&name=false', 'POST');
  const conid = search[0]?.conid;
  console.log(`    Contract ID: ${conid}\n`);

  // Request ALL fields
  console.log('[3] Requesting ALL documented market data fields...');
  console.log(`    Testing ${ALL_FIELDS.length} field IDs...\n`);

  const fieldsParam = ALL_FIELDS.join(',');
  const snapshot = await makeRequest(
    `/v1/api/iserver/marketdata/snapshot?conids=${conid}&fields=${fieldsParam}`
  );

  const data = snapshot[0] || {};
  const receivedFields = Object.keys(data).filter(
    k => k !== 'conid' && k !== 'conidEx' && k !== 'server_id' && k !== '_updated'
  );

  console.log('='.repeat(80));
  console.log('RESULTS WITH NEW SUBSCRIPTIONS');
  console.log('='.repeat(80));

  if (receivedFields.length === 0) {
    console.log('\n❌ STILL RECEIVING 0 FIELDS!');
    console.log('\nPossible reasons:');
    console.log('  1. Subscriptions not yet active (can take 24 hours)');
    console.log('  2. Need to restart IBKR Gateway after subscription');
    console.log('  3. Subscriptions might not cover these specific fields');
    console.log('  4. TWS API might be the only way to access this data\n');
    console.log('NEXT STEP: Test TWS API (ib_insync) instead!');
    console.log('  → Run: python scripts/test-tws-api.py\n');
  } else {
    console.log(`\n✅ RECEIVED ${receivedFields.length} FIELDS WITH DATA!\n`);
    console.log('Field ID | Name                          | Value');
    console.log('-'.repeat(80));

    // Categorize fields
    const criticalFields: string[] = [];
    const fundamentalFields: string[] = [];
    const technicalFields: string[] = [];
    const otherFields: string[] = [];

    receivedFields.forEach(field => {
      const name = FIELD_NAMES[field] || 'Unknown';
      const value = JSON.stringify(data[field]).substring(0, 40);
      console.log(`${field.padEnd(8)} | ${name.padEnd(29)} | ${value}`);

      // Categorize
      if (['7636', '7637', '7644'].includes(field)) {
        criticalFields.push(name);
      } else if (['7289', '7290', '7291', '7280', '7281'].includes(field)) {
        fundamentalFields.push(name);
      } else if (['7674', '7675', '7676', '7677'].includes(field)) {
        technicalFields.push(name);
      } else {
        otherFields.push(name);
      }
    });

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY BY CATEGORY');
    console.log('='.repeat(80));

    if (criticalFields.length > 0) {
      console.log('\n✅ SHORT SELLING DATA (CRITICAL):');
      criticalFields.forEach(f => console.log(`  - ${f}`));
    }

    if (fundamentalFields.length > 0) {
      console.log('\n✅ FUNDAMENTAL DATA:');
      fundamentalFields.forEach(f => console.log(`  - ${f}`));
    }

    if (technicalFields.length > 0) {
      console.log('\n✅ TECHNICAL INDICATORS:');
      technicalFields.forEach(f => console.log(`  - ${f}`));
    }

    if (otherFields.length > 0) {
      console.log('\n✅ OTHER MARKET DATA:');
      otherFields.slice(0, 10).forEach(f => console.log(`  - ${f}`));
      if (otherFields.length > 10) {
        console.log(`  ... and ${otherFields.length - 10} more`);
      }
    }

    // Decision
    console.log('\n' + '='.repeat(80));
    console.log('ARCHITECTURE DECISION');
    console.log('='.repeat(80));

    const hasShortData = criticalFields.length > 0;
    const hasFundamentals = fundamentalFields.length > 0;

    if (hasShortData && hasFundamentals) {
      console.log('\n🎉 EXCELLENT NEWS!');
      console.log('   Client Portal API NOW HAS:');
      console.log('   ✅ Short selling data (shortable shares, fee rates)');
      console.log('   ✅ Fundamental data (P/E, EPS, Market Cap)');
      console.log('\n   → We can use Client Portal API for EVERYTHING!');
      console.log('   → NO need for Yahoo Finance or Finnhub!');
      console.log('   → Update screening architecture to use ONLY IBKR');
    } else if (hasShortData) {
      console.log('\n✅ SHORT DATA AVAILABLE');
      console.log('   → Still need Yahoo Finance for fundamentals');
    } else if (hasFundamentals) {
      console.log('\n✅ FUNDAMENTALS AVAILABLE');
      console.log('   → Still need external API for short selling data');
    } else {
      console.log('\n⚠️ MIXED RESULTS');
      console.log('   → Need to test TWS API (ib_insync)');
      console.log('   → Run: python scripts/test-tws-api.py');
    }
  }

  console.log('\n');
}

main().catch(console.error);

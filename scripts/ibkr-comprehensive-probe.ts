/**
 * Comprehensive IBKR API Data Probe
 * Tests EVERY documented field to see what data is actually available
 */

import https from 'https';

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

  // Short selling
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

const ALL_FIELDS_STRING = ALL_FIELDS.join(',');

interface ProbeResult {
  feature: string;
  available: boolean;
  value?: any;
  notes?: string;
}

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

    const options = {
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

async function main() {
  console.log('='.repeat(80));
  console.log('COMPREHENSIVE IBKR API DATA PROBE');
  console.log('='.repeat(80));

  // Get AAPL contract ID
  console.log('\n[1] Getting AAPL contract ID...');
  const search = await makeRequest('/v1/api/iserver/secdef/search?symbol=AAPL&name=false', 'POST');
  const conid = search[0]?.conid;
  console.log(`   Contract ID: ${conid}`);

  // Test market data with ALL fields
  console.log('\n[2] Requesting ALL documented market data fields...');
  console.log(`   Requesting ${ALL_FIELDS.length} fields...`);

  const snapshot = await makeRequest(
    `/v1/api/iserver/marketdata/snapshot?conids=${conid}&fields=${ALL_FIELDS_STRING}`
  );

  const data = snapshot[0] || {};
  const availableFields = Object.keys(data).filter(k => k !== 'conid' && k !== 'conidEx' && k !== 'server_id' && k !== '_updated');

  console.log(`   ✅ Received ${availableFields.length} fields with data`);

  // Map field IDs to names
  const fieldNames: Record<string, string> = {
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
    '7636': 'Shortable Shares',
    '7637': 'Short Fee Rate',
    '7644': 'Shortable Difficulty',
    '7741': 'Prior Close',
    '7762': 'Volume (precise)',
  };

  console.log('\n[3] AVAILABLE DATA FIELDS:\n');
  console.log('   Field ID | Name                    | Value');
  console.log('   ' + '-'.repeat(70));

  for (const field of availableFields) {
    const name = fieldNames[field] || 'Unknown';
    const value = JSON.stringify(data[field]).substring(0, 30);
    console.log(`   ${field.padEnd(8)} | ${name.padEnd(23)} | ${value}`);
  }

  // Test scanner params
  console.log('\n[4] Scanner Parameters...');
  const scannerParams = await makeRequest('/v1/api/iserver/scanner/params');
  const scanTypes = scannerParams.scan_type_list || [];
  console.log(`   ✅ ${scanTypes.length} scanner types available`);
  console.log('\n   Top 10 scanner types:');
  scanTypes.slice(0, 10).forEach((s: any, i: number) => {
    console.log(`   ${(i + 1).toString().padStart(2)}. ${s.display_name} (${s.code})`);
  });

  // Test fundamentals endpoint
  console.log('\n[5] Fundamentals Endpoint...');
  try {
    const fundamentals = await makeRequest(`/v1/api/iserver/fundamentals?conid=${conid}`);
    const fundFields = Object.keys(fundamentals);
    console.log(`   ✅ ${fundFields.length} fundamental fields`);
    console.log(`   Fields: ${fundFields.slice(0, 10).join(', ')}...`);
  } catch (e: any) {
    console.log(`   ❌ Not available: ${e.message}`);
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`✅ Market Data Fields: ${availableFields.length} / ${ALL_FIELDS.length} requested`);
  console.log(`✅ Scanner Types: ${scanTypes.length}`);
  console.log(`✅ Pre-Market Data: Available (tested in other probe)`);
  console.log('\n');
}

main().catch(console.error);

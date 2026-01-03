/**
 * IBKR Client Portal API Capabilities Probe
 * Tests what data is available from existing Client Portal Gateway integration
 */

import https from 'https';

interface ProbeResult {
  feature: string;
  status: 'SUCCESS' | 'FAIL' | 'PARTIAL';
  details: string;
}

const IBKR_BASE_URL = 'https://localhost:5050';
const TEST_SYMBOL = 'AAPL';

// Allow self-signed certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

function makeRequest(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : undefined;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 VerdictAI/1.0',
      'Accept': 'application/json',
    };

    // Add Content-Length for POST requests (IBKR Gateway requires this)
    if (bodyStr) {
      headers['Content-Length'] = Buffer.byteLength(bodyStr).toString();
    }

    const options = {
      hostname: '127.0.0.1', // Use 127.0.0.1 instead of 'localhost'
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
    req.setTimeout(10000, () => reject(new Error('Request timeout')));

    if (bodyStr) {
      req.write(bodyStr);
    }

    req.end();
  });
}

async function probeClientPortalCapabilities(): Promise<ProbeResult[]> {
  const results: ProbeResult[] = [];

  console.log('\n' + '='.repeat(60));
  console.log('=== IBKR Client Portal API Capabilities Probe ===');
  console.log('='.repeat(60) + '\n');

  // Test 1: Authentication Status
  console.log('\n=== Test 1: Authentication Status ===\n');
  try {
    let authStatus = await makeRequest('/v1/api/iserver/auth/status', 'GET');
    console.log('[INFO] Initial status:', authStatus);

    // If not authenticated, try ssodh/init to complete 2FA (like your existing code does)
    if (!authStatus.authenticated) {
      console.log('[INFO] Not authenticated, trying ssodh/init...');
      try {
        const initResult = await makeRequest('/v1/api/iserver/auth/ssodh/init', 'POST', { publish: true, compete: true });
        console.log('[INFO] ssodh/init result:', initResult);

        // Check status again
        authStatus = await makeRequest('/v1/api/iserver/auth/status');
        console.log('[INFO] Status after ssodh/init:', authStatus);
      } catch (initError: any) {
        console.log(`[WARN] ssodh/init failed: ${initError.message}`);
      }
    }

    if (authStatus.authenticated) {
      console.log('[SUCCESS] Authentication: Authenticated');
      results.push({ feature: 'Authentication', status: 'SUCCESS', details: 'Authenticated' });
    } else {
      console.log('[PARTIAL] Authentication: Gateway running but not authenticated');
      console.log('[INFO] Open browser: https://localhost:5050 and complete login');
      results.push({ feature: 'Authentication', status: 'PARTIAL', details: 'Gateway running, login required' });
      // Continue with tests anyway to see what endpoints are available
    }
  } catch (e: any) {
    console.log(`[FAIL] Authentication: ${e.message}`);
    results.push({ feature: 'Authentication', status: 'FAIL', details: e.message });
    return results;
  }

  // Test 2: Market Data Snapshot (Check for sentiment/advanced fields)
  console.log('\n=== Test 2: Market Data Snapshot ===\n');
  try {
    // First get contract ID for AAPL
    const search = await makeRequest(`/v1/api/iserver/secdef/search?symbol=${TEST_SYMBOL}&name=false`);
    const conid = search[0]?.conid;

    if (conid) {
      const snapshot = await makeRequest(`/v1/api/iserver/marketdata/snapshot?conids=${conid}&fields=31,84,85,86,88`);

      const fields = snapshot[0] || {};
      const availableFields = Object.keys(fields).filter(k => k !== 'conid' && k !== 'conidEx');

      console.log(`[SUCCESS] Market Data: ${availableFields.length} fields available`);
      console.log(`  Fields: ${availableFields.join(', ')}`);

      // Check for advanced fields
      const hasShortData = availableFields.some(f => f.includes('short') || f === '236');
      const hasSentiment = availableFields.some(f => f.includes('sentiment'));

      let details = `${availableFields.length} fields`;
      if (hasShortData) details += ', has short data';
      if (hasSentiment) details += ', has sentiment';

      results.push({
        feature: 'Market Data',
        status: 'SUCCESS',
        details
      });
    } else {
      console.log('[FAIL] Market Data: Could not find contract');
      results.push({ feature: 'Market Data', status: 'FAIL', details: 'Contract not found' });
    }
  } catch (e: any) {
    console.log(`[FAIL] Market Data: ${e.message}`);
    results.push({ feature: 'Market Data', status: 'FAIL', details: e.message });
  }

  // Test 3: Scanner Endpoints
  console.log('\n=== Test 3: Market Scanners ===\n');
  try {
    const scanParams = await makeRequest('/v1/api/iserver/scanner/params');

    if (scanParams && scanParams.scan_type_list) {
      const scanTypes = scanParams.scan_type_list.length;
      console.log(`[SUCCESS] Scanners: ${scanTypes} scan types available`);
      console.log(`  Examples: ${scanParams.scan_type_list.slice(0, 3).map((s: any) => s.display_name).join(', ')}`);

      results.push({
        feature: 'Market Scanners',
        status: 'SUCCESS',
        details: `${scanTypes} scan types`
      });
    } else {
      console.log('[FAIL] Scanners: No scan parameters available');
      results.push({ feature: 'Market Scanners', status: 'FAIL', details: 'No params' });
    }
  } catch (e: any) {
    console.log(`[FAIL] Scanners: ${e.message}`);
    results.push({ feature: 'Market Scanners', status: 'FAIL', details: e.message });
  }

  // Test 4: Historical Bars (Pre-Market)
  console.log('\n=== Test 4: Pre-Market Historical Bars ===\n');
  try {
    const search = await makeRequest(`/v1/api/iserver/secdef/search?symbol=${TEST_SYMBOL}&name=false`);
    const conid = search[0]?.conid;

    if (conid) {
      const bars = await makeRequest(
        `/v1/api/iserver/marketdata/history?conid=${conid}&period=1d&bar=5min&outsideRth=true`
      );

      if (bars && bars.data) {
        const totalBars = bars.data.length;
        // Check if we have pre-market bars (before 9:30 AM ET)
        const premarketBars = bars.data.filter((b: any) => {
          const date = new Date(b.t);
          const hour = date.getHours();
          const minute = date.getMinutes();
          return hour < 9 || (hour === 9 && minute < 30);
        });

        if (premarketBars.length > 0) {
          console.log(`[SUCCESS] Pre-Market: ${premarketBars.length}/${totalBars} bars from extended hours`);
          results.push({
            feature: 'Pre-Market Data',
            status: 'SUCCESS',
            details: `${premarketBars.length} pre-market bars`
          });
        } else {
          console.log(`[PARTIAL] Pre-Market: ${totalBars} bars but none before 9:30 AM`);
          results.push({
            feature: 'Pre-Market Data',
            status: 'PARTIAL',
            details: 'No pre-market bars (may need outsideRth param)'
          });
        }
      } else {
        console.log('[FAIL] Pre-Market: No bar data received');
        results.push({ feature: 'Pre-Market Data', status: 'FAIL', details: 'No bars' });
      }
    }
  } catch (e: any) {
    console.log(`[FAIL] Pre-Market: ${e.message}`);
    results.push({ feature: 'Pre-Market Data', status: 'FAIL', details: e.message });
  }

  // Test 5: News
  console.log('\n=== Test 5: News Feed ===\n');
  try {
    const search = await makeRequest(`/v1/api/iserver/secdef/search?symbol=${TEST_SYMBOL}&name=false`);
    const conid = search[0]?.conid;

    if (conid) {
      const news = await makeRequest(`/v1/api/iserver/marketdata/news?conid=${conid}`);

      if (news && Array.isArray(news) && news.length > 0) {
        console.log(`[SUCCESS] News: ${news.length} articles available`);
        console.log(`  Latest: ${news[0].headline || 'N/A'}`);

        // Check for sentiment
        const hasSentiment = news.some((n: any) => n.sentiment || n.score);

        results.push({
          feature: 'News Feed',
          status: 'SUCCESS',
          details: `${news.length} articles${hasSentiment ? ' with sentiment' : ''}`
        });
      } else {
        console.log('[FAIL] News: No articles received');
        results.push({ feature: 'News Feed', status: 'FAIL', details: 'No articles' });
      }
    }
  } catch (e: any) {
    console.log(`[FAIL] News: ${e.message}`);
    results.push({ feature: 'News Feed', status: 'FAIL', details: e.message });
  }

  // Test 6: Fundamental Data
  console.log('\n=== Test 6: Fundamental Data ===\n');
  try {
    const search = await makeRequest(`/v1/api/iserver/secdef/search?symbol=${TEST_SYMBOL}&name=false`);
    const conid = search[0]?.conid;

    if (conid) {
      const fundamentals = await makeRequest(`/v1/api/iserver/fundamentals?conid=${conid}`);

      if (fundamentals && Object.keys(fundamentals).length > 0) {
        const fields = Object.keys(fundamentals);
        console.log(`[SUCCESS] Fundamentals: ${fields.length} fields available`);
        console.log(`  Fields: ${fields.slice(0, 5).join(', ')}...`);

        results.push({
          feature: 'Fundamentals',
          status: 'SUCCESS',
          details: `${fields.length} fields`
        });
      } else {
        console.log('[FAIL] Fundamentals: No data received');
        results.push({ feature: 'Fundamentals', status: 'FAIL', details: 'No data' });
      }
    }
  } catch (e: any) {
    console.log(`[PARTIAL] Fundamentals: ${e.message} (endpoint may not exist)`);
    results.push({ feature: 'Fundamentals', status: 'PARTIAL', details: 'Endpoint may not exist' });
  }

  return results;
}

async function main() {
  console.log('IBKR Client Portal API Capabilities Probe');
  console.log('Testing localhost:5050 Gateway API\n');

  const results = await probeClientPortalCapabilities();

  // Print Final Report
  console.log('\n' + '='.repeat(80));
  console.log('=== CAPABILITIES REPORT ===');
  console.log('='.repeat(80) + '\n');

  console.log(`${'Feature'.padEnd(25)} ${'Status'.padEnd(12)} ${'Details'.padEnd(40)}`);
  console.log('-'.repeat(80));

  for (const { feature, status, details } of results) {
    console.log(`${feature.padEnd(25)} ${status.padEnd(12)} ${details.padEnd(40)}`);
  }

  console.log('\n');
}

main().catch(console.error);

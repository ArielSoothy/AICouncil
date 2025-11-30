#!/usr/bin/env npx ts-node
/**
 * IBKR Client Portal Gateway Connection Test
 *
 * This script tests the connection to Interactive Brokers Client Portal Gateway.
 *
 * Prerequisites:
 * 1. Download Client Portal Gateway from IBKR
 *    - Login to IBKR Portal > Settings > API Settings
 *    - Download "Client Portal Gateway"
 *
 * 2. Extract and run the Gateway:
 *    - Extract to ~/ibkr-gateway/
 *    - cd ~/ibkr-gateway/
 *    - ./bin/run.sh root/conf.yaml
 *
 * 3. Authenticate via browser:
 *    - Open https://localhost:5000
 *    - Login with your IBKR credentials
 *    - Session lasts ~24 hours
 *
 * 4. Set environment variables:
 *    - IBKR_GATEWAY_URL=https://localhost:5000/v1/api
 *    - IBKR_ACCOUNT_ID=YOUR_ACCOUNT_ID (optional)
 *
 * Usage:
 *   npx ts-node scripts/test-ibkr-connection.ts
 *
 * @see https://interactivebrokers.github.io/cpwebapi/
 */

import * as https from 'https';
import * as http from 'http';

// Configuration
const GATEWAY_URL = process.env.IBKR_GATEWAY_URL || 'https://localhost:5000/v1/api';
const ACCOUNT_ID = process.env.IBKR_ACCOUNT_ID;

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

function logResult(label: string, value: string | number | boolean, success = true) {
  const status = success ? colors.green + '✓' : colors.red + '✗';
  console.log(`${status} ${colors.reset}${label}: ${colors.blue}${value}${colors.reset}`);
}

// Custom fetch that accepts self-signed certificates
async function fetchIBKR(endpoint: string): Promise<any> {
  const url = new URL(endpoint, GATEWAY_URL);

  return new Promise((resolve, reject) => {
    const options = {
      hostname: url.hostname,
      port: url.port || 5000,
      path: url.pathname,
      method: 'GET',
      rejectUnauthorized: false, // Accept self-signed certs from Gateway
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };

    const protocol = url.protocol === 'https:' ? https : http;

    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(data);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function testEnvVars(): Promise<boolean> {
  logSection('1. Environment Variables');

  let success = true;

  if (!process.env.IBKR_GATEWAY_URL) {
    log('⚠ IBKR_GATEWAY_URL not set, using default: ' + GATEWAY_URL, 'yellow');
  } else {
    logResult('IBKR_GATEWAY_URL', GATEWAY_URL);
  }

  if (!ACCOUNT_ID) {
    log('ℹ IBKR_ACCOUNT_ID not set (will use first available account)', 'dim');
  } else {
    logResult('IBKR_ACCOUNT_ID', ACCOUNT_ID);
  }

  return success;
}

async function testGatewayConnection(): Promise<boolean> {
  logSection('2. Gateway Connection');

  try {
    log(`Connecting to ${GATEWAY_URL}...`, 'dim');

    const status = await fetchIBKR('/iserver/auth/status');

    logResult('Gateway reachable', 'Yes');
    logResult('Authenticated', status.authenticated ? 'Yes' : 'No', status.authenticated);
    logResult('Connected', status.connected ? 'Yes' : 'No', status.connected);

    if (!status.authenticated) {
      log('\n⚠ Please authenticate:', 'yellow');
      log('  1. Open https://localhost:5000 in your browser', 'dim');
      log('  2. Login with your IBKR credentials', 'dim');
      log('  3. Re-run this test', 'dim');
      return false;
    }

    return true;
  } catch (error) {
    logResult('Gateway reachable', 'No', false);
    log('\n⚠ Gateway connection failed:', 'red');
    log(`  ${error instanceof Error ? error.message : 'Unknown error'}`, 'dim');
    log('\nTroubleshooting:', 'yellow');
    log('  1. Ensure Client Portal Gateway is running', 'dim');
    log('  2. Check if Gateway is on correct port (default: 5000)', 'dim');
    log('  3. Try: ./bin/run.sh root/conf.yaml', 'dim');
    return false;
  }
}

async function testAccountInfo(): Promise<string | null> {
  logSection('3. Account Information');

  try {
    const response = await fetchIBKR('/iserver/accounts');
    const accounts = response.accounts || [];

    if (accounts.length === 0) {
      log('⚠ No accounts found', 'red');
      return null;
    }

    log(`Found ${accounts.length} account(s):`, 'green');
    accounts.forEach((acc: string, i: number) => {
      console.log(`  ${i + 1}. ${acc}`);
    });

    const accountId = ACCOUNT_ID || accounts[0];
    logResult('Using account', accountId);

    // Get account summary
    try {
      const summary = await fetchIBKR(`/portfolio/${accountId}/summary`);

      log('\nAccount Summary:', 'cyan');
      if (summary.netliquidation) {
        logResult('Net Liquidation', `$${summary.netliquidation.amount?.toLocaleString() || 'N/A'}`);
      }
      if (summary.buyingpower) {
        logResult('Buying Power', `$${summary.buyingpower.amount?.toLocaleString() || 'N/A'}`);
      }
      if (summary.availablefunds) {
        logResult('Available Funds', `$${summary.availablefunds.amount?.toLocaleString() || 'N/A'}`);
      }
      if (summary.baseCurrency) {
        logResult('Base Currency', summary.baseCurrency);
      }
    } catch {
      log('⚠ Could not fetch account summary', 'yellow');
    }

    return accountId;
  } catch (error) {
    log(`⚠ Failed to fetch accounts: ${error instanceof Error ? error.message : 'Unknown'}`, 'red');
    return null;
  }
}

async function testPositions(accountId: string): Promise<void> {
  logSection('4. Positions');

  try {
    const positions = await fetchIBKR(`/portfolio/${accountId}/positions/0`);

    if (!positions || positions.length === 0) {
      log('No open positions', 'dim');
      return;
    }

    log(`Found ${positions.length} position(s):`, 'green');
    console.log('');
    console.log('  Symbol          Qty       Value       P&L');
    console.log('  ' + '-'.repeat(50));

    positions.forEach((pos: any) => {
      const symbol = (pos.contractDesc || pos.ticker || 'N/A').padEnd(14);
      const qty = String(pos.position || 0).padStart(6);
      const value = `$${(pos.mktValue || 0).toLocaleString()}`.padStart(12);
      const pnl = pos.unrealizedPnl || 0;
      const pnlColor = pnl >= 0 ? colors.green : colors.red;
      const pnlStr = `${pnlColor}$${pnl.toLocaleString()}${colors.reset}`;

      console.log(`  ${symbol}${qty}${value}    ${pnlStr}`);
    });
  } catch (error) {
    log(`⚠ Failed to fetch positions: ${error instanceof Error ? error.message : 'Unknown'}`, 'yellow');
  }
}

async function testQuote(symbol = 'AAPL'): Promise<void> {
  logSection('5. Quote API Test');

  try {
    log(`Searching for ${symbol}...`, 'dim');

    // Search for symbol
    const contracts = await fetchIBKR(`/iserver/secdef/search?symbol=${symbol}&secType=STK`);

    if (!contracts || contracts.length === 0) {
      log(`⚠ Symbol ${symbol} not found`, 'yellow');
      return;
    }

    const conid = contracts[0].conid;
    logResult('Contract ID (conid)', conid);

    // Get market data snapshot
    log(`Fetching quote for ${symbol}...`, 'dim');

    const snapshot = await fetchIBKR(
      `/iserver/marketdata/snapshot?conids=${conid}&fields=31,84,85,86,87,88`
    );

    const data = snapshot[0] || {};

    console.log('');
    log(`${symbol} Quote:`, 'cyan');
    logResult('Last Price', data['31'] ? `$${data['31']}` : 'N/A');
    logResult('Bid', data['84'] ? `$${data['84']}` : 'N/A');
    logResult('Ask', data['86'] ? `$${data['86']}` : 'N/A');
    logResult('Bid Size', data['88'] || 'N/A');
    logResult('Ask Size', data['85'] || 'N/A');
  } catch (error) {
    log(`⚠ Failed to fetch quote: ${error instanceof Error ? error.message : 'Unknown'}`, 'yellow');
  }
}

async function main() {
  console.log('\n');
  log('╔══════════════════════════════════════════════════════════╗', 'cyan');
  log('║         IBKR Client Portal Gateway Connection Test        ║', 'cyan');
  log('╚══════════════════════════════════════════════════════════╝', 'cyan');

  // Test 1: Environment variables
  await testEnvVars();

  // Test 2: Gateway connection & auth
  const connected = await testGatewayConnection();
  if (!connected) {
    logSection('Test Complete');
    log('⚠ Cannot continue without Gateway connection', 'red');
    log('\nNext steps:', 'yellow');
    log('  1. Download Client Portal Gateway from IBKR', 'dim');
    log('  2. Run: ./bin/run.sh root/conf.yaml', 'dim');
    log('  3. Authenticate at https://localhost:5000', 'dim');
    log('  4. Re-run this test', 'dim');
    process.exit(1);
  }

  // Test 3: Account info
  const accountId = await testAccountInfo();
  if (!accountId) {
    logSection('Test Complete');
    log('⚠ Could not access accounts', 'red');
    process.exit(1);
  }

  // Test 4: Positions
  await testPositions(accountId);

  // Test 5: Quote API
  await testQuote('AAPL');

  // Summary
  logSection('Test Complete');
  log('✓ All tests passed! IBKR Gateway is working correctly.', 'green');
  log('\nYou can now use IBKR as your active broker:', 'cyan');
  log('  Set ACTIVE_BROKER=ibkr in your .env.local', 'dim');
  console.log('\n');
}

main().catch((error) => {
  log(`\nFatal error: ${error.message}`, 'red');
  process.exit(1);
});

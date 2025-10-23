import Alpaca from '@alpacahq/alpaca-trade-api';
import type { AlpacaAccount } from './types';

/**
 * Get or create Alpaca client instance
 * Lazy initialization to ensure env vars are loaded first
 */
function getAlpacaClient(): Alpaca {
  return new Alpaca({
    keyId: process.env.ALPACA_API_KEY!,
    secretKey: process.env.ALPACA_SECRET_KEY!,
    paper: true, // ALWAYS paper trading
    baseUrl: process.env.ALPACA_BASE_URL || 'https://paper-api.alpaca.markets',
  });
}

/**
 * Test connection to Alpaca API
 * Returns account info if successful
 */
export async function testConnection(): Promise<AlpacaAccount> {
  try {
    console.log('🔌 Testing Alpaca connection...');
    const alpaca = getAlpacaClient();
    const account = await alpaca.getAccount();
    console.log('✅ Connection successful!');
    console.log('📊 Account Balance:', account.portfolio_value);
    return account as AlpacaAccount;
  } catch (error) {
    console.error('❌ Alpaca connection failed:', error);
    throw new Error(`Alpaca connection failed: ${error}`);
  }
}

/**
 * Get current account information
 */
export async function getAccount(): Promise<AlpacaAccount> {
  try {
    const alpaca = getAlpacaClient();
    const account = await alpaca.getAccount();
    console.log('💰 Current Balance:', account.portfolio_value);
    return account as AlpacaAccount;
  } catch (error) {
    console.error('❌ Failed to get account:', error);
    throw error;
  }
}

import Alpaca from '@alpacahq/alpaca-trade-api';
import type { AlpacaAccount, AlpacaOrder, OrderSide } from './types';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Validate that required Alpaca environment variables are set
 * Throws descriptive error if any are missing
 */
function validateAlpacaEnv(): void {
  const missingVars: string[] = [];

  if (!process.env.ALPACA_API_KEY) {
    missingVars.push('ALPACA_API_KEY');
  }
  if (!process.env.ALPACA_SECRET_KEY) {
    missingVars.push('ALPACA_SECRET_KEY');
  }

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required Alpaca environment variables: ${missingVars.join(', ')}. ` +
      `Please add them to your .env.local file (development) or Vercel environment variables (production). ` +
      `Get your keys from: https://alpaca.markets (Paper Trading section)`
    );
  }
}

/**
 * Get or create Alpaca client instance
 * Lazy initialization to ensure env vars are loaded first
 */
export function getAlpacaClient(): Alpaca {
  console.log('🔍 [Alpaca Client] Initializing Alpaca client...');

  // Validate environment variables before creating client
  validateAlpacaEnv();

  console.log('✅ [Alpaca Client] Environment variables validated');
  console.log('🔑 [Alpaca Client] API Key:', process.env.ALPACA_API_KEY ? `${process.env.ALPACA_API_KEY.substring(0, 8)}...` : 'MISSING');
  console.log('🔐 [Alpaca Client] Secret Key:', process.env.ALPACA_SECRET_KEY ? `${process.env.ALPACA_SECRET_KEY.substring(0, 8)}...` : 'MISSING');
  console.log('🌐 [Alpaca Client] Base URL:', process.env.ALPACA_BASE_URL || 'https://paper-api.alpaca.markets');

  const client = new Alpaca({
    keyId: process.env.ALPACA_API_KEY!,
    secretKey: process.env.ALPACA_SECRET_KEY!,
    paper: true, // ALWAYS paper trading
    baseUrl: process.env.ALPACA_BASE_URL || 'https://paper-api.alpaca.markets',
  });

  console.log('✅ [Alpaca Client] Client created successfully');
  return client;
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

/**
 * Get current portfolio positions
 */
export async function getPositions(): Promise<any[]> {
  try {
    const alpaca = getAlpacaClient();
    const positions = await alpaca.getPositions();
    console.log(`📊 Current positions: ${positions.length}`);
    return positions;
  } catch (error) {
    console.error('❌ Failed to get positions:', error);
    throw error;
  }
}

/**
 * Place a market order (buy or sell)
 * @param symbol - Stock symbol (e.g., 'AAPL')
 * @param quantity - Number of shares
 * @param side - 'buy' or 'sell'
 */
export async function placeMarketOrder(
  symbol: string,
  quantity: number,
  side: OrderSide
): Promise<AlpacaOrder> {
  try {
    console.log(`📈 Placing ${side.toUpperCase()} order: ${quantity} shares of ${symbol}`);

    const alpaca = getAlpacaClient();
    const order = await alpaca.createOrder({
      symbol,
      qty: quantity,
      side,
      type: 'market',
      time_in_force: 'day',
    });

    console.log('✅ Order placed successfully!');
    console.log('Order ID:', order.id);
    console.log('Status:', order.status);

    return order as AlpacaOrder;
  } catch (error) {
    console.error('❌ Failed to place order:', error);
    throw error;
  }
}

/**
 * Save trade to database
 * @param mode - Trading mode (e.g., 'individual_claude', 'consensus', 'debate')
 * @param symbol - Stock symbol
 * @param action - Trade action (BUY, SELL, HOLD)
 * @param quantity - Number of shares
 * @param price - Price per share
 * @param reasoning - Trade reasoning from AI
 * @param confidence - Confidence score (0-1)
 * @param alpacaOrderId - Alpaca order ID
 */
export async function saveTrade(
  mode: string,
  symbol: string,
  action: string,
  quantity: number,
  price: number,
  reasoning: string,
  confidence: number,
  alpacaOrderId: string
) {
  try {
    // Use direct Supabase client for script compatibility
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('Attempting to save:', { mode, symbol, action, quantity, price, confidence });

    const { data, error} = await supabase
      .from('paper_trades')
      .insert({
        mode,
        symbol,
        action,
        quantity,
        price,
        reasoning,
        confidence,
        alpaca_order_id: alpacaOrderId,
      })
      .select();

    if (error) {
      console.error('❌ Database save failed:');
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', error.details);
      console.error('Error hint:', error.hint);
      console.error('Full error:', JSON.stringify(error, null, 2));
      throw new Error(`Database save failed: ${error.message || JSON.stringify(error)}`);
    }

    console.log('✅ Trade saved to database!');
    console.log('Database record:', data);
    return data ? data[0] : null;
  } catch (error) {
    console.error('❌ Failed to save trade:', error);
    throw error;
  }
}

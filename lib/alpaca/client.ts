import Alpaca from '@alpacahq/alpaca-trade-api';
import type { AlpacaAccount, AlpacaOrder, OrderSide } from './types';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

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

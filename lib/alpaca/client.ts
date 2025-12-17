import Alpaca from '@alpacahq/alpaca-trade-api';
import type { AlpacaAccount, AlpacaOrder, OrderSide, BracketOrderResult } from './types';
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
 * Place a bracket order (entry + stop-loss + take-profit)
 * This creates a parent market order with two child orders that auto-execute
 * @param symbol - Stock symbol (e.g., 'AAPL')
 * @param quantity - Number of shares
 * @param side - 'buy' or 'sell'
 * @param takeProfitPrice - Price to take profit at
 * @param stopLossPrice - Price to stop loss at
 * @returns Parent order and child order IDs
 */
export async function placeBracketOrder(
  symbol: string,
  quantity: number,
  side: OrderSide,
  takeProfitPrice: number,
  stopLossPrice: number
): Promise<BracketOrderResult> {
  try {
    console.log(`📈 Placing BRACKET ${side.toUpperCase()} order: ${quantity} shares of ${symbol}`);
    console.log(`   Take Profit: $${takeProfitPrice}`);
    console.log(`   Stop Loss: $${stopLossPrice}`);

    const alpaca = getAlpacaClient();

    // Create bracket order with stop-loss and take-profit legs
    const order = await alpaca.createOrder({
      symbol,
      qty: quantity,
      side,
      type: 'market',
      time_in_force: 'day',
      order_class: 'bracket',
      take_profit: {
        limit_price: takeProfitPrice,
      },
      stop_loss: {
        stop_price: stopLossPrice,
      },
    }) as any;

    console.log('✅ Bracket order placed successfully!');
    console.log('Parent Order ID:', order.id);
    console.log('Status:', order.status);

    // Extract child order IDs from legs
    const legs = order.legs || [];
    let stopLossOrderId = '';
    let takeProfitOrderId = '';

    for (const leg of legs) {
      if (leg.type === 'stop') {
        stopLossOrderId = leg.id;
        console.log('Stop-Loss Order ID:', leg.id);
      } else if (leg.type === 'limit') {
        takeProfitOrderId = leg.id;
        console.log('Take-Profit Order ID:', leg.id);
      }
    }

    return {
      parentOrder: order as AlpacaOrder,
      stopLossOrderId,
      takeProfitOrderId,
      legs: legs as AlpacaOrder[],
    };
  } catch (error) {
    console.error('❌ Failed to place bracket order:', error);
    throw error;
  }
}

/**
 * Get order by ID
 * @param orderId - Alpaca order ID
 */
export async function getOrder(orderId: string): Promise<AlpacaOrder | null> {
  try {
    const alpaca = getAlpacaClient();
    const order = await alpaca.getOrder(orderId);
    return order as AlpacaOrder;
  } catch (error: any) {
    if (error.statusCode === 404) {
      return null;
    }
    console.error(`❌ Failed to get order ${orderId}:`, error);
    throw error;
  }
}

/**
 * Cancel an order by ID
 * @param orderId - Alpaca order ID
 */
export async function cancelOrder(orderId: string): Promise<void> {
  try {
    const alpaca = getAlpacaClient();
    await alpaca.cancelOrder(orderId);
    console.log(`✅ Order ${orderId} cancelled`);
  } catch (error) {
    console.error(`❌ Failed to cancel order ${orderId}:`, error);
    throw error;
  }
}

/**
 * Get a specific position by symbol
 * @param symbol - Stock symbol (e.g., 'AAPL')
 */
export async function getPosition(symbol: string): Promise<any | null> {
  try {
    const alpaca = getAlpacaClient();
    const position = await alpaca.getPosition(symbol);
    return position;
  } catch (error: any) {
    // Position doesn't exist (404) is expected, not an error
    if (error.statusCode === 404) {
      return null;
    }
    console.error(`❌ Failed to get position for ${symbol}:`, error);
    throw error;
  }
}

/**
 * Close a position (sell all shares of a symbol)
 * @param symbol - Stock symbol (e.g., 'AAPL')
 * @returns Order details from closing the position
 */
export async function closePosition(symbol: string): Promise<AlpacaOrder> {
  try {
    console.log(`📉 Closing position: ${symbol}`);
    const alpaca = getAlpacaClient();
    const order = await alpaca.closePosition(symbol);
    console.log('✅ Position closed successfully!');
    console.log('Order ID:', order.id);
    console.log('Status:', order.status);
    return order as AlpacaOrder;
  } catch (error) {
    console.error(`❌ Failed to close position ${symbol}:`, error);
    throw error;
  }
}

/**
 * Get current market price for a symbol
 * @param symbol - Stock symbol (e.g., 'AAPL')
 */
export async function getLatestQuote(symbol: string): Promise<{ price: number; timestamp: string }> {
  try {
    const alpaca = getAlpacaClient();
    // Use latest trade price as current market price
    const latestTrade = await alpaca.getLatestTrade(symbol) as any;
    return {
      price: parseFloat(latestTrade.Price || latestTrade.price || String(latestTrade.p) || '0'),
      timestamp: latestTrade.Timestamp || latestTrade.timestamp || String(latestTrade.t) || new Date().toISOString(),
    };
  } catch (error) {
    console.error(`❌ Failed to get quote for ${symbol}:`, error);
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
 * @param userId - User ID for RLS (optional for backward compatibility)
 */
export async function saveTrade(
  mode: string,
  symbol: string,
  action: string,
  quantity: number,
  price: number,
  reasoning: string,
  confidence: number,
  alpacaOrderId: string,
  userId?: string
) {
  try {
    // Use direct Supabase client for script compatibility
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('Attempting to save:', { mode, symbol, action, quantity, price, confidence, userId });

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
        user_id: userId || null, // Include user_id for RLS
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

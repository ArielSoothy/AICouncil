/**
 * Arena Mode Stock Locking System
 *
 * Manages exclusive stock ownership per model to prevent position merging.
 * When a model owns a stock, no other model can trade that stock until
 * the position is closed.
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export interface StockLock {
  id: string;
  model_id: string;
  symbol: string;
  locked_at: string;
  unlocked_at: string | null;
  arena_trade_id: string | null;
}

/**
 * Get all currently locked stocks (active locks only)
 * @returns Array of locked stock symbols
 */
export async function getLockedStocks(): Promise<string[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('arena_stock_locks')
    .select('symbol')
    .is('unlocked_at', null);

  if (error) {
    console.error('❌ Failed to get locked stocks:', error);
    throw error;
  }

  const symbols = (data || []).map((lock: { symbol: string }) => lock.symbol);
  console.log(`🔒 Currently locked stocks: ${symbols.length > 0 ? symbols.join(', ') : 'none'}`);
  return symbols;
}

/**
 * Get all active locks with full details
 * @returns Array of StockLock objects
 */
export async function getActiveLocks(): Promise<StockLock[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('arena_stock_locks')
    .select('*')
    .is('unlocked_at', null)
    .order('locked_at', { ascending: false });

  if (error) {
    console.error('❌ Failed to get active locks:', error);
    throw error;
  }

  return (data || []) as StockLock[];
}

/**
 * Lock a stock to a specific model
 * @param modelId - Model ID that owns this stock
 * @param symbol - Stock symbol to lock
 * @param tradeId - Arena trade ID associated with this lock
 */
export async function lockStock(
  modelId: string,
  symbol: string,
  tradeId: string
): Promise<void> {
  const supabase = getSupabaseClient();

  // First check if stock is already locked
  const locked = await isStockLocked(symbol);
  if (locked) {
    throw new Error(`Stock ${symbol} is already locked by another model`);
  }

  const { error } = await supabase
    .from('arena_stock_locks')
    .insert({
      model_id: modelId,
      symbol: symbol.toUpperCase(),
      arena_trade_id: tradeId,
      locked_at: new Date().toISOString(),
    });

  if (error) {
    console.error(`❌ Failed to lock stock ${symbol}:`, error);
    throw error;
  }

  console.log(`🔒 Locked ${symbol} to model ${modelId}`);
}

/**
 * Unlock a stock (called when position closes)
 * @param symbol - Stock symbol to unlock
 */
export async function unlockStock(symbol: string): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('arena_stock_locks')
    .update({ unlocked_at: new Date().toISOString() })
    .eq('symbol', symbol.toUpperCase())
    .is('unlocked_at', null);

  if (error) {
    console.error(`❌ Failed to unlock stock ${symbol}:`, error);
    throw error;
  }

  console.log(`🔓 Unlocked ${symbol}`);
}

/**
 * Check if a stock is currently locked
 * @param symbol - Stock symbol to check
 * @returns True if stock is locked
 */
export async function isStockLocked(symbol: string): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('arena_stock_locks')
    .select('id')
    .eq('symbol', symbol.toUpperCase())
    .is('unlocked_at', null)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows found, which is expected
    console.error(`❌ Failed to check stock lock:`, error);
    throw error;
  }

  return !!data;
}

/**
 * Get the stock that a model currently owns
 * @param modelId - Model ID to check
 * @returns Stock symbol or null if model has no locked stock
 */
export async function getModelStock(modelId: string): Promise<string | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('arena_stock_locks')
    .select('symbol')
    .eq('model_id', modelId)
    .is('unlocked_at', null)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error(`❌ Failed to get model stock:`, error);
    throw error;
  }

  return data?.symbol || null;
}

/**
 * Get the model that owns a specific stock
 * @param symbol - Stock symbol to check
 * @returns Model ID or null if stock is not locked
 */
export async function getStockOwner(symbol: string): Promise<string | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('arena_stock_locks')
    .select('model_id')
    .eq('symbol', symbol.toUpperCase())
    .is('unlocked_at', null)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error(`❌ Failed to get stock owner:`, error);
    throw error;
  }

  return data?.model_id || null;
}

/**
 * Unlock all stocks owned by a specific model
 * Used when resetting a model or during cleanup
 * @param modelId - Model ID to unlock all stocks for
 */
export async function unlockAllModelStocks(modelId: string): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('arena_stock_locks')
    .update({ unlocked_at: new Date().toISOString() })
    .eq('model_id', modelId)
    .is('unlocked_at', null);

  if (error) {
    console.error(`❌ Failed to unlock model stocks:`, error);
    throw error;
  }

  console.log(`🔓 Unlocked all stocks for model ${modelId}`);
}

/**
 * Unlock all stocks (cleanup function)
 * Used during system reset or end of day
 */
export async function unlockAllStocks(): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('arena_stock_locks')
    .update({ unlocked_at: new Date().toISOString() })
    .is('unlocked_at', null);

  if (error) {
    console.error(`❌ Failed to unlock all stocks:`, error);
    throw error;
  }

  console.log(`🔓 Unlocked all stocks`);
}

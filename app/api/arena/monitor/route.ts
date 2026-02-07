import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPosition, closePosition, getLatestQuote, getPositions, getOrder, cancelOrder } from '@/lib/alpaca/client';
import { unlockStock } from '@/lib/arena/stock-locks';

/**
 * Timeframe to hours mapping for position expiry
 * After this time, positions are automatically closed
 */
const TIMEFRAME_HOURS: Record<string, number> = {
  day: 6,        // Day trading: close after 6 hours
  swing: 48,     // Swing trading: close after 2 days
  position: 168, // Position trading: close after 1 week
  'long-term': 720, // Long-term: close after 30 days
};

/**
 * Check bracket order status
 * Returns: 'active' | 'stop_hit' | 'profit_hit' | 'filled' | 'canceled' | 'unknown'
 */
async function checkBracketStatus(
  parentOrderId: string | null,
  stopLossOrderId: string | null,
  takeProfitOrderId: string | null
): Promise<{ status: string; filledPrice: number | null }> {
  // Check stop-loss order
  if (stopLossOrderId) {
    try {
      const stopOrder = await getOrder(stopLossOrderId);
      if (stopOrder?.status === 'filled') {
        return {
          status: 'stop_hit',
          filledPrice: stopOrder.filled_avg_price ? parseFloat(stopOrder.filled_avg_price) : null
        };
      }
    } catch {
      // Could not check stop-loss order
    }
  }

  // Check take-profit order
  if (takeProfitOrderId) {
    try {
      const tpOrder = await getOrder(takeProfitOrderId);
      if (tpOrder?.status === 'filled') {
        return {
          status: 'profit_hit',
          filledPrice: tpOrder.filled_avg_price ? parseFloat(tpOrder.filled_avg_price) : null
        };
      }
    } catch {
      // Could not check take-profit order
    }
  }

  // Check parent order
  if (parentOrderId) {
    try {
      const parentOrder = await getOrder(parentOrderId);
      if (parentOrder?.status === 'filled') {
        return { status: 'filled', filledPrice: null };
      }
      if (parentOrder?.status === 'canceled' || parentOrder?.status === 'expired') {
        return { status: parentOrder.status, filledPrice: null };
      }
    } catch {
      // Could not check parent order
    }
  }

  return { status: 'active', filledPrice: null };
}

/**
 * POST /api/arena/monitor
 * Monitors open arena positions and calculates real P&L
 * Handles bracket orders (stop-loss and take-profit)
 * Unlocks stocks when positions close
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    // Step 1: Get all open arena trades (bracket_status = 'active' or pnl is null)
    const { data: openTrades, error: fetchError } = await supabase
      .from('arena_trades')
      .select('*')
      .or('bracket_status.eq.active,pnl.is.null')
      .not('order_status', 'eq', 'hold_no_order')
      .not('order_status', 'eq', 'invalid_params')
      .not('order_status', 'eq', 'execution_failed');

    if (fetchError) {
      console.error('❌ Error fetching open trades:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch open trades' },
        { status: 500 }
      );
    }

    if (!openTrades || openTrades.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No open positions to monitor',
        positionsChecked: 0,
        positionsClosed: 0,
      });
    }

    // Step 2: Get current Alpaca positions for cross-reference
    let alpacaPositions: any[] = [];
    try {
      alpacaPositions = await getPositions();
    } catch {
      // Could not fetch Alpaca positions, will use quote prices
    }

    const results = {
      checked: 0,
      closed: 0,
      errors: 0,
      details: [] as any[],
    };

    // Step 3: Process each open trade
    for (const trade of openTrades) {
      results.checked++;
      const tradeAge = Date.now() - new Date(trade.created_at).getTime();
      const tradeAgeHours = tradeAge / (1000 * 60 * 60);
      const maxHours = TIMEFRAME_HOURS[trade.timeframe] || 24;

      // Determine if position should be closed
      let shouldClose = false;
      let exitReason = '';
      let exitPrice: number | null = null;

      // CHECK 1: Bracket order status (stop-loss or take-profit filled?)
      if (trade.stop_loss_order_id || trade.take_profit_order_id) {
        const bracketCheck = await checkBracketStatus(
          trade.alpaca_order_id,
          trade.stop_loss_order_id,
          trade.take_profit_order_id
        );

        if (bracketCheck.status === 'stop_hit') {
          shouldClose = true;
          exitReason = 'stop_loss_hit';
          exitPrice = bracketCheck.filledPrice || trade.stop_loss_price;
        } else if (bracketCheck.status === 'profit_hit') {
          shouldClose = true;
          exitReason = 'take_profit_hit';
          exitPrice = bracketCheck.filledPrice || trade.take_profit_price;
        } else if (bracketCheck.status === 'canceled' || bracketCheck.status === 'expired') {
          shouldClose = true;
          exitReason = `order_${bracketCheck.status}`;
        }
      }

      // CHECK 2: Time-based exit (if not already closed by bracket)
      if (!shouldClose && tradeAgeHours >= maxHours) {
        shouldClose = true;
        exitReason = `timeframe_expired_${trade.timeframe}`;
      }

      // Get current price if we need to close manually
      let currentPrice: number | null = null;
      const alpacaPos = alpacaPositions.find((p: any) => p.symbol === trade.symbol);

      if (alpacaPos) {
        currentPrice = parseFloat(alpacaPos.current_price);

        // CHECK 3: Manual stop-loss/take-profit check (if bracket orders not set)
        if (!shouldClose && !trade.stop_loss_order_id) {
          const entryPrice = trade.entry_price;
          const stopLossPrice = trade.stop_loss_price || (entryPrice * 0.9);
          const takeProfitPrice = trade.take_profit_price || (entryPrice * 1.2);

          if (currentPrice <= stopLossPrice) {
            shouldClose = true;
            exitReason = 'manual_stop_loss';
            exitPrice = currentPrice;
          } else if (currentPrice >= takeProfitPrice) {
            shouldClose = true;
            exitReason = 'manual_take_profit';
            exitPrice = currentPrice;
          }
        }
      } else if (!exitPrice) {
        // No Alpaca position - try to get current quote
        try {
          const quote = await getLatestQuote(trade.symbol);
          currentPrice = quote.price;
        } catch {
          // Could not get price for symbol
        }
      }

      // Close position if needed
      if (shouldClose) {
        // Cancel remaining bracket orders if manually closing
        if (exitReason.includes('timeframe_expired') || exitReason.includes('manual_')) {
          try {
            if (trade.stop_loss_order_id) {
              await cancelOrder(trade.stop_loss_order_id);
            }
            if (trade.take_profit_order_id) {
              await cancelOrder(trade.take_profit_order_id);
            }
          } catch {
            // Could not cancel child orders
          }
        }

        // Close Alpaca position if still open
        if (alpacaPos && !exitReason.includes('_hit')) {
          try {
            const closeOrder = await closePosition(trade.symbol);
            exitPrice = closeOrder.filled_avg_price
              ? parseFloat(closeOrder.filled_avg_price)
              : currentPrice;
          } catch (closeError) {
            console.error(`   ❌ Failed to close position:`, closeError);
            results.errors++;
            continue;
          }
        } else if (!exitPrice) {
          // Position already closed or never existed
          exitPrice = currentPrice;
          if (!exitReason) {
            exitReason = 'position_not_found';
          }
        }

        // Calculate P&L
        if (exitPrice !== null) {
          const entryPrice = trade.entry_price || 0;
          const quantity = trade.quantity || 0;

          // P&L = (exit - entry) * quantity for BUY
          const pnl = (exitPrice - entryPrice) * quantity;
          const pnlPercent = entryPrice > 0 ? ((exitPrice - entryPrice) / entryPrice) * 100 : 0;

          // Update database with REAL P&L
          const { error: updateError } = await supabase
            .from('arena_trades')
            .update({
              exit_price: exitPrice,
              exit_reason: exitReason,
              exit_at: new Date().toISOString(),
              pnl: parseFloat(pnl.toFixed(2)),
              pnl_percent: parseFloat(pnlPercent.toFixed(2)),
              bracket_status: exitReason.includes('stop') ? 'stop_hit' :
                             exitReason.includes('profit') ? 'profit_hit' : 'closed',
            })
            .eq('id', trade.id);

          if (updateError) {
            console.error(`   ❌ Failed to update trade:`, updateError);
            results.errors++;
          } else {
            // UNLOCK STOCK when position closes
            try {
              await unlockStock(trade.symbol);
            } catch {
              // Could not unlock stock
            }

            results.closed++;
            results.details.push({
              symbol: trade.symbol,
              model: trade.model_name || trade.model_id,
              entryPrice,
              exitPrice,
              pnl: parseFloat(pnl.toFixed(2)),
              pnlPercent: parseFloat(pnlPercent.toFixed(2)),
              exitReason,
            });

            // Update model performance (if table exists)
            try {
              await updateModelPerformance(supabase, trade.model_id, pnl, pnlPercent);
            } catch {
              // Could not update model performance
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      positionsChecked: results.checked,
      positionsClosed: results.closed,
      errors: results.errors,
      details: results.details,
    });

  } catch (error) {
    console.error('❌ Arena monitor error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Update model performance stats
 */
async function updateModelPerformance(
  supabase: any,
  modelId: string,
  pnl: number,
  pnlPercent: number
): Promise<void> {
  // Get existing performance record
  const { data: existing } = await supabase
    .from('model_performance')
    .select('*')
    .eq('model_id', modelId)
    .single();

  if (existing) {
    // Update existing record
    const newTotalPnl = (existing.total_pnl || 0) + pnl;
    const newTradeCount = (existing.trade_count || 0) + 1;
    const newWins = pnl > 0 ? (existing.wins || 0) + 1 : (existing.wins || 0);
    const newLosses = pnl < 0 ? (existing.losses || 0) + 1 : (existing.losses || 0);

    await supabase
      .from('model_performance')
      .update({
        total_pnl: newTotalPnl,
        trade_count: newTradeCount,
        wins: newWins,
        losses: newLosses,
        win_rate: newTradeCount > 0 ? (newWins / newTradeCount) * 100 : 0,
        avg_pnl_percent: newTradeCount > 0 ? newTotalPnl / newTradeCount : 0,
        last_trade_at: new Date().toISOString(),
      })
      .eq('model_id', modelId);
  } else {
    // Create new record
    await supabase
      .from('model_performance')
      .insert({
        model_id: modelId,
        total_pnl: pnl,
        trade_count: 1,
        wins: pnl > 0 ? 1 : 0,
        losses: pnl < 0 ? 1 : 0,
        win_rate: pnl > 0 ? 100 : 0,
        avg_pnl_percent: pnlPercent,
        last_trade_at: new Date().toISOString(),
      });
  }
}

/**
 * GET /api/arena/monitor
 * Returns status of open positions without closing them
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get all open arena trades
    const { data: openTrades, error } = await supabase
      .from('arena_trades')
      .select('*')
      .or('bracket_status.eq.active,pnl.is.null')
      .not('order_status', 'eq', 'hold_no_order')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch positions' }, { status: 500 });
    }

    // Get current prices for each unique symbol
    const trades = openTrades || [];
    const symbolSet = new Set<string>();
    trades.forEach((t: any) => symbolSet.add(t.symbol as string));
    const symbols: string[] = Array.from(symbolSet);
    const prices: Record<string, number> = {};

    for (const symbol of symbols) {
      try {
        const quote = await getLatestQuote(symbol);
        prices[symbol] = quote.price;
      } catch (err) {
        prices[symbol] = 0;
      }
    }

    // Calculate unrealized P&L for each position
    const positions = trades.map((trade: any) => {
      const currentPrice = prices[trade.symbol] || 0;
      const entryPrice = trade.entry_price || 0;
      const quantity = trade.quantity || 0;
      const unrealizedPnl = (currentPrice - entryPrice) * quantity;
      const unrealizedPnlPercent = entryPrice > 0 ? ((currentPrice - entryPrice) / entryPrice) * 100 : 0;

      // Calculate distance to stop-loss and take-profit
      const stopLossDistance = trade.stop_loss_price
        ? ((currentPrice - trade.stop_loss_price) / currentPrice) * 100
        : null;
      const takeProfitDistance = trade.take_profit_price
        ? ((trade.take_profit_price - currentPrice) / currentPrice) * 100
        : null;

      return {
        id: trade.id,
        symbol: trade.symbol,
        model: trade.model_name || trade.model_id,
        action: trade.action,
        quantity,
        entryPrice,
        currentPrice,
        stopLossPrice: trade.stop_loss_price,
        takeProfitPrice: trade.take_profit_price,
        unrealizedPnl: parseFloat(unrealizedPnl.toFixed(2)),
        unrealizedPnlPercent: parseFloat(unrealizedPnlPercent.toFixed(2)),
        stopLossDistance: stopLossDistance ? parseFloat(stopLossDistance.toFixed(2)) : null,
        takeProfitDistance: takeProfitDistance ? parseFloat(takeProfitDistance.toFixed(2)) : null,
        bracketStatus: trade.bracket_status,
        timeframe: trade.timeframe,
        createdAt: trade.created_at,
      };
    });

    return NextResponse.json({
      success: true,
      openPositions: positions.length,
      positions,
      totalUnrealizedPnl: positions.reduce((sum: number, p: any) => sum + p.unrealizedPnl, 0),
    });

  } catch (error) {
    console.error('❌ Arena monitor GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

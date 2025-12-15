/**
 * Arena Trade History API
 *
 * Returns complete trade history with all details:
 * - Entry, stop loss, take profit prices
 * - P&L for closed trades
 * - Reasoning and confidence
 * - Status (active/closed)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export interface TradeHistoryItem {
  id: string;
  modelId: string;
  modelName: string;
  provider: string;
  symbol: string;
  action: string;
  quantity: number;

  // Prices
  entryPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  exitPrice: number | null;
  filledPrice: number | null;

  // P&L
  pnl: number | null;
  pnlPercent: number | null;

  // Status
  status: 'active' | 'closed';
  bracketStatus: string | null;
  exitReason: string | null;
  orderStatus: string | null;

  // Context
  confidence: number | null;
  reasoning: string;
  timeframe: string | null;

  // Timestamps
  createdAt: string;
  filledAt: string | null;
  exitAt: string | null;
}

export interface TradeHistoryResponse {
  success: boolean;
  trades: TradeHistoryItem[];
  totalTrades: number;
  activeTrades: number;
  closedTrades: number;
  error?: string;
}

/**
 * GET /api/arena/history
 *
 * Query params:
 * - status: 'active' | 'closed' | 'all' (default: 'all')
 * - limit: number (default: 50)
 * - model: string (optional, filter by model_id)
 * - symbol: string (optional, filter by symbol)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const limit = parseInt(searchParams.get('limit') || '50');
    const modelFilter = searchParams.get('model');
    const symbolFilter = searchParams.get('symbol');

    const supabase = await createClient();

    // Build query
    let query = supabase
      .from('arena_trades')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    // Filter by status (pnl NULL = active, pnl NOT NULL = closed)
    if (status === 'active') {
      query = query.is('pnl', null);
    } else if (status === 'closed') {
      query = query.not('pnl', 'is', null);
    }

    // Optional filters
    if (modelFilter) {
      query = query.eq('model_id', modelFilter);
    }
    if (symbolFilter) {
      query = query.eq('symbol', symbolFilter.toUpperCase());
    }

    const { data: trades, error } = await query;

    if (error) {
      console.error('Trade history query error:', error);
      return NextResponse.json(
        { success: false, error: error.message, trades: [], totalTrades: 0, activeTrades: 0, closedTrades: 0 },
        { status: 500 }
      );
    }

    // Count totals
    const { count: totalCount } = await supabase
      .from('arena_trades')
      .select('*', { count: 'exact', head: true });

    const { count: activeCount } = await supabase
      .from('arena_trades')
      .select('*', { count: 'exact', head: true })
      .is('pnl', null);

    // Format trades
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formattedTrades: TradeHistoryItem[] = (trades || []).map((trade: any) => {
      // Extract reasoning from JSONB if needed
      let reasoning = '';
      if (typeof trade.reasoning === 'string') {
        reasoning = trade.reasoning;
      } else if (trade.reasoning && typeof trade.reasoning === 'object') {
        reasoning = trade.reasoning.text || trade.reasoning.reasoning || JSON.stringify(trade.reasoning);
      }

      return {
        id: trade.id,
        modelId: trade.model_id,
        modelName: trade.model_name,
        provider: trade.provider,
        symbol: trade.symbol,
        action: trade.action || 'BUY',
        quantity: trade.quantity || 0,

        // Prices
        entryPrice: trade.entry_price ? parseFloat(trade.entry_price) : null,
        stopLoss: trade.stop_loss_price || trade.stop_loss ? parseFloat(trade.stop_loss_price || trade.stop_loss) : null,
        takeProfit: trade.take_profit_price || trade.take_profit ? parseFloat(trade.take_profit_price || trade.take_profit) : null,
        exitPrice: trade.exit_price ? parseFloat(trade.exit_price) : null,
        filledPrice: trade.filled_price ? parseFloat(trade.filled_price) : null,

        // P&L
        pnl: trade.pnl ? parseFloat(trade.pnl) : null,
        pnlPercent: trade.pnl_percent ? parseFloat(trade.pnl_percent) : null,

        // Status
        status: trade.pnl !== null ? 'closed' : 'active',
        bracketStatus: trade.bracket_status,
        exitReason: trade.exit_reason,
        orderStatus: trade.order_status,

        // Context
        confidence: trade.confidence ? parseFloat(trade.confidence) : null,
        reasoning: reasoning,
        timeframe: trade.timeframe,

        // Timestamps
        createdAt: trade.created_at,
        filledAt: trade.filled_at,
        exitAt: trade.exit_at,
      };
    });

    const response: TradeHistoryResponse = {
      success: true,
      trades: formattedTrades,
      totalTrades: totalCount || 0,
      activeTrades: activeCount || 0,
      closedTrades: (totalCount || 0) - (activeCount || 0),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Trade history error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        trades: [],
        totalTrades: 0,
        activeTrades: 0,
        closedTrades: 0,
      },
      { status: 500 }
    );
  }
}

/**
 * Screening Debate Trade Executor
 *
 * Executes paper trades based on judge BUY verdicts via BrokerFactory.
 * Supports both Alpaca (paper-only) and IBKR (paper available).
 *
 * Safety:
 * - Auto-trade must be explicitly enabled
 * - Confidence must exceed threshold
 * - Position size capped by config
 * - Paper mode enforced for Alpaca; IBKR requires careful setup
 */

import { BrokerFactory } from '@/lib/brokers/broker-factory'
import type { BrokerId, OrderRequest } from '@/lib/brokers/types'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import type { ScreeningDebateConfig, ScreeningJudgeResult, StockDebateResult } from './types'

export interface TradeExecutionResult {
  executed: boolean
  orderId?: string
  brokerId?: BrokerId
  filledPrice?: number
  quantity?: number
  error?: string
  timestamp?: string
}

/**
 * Execute a trade based on judge verdict.
 * Only executes for BUY verdicts above confidence threshold.
 */
export async function executeScreeningTrade(
  symbol: string,
  verdict: ScreeningJudgeResult,
  config: ScreeningDebateConfig,
  debateId: string
): Promise<TradeExecutionResult> {
  const timestamp = new Date().toISOString()

  // Safety checks
  if (!config.autoTrade) {
    return { executed: false, error: 'Auto-trade not enabled', timestamp }
  }

  if (verdict.verdict !== 'BUY') {
    return { executed: false, error: `Verdict is ${verdict.verdict}, not BUY`, timestamp }
  }

  if (verdict.confidence < config.minConfidence) {
    return {
      executed: false,
      error: `Confidence ${verdict.confidence}% below threshold ${config.minConfidence}%`,
      timestamp,
    }
  }

  // Determine position size
  const quantity = Math.min(
    verdict.positionSize || 1,
    config.maxPositionSize
  )

  if (quantity < 1) {
    return { executed: false, error: 'Position size too small', timestamp }
  }

  try {
    // Get broker (configured via env or explicit brokerId)
    const broker = config.brokerId
      ? BrokerFactory.getBroker(config.brokerId, config.brokerId === 'ibkr' ? 'paper' : 'paper')
      : BrokerFactory.getActiveBroker()

    // Verify broker connection
    const connected = await broker.isConnected()
    if (!connected) {
      await broker.connect()
    }

    // Build order request
    const orderRequest: OrderRequest = {
      symbol: symbol.toUpperCase(),
      quantity,
      side: 'buy',
      type: verdict.entryPrice ? 'limit' : 'market',
      limitPrice: verdict.entryPrice || undefined,
      timeInForce: 'day',
    }

    // Place order
    const order = await broker.placeOrder(orderRequest)

    const result: TradeExecutionResult = {
      executed: true,
      orderId: order.id,
      brokerId: broker.id,
      filledPrice: order.filledAvgPrice || verdict.entryPrice || undefined,
      quantity,
      timestamp,
    }

    // Record in paper_trades table
    try {
      const supabase = getSupabaseAdmin()
      await supabase.from('paper_trades').insert({
        symbol: symbol.toUpperCase(),
        action: 'BUY',
        quantity,
        price: order.filledAvgPrice || verdict.entryPrice || 0,
        broker_id: broker.id,
        order_id: order.id,
        source: 'screening_debate',
        metadata: {
          debate_id: debateId,
          confidence: verdict.confidence,
          stop_loss: verdict.stopLoss,
          take_profit: verdict.takeProfit,
          risk_level: verdict.riskLevel,
        },
        created_at: timestamp,
      })
    } catch (dbError) {
      console.error('Failed to record trade in paper_trades:', dbError)
      // Trade was still executed - don't fail
    }

    return result
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error(`Trade execution failed for ${symbol}:`, errorMsg)
    return {
      executed: false,
      error: errorMsg,
      timestamp,
    }
  }
}

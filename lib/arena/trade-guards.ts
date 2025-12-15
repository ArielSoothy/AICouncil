/**
 * Arena Trade Guards - Track today's trading activity
 *
 * Provides functions to fetch and display which models/stocks
 * have been traded today. Used for UI indicators (not blocking).
 */

import { createClient } from '@/lib/supabase/server'

interface ArenaTrade {
  model_id: string
  model_name: string | null
  symbol: string
  action: string
  created_at: string
}

export interface TodaysTrades {
  modelsTradedToday: string[]
  stocksTradedToday: string[]
  tradeDetails: Array<{
    modelId: string
    modelName: string
    symbol: string
    action: string
    createdAt: string
  }>
}

/**
 * Get helper for start/end of today in UTC
 */
function getTodayBounds(): { start: string; end: string } {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)

  return {
    start: start.toISOString(),
    end: end.toISOString()
  }
}

/**
 * Fetch all trades executed today
 * Used for UI indicators showing which models/stocks have traded
 */
export async function getTodaysTrades(): Promise<TodaysTrades> {
  const supabase = await createClient()
  const { start, end } = getTodayBounds()

  const { data: trades, error } = await supabase
    .from('arena_trades')
    .select('model_id, model_name, symbol, action, created_at')
    .gte('created_at', start)
    .lt('created_at', end)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching today\'s trades:', error)
    return {
      modelsTradedToday: [],
      stocksTradedToday: [],
      tradeDetails: []
    }
  }

  // Type assertion for Supabase query result
  const typedTrades = (trades || []) as ArenaTrade[]

  const modelsTradedToday = [...new Set(typedTrades.map(t => t.model_id))]
  const stocksTradedToday = [...new Set(typedTrades.map(t => t.symbol))]
  const tradeDetails = typedTrades.map(t => ({
    modelId: t.model_id,
    modelName: t.model_name || t.model_id,
    symbol: t.symbol,
    action: t.action,
    createdAt: t.created_at
  }))

  return {
    modelsTradedToday,
    stocksTradedToday,
    tradeDetails
  }
}

/**
 * Check if a specific model has traded today
 */
export async function hasModelTradedToday(modelId: string): Promise<boolean> {
  const { modelsTradedToday } = await getTodaysTrades()
  return modelsTradedToday.includes(modelId)
}

/**
 * Check if a specific stock was traded today
 */
export async function wasStockTradedToday(symbol: string): Promise<boolean> {
  const { stocksTradedToday } = await getTodaysTrades()
  return stocksTradedToday.includes(symbol.toUpperCase())
}

/**
 * Get summary message for today's trading activity
 */
export function formatTodaysActivitySummary(trades: TodaysTrades): string {
  if (trades.tradeDetails.length === 0) {
    return 'No trades executed today'
  }

  const count = trades.tradeDetails.length
  const uniqueModels = trades.modelsTradedToday.length
  const uniqueStocks = trades.stocksTradedToday.length

  return `${count} trade${count !== 1 ? 's' : ''} today by ${uniqueModels} model${uniqueModels !== 1 ? 's' : ''} on ${uniqueStocks} stock${uniqueStocks !== 1 ? 's' : ''}`
}

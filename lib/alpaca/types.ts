// Trading action types
export type TradeAction = 'BUY' | 'SELL' | 'HOLD';
export type OrderSide = 'buy' | 'sell';
export type OrderType = 'market' | 'limit' | 'stop' | 'stop_limit';
export type OrderClass = 'simple' | 'bracket' | 'oco' | 'oto';

// Alpaca account info
export interface AlpacaAccount {
  id: string;
  account_number: string;
  status: string;
  currency: string;
  buying_power: string;
  cash: string;
  portfolio_value: string;
  equity: string;
  last_equity: string;
}

// Alpaca position
export interface AlpacaPosition {
  symbol: string;
  qty: string;
  market_value: string;
  avg_entry_price: string;
  current_price: string;
  unrealized_pl: string;
}

// Alpaca order
export interface AlpacaOrder {
  id: string;
  symbol: string;
  qty: string;
  side: OrderSide;
  type: OrderType;
  status: string;
  filled_avg_price?: string;
  submitted_at: string;
  // Bracket order fields
  order_class?: OrderClass;
  legs?: AlpacaOrder[];  // Child orders (stop-loss, take-profit)
}

// Bracket order result (parent + child orders)
export interface BracketOrderResult {
  parentOrder: AlpacaOrder;
  stopLossOrderId: string;
  takeProfitOrderId: string;
  legs: AlpacaOrder[];
}

// AI model trade decision
export interface TradeDecision {
  action: TradeAction;
  symbol: string;
  quantity: number;
  reasoning: string;
  confidence: number;
  model?: string; // Optional model ID for judge weighting

  // Tool usage tracking (Hybrid Research Mode)
  toolsUsed?: boolean; // Whether this decision used AI research tools
  toolCallCount?: number; // Number of tool calls made
  toolNames?: string[]; // Names of tools used (e.g., ['get_stock_quote', 'calculate_rsi'])
  researchTrail?: Array<{ // Detailed research steps (optional, for UI display)
    tool: string;
    args: Record<string, any>;
    result: string;
    timestamp: number;
  }>;
}

// Arena Mode trade decision (includes bracket order parameters)
export interface ArenaTradeDecision extends TradeDecision {
  stopLoss: number;      // Stop-loss price
  takeProfit: number;    // Take-profit price
  entryPrice?: number;   // Expected entry price (for limit orders)
  riskRewardRatio?: string; // e.g., "2.5:1"
}

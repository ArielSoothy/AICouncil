// Trading action types
export type TradeAction = 'BUY' | 'SELL' | 'HOLD';
export type OrderSide = 'buy' | 'sell';
export type OrderType = 'market' | 'limit';

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
}

// AI model trade decision
export interface TradeDecision {
  action: TradeAction;
  symbol: string;
  quantity: number;
  reasoning: string;
  confidence: number;
  model?: string; // Optional model ID for judge weighting
}

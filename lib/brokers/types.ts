/**
 * Broker Abstraction Layer - Type Definitions
 *
 * Unified types for multi-broker support:
 * - Alpaca: Paper trading (default)
 * - IBKR: Real money trading (Israel)
 *
 * Architecture: Strategy pattern for broker implementations
 */

// Broker identification
export type BrokerId = 'alpaca' | 'ibkr';

export type BrokerEnvironment = 'paper' | 'live';

// Unified account interface (broker-agnostic)
export interface BrokerAccount {
  id: string;
  accountNumber: string;
  brokerId: BrokerId;
  environment: BrokerEnvironment;
  status: 'active' | 'inactive' | 'restricted';
  currency: string;
  buyingPower: number;
  cash: number;
  portfolioValue: number;
  equity: number;
  lastEquity: number;
  dayTradeCount?: number;
  patternDayTrader?: boolean;
}

// Unified position interface
export interface BrokerPosition {
  symbol: string;
  quantity: number;
  marketValue: number;
  avgEntryPrice: number;
  currentPrice: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  side: 'long' | 'short';
  brokerId: BrokerId;
}

// Order types
export type OrderSide = 'buy' | 'sell';
export type OrderType = 'market' | 'limit' | 'stop' | 'stop_limit';
export type TimeInForce = 'day' | 'gtc' | 'ioc' | 'fok';
export type OrderStatus =
  | 'new'
  | 'pending'
  | 'accepted'
  | 'filled'
  | 'partially_filled'
  | 'cancelled'
  | 'rejected'
  | 'expired';

// Order request (what we send to broker)
export interface OrderRequest {
  symbol: string;
  quantity: number;
  side: OrderSide;
  type: OrderType;
  limitPrice?: number;
  stopPrice?: number;
  timeInForce: TimeInForce;
  extendedHours?: boolean;
  clientOrderId?: string;
}

// Unified order interface (what we get back)
export interface BrokerOrder {
  id: string;
  clientOrderId?: string;
  brokerId: BrokerId;
  symbol: string;
  quantity: number;
  filledQuantity: number;
  side: OrderSide;
  type: OrderType;
  status: OrderStatus;
  limitPrice?: number;
  stopPrice?: number;
  filledAvgPrice?: number;
  timeInForce: TimeInForce;
  submittedAt: Date;
  filledAt?: Date;
  cancelledAt?: Date;
  commission?: number;
}

// Quote data
export interface BrokerQuote {
  symbol: string;
  bidPrice: number;
  bidSize: number;
  askPrice: number;
  askSize: number;
  lastPrice: number;
  lastSize: number;
  volume: number;
  timestamp: Date;
  brokerId: BrokerId;
}

// Historical bar data
export interface BrokerBar {
  symbol: string;
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap?: number;
}

// Broker capabilities (not all brokers support all features)
export interface BrokerCapabilities {
  paperTrading: boolean;
  liveTrading: boolean;
  fractionalShares: boolean;
  extendedHours: boolean;
  options: boolean;
  crypto: boolean;
  forex: boolean;
  marginTrading: boolean;
  shortSelling: boolean;
  realTimeQuotes: boolean;
  historicalData: boolean;
  streaming: boolean;
}

// Broker configuration
export interface BrokerConfig {
  id: BrokerId;
  name: string;
  environment: BrokerEnvironment;
  capabilities: BrokerCapabilities;
  apiKeyEnvVar: string;
  secretKeyEnvVar: string;
  baseUrl?: string;
}

// Broker interface - all brokers must implement this
export interface IBroker {
  readonly id: BrokerId;
  readonly name: string;
  readonly environment: BrokerEnvironment;
  readonly capabilities: BrokerCapabilities;

  // Connection
  isConnected(): Promise<boolean>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;

  // Account
  getAccount(): Promise<BrokerAccount>;

  // Positions
  getPositions(): Promise<BrokerPosition[]>;
  getPosition(symbol: string): Promise<BrokerPosition | null>;

  // Orders
  placeOrder(request: OrderRequest): Promise<BrokerOrder>;
  cancelOrder(orderId: string): Promise<boolean>;
  getOrder(orderId: string): Promise<BrokerOrder | null>;
  getOrders(status?: OrderStatus): Promise<BrokerOrder[]>;

  // Market data (optional - not all brokers provide this)
  getQuote?(symbol: string): Promise<BrokerQuote>;
  getBars?(
    symbol: string,
    timeframe: string,
    start: Date,
    end: Date
  ): Promise<BrokerBar[]>;
}

// Broker error types
export class BrokerError extends Error {
  constructor(
    public brokerId: BrokerId,
    public code: string,
    message: string,
    public originalError?: unknown
  ) {
    super(`[${brokerId}] ${message}`);
    this.name = 'BrokerError';
  }
}

export class ConnectionError extends BrokerError {
  constructor(brokerId: BrokerId, message: string, originalError?: unknown) {
    super(brokerId, 'CONNECTION_ERROR', message, originalError);
    this.name = 'ConnectionError';
  }
}

export class OrderError extends BrokerError {
  constructor(brokerId: BrokerId, message: string, originalError?: unknown) {
    super(brokerId, 'ORDER_ERROR', message, originalError);
    this.name = 'OrderError';
  }
}

export class InsufficientFundsError extends BrokerError {
  constructor(brokerId: BrokerId, message: string, originalError?: unknown) {
    super(brokerId, 'INSUFFICIENT_FUNDS', message, originalError);
    this.name = 'InsufficientFundsError';
  }
}

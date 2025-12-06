/**
 * Interactive Brokers (IBKR) Broker Implementation
 *
 * Real money trading broker for production use.
 * Uses the IBKR Client Portal API (Web API).
 *
 * Prerequisites:
 * 1. IBKR account (Pro or Lite)
 * 2. Client Portal Gateway running locally or on server
 * 3. Authentication via Client Portal web interface
 *
 * Note: IBKR Web API requires the Gateway to be running and authenticated.
 * This is different from TWS API which requires TWS/IB Gateway desktop app.
 *
 * Documentation: https://interactivebrokers.github.io/cpwebapi/
 */

import {
  IBroker,
  BrokerId,
  BrokerEnvironment,
  BrokerCapabilities,
  BrokerAccount,
  BrokerPosition,
  BrokerOrder,
  BrokerQuote,
  OrderRequest,
  OrderStatus,
  ConnectionError,
  OrderError,
} from './types';

interface IBKRConfig {
  gatewayUrl: string;
  accountId?: string;
}

// IBKR API response types
interface IBKRAccountSummary {
  baseCurrency?: string;
  buyingpower?: { amount: number };
  totalcashvalue?: { amount: number };
  netliquidation?: { amount: number };
  previousdayequitywithloanvalue?: { amount: number };
}

interface IBKRPosition {
  contractDesc?: string;
  ticker?: string;
  position?: number;
  mktValue?: number;
  avgCost?: number;
  mktPrice?: number;
  unrealizedPnl?: number;
}

interface IBKRContract {
  conid: number;
  symbol?: string;
  secType?: string;
}

interface IBKROrderResult {
  id?: string;
  order_id?: string;
  message?: string;
}

interface IBKROrder {
  orderId?: number;
  order_id?: string;
  ticker?: string;
  symbol?: string;
  totalQuantity?: number;
  quantity?: number;
  filledQuantity?: number;
  side?: string;
  orderType?: string;
  status?: string;
  price?: number;
  auxPrice?: number;
  avgPrice?: number;
  timeInForce?: string;
  lastExecutionTime?: string | number;
}

interface IBKRMarketDataSnapshot {
  '31'?: number; // Last price
  '84'?: number; // Bid price
  '85'?: number; // Ask size
  '86'?: number; // Ask price
  '87'?: number; // Last size
  '88'?: number; // Bid size
}

export class IBKRBroker implements IBroker {
  readonly id: BrokerId = 'ibkr';
  readonly name = 'Interactive Brokers';
  readonly environment: BrokerEnvironment;
  readonly capabilities: BrokerCapabilities = {
    paperTrading: true,
    liveTrading: true,
    fractionalShares: false, // IBKR has limited fractional support
    extendedHours: true,
    options: true,
    crypto: true,
    forex: true,
    marginTrading: true,
    shortSelling: true,
    realTimeQuotes: true,
    historicalData: true,
    streaming: true,
  };

  private config: IBKRConfig;
  private accountId: string | null = null;
  private connected = false;

  constructor(environment: BrokerEnvironment = 'live') {
    this.environment = environment;

    // IBKR Client Portal Gateway URL
    // Default: localhost:5050 for local Gateway (port 5000 used by macOS)
    // Production: Your server running the Gateway
    this.config = {
      gatewayUrl:
        process.env.IBKR_GATEWAY_URL || 'https://localhost:5050/v1/api',
      accountId: process.env.IBKR_ACCOUNT_ID,
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.config.gatewayUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      cache: 'no-store', // Disable caching - always fetch fresh data
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new ConnectionError(
        this.id,
        `API request failed: ${response.status} - ${errorText}`
      );
    }

    return response.json();
  }

  async isConnected(): Promise<boolean> {
    if (!this.connected) return false;
    try {
      const status = await this.request<{ authenticated: boolean }>(
        '/iserver/auth/status'
      );
      return status.authenticated;
    } catch {
      this.connected = false;
      return false;
    }
  }

  async connect(): Promise<void> {
    try {
      // Check authentication status
      const status = await this.request<{
        authenticated: boolean;
        connected: boolean;
      }>('/iserver/auth/status');

      if (!status.authenticated) {
        throw new ConnectionError(
          this.id,
          'Not authenticated. Please login via Client Portal Gateway web interface.'
        );
      }

      // Get accounts
      const accounts = await this.request<{ accounts: string[] }>(
        '/iserver/accounts'
      );

      if (!accounts.accounts || accounts.accounts.length === 0) {
        throw new ConnectionError(this.id, 'No accounts found');
      }

      // Use configured account or first available
      this.accountId = this.config.accountId || accounts.accounts[0];
      this.connected = true;
    } catch (error) {
      if (error instanceof ConnectionError) throw error;
      throw new ConnectionError(
        this.id,
        'Failed to connect to IBKR Gateway. Ensure Gateway is running and authenticated.',
        error
      );
    }
  }

  async disconnect(): Promise<void> {
    // IBKR Gateway manages session, we just clear local state
    this.connected = false;
    this.accountId = null;
  }

  async getAccount(): Promise<BrokerAccount> {
    // Auto-connect if not connected
    if (!this.accountId) {
      await this.connect();
    }

    // Ensure accountId is set after connect
    const accountId = this.accountId!;

    try {
      const summary = await this.request<IBKRAccountSummary>(
        `/portfolio/${accountId}/summary`
      );

      return {
        id: accountId,
        accountNumber: accountId,
        brokerId: this.id,
        environment: this.environment,
        status: 'active',
        currency: summary.baseCurrency || 'USD',
        buyingPower: summary.buyingpower?.amount || 0,
        cash: summary.totalcashvalue?.amount || 0, // Actual settled cash
        portfolioValue: summary.netliquidation?.amount || 0,
        equity: summary.netliquidation?.amount || 0,
        lastEquity: summary.previousdayequitywithloanvalue?.amount || 0, // Previous day equity
      };
    } catch (error) {
      throw new ConnectionError(this.id, 'Failed to get account summary', error);
    }
  }

  async getPositions(): Promise<BrokerPosition[]> {
    // Auto-connect if not connected
    if (!this.accountId) {
      await this.connect();
    }

    // Ensure accountId is set after connect
    const accountId = this.accountId!;

    try {
      const positions = await this.request<IBKRPosition[]>(
        `/portfolio/${accountId}/positions/0`
      );

      return positions.map((pos: IBKRPosition) => {
        const avgCost = pos.avgCost ?? 0;
        const mktPrice = pos.mktPrice ?? 0;
        return {
          symbol: pos.contractDesc || pos.ticker || 'UNKNOWN',
          quantity: Math.abs(pos.position || 0),
          marketValue: pos.mktValue || 0,
          avgEntryPrice: avgCost,
          currentPrice: mktPrice,
          unrealizedPL: pos.unrealizedPnl || 0,
          unrealizedPLPercent:
            avgCost > 0
              ? ((mktPrice - avgCost) / avgCost) * 100
              : 0,
          side: (pos.position || 0) >= 0 ? 'long' : 'short',
          brokerId: this.id,
        };
      });
    } catch (error) {
      throw new ConnectionError(this.id, 'Failed to get positions', error);
    }
  }

  async getPosition(symbol: string): Promise<BrokerPosition | null> {
    const positions = await this.getPositions();
    return positions.find((p) => p.symbol === symbol) || null;
  }

  async placeOrder(request: OrderRequest): Promise<BrokerOrder> {
    if (!this.accountId) {
      throw new ConnectionError(this.id, 'Not connected');
    }

    try {
      // First, get the contract ID for the symbol
      const contracts = await this.request<IBKRContract[]>(
        `/iserver/secdef/search?symbol=${request.symbol}&secType=STK`
      );

      if (!contracts || contracts.length === 0) {
        throw new OrderError(this.id, `Symbol not found: ${request.symbol}`);
      }

      const conid = contracts[0].conid;

      // Place the order
      const orderPayload = {
        acctId: this.accountId,
        conid,
        secType: 'STK',
        orderType: this.mapOrderTypeToIBKR(request.type),
        side: request.side.toUpperCase(),
        quantity: request.quantity,
        tif: this.mapTimeInForceToIBKR(request.timeInForce),
        price: request.limitPrice,
        auxPrice: request.stopPrice,
        outsideRTH: request.extendedHours,
      };

      const result = await this.request<IBKROrderResult[]>('/iserver/account/orders', {
        method: 'POST',
        body: JSON.stringify({ orders: [orderPayload] }),
      });

      // IBKR may require order confirmation
      if (result[0]?.id && result[0]?.message) {
        // Confirm the order
        await this.request(`/iserver/reply/${result[0].id}`, {
          method: 'POST',
          body: JSON.stringify({ confirmed: true }),
        });
      }

      const orderId = result[0]?.order_id || result[0]?.id || '';

      return {
        id: orderId,
        clientOrderId: request.clientOrderId,
        brokerId: this.id,
        symbol: request.symbol,
        quantity: request.quantity,
        filledQuantity: 0,
        side: request.side,
        type: request.type,
        status: 'pending',
        limitPrice: request.limitPrice,
        stopPrice: request.stopPrice,
        timeInForce: request.timeInForce,
        submittedAt: new Date(),
      };
    } catch (error) {
      if (error instanceof OrderError) throw error;
      throw new OrderError(
        this.id,
        `Failed to place order: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    if (!this.accountId) {
      throw new ConnectionError(this.id, 'Not connected');
    }

    try {
      await this.request(`/iserver/account/${this.accountId}/order/${orderId}`, {
        method: 'DELETE',
      });
      return true;
    } catch {
      // Order may not exist or already filled
      return false;
    }
  }

  async getOrder(orderId: string): Promise<BrokerOrder | null> {
    const orders = await this.getOrders();
    return orders.find((o) => o.id === orderId) || null;
  }

  async getOrders(status?: OrderStatus): Promise<BrokerOrder[]> {
    try {
      const orders = await this.request<IBKROrder[]>('/iserver/account/orders');

      return orders
        .map((order: IBKROrder) => this.mapOrder(order))
        .filter((o) => !status || o.status === status);
    } catch (error) {
      throw new OrderError(this.id, 'Failed to get orders', error);
    }
  }

  async getQuote(symbol: string): Promise<BrokerQuote> {
    try {
      // First get contract ID
      const contracts = await this.request<IBKRContract[]>(
        `/iserver/secdef/search?symbol=${symbol}&secType=STK`
      );

      if (!contracts || contracts.length === 0) {
        throw new ConnectionError(this.id, `Symbol not found: ${symbol}`);
      }

      const conid = contracts[0].conid;

      // Get market data snapshot
      const snapshot = await this.request<IBKRMarketDataSnapshot[]>(
        `/iserver/marketdata/snapshot?conids=${conid}&fields=31,84,85,86,87,88`
      );

      const data: IBKRMarketDataSnapshot = snapshot[0] || {};

      return {
        symbol,
        bidPrice: data['84'] || 0, // Bid price
        bidSize: data['88'] || 0, // Bid size
        askPrice: data['86'] || 0, // Ask price
        askSize: data['85'] || 0, // Ask size
        lastPrice: data['31'] || 0, // Last price
        lastSize: data['87'] || 0, // Last size
        volume: 0,
        timestamp: new Date(),
        brokerId: this.id,
      };
    } catch (error) {
      throw new ConnectionError(
        this.id,
        `Failed to get quote for ${symbol}`,
        error
      );
    }
  }

  private mapOrder(order: IBKROrder): BrokerOrder {
    return {
      id: order.orderId?.toString() || order.order_id || '',
      brokerId: this.id,
      symbol: order.ticker || order.symbol || 'UNKNOWN',
      quantity: Math.abs(order.totalQuantity || order.quantity || 0),
      filledQuantity: order.filledQuantity || 0,
      side: order.side?.toLowerCase() === 'buy' ? 'buy' : 'sell',
      type: this.mapOrderTypeFromIBKR(order.orderType || ''),
      status: this.mapOrderStatusFromIBKR(order.status || ''),
      limitPrice: order.price,
      stopPrice: order.auxPrice,
      filledAvgPrice: order.avgPrice,
      timeInForce: this.mapTimeInForceFromIBKR(order.timeInForce || ''),
      submittedAt: order.lastExecutionTime
        ? new Date(order.lastExecutionTime)
        : new Date(),
    };
  }

  private mapOrderTypeToIBKR(type: string): string {
    const typeMap: Record<string, string> = {
      market: 'MKT',
      limit: 'LMT',
      stop: 'STP',
      stop_limit: 'STP LMT',
    };
    return typeMap[type] || 'MKT';
  }

  private mapOrderTypeFromIBKR(type: string): 'market' | 'limit' | 'stop' | 'stop_limit' {
    const typeMap: Record<string, 'market' | 'limit' | 'stop' | 'stop_limit'> = {
      MKT: 'market',
      LMT: 'limit',
      STP: 'stop',
      'STP LMT': 'stop_limit',
    };
    return typeMap[type] || 'market';
  }

  private mapTimeInForceToIBKR(tif: string): string {
    const tifMap: Record<string, string> = {
      day: 'DAY',
      gtc: 'GTC',
      ioc: 'IOC',
      fok: 'FOK',
    };
    return tifMap[tif] || 'DAY';
  }

  private mapTimeInForceFromIBKR(tif: string): 'day' | 'gtc' | 'ioc' | 'fok' {
    const tifMap: Record<string, 'day' | 'gtc' | 'ioc' | 'fok'> = {
      DAY: 'day',
      GTC: 'gtc',
      IOC: 'ioc',
      FOK: 'fok',
    };
    return tifMap[tif] || 'day';
  }

  private mapOrderStatusFromIBKR(status: string): OrderStatus {
    const statusMap: Record<string, OrderStatus> = {
      Submitted: 'pending',
      Filled: 'filled',
      Cancelled: 'cancelled',
      ApiCanceled: 'cancelled',
      Inactive: 'cancelled',
      PendingSubmit: 'pending',
      PreSubmitted: 'pending',
      ApiPending: 'pending',
    };
    return statusMap[status] || 'pending';
  }
}

/**
 * Alpaca Broker Implementation
 *
 * Paper trading broker for development and testing.
 * Wraps the existing @alpacahq/alpaca-trade-api SDK.
 */

import Alpaca from '@alpacahq/alpaca-trade-api';
import {
  IBroker,
  BrokerId,
  BrokerEnvironment,
  BrokerCapabilities,
  BrokerAccount,
  BrokerPosition,
  BrokerOrder,
  BrokerQuote,
  BrokerBar,
  OrderRequest,
  OrderStatus,
  ConnectionError,
  OrderError,
} from './types';

export class AlpacaBroker implements IBroker {
  readonly id: BrokerId = 'alpaca';
  readonly name = 'Alpaca Markets';
  readonly environment: BrokerEnvironment;
  readonly capabilities: BrokerCapabilities = {
    paperTrading: true,
    liveTrading: true,
    fractionalShares: true,
    extendedHours: true,
    options: false,
    crypto: true,
    forex: false,
    marginTrading: true,
    shortSelling: true,
    realTimeQuotes: true,
    historicalData: true,
    streaming: true,
  };

  private client: Alpaca | null = null;
  private connected = false;

  constructor(environment: BrokerEnvironment = 'paper') {
    this.environment = environment;
  }

  private validateEnv(): void {
    const missingVars: string[] = [];

    if (!process.env.ALPACA_API_KEY) {
      missingVars.push('ALPACA_API_KEY');
    }
    if (!process.env.ALPACA_SECRET_KEY) {
      missingVars.push('ALPACA_SECRET_KEY');
    }

    if (missingVars.length > 0) {
      throw new ConnectionError(
        this.id,
        `Missing required environment variables: ${missingVars.join(', ')}. ` +
          `Get your keys from: https://alpaca.markets`
      );
    }
  }

  private getClient(): Alpaca {
    if (!this.client) {
      this.validateEnv();

      const baseUrl =
        this.environment === 'paper'
          ? 'https://paper-api.alpaca.markets'
          : 'https://api.alpaca.markets';

      this.client = new Alpaca({
        keyId: process.env.ALPACA_API_KEY!,
        secretKey: process.env.ALPACA_SECRET_KEY!,
        paper: this.environment === 'paper',
        baseUrl: process.env.ALPACA_BASE_URL || baseUrl,
      });
    }
    return this.client;
  }

  async isConnected(): Promise<boolean> {
    if (!this.connected) return false;
    try {
      await this.getClient().getAccount();
      return true;
    } catch {
      this.connected = false;
      return false;
    }
  }

  async connect(): Promise<void> {
    try {
      const client = this.getClient();
      await client.getAccount();
      this.connected = true;
    } catch (error) {
      throw new ConnectionError(
        this.id,
        'Failed to connect to Alpaca API',
        error
      );
    }
  }

  async disconnect(): Promise<void> {
    this.client = null;
    this.connected = false;
  }

  async getAccount(): Promise<BrokerAccount> {
    try {
      const account = await this.getClient().getAccount();

      return {
        id: account.id,
        accountNumber: account.account_number,
        brokerId: this.id,
        environment: this.environment,
        status: account.status === 'ACTIVE' ? 'active' : 'inactive',
        currency: account.currency,
        buyingPower: parseFloat(account.buying_power),
        cash: parseFloat(account.cash),
        portfolioValue: parseFloat(account.portfolio_value),
        equity: parseFloat(account.equity),
        lastEquity: parseFloat(account.last_equity),
        dayTradeCount: account.daytrade_count,
        patternDayTrader: account.pattern_day_trader,
      };
    } catch (error) {
      throw new ConnectionError(this.id, 'Failed to get account', error);
    }
  }

  async getPositions(): Promise<BrokerPosition[]> {
    try {
      const positions = await this.getClient().getPositions();

      return positions.map((pos: any) => ({
        symbol: pos.symbol,
        quantity: parseFloat(pos.qty),
        marketValue: parseFloat(pos.market_value),
        avgEntryPrice: parseFloat(pos.avg_entry_price),
        currentPrice: parseFloat(pos.current_price),
        unrealizedPL: parseFloat(pos.unrealized_pl),
        unrealizedPLPercent: parseFloat(pos.unrealized_plpc) * 100,
        side: parseFloat(pos.qty) >= 0 ? 'long' : 'short',
        brokerId: this.id,
      }));
    } catch (error) {
      throw new ConnectionError(this.id, 'Failed to get positions', error);
    }
  }

  async getPosition(symbol: string): Promise<BrokerPosition | null> {
    try {
      const pos = await this.getClient().getPosition(symbol);

      return {
        symbol: pos.symbol,
        quantity: parseFloat(pos.qty),
        marketValue: parseFloat(pos.market_value),
        avgEntryPrice: parseFloat(pos.avg_entry_price),
        currentPrice: parseFloat(pos.current_price),
        unrealizedPL: parseFloat(pos.unrealized_pl),
        unrealizedPLPercent: parseFloat(pos.unrealized_plpc) * 100,
        side: parseFloat(pos.qty) >= 0 ? 'long' : 'short',
        brokerId: this.id,
      };
    } catch (error: any) {
      // Position not found is not an error
      if (error.statusCode === 404) return null;
      throw new ConnectionError(
        this.id,
        `Failed to get position for ${symbol}`,
        error
      );
    }
  }

  async placeOrder(request: OrderRequest): Promise<BrokerOrder> {
    try {
      const order = await this.getClient().createOrder({
        symbol: request.symbol,
        qty: request.quantity,
        side: request.side,
        type: request.type,
        time_in_force: request.timeInForce,
        limit_price: request.limitPrice,
        stop_price: request.stopPrice,
        extended_hours: request.extendedHours,
        client_order_id: request.clientOrderId,
      });

      return this.mapOrder(order);
    } catch (error: any) {
      throw new OrderError(
        this.id,
        `Failed to place order: ${error.message || 'Unknown error'}`,
        error
      );
    }
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    try {
      await this.getClient().cancelOrder(orderId);
      return true;
    } catch (error: any) {
      if (error.statusCode === 404) return false;
      throw new OrderError(this.id, `Failed to cancel order ${orderId}`, error);
    }
  }

  async getOrder(orderId: string): Promise<BrokerOrder | null> {
    try {
      const order = await this.getClient().getOrder(orderId);
      return this.mapOrder(order);
    } catch (error: any) {
      if (error.statusCode === 404) return null;
      throw new OrderError(this.id, `Failed to get order ${orderId}`, error);
    }
  }

  async getOrders(status?: OrderStatus): Promise<BrokerOrder[]> {
    try {
      const alpacaStatus = status
        ? this.mapOrderStatusToAlpaca(status)
        : 'all';
      const orders = await this.getClient().getOrders({
        status: alpacaStatus,
        until: undefined as any,
        after: undefined as any,
        limit: 100,
        direction: 'desc' as any,
        nested: false as any,
        symbols: undefined as any,
      });
      return orders.map((order: any) => this.mapOrder(order));
    } catch (error) {
      throw new OrderError(this.id, 'Failed to get orders', error);
    }
  }

  async getQuote(symbol: string): Promise<BrokerQuote> {
    try {
      const quote = await this.getClient().getLatestQuote(symbol);

      return {
        symbol,
        bidPrice: quote.BidPrice,
        bidSize: quote.BidSize,
        askPrice: quote.AskPrice,
        askSize: quote.AskSize,
        lastPrice: (quote.BidPrice + quote.AskPrice) / 2, // Mid price
        lastSize: 0,
        volume: 0,
        timestamp: new Date(quote.Timestamp),
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

  async getBars(
    symbol: string,
    timeframe: string,
    start: Date,
    end: Date
  ): Promise<BrokerBar[]> {
    try {
      const bars = await this.getClient().getBarsV2(symbol, {
        start: start.toISOString(),
        end: end.toISOString(),
        timeframe,
      });

      const result: BrokerBar[] = [];
      for await (const bar of bars) {
        result.push({
          symbol,
          timestamp: new Date(bar.Timestamp),
          open: bar.OpenPrice,
          high: bar.HighPrice,
          low: bar.LowPrice,
          close: bar.ClosePrice,
          volume: bar.Volume,
          vwap: bar.VWAP,
        });
      }
      return result;
    } catch (error) {
      throw new ConnectionError(
        this.id,
        `Failed to get bars for ${symbol}`,
        error
      );
    }
  }

  private mapOrder(order: any): BrokerOrder {
    return {
      id: order.id,
      clientOrderId: order.client_order_id,
      brokerId: this.id,
      symbol: order.symbol,
      quantity: parseFloat(order.qty),
      filledQuantity: parseFloat(order.filled_qty || '0'),
      side: order.side,
      type: order.type,
      status: this.mapOrderStatus(order.status),
      limitPrice: order.limit_price ? parseFloat(order.limit_price) : undefined,
      stopPrice: order.stop_price ? parseFloat(order.stop_price) : undefined,
      filledAvgPrice: order.filled_avg_price
        ? parseFloat(order.filled_avg_price)
        : undefined,
      timeInForce: order.time_in_force,
      submittedAt: new Date(order.submitted_at),
      filledAt: order.filled_at ? new Date(order.filled_at) : undefined,
      cancelledAt: order.canceled_at ? new Date(order.canceled_at) : undefined,
    };
  }

  private mapOrderStatus(alpacaStatus: string): OrderStatus {
    const statusMap: Record<string, OrderStatus> = {
      new: 'new',
      accepted: 'accepted',
      pending_new: 'pending',
      accepted_for_bidding: 'accepted',
      filled: 'filled',
      partially_filled: 'partially_filled',
      canceled: 'cancelled',
      expired: 'expired',
      rejected: 'rejected',
      pending_cancel: 'pending',
      pending_replace: 'pending',
      stopped: 'cancelled',
      suspended: 'cancelled',
      calculated: 'pending',
      held: 'pending',
      done_for_day: 'cancelled',
    };
    return statusMap[alpacaStatus.toLowerCase()] || 'pending';
  }

  private mapOrderStatusToAlpaca(status: OrderStatus): string {
    const statusMap: Record<OrderStatus, string> = {
      new: 'new',
      pending: 'pending_new',
      accepted: 'accepted',
      filled: 'filled',
      partially_filled: 'partially_filled',
      cancelled: 'canceled',
      rejected: 'rejected',
      expired: 'expired',
    };
    return statusMap[status] || 'all';
  }
}

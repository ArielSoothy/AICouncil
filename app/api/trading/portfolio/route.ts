import { NextRequest, NextResponse } from 'next/server';
import { BrokerFactory } from '@/lib/brokers/broker-factory';
import { cookies } from 'next/headers';

// Cookie name must match the one in broker/switch/route.ts
const ACTIVE_BROKER_COOKIE = 'active_broker';

// Check if running in production (Vercel) or local development
const isProduction = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';

export async function GET(request: NextRequest) {
  try {
    // Read broker selection from cookie (persisted across serverless function restarts)
    const cookieStore = cookies();
    const brokerCookie = cookieStore.get(ACTIVE_BROKER_COOKIE);
    const cookieBrokerId = brokerCookie?.value;

    // Determine which broker to use:
    // 1. If cookie is set, use that
    // 2. Otherwise: Local → IBKR default, Production → Alpaca default
    let brokerId: 'alpaca' | 'ibkr';

    if (cookieBrokerId && ['alpaca', 'ibkr'].includes(cookieBrokerId)) {
      brokerId = cookieBrokerId as 'alpaca' | 'ibkr';
    } else {
      // Default: Local → IBKR, Production → Alpaca (original intended behavior)
      brokerId = isProduction ? 'alpaca' : 'ibkr';
    }

    const environment = brokerId === 'ibkr' ? 'live' : 'paper';
    BrokerFactory.setActiveBroker(brokerId, environment);

    // Get the active broker
    const broker = BrokerFactory.getActiveBroker();

    // Fetch account and positions in parallel
    const [account, positions] = await Promise.all([
      broker.getAccount(),
      broker.getPositions(),
    ]);

    // Calculate cost basis from positions
    const totalCostBasis = positions.reduce((sum, pos) => {
      return sum + (pos.avgEntryPrice * pos.quantity);
    }, 0);

    const portfolioData = {
      // Include broker info for UI display
      broker: {
        id: broker.id,
        name: broker.name,
        environment: broker.environment,
      },
      account: {
        portfolio_value: account.portfolioValue,
        cash: account.cash,
        buying_power: account.buyingPower,
        equity: account.equity,
        last_equity: account.lastEquity,
      },
      positions: positions.map((pos) => ({
        symbol: pos.symbol,
        qty: pos.quantity,
        side: pos.side,
        market_value: pos.marketValue,
        cost_basis: pos.avgEntryPrice * pos.quantity,
        unrealized_pl: pos.unrealizedPL,
        unrealized_plpc: pos.unrealizedPLPercent,
        current_price: pos.currentPrice,
        avg_entry_price: pos.avgEntryPrice,
      })),
      performance: {
        daily_pl: account.equity - account.lastEquity,
        daily_pl_percent: account.lastEquity > 0
          ? ((account.equity - account.lastEquity) / account.lastEquity) * 100
          : 0,
        total_pl: account.equity - totalCostBasis - account.cash,
        total_pl_percent: totalCostBasis > 0
          ? ((account.equity - totalCostBasis - account.cash) / totalCostBasis) * 100
          : 0,
      },
    };

    return NextResponse.json(portfolioData);

  } catch (error) {
    // Extract error message
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Classify error and return appropriate status code
    let statusCode = 500;
    let userMessage = 'Failed to fetch portfolio data';

    // Check for specific error types
    if (errorMessage.includes('Missing required') || errorMessage.includes('environment variables') || errorMessage.includes('not configured')) {
      statusCode = 503;
      userMessage = 'Trading service is not configured. Please contact support.';
    } else if (errorMessage.includes('Unauthorized') || errorMessage.includes('authentication') || errorMessage.includes('forbidden') || errorMessage.includes('not authenticated')) {
      statusCode = 401;
      userMessage = 'Trading API authentication failed. Please check credentials.';
    } else if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
      statusCode = 429;
      userMessage = 'Too many requests. Please try again in a moment.';
    } else if (errorMessage.includes('timeout') || errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ETIMEDOUT')) {
      statusCode = 503;
      userMessage = 'Trading service temporarily unavailable. Please try again.';
    }

    return NextResponse.json(
      {
        error: userMessage,
        // Include details in development mode only
        ...(process.env.NODE_ENV === 'development' && { details: errorMessage })
      },
      { status: statusCode }
    );
  }
}

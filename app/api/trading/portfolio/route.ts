import { NextRequest, NextResponse } from 'next/server';
import { getAccount, getPositions } from '@/lib/alpaca/client';

export async function GET(request: NextRequest) {
  try {
    // Fetch account and positions in parallel
    const [account, positions] = await Promise.all([
      getAccount(),
      getPositions(),
    ]);

    const portfolioData = {
      account: {
        portfolio_value: parseFloat(account.portfolio_value),
        cash: parseFloat(account.cash),
        buying_power: parseFloat(account.buying_power),
        equity: parseFloat(account.equity),
        last_equity: parseFloat(account.last_equity),
      },
      positions: positions.map((pos) => ({
        symbol: pos.symbol,
        qty: parseInt(pos.qty),
        side: pos.side,
        market_value: parseFloat(pos.market_value),
        cost_basis: parseFloat(pos.cost_basis),
        unrealized_pl: parseFloat(pos.unrealized_pl),
        unrealized_plpc: parseFloat(pos.unrealized_plpc),
        current_price: parseFloat(pos.current_price),
        avg_entry_price: parseFloat(pos.avg_entry_price),
      })),
      performance: {
        daily_pl: parseFloat(account.equity) - parseFloat(account.last_equity),
        daily_pl_percent: ((parseFloat(account.equity) - parseFloat(account.last_equity)) / parseFloat(account.last_equity)) * 100,
        total_pl: parseFloat(account.equity) - 100000, // Assuming $100k starting balance
        total_pl_percent: ((parseFloat(account.equity) - 100000) / 100000) * 100,
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
    if (errorMessage.includes('Missing required Alpaca environment variables')) {
      statusCode = 503;
      userMessage = 'Trading service is not configured. Please contact support.';
    } else if (errorMessage.includes('Unauthorized') || errorMessage.includes('authentication') || errorMessage.includes('forbidden')) {
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

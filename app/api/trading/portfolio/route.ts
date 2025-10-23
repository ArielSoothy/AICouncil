import { NextRequest, NextResponse } from 'next/server';
import { getAccount, getPositions } from '@/lib/alpaca/client';

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Fetching portfolio data...');

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

    console.log('✅ Portfolio data:', {
      value: portfolioData.account.portfolio_value,
      positions: portfolioData.positions.length,
      daily_pl: portfolioData.performance.daily_pl,
    });

    return NextResponse.json(portfolioData);

  } catch (error) {
    console.error('❌ API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

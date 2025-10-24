import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/arena/leaderboard
 * Returns model performance leaderboard with rankings
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Fetch all models ordered by total P&L (best first)
    const { data: performances, error } = await supabase
      .from('model_performance')
      .select('*')
      .order('total_pnl', { ascending: false });

    if (error) {
      console.error('Error fetching leaderboard:', error);
      return NextResponse.json(
        { error: 'Failed to fetch leaderboard' },
        { status: 500 }
      );
    }

    // Calculate rankings
    const leaderboard = performances?.map((perf, index) => ({
      ...perf,
      rank: index + 1,
      // Format metrics for display
      total_pnl: parseFloat(perf.total_pnl || 0).toFixed(2),
      win_rate: parseFloat(perf.win_rate || 0).toFixed(1),
      avg_win: parseFloat(perf.avg_win || 0).toFixed(2),
      avg_loss: parseFloat(perf.avg_loss || 0).toFixed(2),
      profit_factor: parseFloat(perf.profit_factor || 0).toFixed(2),
      sharpe_ratio: parseFloat(perf.sharpe_ratio || 0).toFixed(2),
      max_drawdown: parseFloat(perf.max_drawdown || 0).toFixed(2),
    })) || [];

    return NextResponse.json({ leaderboard });

  } catch (error) {
    console.error('Leaderboard API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

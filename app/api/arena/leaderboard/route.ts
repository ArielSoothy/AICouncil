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
    interface ModelPerformance {
      total_pnl: string | number | null;
      win_rate: string | number | null;
      avg_win: string | number | null;
      avg_loss: string | number | null;
      profit_factor: string | number | null;
      sharpe_ratio: string | number | null;
      max_drawdown: string | number | null;
    }
    const leaderboard = performances?.map((perf: ModelPerformance, index: number) => ({
      ...perf,
      rank: index + 1,
      // Format metrics for display
      total_pnl: parseFloat(String(perf.total_pnl ?? 0)).toFixed(2),
      win_rate: parseFloat(String(perf.win_rate ?? 0)).toFixed(1),
      avg_win: parseFloat(String(perf.avg_win ?? 0)).toFixed(2),
      avg_loss: parseFloat(String(perf.avg_loss ?? 0)).toFixed(2),
      profit_factor: parseFloat(String(perf.profit_factor ?? 0)).toFixed(2),
      sharpe_ratio: parseFloat(String(perf.sharpe_ratio ?? 0)).toFixed(2),
      max_drawdown: parseFloat(String(perf.max_drawdown ?? 0)).toFixed(2),
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

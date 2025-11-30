import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Optional filters
    const mode = searchParams.get('mode');
    const symbol = searchParams.get('symbol');
    const action = searchParams.get('action');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = supabase
      .from('paper_trades')
      .select('*')
      .order('executed_at', { ascending: false })
      .limit(limit);

    // Apply filters
    if (mode) {
      query = query.eq('mode', mode);
    }
    if (symbol) {
      query = query.eq('symbol', symbol);
    }
    if (action) {
      query = query.eq('action', action);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch trade history' },
        { status: 500 }
      );
    }

    return NextResponse.json({ trades: data || [] });

  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/arena/config
 * Returns current Arena Mode configuration
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Fetch config (singleton table with id=1)
    const { data: config, error } = await supabase
      .from('arena_config')
      .select('*')
      .eq('id', 1)
      .single();

    if (error) {
      console.error('Error fetching arena config:', error);
      return NextResponse.json(
        { error: 'Failed to fetch arena configuration' },
        { status: 500 }
      );
    }

    return NextResponse.json({ config });

  } catch (error) {
    console.error('Arena config API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/arena/config
 * Updates Arena Mode configuration
 * Body: { is_enabled?, schedule_frequency?, enabled_models?, max_position_size?, etc. }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    // Validate inputs
    if (body.schedule_frequency && !['hourly', 'daily', 'weekly'].includes(body.schedule_frequency)) {
      return NextResponse.json(
        { error: 'Invalid schedule frequency. Must be: hourly, daily, or weekly' },
        { status: 400 }
      );
    }

    // Update config (singleton table with id=1)
    const { data: config, error } = await supabase
      .from('arena_config')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1)
      .select()
      .single();

    if (error) {
      console.error('Error updating arena config:', error);
      return NextResponse.json(
        { error: 'Failed to update arena configuration' },
        { status: 500 }
      );
    }

    console.log('✅ Arena config updated:', config);
    return NextResponse.json({ config });

  } catch (error) {
    console.error('Arena config update error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

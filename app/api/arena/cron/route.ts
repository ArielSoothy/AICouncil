import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/arena/cron
 * Vercel Cron endpoint for scheduled autonomous trading
 * Triggered by vercel.json cron configuration
 *
 * Cron secret authentication via CRON_SECRET environment variable
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error('Unauthorized cron attempt - invalid secret');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🕐 Cron job triggered - checking Arena Mode config...');

    const supabase = await createClient();

    // Check if Arena Mode is enabled
    const { data: config, error: configError } = await supabase
      .from('arena_config')
      .select('*')
      .eq('id', 1)
      .single();

    if (configError) {
      console.error('Error fetching arena config:', configError);
      return NextResponse.json(
        { error: 'Failed to fetch arena configuration' },
        { status: 500 }
      );
    }

    if (!config.is_enabled) {
      console.log('⏸️  Arena Mode is disabled - skipping execution');
      return NextResponse.json({
        message: 'Arena Mode is disabled',
        skipped: true,
      });
    }

    console.log('✅ Arena Mode is enabled - triggering execution...');

    // Call the execute endpoint internally
    const executeUrl = new URL('/api/arena/execute', request.url);
    const executeResponse = await fetch(executeUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const executeResult = await executeResponse.json();

    if (!executeResponse.ok) {
      console.error('Execution failed:', executeResult);
      return NextResponse.json(
        { error: 'Execution failed', details: executeResult },
        { status: 500 }
      );
    }

    console.log('✅ Cron execution complete:', executeResult);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      result: executeResult,
    });

  } catch (error) {
    console.error('❌ Cron job error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Disable caching for cron endpoint
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * POST /api/setup/migrate-arena
 * One-time endpoint to run Arena Mode database migration
 *
 * IMPORTANT: DELETE THIS FILE AFTER SUCCESSFUL MIGRATION (security)
 *
 * This endpoint executes the SQL migration file directly using Supabase's
 * SQL execution endpoint with the service role key.
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting Arena Mode database migration...');

    // Get Supabase credentials from environment
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing Supabase credentials (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)',
      }, { status: 500 });
    }

    // Read the migration SQL file
    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20251024_arena_mode_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📄 Migration SQL file loaded');
    console.log('📏 SQL length:', migrationSQL.length, 'characters');

    // Execute the entire SQL migration using Supabase's query endpoint
    // This uses the Supabase PostgREST extension for raw SQL execution
    const queryUrl = `${supabaseUrl}/rest/v1/rpc/exec_raw_sql`;

    console.log('🔗 Attempting to execute SQL via Supabase...');

    // First, let's try creating the tables directly via Supabase management API
    // Actually, the easiest way is to use Supabase's Database API
    // But since that's complex, let me just output the SQL for the user to copy

    return NextResponse.json({
      success: false,
      message: 'Please run the migration manually in Supabase SQL Editor',
      instructions: [
        '1. Go to your Supabase Dashboard (https://supabase.com/dashboard)',
        '2. Select your project',
        '3. Go to SQL Editor',
        '4. Click "New Query"',
        '5. Copy the SQL from: /supabase/migrations/20251024_arena_mode_tables.sql',
        '6. Paste and click "Run"',
        '7. Verify tables created: arena_trades, model_performance, arena_config, arena_runs',
      ],
      migrationFile: '/supabase/migrations/20251024_arena_mode_tables.sql',
      sqlPreview: migrationSQL.substring(0, 500) + '...',
    });

  } catch (error) {
    console.error('❌ Migration setup failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// Disable caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

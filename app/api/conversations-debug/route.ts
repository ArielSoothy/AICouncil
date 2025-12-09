import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Guard initialization to avoid build failures when env vars are missing
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({
        success: false,
        error: 'Supabase not configured for debug route',
      }, { status: 503 })
    }

    console.log('Debug API - Starting request')
    
    // Get all conversations (bypassing RLS)
    const { data: conversations, error } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .eq('user_id', 'f49aed91-bd28-42ef-84f2-af68a369e401') // Your user ID
      .order('created_at', { ascending: false })

    console.log('Debug API - Query result:', { 
      conversationsCount: conversations?.length || 0, 
      error: error?.message 
    })

    if (error) {
      return NextResponse.json({ 
        error: 'Database error', 
        details: error.message 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      count: conversations?.length || 0,
      conversations: conversations || []
    })
  } catch (error) {
    console.error('Debug API - Unexpected error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
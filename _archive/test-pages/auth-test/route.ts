import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    console.log('Auth Test API - Starting request')
    console.log('Auth Test API - Request cookies:', request.cookies.getAll())
    console.log('Auth Test API - Request headers auth:', request.headers.get('authorization'))
    
    const supabase = await createClient()
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    console.log('Auth Test API - Auth check:', { 
      userId: user?.id, 
      userEmail: user?.email,
      authError: authError?.message,
      hasUser: !!user 
    })
    
    if (authError) {
      return NextResponse.json({ 
        success: false,
        error: 'Authentication error', 
        details: authError.message 
      })
    }
    
    if (!user) {
      return NextResponse.json({ 
        success: false,
        error: 'No authenticated user found' 
      })
    }

    // Check if user exists in public.users table
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()
    
    return NextResponse.json({ 
      success: true,
      auth: {
        userId: user.id,
        userEmail: user.email,
        userCreatedAt: user.created_at
      },
      profile: {
        exists: !profileError,
        data: userProfile,
        error: profileError?.message
      }
    })
  } catch (error) {
    console.error('Auth Test API - Unexpected error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
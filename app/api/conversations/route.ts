import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

type ConversationInsert = Database['public']['Tables']['conversations']['Insert']

export async function GET(request: NextRequest) {
  try {
    console.log('Conversations API - Starting request')
    console.log('Conversations API - Request headers:', {
      authorization: request.headers.get('authorization'),
      cookie: request.headers.get('cookie')?.substring(0, 100) + '...',
      userAgent: request.headers.get('user-agent')
    })
    
    const supabase = createClient()
    
    // Get the authenticated user  
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    console.log('Conversations API - Auth check:', { 
      userId: user?.id, 
      userEmail: user?.email,
      authError: authError?.message,
      hasUser: !!user 
    })
    
    if (authError) {
      console.log('Conversations API - Auth error:', authError)
      return NextResponse.json({ 
        error: 'Authentication error', 
        details: authError.message 
      }, { status: 401 })
    }
    
    if (!user) {
      console.log('Conversations API - No user found')
      return NextResponse.json({ 
        error: 'No authenticated user found' 
      }, { status: 401 })
    }

    // Check if user exists in public.users table
    console.log('Conversations API - Checking if user exists in public.users...')
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single()
    
    console.log('Conversations API - User profile check:', { 
      userProfile: userProfile?.id, 
      profileError: profileError?.message 
    })
    
    if (profileError && profileError.code === 'PGRST116') {
      // User doesn't exist in public.users, create them
      console.log('Conversations API - Creating user in public.users table')
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email || ''
        })
      
      if (insertError) {
        console.error('Conversations API - Failed to create user:', insertError)
        return NextResponse.json({ 
          error: 'Failed to create user profile', 
          details: insertError.message 
        }, { status: 500 })
      }
    }

    // Get conversations for the user
    console.log('Conversations API - Querying conversations for user:', user.id)
    
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    console.log('Conversations API - Query result:', { 
      conversationsCount: conversations?.length || 0, 
      error: error?.message,
      conversations: conversations 
    })

    if (error) {
      console.error('Conversations API - Database error:', error)
      return NextResponse.json({ 
        error: 'Database error', 
        details: error.message 
      }, { status: 500 })
    }

    console.log('Conversations API - Returning conversations:', conversations?.length || 0)
    return NextResponse.json(conversations || [])
  } catch (error) {
    console.error('Conversations API - Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { query, responses } = body

    if (!query || !responses) {
      return NextResponse.json(
        { error: 'Query and responses are required' },
        { status: 400 }
      )
    }

    // Insert new conversation
    const conversationData: ConversationInsert = {
      user_id: user.id,
      query,
      responses,
    }

    const { data: conversation, error } = await supabase
      .from('conversations')
      .insert(conversationData)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(conversation, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
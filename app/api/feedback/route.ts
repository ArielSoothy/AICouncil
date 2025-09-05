import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

type FeedbackInsert = Database['public']['Tables']['feedback']['Insert']

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { conversation_id, user_rating, comments } = body

    if (!conversation_id) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      )
    }

    // Verify the conversation belongs to the user
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversation_id)
      .eq('user_id', user.id)
      .single()

    if (convError || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Check if user already provided feedback for this conversation
    const { data: existingFeedback } = await supabase
      .from('feedback')
      .select('id')
      .eq('conversation_id', conversation_id)
      .limit(1)
    
    if (existingFeedback && existingFeedback.length > 0) {
      return NextResponse.json(
        { error: 'Feedback already provided for this conversation', creditsEarned: 0 },
        { status: 400 }
      )
    }

    // Insert feedback
    const feedbackData: FeedbackInsert = {
      conversation_id,
      user_rating: user_rating || null,
      comments: comments || null,
    }

    const { data: feedback, error } = await supabase
      .from('feedback')
      .insert(feedbackData)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Reward user with premium credits (2 credits per feedback)
    const creditsToAdd = 2
    
    // Get current user data
    const { data: userData } = await supabase
      .from('users')
      .select('premium_credits')
      .eq('id', user.id)
      .single()

    const currentCredits = userData?.premium_credits || 0
    
    // Update premium credits
    const { error: creditError } = await supabase
      .from('users')
      .update({ premium_credits: currentCredits + creditsToAdd })
      .eq('id', user.id)

    if (creditError) {
      console.error('Error updating premium credits:', creditError)
      // Don't fail the feedback submission if credit update fails
    }

    return NextResponse.json({ 
      ...feedback, 
      creditsEarned: creditError ? 0 : creditsToAdd,
      message: creditError ? 'Feedback saved but credit reward failed' : 'Feedback saved and credits earned!'
    }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
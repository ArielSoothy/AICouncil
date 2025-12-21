import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // SECURITY: Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      )
    }

    // SECURITY: Verify admin role (check if user email matches admin)
    const adminEmail = process.env.ADMIN_EMAIL
    if (adminEmail && user.email !== adminEmail) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    // Get total conversations
    const { count: totalConversations } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })

    // Get total feedback
    const { count: totalFeedback } = await supabase
      .from('feedback')
      .select('*', { count: 'exact', head: true })

    // Get average rating
    const { data: ratingData } = await supabase
      .from('feedback')
      .select('user_rating')
      .not('user_rating', 'is', null)

    const averageRating = ratingData && ratingData.length > 0
      ? ratingData.reduce((sum: number, item: { user_rating: number | null }) => sum + (item.user_rating || 0), 0) / ratingData.length
      : 0

    // Get recent queries (last 50)
    const { data: recentQueries } = await supabase
      .from('conversations')
      .select('id, query, created_at, user_id')
      .order('created_at', { ascending: false })
      .limit(50)

    // Get saved conversations with full Q&A data (last 20)
    const { data: savedConversations } = await supabase
      .from('conversations')
      .select('id, query, responses, created_at, user_id')
      .order('created_at', { ascending: false })
      .limit(20)

    // Get daily stats for last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: conversationsByDate } = await supabase
      .from('conversations')
      .select('created_at')
      .gte('created_at', thirtyDaysAgo.toISOString())

    const { data: feedbackByDate } = await supabase
      .from('feedback')
      .select('created_at')
      .gte('created_at', thirtyDaysAgo.toISOString())

    // Group by date
    const dailyStats: Record<string, { conversations: number; feedback: number }> = {}

    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateKey = date.toISOString().split('T')[0]
      dailyStats[dateKey] = { conversations: 0, feedback: 0 }
    }

    // Count conversations by date
    conversationsByDate?.forEach((conv: { created_at: string }) => {
      const date = new Date(conv.created_at).toISOString().split('T')[0]
      if (dailyStats[date]) {
        dailyStats[date].conversations++
      }
    })

    // Count feedback by date
    feedbackByDate?.forEach((feedback: { created_at: string }) => {
      const date = new Date(feedback.created_at).toISOString().split('T')[0]
      if (dailyStats[date]) {
        dailyStats[date].feedback++
      }
    })

    // Convert to array
    const dailyStatsArray = Object.entries(dailyStats).map(([date, stats]) => ({
      date,
      conversations: stats.conversations,
      feedback: stats.feedback
    }))

    const analytics = {
      totalConversations: totalConversations || 0,
      totalFeedback: totalFeedback || 0,
      averageRating,
      recentQueries: recentQueries || [],
      savedConversations: savedConversations || [],
      dailyStats: dailyStatsArray
    }

    return NextResponse.json(analytics)

  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json(
      { error: 'Failed to load analytics' },
      { status: 500 }
    )
  }
}
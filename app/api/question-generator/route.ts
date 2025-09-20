import { NextRequest, NextResponse } from 'next/server'
import { QuestionGenerator } from '@/lib/question-generator/question-generator'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      category,
      complexity,
      priority = 'high',
      useAI = false,
      avoidRecent = true
    } = body

    const question = await QuestionGenerator.generate({
      category,
      complexity,
      priority,
      useAI,
      avoidRecent
    })

    return NextResponse.json({
      success: true,
      question,
      stats: QuestionGenerator.getStats()
    })
  } catch (error) {
    console.error('Question generation error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate question',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    // Get a quick high-priority question for simple requests
    const question = await QuestionGenerator.generate({
      priority: 'high',
      useAI: false,
      avoidRecent: true
    })

    return NextResponse.json({
      success: true,
      question,
      categories: QuestionGenerator.getCategories(),
      stats: QuestionGenerator.getStats()
    })
  } catch (error) {
    console.error('Question generation error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate question',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
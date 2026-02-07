import { NextRequest, NextResponse } from 'next/server'
import { groq } from '@ai-sdk/groq'
import { anthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'

export const dynamic = 'force-dynamic'

const PRE_DEBATE_PROMPT = `You are an expert at analyzing questions and identifying what additional context would help provide a better answer.

Given the user's query, generate 3-4 clarifying questions that would help improve the quality of the debate/analysis.

Focus on questions that:
1. Clarify the user's specific needs or constraints
2. Identify relevant context (budget, timeline, location, preferences)
3. Uncover unstated assumptions
4. Define success criteria

Format your response as a JSON array of question objects:
[
  {"question": "...", "hint": "brief hint about what kind of answer is helpful"},
  ...
]

Only output the JSON array, nothing else.`

async function generateWithGroq(query: string): Promise<{ questions: Array<{ question: string; hint?: string }> }> {
  const result = await generateText({
    model: groq('llama-3.3-70b-versatile'),
    system: PRE_DEBATE_PROMPT,
    prompt: `User query: ${query}`,
    temperature: 0.7,
    maxOutputTokens: 500
  })

  const content = result.text || '[]'

  try {
    // Extract JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      const questions = JSON.parse(jsonMatch[0])
      return { questions }
    }
    return { questions: [] }
  } catch {
    console.error('Failed to parse questions:', content)
    return { questions: [] }
  }
}

async function generateWithClaude(query: string): Promise<{ questions: Array<{ question: string; hint?: string }> }> {
  const result = await generateText({
    model: anthropic('claude-3-5-haiku-20241022'),
    system: PRE_DEBATE_PROMPT,
    prompt: `User query: ${query}`,
    temperature: 0.7,
    maxOutputTokens: 500
  })

  const content = result.text || '[]'

  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      const questions = JSON.parse(jsonMatch[0])
      return { questions }
    }
    return { questions: [] }
  } catch {
    console.error('Failed to parse questions:', content)
    return { questions: [] }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json()

    if (!query || typeof query !== 'string' || query.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Query is required and must be at least 10 characters' },
        { status: 400 }
      )
    }

    // Try Groq first (free and fast), fall back to Claude
    let result
    try {
      result = await generateWithGroq(query)
    } catch {
      // Groq failed, trying Claude
      result = await generateWithClaude(query)
    }

    // Ensure we have valid questions
    const questions = result.questions.filter(
      (q: { question?: string; hint?: string }) => q && typeof q.question === 'string' && q.question.length > 5
    ).slice(0, 4) // Max 4 questions

    return NextResponse.json({
      success: true,
      questions
    })

  } catch (error) {
    console.error('Pre-debate questions error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate questions',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

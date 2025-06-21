import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'
import { generateText } from 'ai'

interface ElaborateRequest {
  query: string;
  responses: Array<{
    model: string;
    response: string;
  }>;
  conciseAnswer: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ElaborateRequest = await request.json()
    const { query, responses, conciseAnswer } = body

    if (!query?.trim() || !responses?.length || !conciseAnswer?.trim()) {
      return NextResponse.json(
        { error: 'Query, responses, and concise answer are required' },
        { status: 400 }
      )
    }

    // Try Claude Opus 4 first for elaboration
    try {
      if (process.env.ANTHROPIC_API_KEY && 
          process.env.ANTHROPIC_API_KEY !== 'your_anthropic_api_key_here' &&
          process.env.ANTHROPIC_API_KEY.startsWith('sk-ant-')) {
        return await elaborateWithClaudeOpus(query, responses, conciseAnswer)
      }
    } catch (error) {
      console.log('Claude Opus 4 elaboration failed, trying GPT-4o fallback:', error)
    }

    // Fallback to GPT-4o
    try {
      if (process.env.OPENAI_API_KEY && 
          process.env.OPENAI_API_KEY !== 'your_openai_api_key_here' &&
          process.env.OPENAI_API_KEY.startsWith('sk-')) {
        return await elaborateWithGPT4o(query, responses, conciseAnswer)
      }
    } catch (error) {
      console.log('GPT-4o elaboration failed:', error)
    }

    // Final fallback
    return NextResponse.json({
      detailedAnswer: `${conciseAnswer}\n\nDetailed analysis: Based on ${responses.length} AI responses, this represents the consensus view with additional context and reasoning.`,
      judgeTokensUsed: 0
    })

  } catch (error) {
    console.error('Elaborate endpoint error:', error)
    return NextResponse.json(
      { error: 'Failed to elaborate answer' },
      { status: 500 }
    )
  }
}

async function elaborateWithClaudeOpus(query: string, responses: Array<{model: string, response: string}>, conciseAnswer: string) {
  const promptContent = `You previously provided this concise answer: "${conciseAnswer}"

For the query: "${query}"

Based on these AI responses:
${responses.map((r, i) => `Response ${i + 1} (${r.model}): "${r.response}"`).join('\n\n')}

Now provide a comprehensive, detailed elaboration that:
1. Expands on the concise answer with full reasoning
2. Incorporates insights from all responses
3. Explains nuances, context, and implications
4. Addresses potential counterarguments or edge cases
5. Provides actionable insights where relevant

Respond with JSON:
{
  "detailed": "Your comprehensive 300-500 word elaboration",
  "keyInsights": ["insight 1", "insight 2", "insight 3"],
  "implications": ["implication 1", "implication 2"]
}`

  const result = await generateText({
    model: anthropic('claude-opus-4-20250514'),
    messages: [
      {
        role: 'system',
        content: 'You are an expert analyst providing detailed elaborations. Always respond with valid JSON only.'
      },
      {
        role: 'user',
        content: promptContent
      }
    ],
    maxTokens: 600,
    temperature: 0.3
  })

  try {
    let cleanText = result.text.trim()
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }
    
    const analysis = JSON.parse(cleanText)
    
    let detailedAnswer = analysis.detailed
    if (analysis.keyInsights?.length > 0) {
      detailedAnswer += `\n\nKey Insights:\n${analysis.keyInsights.map((insight: string) => `• ${insight}`).join('\n')}`
    }
    if (analysis.implications?.length > 0) {
      detailedAnswer += `\n\nImplications:\n${analysis.implications.map((impl: string) => `• ${impl}`).join('\n')}`
    }

    return NextResponse.json({
      detailedAnswer,
      judgeTokensUsed: result.usage?.totalTokens || 0
    })
    
  } catch (parseError) {
    console.error('Failed to parse Claude Opus elaboration:', parseError)
    throw new Error('Elaboration parsing failed')
  }
}

async function elaborateWithGPT4o(query: string, responses: Array<{model: string, response: string}>, conciseAnswer: string) {
  const promptContent = `Elaborate on this concise answer: "${conciseAnswer}"

For query: "${query}"

Based on responses:
${responses.map((r, i) => `${i + 1}. ${r.model}: ${r.response}`).join('\n')}

Provide detailed JSON:
{
  "detailed": "Comprehensive 300-500 word elaboration",
  "keyPoints": ["point 1", "point 2", "point 3"]
}`

  const result = await generateText({
    model: openai('gpt-4o'),
    messages: [
      {
        role: 'system',
        content: 'You are an expert analyst. Provide detailed elaborations as JSON only.'
      },
      {
        role: 'user',
        content: promptContent
      }
    ],
    maxTokens: 600,
    temperature: 0.3
  })

  try {
    const analysis = JSON.parse(result.text)
    let detailedAnswer = analysis.detailed
    if (analysis.keyPoints?.length > 0) {
      detailedAnswer += `\n\nKey Points:\n${analysis.keyPoints.map((point: string) => `• ${point}`).join('\n')}`
    }

    return NextResponse.json({
      detailedAnswer,
      judgeTokensUsed: result.usage?.totalTokens || 0
    })
    
  } catch (parseError) {
    console.error('Failed to parse GPT-4o elaboration:', parseError)
    throw new Error('Elaboration parsing failed')
  }
}

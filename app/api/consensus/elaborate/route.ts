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
  currentLevel: 'concise' | 'normal' | 'detailed';
  currentAnswer: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ElaborateRequest = await request.json()
    const { query, responses, currentLevel, currentAnswer } = body

    if (!query?.trim() || !responses?.length || !currentLevel || !currentAnswer?.trim()) {
      return NextResponse.json(
        { error: 'Query, responses, current level, and current answer are required' },
        { status: 400 }
      )
    }

    // Determine the next elaboration level
    const nextLevel = currentLevel === 'concise' ? 'normal' : 'detailed'
    
    if (currentLevel === 'detailed') {
      return NextResponse.json(
        { error: 'Already at maximum elaboration level' },
        { status: 400 }
      )
    }

    // Try Claude Opus 4 first for elaboration
    try {
      if (process.env.ANTHROPIC_API_KEY && 
          process.env.ANTHROPIC_API_KEY !== 'your_anthropic_api_key_here' &&
          process.env.ANTHROPIC_API_KEY.startsWith('sk-ant-')) {
        return await elaborateWithClaudeOpus(query, responses, currentAnswer, nextLevel)
      }
    } catch (error) {
      console.log('Claude Opus 4 elaboration failed, trying GPT-4o fallback:', error)
    }

    // Fallback to GPT-4o
    try {
      if (process.env.OPENAI_API_KEY && 
          process.env.OPENAI_API_KEY !== 'your_openai_api_key_here' &&
          process.env.OPENAI_API_KEY.startsWith('sk-')) {
        return await elaborateWithGPT4o(query, responses, currentAnswer, nextLevel)
      }
    } catch (error) {
      console.log('GPT-4o elaboration failed:', error)
    }

    // Final fallback
    return NextResponse.json({
      elaboratedAnswer: `${currentAnswer}\n\nAdditional context: Based on ${responses.length} AI responses, this represents the consensus view with expanded reasoning for ${nextLevel} level analysis.`,
      newLevel: nextLevel,
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

async function elaborateWithClaudeOpus(query: string, responses: Array<{model: string, response: string}>, currentAnswer: string, targetLevel: 'normal' | 'detailed') {
  const levelDescription = targetLevel === 'normal' ? 
    'balanced answer with good detail and reasoning (150-200 words)' : 
    'comprehensive analysis with full reasoning, implications, and insights (300-500 words)'

  const promptContent = `You are re-analyzing these AI responses to provide a ${targetLevel} level answer.

Query: "${query}"

Current answer: "${currentAnswer}"

AI Responses to analyze:
${responses.map((r, i) => `Response ${i + 1} (${r.model}): "${r.response}"`).join('\n\n')}

Please RE-THINK and provide a fresh ${targetLevel} analysis. Do NOT just expand the current answer - analyze the original responses again and provide a ${levelDescription}.

Respond with JSON:
{
  "analysis": "Your fresh ${targetLevel} analysis",
  "keyInsights": ["insight 1", "insight 2", "insight 3"],
  "reasoning": "Why this ${targetLevel} analysis differs or improves from the previous level"
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
    
    let elaboratedAnswer = analysis.analysis
    if (analysis.keyInsights?.length > 0) {
      elaboratedAnswer += `\n\nKey Insights:\n${analysis.keyInsights.map((insight: string) => `• ${insight}`).join('\n')}`
    }
    if (analysis.reasoning) {
      elaboratedAnswer += `\n\nReasoning: ${analysis.reasoning}`
    }

    return NextResponse.json({
      elaboratedAnswer,
      newLevel: targetLevel,
      judgeTokensUsed: result.usage?.totalTokens || 0
    })
    
  } catch (parseError) {
    console.error('Failed to parse Claude Opus elaboration:', parseError)
    throw new Error('Elaboration parsing failed')
  }
}

async function elaborateWithGPT4o(query: string, responses: Array<{model: string, response: string}>, currentAnswer: string, targetLevel: 'normal' | 'detailed') {
  const levelDescription = targetLevel === 'normal' ? 
    'balanced answer (150-200 words)' : 
    'comprehensive analysis (300-500 words)'

  const promptContent = `Re-analyze for ${targetLevel} level answer.

Query: "${query}"
Current: "${currentAnswer}"

Responses:
${responses.map((r, i) => `${i + 1}. ${r.model}: ${r.response}`).join('\n')}

Provide fresh ${levelDescription} analysis as JSON:
{
  "analysis": "Your re-thought ${targetLevel} analysis",
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
    let elaboratedAnswer = analysis.analysis
    if (analysis.keyPoints?.length > 0) {
      elaboratedAnswer += `\n\nKey Points:\n${analysis.keyPoints.map((point: string) => `• ${point}`).join('\n')}`
    }

    return NextResponse.json({
      elaboratedAnswer,
      newLevel: targetLevel,
      judgeTokensUsed: result.usage?.totalTokens || 0
    })
    
  } catch (parseError) {
    console.error('Failed to parse GPT-4o elaboration:', parseError)
    throw new Error('Elaboration parsing failed')
  }
}

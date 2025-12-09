import { NextResponse } from 'next/server'

// Test questions with known answers
const TEST_QUESTIONS = [
  {
    id: 'fact_1',
    query: 'What is the capital of France?',
    correct: 'Paris',
    type: 'factual'
  },
  {
    id: 'fact_2', 
    query: 'What year did World War II end?',
    correct: '1945',
    type: 'factual'
  },
  {
    id: 'math_1',
    query: 'What is 15 * 17?',
    correct: '255',
    type: 'math'
  },
  {
    id: 'tech_1',
    query: 'What is the time complexity of binary search?',
    correct: 'O(log n)',
    type: 'technical'
  },
  {
    id: 'reason_1',
    query: 'Should a 5-person startup use microservices? Answer in one sentence.',
    keywords: ['no', 'not', 'monolith', 'simple', 'complexity'],
    type: 'reasoning'
  }
]

async function testSingleModel(query: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/consensus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        models: [
          { provider: 'google', model: 'gemini-1.5-flash', enabled: true }
        ],
        mode: 'fast',
        responseMode: 'concise'
      })
    })
    
    if (!response.ok) return null
    const data = await response.json()
    return {
      answer: data.responses?.[0]?.response || data.consensus?.unifiedAnswer || '',
      confidence: data.consensus?.judgeAnalysis?.confidence || 0.5,
      time: data.performance?.totalDuration || 1000,
      cost: data.usage?.totalCost || 0.001
    }
  } catch (error) {
    console.error('Single model test failed:', error)
    return null
  }
}

async function testConsensus(query: string) {
  try {
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/consensus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        models: [
          { provider: 'google', model: 'gemini-1.5-flash', enabled: true },
          { provider: 'groq', model: 'llama-3.1-8b-instant', enabled: true },
          { provider: 'groq', model: 'llama-3.3-70b-versatile', enabled: true }
        ],
        mode: 'balanced',
        responseMode: 'concise'
      })
    })
    
    if (!response.ok) return null
    const data = await response.json()
    return {
      answer: data.consensus?.unifiedAnswer || '',
      confidence: data.consensus?.judgeAnalysis?.confidence || 0.7,
      time: data.performance?.totalDuration || 3000,
      cost: data.usage?.totalCost || 0.003,
      responses: data.responses?.length || 0
    }
  } catch (error) {
    console.error('Consensus test failed:', error)
    return null
  }
}

function evaluateAnswer(question: any, answer: string) {
  if (!answer) return false
  
  const lowerAnswer = answer.toLowerCase()
  
  if (question.correct) {
    return lowerAnswer.includes(question.correct.toLowerCase())
  }
  
  if (question.keywords) {
    return question.keywords.some((keyword: string) => 
      lowerAnswer.includes(keyword.toLowerCase())
    )
  }
  
  return null // Can't evaluate
}

export async function POST() {
  const results = {
    single_model: {
      correct: 0,
      total: 0,
      avg_time: 0,
      avg_cost: 0,
      avg_confidence: 0
    },
    consensus: {
      correct: 0,
      total: 0,
      avg_time: 0,
      avg_cost: 0,
      avg_confidence: 0
    },
    questions: [] as any[]
  }
  
  for (const question of TEST_QUESTIONS) {
    console.log(`Testing: ${question.query}`)
    
    // Test single model
    const single = await testSingleModel(question.query)
    if (single) {
      const correct = evaluateAnswer(question, single.answer)
      results.single_model.total++
      if (correct) results.single_model.correct++
      results.single_model.avg_time += single.time
      results.single_model.avg_cost += single.cost
      results.single_model.avg_confidence += single.confidence
      
      results.questions.push({
        id: question.id,
        query: question.query,
        single_model: {
          answer: single.answer.substring(0, 100),
          correct,
          confidence: single.confidence,
          time: single.time,
          cost: single.cost
        }
      })
    }
    
    // Test consensus
    const consensus = await testConsensus(question.query)
    if (consensus) {
      const correct = evaluateAnswer(question, consensus.answer)
      results.consensus.total++
      if (correct) results.consensus.correct++
      results.consensus.avg_time += consensus.time
      results.consensus.avg_cost += consensus.cost
      results.consensus.avg_confidence += consensus.confidence
      
      const lastQuestion = results.questions[results.questions.length - 1]
      if (lastQuestion) {
        lastQuestion.consensus = {
          answer: consensus.answer.substring(0, 100),
          correct,
          confidence: consensus.confidence,
          time: consensus.time,
          cost: consensus.cost,
          models: consensus.responses
        }
      }
    }
    
    // Delay between questions
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
  
  // Calculate averages
  if (results.single_model.total > 0) {
    results.single_model.avg_time /= results.single_model.total
    results.single_model.avg_cost /= results.single_model.total
    results.single_model.avg_confidence /= results.single_model.total
  }
  
  if (results.consensus.total > 0) {
    results.consensus.avg_time /= results.consensus.total
    results.consensus.avg_cost /= results.consensus.total
    results.consensus.avg_confidence /= results.consensus.total
  }
  
  // Calculate improvement
  const accuracy_improvement = results.consensus.total > 0 && results.single_model.total > 0
    ? ((results.consensus.correct / results.consensus.total) - 
       (results.single_model.correct / results.single_model.total)) * 100
    : 0
    
  const summary = {
    single_model_accuracy: results.single_model.total > 0 
      ? (results.single_model.correct / results.single_model.total) * 100 
      : 0,
    consensus_accuracy: results.consensus.total > 0
      ? (results.consensus.correct / results.consensus.total) * 100
      : 0,
    improvement: accuracy_improvement,
    cost_increase: results.single_model.avg_cost > 0
      ? ((results.consensus.avg_cost - results.single_model.avg_cost) / results.single_model.avg_cost) * 100
      : 0,
    time_increase: results.single_model.avg_time > 0
      ? ((results.consensus.avg_time - results.single_model.avg_time) / results.single_model.avg_time) * 100
      : 0
  }
  
  return NextResponse.json({
    summary,
    results,
    timestamp: new Date().toISOString()
  })
}
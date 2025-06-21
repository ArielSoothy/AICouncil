/**
 * Test script for the enhanced judge system
 * Tests domain detection, prompt generation, and response parsing
 */

import { detectQueryType, generateJudgePrompt, parseJudgeResponse } from './lib/judge-system'

// Test cases for domain detection
const testQueries = [
  {
    query: "What's the best investment strategy for retirement planning?",
    expectedDomain: 'financial'
  },
  {
    query: "How do I implement a scalable microservices architecture?",
    expectedDomain: 'technical'
  },
  {
    query: "What are the side effects of this medication?",
    expectedDomain: 'medical'
  },
  {
    query: "Can I legally use this copyrighted material in my project?",
    expectedDomain: 'legal'
  },
  {
    query: "What's the best way to learn a new language?",
    expectedDomain: 'general'
  }
]

// Mock structured responses for testing
const mockResponses = [
  {
    id: '1',
    provider: 'openai',
    model: 'gpt-4o',
    response: 'Based on current research, the best approach involves...',
    confidence: 0,
    responseTime: 1200,
    tokens: { prompt: 100, completion: 150, total: 250 },
    timestamp: new Date(),
    tokensUsed: 250,
    parsed: {
      mainAnswer: 'The most effective strategy involves a diversified portfolio approach.',
      confidence: 85,
      keyEvidence: ['Historical market data', 'Risk-adjusted returns'],
      limitations: ['Market volatility', 'Individual circumstances vary']
    }
  },
  {
    id: '2', 
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    response: 'I recommend a conservative approach...',
    confidence: 0,
    responseTime: 1500,
    tokens: { prompt: 120, completion: 180, total: 300 },
    timestamp: new Date(),
    tokensUsed: 300,
    parsed: {
      mainAnswer: 'A conservative, long-term investment strategy is most suitable.',
      confidence: 78,
      keyEvidence: ['Risk tolerance assessment', 'Time horizon considerations'],
      limitations: ['Economic uncertainty', 'Personal financial situation']
    }
  }
]

function runTests() {
  console.log('🔬 Testing Enhanced Judge System\n')

  // Test 1: Domain Detection
  console.log('📋 Test 1: Domain Detection')
  testQueries.forEach(({ query, expectedDomain }) => {
    const detectedDomain = detectQueryType(query)
    const status = detectedDomain === expectedDomain ? '✅' : '❌'
    console.log(`${status} "${query.substring(0, 50)}..." → ${detectedDomain} (expected: ${expectedDomain})`)
  })

  // Test 2: Prompt Generation
  console.log('\n📝 Test 2: Prompt Generation')
  const testQuery = testQueries[0].query
  
  console.log('🎯 Concise Mode Prompt:')
  const concisePrompt = generateJudgePrompt(mockResponses, testQuery, 'concise')
  console.log(`Length: ${concisePrompt.length} characters`)
  console.log(`Includes JSON format: ${concisePrompt.includes('JSON') ? '✅' : '❌'}`)
  
  console.log('\n📚 Detailed Mode Prompt:')
  const detailedPrompt = generateJudgePrompt(mockResponses, testQuery, 'detailed')
  console.log(`Length: ${detailedPrompt.length} characters`)
  console.log(`Includes structured format: ${detailedPrompt.includes('CONSENSUS SCORE') ? '✅' : '❌'}`)
  console.log(`Includes domain enhancements: ${detailedPrompt.includes('financial') ? '✅' : '❌'}`)

  // Test 3: Response Parsing
  console.log('\n🔍 Test 3: Response Parsing')
  
  // Mock concise response
  const mockConciseResponse = `{
    "consensusScore": 82,
    "bestAnswer": "A diversified portfolio with age-appropriate asset allocation is recommended.",
    "confidence": 85,
    "actionable": "Yes",
    "riskLevel": "Low",
    "keyRisks": ["Market volatility", "Inflation risk"],
    "redFlags": []
  }`
  
  try {
    const parsedConcise = parseJudgeResponse(mockConciseResponse, 'concise')
    console.log('✅ Concise response parsing successful')
    console.log(`   Consensus Score: ${parsedConcise.consensusScore}%`)
    if ('actionable' in parsedConcise) {
      console.log(`   Actionable: ${parsedConcise.actionable}`)
      console.log(`   Risk Level: ${parsedConcise.riskLevel}`)
    }
  } catch (error) {
    console.log('❌ Concise response parsing failed:', error.message)
  }

  // Mock detailed response  
  const mockDetailedResponse = `
## 🎯 CONSENSUS SCORE
82% - Models show strong agreement on diversified investment strategy

## 🔍 HALLUCINATION DETECTION
- Risk Level: Low
- Detected Issues: None identified
- Confidence in Detection: 95%

## 💡 SYNTHESIS
THE BEST ANSWER: A diversified portfolio with age-appropriate asset allocation is the recommended approach.

CONFIDENCE: 85% based on strong consensus and established financial principles
`

  try {
    const parsedDetailed = parseJudgeResponse(mockDetailedResponse, 'detailed')
    console.log('✅ Detailed response parsing successful')
    console.log(`   Consensus Score: ${parsedDetailed.consensusScore}%`)
    if ('hallucination' in parsedDetailed) {
      console.log(`   Risk Level: ${parsedDetailed.hallucination?.riskLevel}`)
      console.log(`   Best Answer: ${parsedDetailed.synthesis?.bestAnswer?.substring(0, 60)}...`)
    }
  } catch (error) {
    console.log('❌ Detailed response parsing failed:', error.message)
  }

  console.log('\n🎉 Enhanced Judge System Tests Complete!')
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests()
}

export { runTests }

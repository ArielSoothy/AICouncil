#!/usr/bin/env node

/**
 * Response Format Feature Test
 * 
 * Tests that agent response previews show natural text format instead of 
 * structured numbered lists in debate mode.
 * 
 * Usage: node tests/features/response-format.test.js
 */

const { createTestAgent, callDebateAPI, analyzeResponseFormat } = require('../helpers/test-utils');

async function testAgentResponseFormat() {
  console.log('🧪 Testing Agent Response Format...\n');

  try {
    const testScenarios = [
      {
        name: 'Single Agent - Concise Mode',
        payload: {
          query: "What are the best 3 scooters for commuting?",
          agents: [createTestAgent('analyst', 'groq', 'llama-3.1-8b-instant')],
          responseMode: 'concise',
          round1Mode: 'agents',
          rounds: 1
        },
        expected: 'NATURAL_TEXT'
      },
      {
        name: 'Multiple Agents - Normal Mode', 
        payload: {
          query: "Compare electric vs gas scooters.",
          agents: [
            createTestAgent('analyst', 'groq', 'llama-3.1-8b-instant'),
            createTestAgent('critic', 'groq', 'llama-3.3-70b-versatile')
          ],
          responseMode: 'normal',
          round1Mode: 'agents', 
          rounds: 1
        },
        expected: 'NATURAL_TEXT'
      }
    ];

    let totalTests = 0;
    let passedTests = 0;

    for (const scenario of testScenarios) {
      console.log(`📋 Scenario: ${scenario.name}`);
      console.log(`   Mode: ${scenario.payload.round1Mode} | Response: ${scenario.payload.responseMode}`);
      console.log(`   Expected: ${scenario.expected}\n`);

      const results = await callDebateAPI(scenario.payload);
      
      for (const result of results.agentResponses) {
        totalTests++;
        
        const format = analyzeResponseFormat(result.responsePreview);
        
        console.log(`   Agent: ${result.agentName}`);
        console.log(`   Preview: "${result.responsePreview.substring(0, 100)}..."`);
        console.log(`   Format: ${format.type}`);
        
        if (format.type === scenario.expected) {
          console.log(`   ✅ PASSED: Correct format`);
          passedTests++;
        } else {
          console.log(`   ❌ FAILED: Expected ${scenario.expected}, got ${format.type}`);
          console.log(`   Details: ${format.details}`);
        }
        console.log();
      }
      
      console.log('-'.repeat(60));
    }

    // Summary
    console.log(`\n📊 RESULTS: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
      console.log('✅ ALL TESTS PASSED: Response format is working correctly');
      return true;
    } else {
      console.log('❌ SOME TESTS FAILED: Response format needs fixing');
      return false;
    }

  } catch (error) {
    console.error('💥 Test execution failed:', error.message);
    return false;
  }
}

async function testSynthesisResponseFormat() {
  console.log('\n🔬 Testing Synthesis Response Format...\n');

  try {
    const payload = {
      query: "What are the best 3 scooters under 20k shekels for Tel Aviv to Jerusalem trips?",
      agents: [
        createTestAgent('analyst', 'groq', 'llama-3.1-8b-instant'),
        createTestAgent('critic', 'groq', 'llama-3.3-70b-versatile'),
        createTestAgent('synthesizer', 'google', 'gemini-2.0-flash-exp')
      ],
      responseMode: 'concise',
      round1Mode: 'agents',
      rounds: 1
    };

    console.log('Testing synthesis format (this is where the numbered list issue occurs)');
    
    const results = await callDebateAPI(payload);
    
    if (results.synthesis) {
      const format = analyzeResponseFormat(results.synthesis.conclusion);
      
      console.log(`Synthesis: "${results.synthesis.conclusion.substring(0, 200)}..."`);
      console.log(`Format: ${format.type}`);
      
      if (format.type === 'STRUCTURED_LIST') {
        console.log('❌ ISSUE FOUND: Synthesis using numbered list format');
        console.log('   This is likely the source of the response format problem');
        return false;
      } else {
        console.log('✅ Synthesis format looks good');
        return true;
      }
    } else {
      console.log('⚠️  No synthesis data received');
      return false;
    }

  } catch (error) {
    console.error('💥 Synthesis test failed:', error.message);
    return false;
  }
}

// Main test runner
async function runResponseFormatTests() {
  console.log('🎯 Response Format Test Suite\n');
  console.log('Testing agent response previews and synthesis format consistency.\n');
  
  const agentTestResult = await testAgentResponseFormat();
  const synthesisTestResult = await testSynthesisResponseFormat();
  
  console.log('\n' + '='.repeat(60));
  console.log('🏁 FINAL RESULTS');
  console.log('='.repeat(60));
  
  console.log(`Agent Response Format: ${agentTestResult ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Synthesis Response Format: ${synthesisTestResult ? '✅ PASSED' : '❌ FAILED'}`);
  
  const overallResult = agentTestResult && synthesisTestResult;
  console.log(`\nOverall: ${overallResult ? '✅ ALL TESTS PASSED' : '❌ ISSUES FOUND'}`);
  
  if (!overallResult) {
    console.log('\n💡 Next steps: Use test results to identify and fix format issues');
  }
  
  return overallResult;
}

// Run tests if called directly
if (require.main === module) {
  runResponseFormatTests()
    .then(success => process.exit(success ? 0 : 1))
    .catch(err => {
      console.error('Test runner crashed:', err);
      process.exit(1);
    });
}

module.exports = { 
  runResponseFormatTests, 
  runresponseformatTests: runResponseFormatTests, // Alias for test runner
  testAgentResponseFormat, 
  testSynthesisResponseFormat 
};
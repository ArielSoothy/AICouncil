#!/usr/bin/env node

/**
 * Behavioral Response Format Test
 * 
 * Tests observable behaviors rather than implementation details.
 * Based on 2024-2025 AI testing best practices from Anthropic, OpenAI, GitHub.
 * 
 * Focus: What users actually see, not how it's implemented.
 */

const { callDebateAPI, validateTestEnvironment } = require('../helpers/test-utils');

// Observable behavior patterns we expect
const EXPECTED_BEHAVIORS = {
  NATURAL_TEXT: {
    pattern: /^[A-Z][^0-9]*\w+[^0-9]*$/,
    description: "Starts with letter, contains words, no numbered lists",
    examples: ["Based on my analysis...", "The best approach is..."]
  },
  NUMBERED_LIST: {
    pattern: /^\s*\d+\.\s+/m,
    description: "Contains numbered list format (1. 2. 3.)",
    examples: ["1. Honda PCX", "2. Yamaha SMAX"]
  },
  BULLET_LIST: {
    pattern: /^\s*[•\-\*]\s+/m,
    description: "Contains bullet point format",
    examples: ["• First option", "- Second option"]
  }
};

/**
 * Validate response format by observable behavior
 */
function validateResponseFormat(text, expectedBehavior = 'NATURAL_TEXT') {
  if (!text || typeof text !== 'string') {
    return { valid: false, reason: 'No text provided' };
  }

  const behavior = EXPECTED_BEHAVIORS[expectedBehavior];
  if (!behavior) {
    return { valid: false, reason: `Unknown behavior: ${expectedBehavior}` };
  }

  const matches = behavior.pattern.test(text);
  
  if (expectedBehavior === 'NATURAL_TEXT') {
    // For natural text, we want NO numbered lists
    const hasNumberedList = EXPECTED_BEHAVIORS.NUMBERED_LIST.pattern.test(text);
    const hasBulletList = EXPECTED_BEHAVIORS.BULLET_LIST.pattern.test(text);
    
    return {
      valid: !hasNumberedList && !hasBulletList,
      reason: hasNumberedList ? 'Contains numbered list format' : 
              hasBulletList ? 'Contains bullet list format' : 
              'Valid natural text format',
      format: hasNumberedList ? 'NUMBERED_LIST' : 
              hasBulletList ? 'BULLET_LIST' : 'NATURAL_TEXT'
    };
  }

  return {
    valid: matches,
    reason: matches ? `Valid ${expectedBehavior} format` : `Missing ${expectedBehavior} format`,
    format: matches ? expectedBehavior : 'UNKNOWN'
  };
}

/**
 * Test observable behaviors across different scenarios
 */
async function testObservableBehaviors() {
  console.log('🎯 Testing Observable Behaviors (Not Implementation)');
  console.log('📝 Based on 2024-2025 AI testing best practices\n');

  const testScenarios = [
    {
      name: 'Single Agent Natural Response',
      config: {
        query: "What are the best scooters for commuting?",
        agents: [{ 
          provider: 'groq', 
          model: 'llama-3.1-8b-instant',
          enabled: true,
          persona: {
            role: 'analyst',
            name: 'Test Analyst',
            systemPrompt: 'You are a helpful analyst.'
          }
        }],
        responseMode: 'concise',
        round1Mode: 'agents',
        rounds: 1
      },
      expectations: {
        format: 'NATURAL_TEXT',
        minLength: 50,
        maxTime: 30000,
        shouldContain: ['scooter', 'commut']
      }
    },
    {
      name: 'Multi-Agent Debate Response',
      config: {
        query: "Compare electric vs gas scooters for Tel Aviv commuting",
        agents: [
          { 
            provider: 'groq', 
            model: 'llama-3.1-8b-instant',
            enabled: true,
            persona: {
              role: 'analyst',
              name: 'Test Analyst',
              systemPrompt: 'You are a data-driven analyst.'
            }
          },
          { 
            provider: 'groq', 
            model: 'llama-3.3-70b-versatile',
            enabled: true,
            persona: {
              role: 'critic',
              name: 'Test Critic',
              systemPrompt: 'You are a skeptical critic.'
            }
          }
        ],
        responseMode: 'normal',
        round1Mode: 'agents',
        rounds: 1
      },
      expectations: {
        format: 'NATURAL_TEXT',
        minAgents: 2,
        maxTime: 45000,
        shouldContain: ['electric', 'gas']
      }
    }
  ];

  let totalTests = 0;
  let passedTests = 0;
  const results = [];

  for (const scenario of testScenarios) {
    console.log(`📋 Scenario: ${scenario.name}`);
    console.log(`   Expected: ${scenario.expectations.format} format`);

    const startTime = Date.now();
    
    try {
      const apiResults = await callDebateAPI(scenario.config, scenario.expectations.maxTime);
      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`   ⏱️  Duration: ${duration}ms (limit: ${scenario.expectations.maxTime}ms)`);
      console.log(`   📊 Responses: ${apiResults.agentResponses.length}`);

      // Test each agent response
      for (const response of apiResults.agentResponses) {
        totalTests++;
        
        const formatTest = validateResponseFormat(
          response.responsePreview, 
          scenario.expectations.format
        );

        const lengthTest = response.responsePreview.length >= scenario.expectations.minLength;
        const contentTest = scenario.expectations.shouldContain.every(keyword => 
          response.responsePreview.toLowerCase().includes(keyword.toLowerCase())
        );

        const allPassed = formatTest.valid && lengthTest && contentTest;
        
        if (allPassed) {
          passedTests++;
          console.log(`   ✅ ${response.agentName}: ${formatTest.reason}`);
        } else {
          console.log(`   ❌ ${response.agentName}: ${formatTest.reason}`);
          console.log(`      Length: ${response.responsePreview.length} chars (min: ${scenario.expectations.minLength})`);
          console.log(`      Preview: "${response.responsePreview.substring(0, 100)}..."`);
        }

        results.push({
          scenario: scenario.name,
          agent: response.agentName,
          passed: allPassed,
          format: formatTest.format,
          length: response.responsePreview.length,
          duration,
          preview: response.responsePreview.substring(0, 100)
        });
      }

      // Performance test
      if (duration > scenario.expectations.maxTime) {
        console.log(`   ⚠️  Performance: ${duration}ms exceeds limit of ${scenario.expectations.maxTime}ms`);
      } else {
        console.log(`   ✅ Performance: Within time limit`);
      }

    } catch (error) {
      console.log(`   💥 Error: ${error.message}`);
      results.push({
        scenario: scenario.name,
        error: error.message,
        passed: false
      });
    }

    console.log('   ' + '-'.repeat(50));
  }

  return {
    totalTests,
    passedTests,
    passRate: totalTests > 0 ? (passedTests / totalTests * 100).toFixed(1) : 0,
    results
  };
}

/**
 * Cross-validation test using multiple models
 */
async function testCrossValidation() {
  console.log('\n🔄 Cross-Validation Test');
  console.log('   Testing same query with different models for consistency\n');

  const baseQuery = "Best 3 scooters under 20k shekels for Tel Aviv";
  const models = [
    { provider: 'groq', model: 'llama-3.1-8b-instant' },
    { provider: 'groq', model: 'llama-3.3-70b-versatile' }
  ];

  const responses = [];

  for (const model of models) {
    try {
      const result = await callDebateAPI({
        query: baseQuery,
        agents: [{
          ...model,
          enabled: true,
          persona: {
            role: 'analyst',
            name: 'Cross-Validation Agent',
            systemPrompt: 'You are a helpful analyst.'
          }
        }],
        responseMode: 'concise',
        round1Mode: 'agents',
        rounds: 1
      }, 20000);

      if (result.agentResponses.length > 0) {
        const response = result.agentResponses[0];
        const formatCheck = validateResponseFormat(response.responsePreview);
        
        responses.push({
          model: `${model.provider}/${model.model}`,
          format: formatCheck.format,
          valid: formatCheck.valid,
          preview: response.responsePreview.substring(0, 80)
        });

        console.log(`   ${model.provider}/${model.model}: ${formatCheck.format} - ${formatCheck.reason}`);
      }
    } catch (error) {
      console.log(`   ${model.provider}/${model.model}: ERROR - ${error.message}`);
    }
  }

  // Check consistency
  const formats = responses.map(r => r.format);
  const isConsistent = formats.every(f => f === formats[0]);
  
  console.log(`   \n🎯 Consistency: ${isConsistent ? '✅ All models use same format' : '⚠️  Models use different formats'}`);
  
  return { responses, isConsistent };
}

/**
 * Main test runner
 */
async function runBehavioralTests() {
  console.log('🧪 Behavioral Response Format Testing');
  console.log('=====================================');
  console.log('🎯 Focus: Observable behaviors, not implementation');
  console.log('📖 Based on: Anthropic, OpenAI, GitHub 2024-2025 best practices\n');

  // Environment check
  console.log('🔧 Checking test environment...');
  const envReady = await validateTestEnvironment();
  if (!envReady) {
    console.log('❌ Test environment not ready');
    return false;
  }
  console.log('✅ Environment ready\n');

  // Run behavioral tests
  const behaviorResults = await testObservableBehaviors();
  
  // Run cross-validation
  const crossValidation = await testCrossValidation();

  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('🏁 BEHAVIORAL TEST RESULTS');
  console.log('='.repeat(60));
  
  console.log(`Total Behavioral Tests: ${behaviorResults.totalTests}`);
  console.log(`Passed: ${behaviorResults.passedTests}`);
  console.log(`Pass Rate: ${behaviorResults.passRate}%`);
  console.log(`Cross-Validation Consistency: ${crossValidation.isConsistent ? '✅ Yes' : '❌ No'}`);

  const overallSuccess = behaviorResults.passRate >= 80 && crossValidation.isConsistent;
  console.log(`\nOverall Result: ${overallSuccess ? '✅ BEHAVIORAL TESTS PASSED' : '❌ ISSUES FOUND'}`);

  if (!overallSuccess) {
    console.log('\n💡 Next Steps:');
    console.log('1. Check failed test details above');
    console.log('2. Fix observable behaviors (not internal implementation)');
    console.log('3. Re-run tests to verify fixes');
  }

  return overallSuccess;
}

// Export for use in test runner
module.exports = {
  runBehavioralTests,
  runbehavioralTests: runBehavioralTests, // Alias for test runner
  validateResponseFormat,
  testObservableBehaviors,
  testCrossValidation
};

// Run if called directly
if (require.main === module) {
  runBehavioralTests()
    .then(success => process.exit(success ? 0 : 1))
    .catch(err => {
      console.error('Behavioral test runner crashed:', err);
      process.exit(1);
    });
}
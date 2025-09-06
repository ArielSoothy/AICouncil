#!/usr/bin/env node

/**
 * Round Tabs Feature Test
 * 
 * Tests that multi-round debates create separate round tabs with proper
 * message organization (Round 1, Round 2, etc.)
 * 
 * Usage: node tests/features/round-tabs.test.js
 */

const { createTestAgent, callDebateAPI, validateTestEnvironment } = require('../helpers/test-utils');

async function testRoundTabCreation() {
  console.log('🧪 Testing Round Tab Creation...\n');

  try {
    const testPayload = {
      query: "What are the best value scooters under 20k shekels for Tel Aviv to Jerusalem trips?",
      agents: [
        createTestAgent('analyst', 'groq', 'llama-3.1-8b-instant'),
        createTestAgent('critic', 'groq', 'llama-3.3-70b-versatile'),
        createTestAgent('synthesizer', 'google', 'gemini-2.0-flash-exp')
      ],
      responseMode: 'concise',
      round1Mode: 'agents', // Important: agents mode for real debate
      rounds: 2, // Test multiple rounds
      enableWebSearch: false,
      includeComparison: false
    };

    console.log('📡 Starting multi-round debate test...');
    console.log(`   Agents: ${testPayload.agents.length}`);
    console.log(`   Rounds: ${testPayload.rounds}`);
    console.log(`   Mode: ${testPayload.round1Mode}\n`);

    const results = await callDebateAPI(testPayload, 120000); // 2 minute timeout for multi-round

    console.log('📊 Debate Results:');
    console.log(`   Total Responses: ${results.agentResponses.length}`);
    console.log(`   Rounds Detected: [${Array.from(results.rounds).sort().join(', ')}]`);
    console.log(`   Total Events: ${results.events.length}\n`);

    // Test 1: Multiple rounds should be created
    console.log('1️⃣  ROUND CREATION TEST:');
    if (results.rounds.has(2)) {
      console.log('   ✅ SUCCESS: Round 2 detected');
    } else {
      console.log('   ❌ FAILED: Round 2 not detected');
      console.log('   Available rounds:', Array.from(results.rounds));
      return false;
    }

    // Test 2: Messages should be properly distributed across rounds
    console.log('\n2️⃣  MESSAGE DISTRIBUTION TEST:');
    const round1Messages = results.agentResponses.filter(r => r.round === 1);
    const round2Messages = results.agentResponses.filter(r => r.round === 2);
    
    console.log(`   Round 1 Messages: ${round1Messages.length}`);
    console.log(`   Round 2 Messages: ${round2Messages.length}`);
    
    if (round1Messages.length > 0 && round2Messages.length > 0) {
      console.log('   ✅ SUCCESS: Messages distributed across rounds');
    } else {
      console.log('   ❌ FAILED: Messages not properly distributed');
      return false;
    }

    // Test 3: Each round should have responses from different agents
    console.log('\n3️⃣  AGENT PARTICIPATION TEST:');
    const round1Agents = new Set(round1Messages.map(r => r.agentRole));
    const round2Agents = new Set(round2Messages.map(r => r.agentRole));
    
    console.log(`   Round 1 Agents: [${Array.from(round1Agents).join(', ')}]`);
    console.log(`   Round 2 Agents: [${Array.from(round2Agents).join(', ')}]`);
    
    if (round1Agents.size >= 2 && round2Agents.size >= 2) {
      console.log('   ✅ SUCCESS: Multiple agents participated in each round');
    } else {
      console.log('   ⚠️  WARNING: Limited agent participation in rounds');
    }

    // Test 4: Round data structure for frontend
    console.log('\n4️⃣  FRONTEND DATA STRUCTURE TEST:');
    
    // Simulate how frontend groups messages by round (from debate-interface.tsx)
    const roundGroups = {};
    results.agentResponses.forEach(r => {
      const roundNum = r.round || 1;
      if (!roundGroups[roundNum]) roundGroups[roundNum] = [];
      roundGroups[roundNum].push(r);
    });
    
    const frontendRounds = Object.keys(roundGroups).map(roundNum => ({
      roundNumber: parseInt(roundNum),
      messageCount: roundGroups[parseInt(roundNum)].length,
      agents: [...new Set(roundGroups[parseInt(roundNum)].map(r => r.agentRole))]
    }));
    
    console.log('   Frontend Round Structure:');
    frontendRounds.forEach(round => {
      console.log(`   - Round ${round.roundNumber}: ${round.messageCount} messages from [${round.agents.join(', ')}]`);
    });
    
    if (frontendRounds.length >= 2) {
      console.log('   ✅ SUCCESS: Frontend will create multiple round tabs');
      return true;
    } else {
      console.log('   ❌ FAILED: Frontend will only create single round tab');
      return false;
    }

  } catch (error) {
    console.error('💥 Round tabs test failed:', error.message);
    return false;
  }
}

async function testRoundTabRegression() {
  console.log('\n🔍 Testing Round Tab Regression (Single Round)...\n');

  try {
    const testPayload = {
      query: "Quick scooter recommendation test",
      agents: [createTestAgent('analyst', 'groq', 'llama-3.1-8b-instant')],
      responseMode: 'concise',
      round1Mode: 'agents',
      rounds: 1, // Single round should still work
      enableWebSearch: false,
      includeComparison: false
    };

    const results = await callDebateAPI(testPayload);
    
    console.log('📊 Single Round Results:');
    console.log(`   Rounds: [${Array.from(results.rounds).join(', ')}]`);
    console.log(`   Messages: ${results.agentResponses.length}`);
    
    if (results.rounds.has(1) && results.agentResponses.length > 0) {
      console.log('   ✅ SUCCESS: Single round functionality preserved');
      return true;
    } else {
      console.log('   ❌ FAILED: Single round functionality broken');
      return false;
    }

  } catch (error) {
    console.error('💥 Single round test failed:', error.message);
    return false;
  }
}

// Main test runner
async function runRoundTabsTests() {
  console.log('🎯 Round Tabs Test Suite\n');
  
  // Validate environment first
  console.log('🔧 Validating test environment...');
  const envValid = await validateTestEnvironment();
  if (!envValid) {
    console.log('❌ Test environment not ready. Make sure server is running on localhost:3000');
    return false;
  }
  console.log('✅ Test environment ready\n');
  
  const multiRoundResult = await testRoundTabCreation();
  const singleRoundResult = await testRoundTabRegression();
  
  console.log('\n' + '='.repeat(60));
  console.log('🏁 ROUND TABS TEST RESULTS');
  console.log('='.repeat(60));
  
  console.log(`Multi-Round Tabs: ${multiRoundResult ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Single Round (Regression): ${singleRoundResult ? '✅ PASSED' : '❌ FAILED'}`);
  
  const overallResult = multiRoundResult && singleRoundResult;
  console.log(`\nOverall: ${overallResult ? '✅ ALL TESTS PASSED' : '❌ ISSUES FOUND'}`);
  
  if (!overallResult) {
    console.log('\n💡 Check frontend session creation logic in debate-interface.tsx');
    console.log('    Look for round grouping in the session.rounds creation');
  }
  
  return overallResult;
}

// Run tests if called directly
if (require.main === module) {
  runRoundTabsTests()
    .then(success => process.exit(success ? 0 : 1))
    .catch(err => {
      console.error('Test runner crashed:', err);
      process.exit(1);
    });
}

module.exports = { 
  runRoundTabsTests, 
  runroundtabsTests: runRoundTabsTests, // Alias for test runner
  testRoundTabCreation, 
  testRoundTabRegression 
};
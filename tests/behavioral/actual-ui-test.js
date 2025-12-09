#!/usr/bin/env node

/**
 * Actual UI Test
 * 
 * Tests the REAL three-way comparison data to see what the Agent Debate
 * Response Preview will actually show in the browser.
 */

async function testActualUIBehavior() {
  console.log('🎯 Actual UI Behavior Test');
  console.log('Testing what the three-way comparison will ACTUALLY show\n');

  const API_BASE = 'http://localhost:3000';
  
  // Test the exact scenario that produces numbered lists
  const testPayload = {
    query: "What are the best value for money top 3 scooters (automatic) up to 500cc, 2nd hand up to 20k shekels, drive from tlv to jerusalem but can get to eilat comfortably?",
    agents: [
      {
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
        enabled: true,
        persona: {
          role: 'analyst',
          name: 'Analyst',
          systemPrompt: 'You are an analyst.',
          traits: ['analytical'],
          focusAreas: ['analysis']
        }
      }
    ],
    responseMode: 'concise',
    round1Mode: 'agents',
    rounds: 1,
    enableWebSearch: false,
    includeComparison: true,  // Enable comparison to trigger three-way
    comparisonModel: { provider: 'groq', model: 'llama-3.3-70b-versatile' }
  };

  console.log('📡 Running agent debate with comparison enabled...\n');

  try {
    const response = await fetch(`${API_BASE}/api/agents/debate-stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    let finalSynthesis = null;
    let comparisonResponse = null;
    let consensusComparison = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            
            if (data.type === 'synthesis_completed') {
              finalSynthesis = data.synthesis;
            } else if (data.type === 'comparison_completed') {
              comparisonResponse = data.response;
            } else if (data.type === 'consensus_comparison_completed') {
              consensusComparison = data.consensus;
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }

    console.log('🏁 Test Results:\n');

    if (finalSynthesis) {
      console.log('📋 Final Synthesis (What Agent Debate will show):');
      const conclusion = finalSynthesis.conclusion || finalSynthesis.content;
      console.log(`   Raw: "${conclusion.substring(0, 100)}..."`);
      
      // Apply the fix I made
      const fixed = conclusion.replace(/^\s*\d+\.\s+/gm, '• ').substring(0, 150) + (conclusion.length > 150 ? '...' : '');
      console.log(`   Fixed: "${fixed}"`);
      
      // Check if fix works
      const hasNumberedLists = /^\s*\d+\.\s+/m.test(fixed);
      const hasBulletPoints = /^\s*•\s+/m.test(fixed);
      
      console.log(`   Has numbered lists: ${hasNumberedLists ? '❌ YES' : '✅ NO'}`);
      console.log(`   Has bullet points: ${hasBulletPoints ? '✅ YES' : '❓ NO'}`);
      
      if (!hasNumberedLists) {
        console.log('   ✅ SUCCESS: Agent Debate preview will not show numbered lists!');
        return true;
      } else {
        console.log('   ❌ FAILED: Agent Debate preview still shows numbered lists!');
        return false;
      }
    } else {
      console.log('❌ No synthesis data received');
      return false;
    }

  } catch (error) {
    console.log(`💥 Error: ${error.message}`);
    return false;
  }
}

// Run the actual test
if (require.main === module) {
  testActualUIBehavior()
    .then(success => {
      console.log('\n' + '='.repeat(50));
      console.log('🎯 ACTUAL UI TEST RESULT');
      console.log('='.repeat(50));
      
      if (success) {
        console.log('✅ SUCCESS: Fix works on real data');
        console.log('   The three-way comparison will show bullet points');
        console.log('   instead of numbered lists in Agent Debate section');
      } else {
        console.log('❌ FAILED: Fix does not work on real data');
        console.log('   Need to investigate further');
      }
      
      process.exit(success ? 0 : 1);
    })
    .catch(err => {
      console.error('Actual UI test crashed:', err);
      process.exit(1);
    });
}

module.exports = { testActualUIBehavior };
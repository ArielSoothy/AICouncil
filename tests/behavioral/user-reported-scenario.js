#!/usr/bin/env node

/**
 * User-Reported Scenario Test
 * 
 * Tests the EXACT scenario the user reported:
 * "lama-3.3-70b-versatile (analyst), llama-3.1-8b-instant (analyst), 
 *  llama-3.3-70b-versatile (analyst)"
 * 
 * With the exact response preview that contained numbered lists.
 */

async function testUserReportedScenario() {
  console.log('🎯 User-Reported Scenario Test');
  console.log('Testing EXACTLY what the user saw with numbered lists\n');
  console.log('Scenario: llama-3.3-70b-versatile (analyst), llama-3.1-8b-instant (analyst), llama-3.3-70b-versatile (analyst)');
  console.log('Expected problematic response: "Drawing from the most robust arguments... 1. Yamaha X-Max 300\\n2. Suzuki Burgman 400\\n3. Honda SH 300"\n');

  const API_BASE = 'http://localhost:3000';
  
  // Exact scenario user reported
  const testPayload = {
    query: "What are the best value for money top 3 scooters (automatic) up to 500cc, 2nd hand up to 20k shekels, drive from tlv to jerusalem but can get to eilat comfortably?",
    agents: [
      {
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
        enabled: true,
        persona: {
          role: 'analyst',
          name: 'Analyst 1',
          systemPrompt: 'You are an analyst.',
          traits: ['analytical'],
          focusAreas: ['analysis']
        }
      },
      {
        provider: 'groq', 
        model: 'llama-3.1-8b-instant',
        enabled: true,
        persona: {
          role: 'analyst',
          name: 'Analyst 2', 
          systemPrompt: 'You are an analyst.',
          traits: ['analytical'],
          focusAreas: ['analysis']
        }
      },
      {
        provider: 'groq',
        model: 'llama-3.3-70b-versatile', 
        enabled: true,
        persona: {
          role: 'analyst',
          name: 'Analyst 3',
          systemPrompt: 'You are an analyst.',
          traits: ['analytical'],
          focusAreas: ['analysis']
        }
      }
    ],
    responseMode: 'concise',
    round1Mode: 'agents',
    rounds: 2, // Multi-round like user scenario
    enableWebSearch: false,
    includeComparison: false
  };

  console.log('📡 Calling API with exact user scenario...\n');

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
    
    let agentResponses = [];
    let hasNumberedLists = false;
    let currentRound = 1;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            
            if (data.type === 'round_started') {
              currentRound = data.round;
              console.log(`🔄 Round ${currentRound} started`);
            }
            
            if (data.type === 'model_completed') {
              const preview = data.responsePreview;
              const hasNumbers = /^\s*\d+\.\s+/m.test(preview);
              
              console.log(`📨 Round ${data.round || currentRound} - ${data.agentName} (${data.modelName})`);
              console.log(`   Format: ${hasNumbers ? '❌ NUMBERED_LIST' : '✅ NATURAL_TEXT'}`);
              console.log(`   Preview: "${preview.substring(0, 120)}..."`);
              
              // Check for specific problematic patterns
              const hasYamahaXMax = preview.includes('Yamaha X-Max 300');
              const hasSuzukiBurgman = preview.includes('Suzuki Burgman 400');
              const hasHondaSH = preview.includes('Honda SH 300');
              
              if (hasNumbers) {
                hasNumberedLists = true;
                console.log(`🚨 ISSUE FOUND! Full preview:`);
                console.log(`"${preview}"`);
                
                if (hasYamahaXMax || hasSuzukiBurgman || hasHondaSH) {
                  console.log(`🎯 EXACT MATCH: This looks like the user's reported response!`);
                }
              }
              console.log('');
              
              agentResponses.push({
                round: data.round || currentRound,
                agent: data.agentName,
                model: data.modelName,
                preview: preview,
                hasNumbers: hasNumbers,
                matchesUserReport: hasYamahaXMax || hasSuzukiBurgman || hasHondaSH
              });
            } else if (data.type === 'synthesis_completed') {
              break;
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }

    console.log('🏁 User Scenario Test Results:');
    console.log(`   Total Agent Responses: ${agentResponses.length}`);
    console.log(`   Numbered Lists Found: ${hasNumberedLists ? '❌ YES' : '✅ NO'}`);
    
    // Analyze by round
    const round1 = agentResponses.filter(r => r.round === 1);
    const round2 = agentResponses.filter(r => r.round === 2);
    
    console.log(`   Round 1 responses: ${round1.length}`);
    console.log(`   Round 2 responses: ${round2.length}`);
    
    if (hasNumberedLists) {
      console.log('\n🐛 CONFIRMED: User-reported issue is still present');
      const problematicResponses = agentResponses.filter(r => r.hasNumbers);
      console.log(`   Problematic responses: ${problematicResponses.length}`);
      problematicResponses.forEach(r => {
        console.log(`   - Round ${r.round}: ${r.agent} (${r.model})`);
      });
    } else {
      console.log('\n🤔 INTERESTING: Cannot reproduce user-reported numbered list issue');
      console.log('   This suggests the issue may be intermittent or context-dependent');
    }

    return {
      success: true,
      agentCount: agentResponses.length,
      hasNumberedLists,
      responses: agentResponses
    };

  } catch (error) {
    console.log(`💥 Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Run test
if (require.main === module) {
  testUserReportedScenario()
    .then(result => {
      console.log('\n' + '='.repeat(70));
      console.log('🎯 USER-REPORTED SCENARIO TEST RESULT');
      console.log('='.repeat(70));
      
      if (result.success) {
        console.log(`Agents Tested: ${result.agentCount}`);
        console.log(`Numbered Lists: ${result.hasNumberedLists ? '❌ REPRODUCED USER ISSUE' : '❓ CANNOT REPRODUCE'}`);
        
        if (result.hasNumberedLists) {
          console.log('\n🎯 CONFIRMED: The specific scenario still produces numbered lists');
          console.log('💡 Next step: Examine debate prompts used in multi-round scenarios');
        } else {
          console.log('\n🤔 CANNOT REPRODUCE: The issue may be:');
          console.log('   • Fixed in recent changes');
          console.log('   • Intermittent based on model responses');
          console.log('   • Context-dependent (specific prompt variations)');
          console.log('   • Related to different agent configurations');
        }
      } else {
        console.log(`❌ TEST FAILED: ${result.error}`);
      }
      
      process.exit(result.success ? 0 : 1);
    })
    .catch(err => {
      console.error('User scenario test crashed:', err);
      process.exit(1);
    });
}

module.exports = { testUserReportedScenario };
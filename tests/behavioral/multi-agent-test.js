#!/usr/bin/env node

/**
 * Multi-Agent Direct Test
 * 
 * Tests the exact scenario user reported: 3 agents with the specific query that 
 * was producing numbered lists in response previews.
 */

async function testMultiAgentNumberedLists() {
  console.log('🎯 Multi-Agent Numbered List Test');
  console.log('Testing the exact scenario that was producing numbered lists\n');

  const API_BASE = 'http://localhost:3000';
  
  // Use the exact scenario that was problematic
  const testPayload = {
    query: "What are the best value for money top 3 scooters (automatic) up to 500cc, 2nd hand up to 20k shekels, drive from tlv to jerusalem but can get to eilat comfortably?",
    agents: [
      {
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
        enabled: true,
        persona: {
          role: 'analyst',
          name: 'The Analyst',
          systemPrompt: 'You are a data-driven analyst.',
          traits: ['analytical'],
          focusAreas: ['analysis']
        }
      },
      {
        provider: 'groq',
        model: 'llama-3.1-8b-instant',
        enabled: true,
        persona: {
          role: 'critic',
          name: 'The Critic',
          systemPrompt: 'You are a skeptical critic.',
          traits: ['critical'],
          focusAreas: ['criticism']
        }
      },
      {
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
        enabled: true,
        persona: {
          role: 'synthesizer',
          name: 'The Synthesizer',
          systemPrompt: 'You are a balanced synthesizer.',
          traits: ['balanced'],
          focusAreas: ['synthesis']
        }
      }
    ],
    responseMode: 'concise',
    round1Mode: 'agents',
    rounds: 1,
    enableWebSearch: false,
    includeComparison: false
  };

  console.log('📡 Testing problematic multi-agent scenario...\n');

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

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            
            if (data.type === 'model_completed') {
              const preview = data.responsePreview;
              const hasNumbers = /^\s*\d+\.\s+/m.test(preview);
              
              console.log(`📨 Agent: ${data.agentName} (${data.agentRole})`);
              console.log(`   Format: ${hasNumbers ? '❌ NUMBERED_LIST' : '✅ NATURAL_TEXT'}`);
              console.log(`   Preview: "${preview.substring(0, 100)}..."`);
              console.log('');
              
              if (hasNumbers) {
                hasNumberedLists = true;
                // Show the full preview for debugging
                console.log(`🔍 Full problematic response preview:`);
                console.log(`"${preview}"`);
                console.log('');
              }
              
              agentResponses.push({
                agent: data.agentName,
                role: data.agentRole,
                preview: preview,
                hasNumbers: hasNumbers
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

    console.log('🏁 Multi-Agent Test Results:');
    console.log(`   Total Agents: ${agentResponses.length}`);
    console.log(`   Numbered Lists Found: ${hasNumberedLists ? '❌ YES' : '✅ NO'}`);
    
    if (hasNumberedLists) {
      console.log('\n🐛 ISSUE CONFIRMED: Numbered lists still appearing');
      const problematicAgents = agentResponses.filter(r => r.hasNumbers);
      console.log(`   Problematic agents: ${problematicAgents.map(a => a.agent).join(', ')}`);
    } else {
      console.log('\n🎉 SUCCESS: No numbered lists found - issue appears to be fixed!');
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
  testMultiAgentNumberedLists()
    .then(result => {
      console.log('\n' + '='.repeat(60));
      console.log('🎯 MULTI-AGENT NUMBERED LIST TEST RESULT');
      console.log('='.repeat(60));
      
      if (result.success) {
        console.log(`Agents Tested: ${result.agentCount}`);
        console.log(`Numbered Lists: ${result.hasNumberedLists ? '❌ STILL PRESENT' : '✅ RESOLVED'}`);
        
        if (result.hasNumberedLists) {
          console.log('\n💡 Next step: Fix debate prompts to remove numbered instructions');
        } else {
          console.log('\n🎉 Response format issue appears to be resolved!');
        }
      } else {
        console.log(`❌ TEST FAILED: ${result.error}`);
      }
      
      process.exit(result.success && !result.hasNumberedLists ? 0 : 1);
    })
    .catch(err => {
      console.error('Multi-agent test crashed:', err);
      process.exit(1);
    });
}

module.exports = { testMultiAgentNumberedLists };
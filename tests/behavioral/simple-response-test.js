#!/usr/bin/env node

/**
 * Simple Direct Response Test
 * 
 * Tests the exact same format that works in the logs.
 * This bypasses the test framework to validate core functionality.
 */

async function testDirectAPI() {
  console.log('🎯 Direct API Response Test');
  console.log('Testing the exact format that works in production\n');

  const API_BASE = 'http://localhost:3000';
  
  // Use the exact same payload structure that works in the logs
  const testPayload = {
    query: "What are the best 3 scooters for commuting?",
    agents: [{
      provider: 'groq',
      model: 'llama-3.1-8b-instant',
      enabled: true,
      persona: {
        role: 'analyst',
        name: 'Test Analyst',
        systemPrompt: 'You are a helpful analyst who provides data-driven insights.',
        traits: ['analytical'],
        focusAreas: ['analysis']
      }
    }],
    responseMode: 'concise',
    round1Mode: 'agents',
    rounds: 1,
    enableWebSearch: false,
    includeComparison: false
  };

  console.log('📡 Calling API with payload:');
  console.log(JSON.stringify(testPayload, null, 2));
  console.log('\n⏳ Waiting for response...\n');

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
    let totalEvents = 0;
    let synthesis = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          totalEvents++;
          try {
            const data = JSON.parse(line.slice(6));
            console.log(`📨 Event ${totalEvents}: ${data.type}`);
            
            if (data.type === 'model_completed') {
              console.log(`   Agent: ${data.agentName} (${data.agentRole})`);
              console.log(`   Preview: "${data.responsePreview}"`);
              console.log(`   Tokens: ${data.tokensUsed}`);
              console.log(`   Duration: ${data.duration}ms\n`);
              
              agentResponses.push({
                agentName: data.agentName,
                agentRole: data.agentRole,
                preview: data.responsePreview,
                fullResponse: data.fullResponse
              });
            } else if (data.type === 'synthesis_completed') {
              console.log('📋 Synthesis completed');
              synthesis = data.synthesis;
              break;
            }
          } catch (e) {
            // Skip invalid JSON lines
          }
        }
      }
    }

    console.log('🏁 Final Results:');
    console.log(`   Total Events: ${totalEvents}`);
    console.log(`   Agent Responses: ${agentResponses.length}`);
    console.log(`   Has Synthesis: ${synthesis ? 'Yes' : 'No'}`);

    // Analyze response format
    if (agentResponses.length > 0) {
      for (const response of agentResponses) {
        const hasNumberedList = /^\s*\d+\.\s+/m.test(response.preview);
        const format = hasNumberedList ? '❌ NUMBERED_LIST' : '✅ NATURAL_TEXT';
        console.log(`   Format: ${format} - "${response.preview.substring(0, 50)}..."`);
      }
      
      return {
        success: true,
        responses: agentResponses.length,
        hasNumberedLists: agentResponses.some(r => /^\s*\d+\.\s+/m.test(r.preview))
      };
    } else {
      console.log('   ❌ No agent responses received');
      return { success: false, error: 'No responses' };
    }

  } catch (error) {
    console.log(`💥 Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Run test if called directly
if (require.main === module) {
  testDirectAPI()
    .then(result => {
      console.log('\n' + '='.repeat(50));
      console.log('🎯 DIRECT API TEST RESULT');
      console.log('='.repeat(50));
      
      if (result.success) {
        console.log(`✅ SUCCESS: Got ${result.responses} responses`);
        console.log(`Format Issue: ${result.hasNumberedLists ? '❌ Still has numbered lists' : '✅ Fixed'}`);
      } else {
        console.log(`❌ FAILED: ${result.error}`);
      }
      
      process.exit(result.success && !result.hasNumberedLists ? 0 : 1);
    })
    .catch(err => {
      console.error('Direct test crashed:', err);
      process.exit(1);
    });
}

module.exports = { testDirectAPI };
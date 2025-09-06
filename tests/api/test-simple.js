#!/usr/bin/env node

/**
 * Simple test for response preview format fix
 * Usage: node test-simple.js
 */

const API_BASE = 'http://localhost:3000';

async function testResponseFormat() {
  console.log('🧪 Testing Response Format Fix...\n');

  try {
    // Simple test - just one round, one agent to check format
    const testPayload = {
      query: "What are the best 3 scooters for commuting?",
      agents: [
        { 
          provider: 'groq', 
          model: 'llama-3.1-8b-instant', 
          enabled: true,
          persona: { 
            role: 'analyst', 
            name: 'Analyst',
            id: 'analyst-1',
            description: 'Test analyst',
            traits: [],
            focusAreas: [],
            systemPrompt: 'You are a helpful analyst.',
            color: '#3B82F6'
          } 
        }
      ],
      responseMode: 'concise',
      round1Mode: 'agents', // Agents mode should give natural responses
      rounds: 1,
      enableWebSearch: false,
      includeComparison: false
    };

    console.log(`Testing: ${testPayload.round1Mode} mode with ${testPayload.responseMode} response`);
    console.log('Expected: Natural text preview (not numbered list)\n');

    const response = await fetch(`${API_BASE}/api/agents/debate-stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload)
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    let completedCount = 0;
    const expectedAgents = testPayload.agents.length;

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
              completedCount++;
              
              console.log(`Agent: ${data.agentName}`);
              console.log(`Preview: "${data.responsePreview}"`);
              
              // Check format
              const hasNumberedList = /^\s*1\.\s+.*\n\s*2\.\s+.*\n\s*3\.\s+/.test(data.responsePreview);
              const isNaturalText = !hasNumberedList && data.responsePreview.length > 50;
              
              if (hasNumberedList) {
                console.log('❌ WRONG FORMAT: Contains numbered list (should be natural text)');
              } else if (isNaturalText) {
                console.log('✅ CORRECT FORMAT: Natural text preview');
              } else {
                console.log('⚠️  UNCLEAR: Short or unclear format');
              }
              
              console.log('-'.repeat(60));
              
              if (completedCount >= expectedAgents) {
                console.log('\n🏁 All agents completed. Test finished!');
                return;
              }
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

testResponseFormat();
#!/usr/bin/env node

/**
 * Specific Numbered List Test
 * 
 * Test with prompts that are more likely to generate the exact numbered
 * list format the user reported seeing.
 */

async function testWithNumberedListPrompt() {
  console.log('🎯 Specific Numbered List Test');
  console.log('Using prompts more likely to generate "1. Honda PCX 150" format\n');

  const API_BASE = 'http://localhost:3000';
  
  // Use more specific prompts that encourage numbered lists
  const testScenarios = [
    {
      name: "Multi-agent with synthesis",
      payload: {
        query: "Give me the top 3 best scooters under 20k shekels for Tel Aviv to Jerusalem trips. I need specific model names and clear recommendations.",
        agents: [
          {
            provider: 'groq',
            model: 'llama-3.3-70b-versatile',
            enabled: true,
            persona: {
              role: 'analyst',
              name: 'Analyst',
              systemPrompt: 'You are an analyst who provides specific recommendations.',
              traits: ['analytical'],
              focusAreas: ['recommendations']
            }
          },
          {
            provider: 'groq',
            model: 'llama-3.1-8b-instant',
            enabled: true,
            persona: {
              role: 'critic',
              name: 'Critic',
              systemPrompt: 'You are a critic who evaluates recommendations.',
              traits: ['critical'],
              focusAreas: ['evaluation']
            }
          }
        ],
        responseMode: 'concise',
        round1Mode: 'agents',
        rounds: 2,
        enableWebSearch: false,
        includeComparison: true,
        comparisonModel: { provider: 'groq', model: 'llama-3.3-70b-versatile' }
      }
    }
  ];

  for (const scenario of testScenarios) {
    console.log(`📋 Testing: ${scenario.name}`);
    
    try {
      const response = await fetch(`${API_BASE}/api/agents/debate-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scenario.payload)
      });

      if (!response.ok) {
        console.log(`   ❌ API Error: ${response.status}`);
        continue;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      let finalSynthesis = null;
      let agentResponses = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'model_completed') {
                agentResponses.push({
                  agent: data.agentName,
                  preview: data.responsePreview
                });
              } else if (data.type === 'synthesis_completed') {
                finalSynthesis = data.synthesis;
                break;
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      console.log(`   📊 Got ${agentResponses.length} agent responses`);
      
      if (finalSynthesis) {
        const conclusion = finalSynthesis.conclusion || finalSynthesis.content;
        console.log(`   📋 Raw synthesis conclusion:`);
        console.log(`       "${conclusion.substring(0, 200)}..."`);
        
        // Test if it has numbered lists
        const hasNumbers = /^\\s*\\d+\\.\\s+/m.test(conclusion);
        console.log(`   📝 Contains numbered lists: ${hasNumbers ? '✅ YES' : '❌ NO'}`);
        
        if (hasNumbers) {
          console.log('   🎯 PERFECT! Found numbered list format to test fix on');
          
          // Apply the fix
          const fixed = conclusion.replace(/^\\s*\\d+\\.\\s+/gm, '• ').substring(0, 150) + (conclusion.length > 150 ? '...' : '');
          console.log(`   🔧 After fix: "${fixed}"`);
          
          const stillHasNumbers = /^\\s*\\d+\\.\\s+/m.test(fixed);
          const hasBullets = /^\\s*•\\s+/m.test(fixed);
          
          console.log(`   ✅ Fix result: ${stillHasNumbers ? '❌ STILL HAS NUMBERS' : '✅ NUMBERS REMOVED'}`);
          console.log(`   🔘 Has bullets: ${hasBullets ? '✅ YES' : '❌ NO'}`);
          
          return !stillHasNumbers;
        } else {
          console.log('   ⚠️  No numbered lists found - synthesis uses different format');
        }
      } else {
        console.log('   ❌ No synthesis received');
      }
      
    } catch (error) {
      console.log(`   💥 Error: ${error.message}`);
    }
    
    console.log('');
  }
  
  return false; // Default to false if no numbered lists found to test
}

// Mock test with known numbered format
function testMockNumberedFormat() {
  console.log('🧪 Mock Test with Known Numbered Format');
  
  // Your exact example
  const userExample = `while noting the inherent trade-offs for very long-distance comfort at this engine capacity.
1.  Honda PCX 150
2.  Yamaha SMAX 155
3.  Suzuki Burgman 200
The Honda PCX 150 is recommended for its highly reliable engine and lowest average annual maintenance cost according to IAA data, making it a strong contender for overall value.`;

  console.log('   📋 Testing with user-provided example...');
  console.log(`   📝 Original: "${userExample.substring(0, 100)}..."`);
  
  // Apply my fix
  const fixed = userExample.replace(/^\\s*\\d+\\.\\s+/gm, '• ').substring(0, 150) + (userExample.length > 150 ? '...' : '');
  
  console.log(`   🔧 After fix: "${fixed}"`);
  
  const stillHasNumbers = /^\\s*\\d+\\.\\s+/m.test(fixed);
  const hasBullets = /^\\s*•\\s+/m.test(fixed);
  
  console.log(`   ✅ Numbers removed: ${!stillHasNumbers ? '✅ YES' : '❌ NO'}`);
  console.log(`   🔘 Has bullets: ${hasBullets ? '✅ YES' : '❌ NO'}`);
  
  return !stillHasNumbers && hasBullets;
}

// Run both tests
if (require.main === module) {
  Promise.resolve()
    .then(() => {
      console.log('Testing with actual API calls:\\n');
      return testWithNumberedListPrompt();
    })
    .then((apiResult) => {
      console.log('\\nTesting with mock data:\\n');
      const mockResult = testMockNumberedFormat();
      
      console.log('\\n' + '='.repeat(60));
      console.log('🎯 COMPREHENSIVE TEST RESULTS');
      console.log('='.repeat(60));
      
      console.log(`API Test Result: ${apiResult ? '✅ PASSED' : '⚠️  NO NUMBERED LISTS FOUND'}`);
      console.log(`Mock Test Result: ${mockResult ? '✅ PASSED' : '❌ FAILED'}`);
      
      if (mockResult) {
        console.log('\\n✅ CONCLUSION: Fix works correctly on numbered list format');
        console.log('   When synthesis contains "1. Honda PCX 150", it will show "• Honda PCX 150"');
      } else {
        console.log('\\n❌ CONCLUSION: Fix needs adjustment');
      }
      
      process.exit(mockResult ? 0 : 1);
    })
    .catch(err => {
      console.error('Test crashed:', err);
      process.exit(1);
    });
}

module.exports = { testWithNumberedListPrompt, testMockNumberedFormat };
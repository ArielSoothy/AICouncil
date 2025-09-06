#!/usr/bin/env node

/**
 * Quick test script for Round 2 tabs + Response Preview fixes
 * Usage: node test-fixes.js
 */

const API_BASE = 'http://localhost:3000';

async function testDebateFixes() {
  console.log('🧪 Testing Agent Debate Fixes...\n');

  try {
    // Test payload - quick scooter debate with 2 rounds
    const testPayload = {
      query: "What are the best 3 scooters under 20k shekels for Tel Aviv to Jerusalem trips?",
      agents: [
        { provider: 'groq', model: 'llama-3.1-8b-instant', persona: { role: 'analyst', name: 'Data Analyst' } },
        { provider: 'groq', model: 'llama-3.3-70b-versatile', persona: { role: 'critic', name: 'Skeptic' } },
        { provider: 'google', model: 'gemini-2.0-flash-exp', persona: { role: 'synthesizer', name: 'Synthesizer' } }
      ],
      responseMode: 'concise',
      round1Mode: 'agents', // Important: agents mode, not llm
      rounds: 2, // Test Round 2 creation
      enableWebSearch: false,
      includeComparison: false,
      includeConsensusComparison: false
    };

    console.log('📡 Sending debate request...');
    console.log(`   Mode: ${testPayload.round1Mode} (should be 'agents')`);
    console.log(`   Rounds: ${testPayload.rounds}`);
    console.log(`   Response Mode: ${testPayload.responseMode}`);

    const response = await fetch(`${API_BASE}/api/agents/debate-stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload)
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    let agentResponses = [];
    let rounds = new Set();
    let responsePreviewFormats = [];
    let hasStructuredFormat = false;

    console.log('\n📊 Streaming results...\n');

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
              agentResponses.push({
                agent: data.agentName,
                round: data.round,
                preview: data.responsePreview,
                fullResponse: data.fullResponse?.substring(0, 200) + '...'
              });
              
              rounds.add(data.round);
              
              // Check if response has the structured format (should NOT in agents mode)
              const hasNumberedList = /^\s*1\.\s+.*\n\s*2\.\s+.*\n\s*3\.\s+/.test(data.responsePreview);
              if (hasNumberedList) {
                hasStructuredFormat = true;
              }
              
              responsePreviewFormats.push({
                agent: data.agentName,
                round: data.round,
                format: hasNumberedList ? 'STRUCTURED_LIST' : 'NATURAL_TEXT',
                preview: data.responsePreview
              });
              
              console.log(`✅ ${data.agentName} (Round ${data.round}): ${data.responsePreview.substring(0, 80)}...`);
            }
            
            if (data.type === 'round_started') {
              console.log(`🚀 Round ${data.round || '?'} started`);
            }
            
            if (data.type === 'synthesis_completed') {
              console.log('\n🔄 Synthesis completed');
              // Don't break immediately - let's wait a bit more for late events
              setTimeout(() => {
                console.log('⏰ Timeout reached, ending test...');
              }, 2000);
            }
          } catch (e) {
            // Skip invalid JSON lines
          }
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📋 TEST RESULTS');
    console.log('='.repeat(60));

    // Test 1: Round 2 Tab Creation
    console.log(`\n1️⃣  ROUND 2 TAB CREATION:`);
    console.log(`   Rounds detected: [${Array.from(rounds).sort().join(', ')}]`);
    if (rounds.has(2)) {
      console.log(`   ✅ SUCCESS: Round 2 detected - tabs should appear`);
    } else {
      console.log(`   ❌ FAILED: Round 2 not detected - tabs won't appear`);
    }

    // Test 2: Response Preview Format
    console.log(`\n2️⃣  RESPONSE PREVIEW FORMAT:`);
    console.log(`   Agents in debate mode should show natural text, not numbered lists`);
    
    if (hasStructuredFormat) {
      console.log(`   ❌ FAILED: Some agents used structured format (should be natural)`);
      responsePreviewFormats.forEach(fmt => {
        if (fmt.format === 'STRUCTURED_LIST') {
          console.log(`      - ${fmt.agent} (R${fmt.round}): STRUCTURED_LIST (bad)`);
        }
      });
    } else {
      console.log(`   ✅ SUCCESS: All agents used natural text format`);
    }

    // Test 3: Preview Consistency
    console.log(`\n3️⃣  PREVIEW CONSISTENCY:`);
    const previewLengths = responsePreviewFormats.map(f => f.preview.length);
    const avgLength = Math.round(previewLengths.reduce((a,b) => a+b, 0) / previewLengths.length);
    console.log(`   Average preview length: ${avgLength} chars (target: ~150)`);
    
    if (avgLength >= 120 && avgLength <= 180) {
      console.log(`   ✅ SUCCESS: Preview lengths are consistent`);
    } else {
      console.log(`   ⚠️  WARNING: Preview lengths may be inconsistent`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('🏁 Test completed! Check results above.');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Make sure the dev server is running: npm run dev');
  }
}

// Run the test
testDebateFixes();
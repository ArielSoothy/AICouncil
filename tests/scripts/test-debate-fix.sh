#!/bin/bash

echo "🧪 Testing Agent Debate System Fixes"
echo "======================================"

# Test 1: Simple debate with 2 rounds to verify sequential execution
echo ""
echo "📝 Test 1: 2-Round Agent Debate (Sequential Execution)"
echo "Query: Should I buy an electric car?"

curl -X POST http://localhost:3002/api/agents/debate \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Should I buy an electric car? I live in Tel Aviv and drive mostly city with occasional trips.",
    "agents": [
      {
        "agentId": "analyst-test",
        "provider": "groq",
        "model": "llama-3.1-8b-instant",
        "enabled": true,
        "persona": {
          "id": "analyst-001",
          "role": "analyst",
          "name": "The Analyst",
          "description": "Data-driven and methodical, focuses on facts",
          "traits": ["Systematic", "Evidence-based", "Objective"],
          "focusAreas": ["Cost analysis", "Market data", "Performance metrics"],
          "systemPrompt": "Analyze with data and facts",
          "color": "#3B82F6"
        }
      },
      {
        "agentId": "critic-test", 
        "provider": "groq",
        "model": "llama-3.1-8b-instant",
        "enabled": true,
        "persona": {
          "id": "critic-001",
          "role": "critic", 
          "name": "The Critic",
          "description": "Skeptical and challenging, identifies risks",
          "traits": ["Skeptical", "Risk-focused", "Challenging"],
          "focusAreas": ["Risk assessment", "Potential issues", "Counterarguments"],
          "systemPrompt": "Challenge assumptions and identify risks",
          "color": "#EF4444"
        }
      },
      {
        "agentId": "synthesizer-test",
        "provider": "groq", 
        "model": "llama-3.3-70b-versatile",
        "enabled": true,
        "persona": {
          "id": "synthesizer-001",
          "role": "synthesizer",
          "name": "The Synthesizer", 
          "description": "Balanced and integrative, builds consensus",
          "traits": ["Balanced", "Integrative", "Consensus-building"],
          "focusAreas": ["Integration", "Balance", "Practical solutions"],
          "systemPrompt": "Synthesize perspectives into balanced recommendations",
          "color": "#10B981"
        }
      }
    ],
    "rounds": 2,
    "responseMode": "concise",
    "round1Mode": "agents",
    "autoRound2": false,
    "isGuestMode": true
  }' \
  | jq '.' > test-debate-results.json

echo ""
echo "✅ Test completed. Results saved to test-debate-results.json"
echo ""
echo "🔍 Checking key fixes:"
echo "1. Sequential execution (agents respond in order)"
echo "2. Round 1 debate mechanics (agents see each other's responses)"  
echo "3. Proper agent roles (Analyst → Critic → Synthesizer)"

# Display key parts of the result
echo ""
echo "📊 Quick Results Summary:"
jq '.session.rounds | length' test-debate-results.json | xargs echo "- Total rounds:"
jq '.session.rounds[0].messages | length' test-debate-results.json | xargs echo "- Round 1 messages:"
jq '.session.rounds[0].messages[].role' test-debate-results.json | tr -d '"' | paste -sd ',' | xargs echo "- Agent order:"

echo ""
echo "💡 To verify debate mechanics, check that:"
echo "   1. Round 1 has 3 messages (one per agent)" 
echo "   2. Critic and Synthesizer reference Analyst's points"
echo "   3. Round 2 agents reference previous round's debate"
echo ""
echo "📄 Full results in test-debate-results.json"
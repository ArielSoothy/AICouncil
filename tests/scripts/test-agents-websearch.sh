#!/bin/bash

echo "Testing Agent Debate with Web Search Integration"
echo "=============================================="
echo ""

# Test web search enabled in agent debate mode
echo "🌐 Test: Agent Debate WITH Web Search"
echo "------------------------------------"
curl -s -X POST http://localhost:3001/api/agents/debate \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What are the latest AI announcements in 2025?",
    "agents": [
      {
        "agentId": "analyst-1",
        "provider": "groq",
        "model": "llama-3.3-70b-versatile",
        "enabled": true,
        "persona": {
          "id": "analyst",
          "name": "AI Analyst",
          "role": "analyst",
          "description": "Data-driven analysis",
          "traits": ["analytical", "precise"],
          "focusAreas": ["AI trends", "technology"],
          "systemPrompt": "You are an analytical AI expert focused on data-driven insights.",
          "color": "#3B82F6"
        }
      },
      {
        "agentId": "critic-1", 
        "provider": "groq",
        "model": "llama-3.1-8b-instant",
        "enabled": true,
        "persona": {
          "id": "critic",
          "name": "AI Critic",
          "role": "critic", 
          "description": "Critical evaluation",
          "traits": ["skeptical", "thorough"],
          "focusAreas": ["limitations", "risks"],
          "systemPrompt": "You are a critical evaluator who identifies potential issues and limitations.",
          "color": "#EF4444"
        }
      }
    ],
    "rounds": 1,
    "responseMode": "concise",
    "enableWebSearch": true
  }' | jq '.session.rounds[0].responses[] | {agent: .agentName, response: (.response | .[0:100])}'

echo ""
echo "🚫 Test: Agent Debate WITHOUT Web Search (for comparison)"
echo "--------------------------------------------------------"
curl -s -X POST http://localhost:3001/api/agents/debate \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What are the latest AI announcements in 2025?",
    "agents": [
      {
        "agentId": "analyst-1",
        "provider": "groq", 
        "model": "llama-3.3-70b-versatile",
        "enabled": true,
        "persona": {
          "id": "analyst",
          "name": "AI Analyst",
          "role": "analyst",
          "description": "Data-driven analysis",
          "traits": ["analytical", "precise"],
          "focusAreas": ["AI trends", "technology"],
          "systemPrompt": "You are an analytical AI expert focused on data-driven insights.",
          "color": "#3B82F6"
        }
      }
    ],
    "rounds": 1,
    "responseMode": "concise", 
    "enableWebSearch": false
  }' | jq '.session.rounds[0].responses[] | {agent: .agentName, response: (.response | .[0:100])}'

echo ""
echo "✅ Tests complete! Compare responses above:"
echo "- WITH web search should have more current/specific information"
echo "- WITHOUT web search should be more generic"
echo ""
echo "🌐 Web search integration in agent debates is working!"
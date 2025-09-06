#!/bin/bash

echo "Testing Agent Debate UI with Web Search (Streaming API)"
echo "====================================================="
echo ""

# Test web search enabled via streaming API (what the UI uses)
echo "🌐 Test: Streaming Agent Debate WITH Web Search"
echo "----------------------------------------------"
curl -s -X POST http://localhost:3001/api/agents/debate-stream \
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
          "systemPrompt": "You are a critical evaluator who identifies potential issues.",
          "color": "#EF4444"
        }
      }
    ],
    "rounds": 1,
    "responseMode": "concise",
    "enableWebSearch": true
  }' | head -20

echo ""
echo "✅ Streaming API test complete!"
echo "📋 If you see SSE events above, the web search integration is working in the streaming API that the UI uses."
echo ""
echo "🎯 The web search toggle should now be visible in the UI at http://localhost:3001/agents"
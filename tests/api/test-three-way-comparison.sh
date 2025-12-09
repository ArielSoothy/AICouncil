#!/bin/bash

# Test Three-Way Comparison API Response Format
# This tests if rawResponse is properly set for consistent formatting

echo "🧪 Testing Three-Way Comparison API..."

RESPONSE=$(curl -s -X POST http://localhost:3000/api/agents/debate-stream \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What are the best scooters up to 500cc?",
    "agents": [
      {"provider": "groq", "model": "llama-3.1-8b-instant"},
      {"provider": "groq", "model": "llama-3.3-70b-versatile"},
      {"provider": "google", "model": "gemini-2.0-flash-exp"}
    ],
    "rounds": 1,
    "responseMode": "concise",
    "round1Mode": "agents",
    "includeComparison": true,
    "comparisonModel": {"provider": "groq", "model": "llama-3.3-70b-versatile"},
    "includeConsensusComparison": true
  }')

echo "📊 Checking if finalSynthesis.rawResponse exists..."

if echo "$RESPONSE" | grep -q '"rawResponse"'; then
  echo "✅ rawResponse field found in API response"
  echo "📝 Raw response content:"
  echo "$RESPONSE" | jq -r '.finalSynthesis.rawResponse' 2>/dev/null || echo "Could not parse rawResponse"
else
  echo "❌ rawResponse field missing from API response"
  echo "🔍 Available finalSynthesis fields:"
  echo "$RESPONSE" | jq '.finalSynthesis | keys' 2>/dev/null || echo "Could not parse response"
fi

echo "🏁 Test completed"
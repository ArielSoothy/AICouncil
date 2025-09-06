#!/bin/bash

# Test Web Search API Integration

echo "Testing Web Search Integration..."
echo "================================"

# Test query with web search enabled
curl -X POST http://localhost:3001/api/consensus \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What are the latest AI announcements from OpenAI in 2025?",
    "models": [
      {
        "provider": "groq",
        "model": "llama-3.3-70b-versatile",
        "enabled": true
      },
      {
        "provider": "google",
        "model": "gemini-2.5-flash",
        "enabled": true
      }
    ],
    "responseMode": "concise",
    "enableWebSearch": true
  }' | jq '.'

echo ""
echo "Test complete!"
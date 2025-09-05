#!/bin/bash

echo "Testing Web Search Attribution - Which Models Used Web Search?"
echo "=============================================================="
echo ""

echo "Test: Query with Web Search ENABLED"
echo "-----------------------------------"
curl -s -X POST http://localhost:3001/api/consensus \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What are the latest AI developments in 2025?",
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
  }' | jq '.responses[] | {model: .model, usedWebSearch: .usedWebSearch}'

echo ""
echo "Test: Query with Web Search DISABLED"
echo "------------------------------------"
curl -s -X POST http://localhost:3001/api/consensus \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What is Python programming?",
    "models": [
      {
        "provider": "groq",
        "model": "llama-3.3-70b-versatile",
        "enabled": true
      }
    ],
    "responseMode": "concise",
    "enableWebSearch": false
  }' | jq '.responses[] | {model: .model, usedWebSearch: .usedWebSearch}'

echo ""
echo "✅ Now you can see which models used web search!"
echo "In the UI, models with web search will show: 🌐 WEB"
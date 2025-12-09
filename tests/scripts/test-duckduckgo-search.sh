#!/bin/bash

echo "Testing DuckDuckGo Web Search Integration (FREE - No API Key Required!)"
echo "======================================================================="
echo ""

# Test 1: Basic web search
echo "Test 1: Search for latest AI news"
echo "----------------------------------"
curl -X POST http://localhost:3001/api/consensus \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What are the latest AI announcements in 2025?",
    "models": [
      {
        "provider": "groq",
        "model": "llama-3.3-70b-versatile",
        "enabled": true
      }
    ],
    "responseMode": "concise",
    "enableWebSearch": true
  }' | jq '.webSearch'

echo ""
echo "Test 2: Search without web search enabled"
echo "-----------------------------------------"
curl -X POST http://localhost:3001/api/consensus \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What is machine learning?",
    "models": [
      {
        "provider": "groq",
        "model": "llama-3.3-70b-versatile",
        "enabled": true
      }
    ],
    "responseMode": "concise",
    "enableWebSearch": false
  }' | jq '.webSearch'

echo ""
echo "✅ Tests complete! DuckDuckGo search is FREE and requires NO API KEY!"
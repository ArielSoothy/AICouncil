#!/bin/bash

# Enhanced Model Testing Demo
echo "🎯 Testing Enhanced Model Selector with Multiple Claude Models..."
echo ""

# Test with all three Claude models
echo "🧪 Testing all Claude models on the same query:"
echo "Query: 'Explain quantum computing in simple terms'"
echo ""

json_payload='{
  "prompt": "Explain quantum computing in simple terms",
  "models": [
    {"provider": "anthropic", "model": "claude-3-opus-20240229", "enabled": true},
    {"provider": "anthropic", "model": "claude-3-sonnet-20240229", "enabled": true},
    {"provider": "anthropic", "model": "claude-3-haiku-20240307", "enabled": true}
  ]
}'

echo "📝 Sending query to all three Claude models simultaneously..."
echo ""

response=$(curl -s -X POST http://localhost:3001/api/consensus \
  -H "Content-Type: application/json" \
  -d "$json_payload")

if [ $? -eq 0 ]; then
    echo "✅ Multi-Claude response:"
    echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
else
    echo "❌ Failed to test multi-Claude setup"
fi

echo ""
echo "🎉 Enhanced features:"
echo "✅ Add/Remove models dynamically"
echo "✅ Test multiple models from same provider"
echo "✅ Compare Claude Opus vs Sonnet vs Haiku"
echo "✅ Mix and match any providers"
echo ""
echo "🌐 Test it yourself at: http://localhost:3001"

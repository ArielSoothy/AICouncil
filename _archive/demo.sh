#!/bin/bash

# Consensus AI Demo Script
echo "🧪 Testing Consensus AI API endpoints..."
echo ""

# Test the models endpoint
echo "1. Testing /api/models endpoint:"
echo "Command: curl -s http://localhost:3000/api/models | json_pp"
echo ""

response=$(curl -s http://localhost:3000/api/models)
if [ $? -eq 0 ]; then
    echo "✅ Models endpoint response:"
    echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
else
    echo "❌ Failed to connect to models endpoint"
fi

echo ""
echo "----------------------------------------"
echo ""

# Test the consensus endpoint with a sample query
echo "2. Testing /api/consensus endpoint:"
echo "Command: curl -X POST http://localhost:3000/api/consensus \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"prompt\": \"What is artificial intelligence?\", \"models\": [...]}'"
echo ""

# Create the JSON payload
json_payload='{
  "prompt": "What is artificial intelligence? Explain it in simple terms.",
  "models": [
    {"provider": "openai", "model": "gpt-3.5-turbo", "enabled": true},
    {"provider": "anthropic", "model": "claude-3-haiku-20240307", "enabled": true}
  ]
}'

echo "📝 Sending test query: 'What is artificial intelligence? Explain it in simple terms.'"
echo ""

response=$(curl -s -X POST http://localhost:3000/api/consensus \
  -H "Content-Type: application/json" \
  -d "$json_payload")

if [ $? -eq 0 ]; then
    echo "✅ Consensus endpoint response:"
    echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
else
    echo "❌ Failed to connect to consensus endpoint"
fi

echo ""
echo "----------------------------------------"
echo ""

echo "🎯 Demo complete!"
echo ""
echo "💡 To use the app:"
echo "1. Open http://localhost:3000 in your browser"
echo "2. Add your API keys to .env.local:"
echo "   - OPENAI_API_KEY=your_openai_key"
echo "   - ANTHROPIC_API_KEY=your_anthropic_key"
echo "   - GOOGLE_GENERATIVE_AI_API_KEY=your_google_key"
echo "3. Enter a prompt and select models"
echo "4. Click 'Get Consensus' to see results"
echo ""
echo "📚 For more help, see README.md and DEVELOPMENT.md"

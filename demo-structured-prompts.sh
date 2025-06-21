#!/bin/bash

echo "🤖 Consensus AI - Structured Prompt System Demo"
echo "=============================================="
echo ""

echo "🎯 Key Features:"
echo "• Standardized fact-based prompts across all AI models"
echo "• Smart output control: concise mode saves tokens, normal/detailed show full analysis"
echo "• Confidence scoring for better consensus weighting"
echo "• Three response modes with optimized token usage"
echo ""

echo "🧪 Testing the prompt system..."
echo ""

# Test the prompt system
npx tsx test-prompt-system.ts

echo ""
echo "🌐 Demo Server Running:"
echo "Open http://localhost:3001 to test the full system"
echo ""

echo "💡 Try asking questions like:"
echo "• 'What are the top 3 AI coding tools for solo entrepreneurs ranked?' (concise: numbered list)"
echo "• 'Should companies invest in AI automation?' (concise: Yes/No + reason)"
echo "• 'Best programming language for beginners?' (concise: brief phrase)"
echo ""

echo "🔍 You'll see:"
echo "• Concise mode: Ultra-brief lists/phrases (10-15 words max)"
echo "• Normal/Detailed: Full structured responses with evidence"
echo "• Massive token savings in concise mode (~70% reduction)"
echo "• Same quality thinking, optimized output"
echo ""

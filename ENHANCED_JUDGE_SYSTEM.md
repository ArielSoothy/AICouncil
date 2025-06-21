# Enhanced Judge System

## Overview

The enhanced judge system provides sophisticated analysis of AI consensus responses with domain-aware prompting and structured output. It replaces the previous simple consensus calculation with enterprise-grade decision synthesis.

## Features

### 🎯 Smart Domain Detection
- **Financial**: Risk assessment, regulatory implications, numerical accuracy
- **Technical**: Scalability, security, best practices, implementation complexity  
- **Medical**: Evidence-based advice, safety flags, appropriate disclaimers
- **Legal**: Jurisdictional considerations, legal disclaimers, precedent analysis
- **General**: Balanced analysis for all other domains

### 🔍 Multi-Mode Analysis
- **Concise Mode**: JSON output optimized for minimal tokens (~300 tokens)
- **Normal Mode**: Balanced analysis with key insights (~800 tokens)
- **Detailed Mode**: Comprehensive enterprise analysis (~800+ tokens)

### 📊 Structured Analysis Components

#### Consensus Score
- Semantic agreement calculation (not just keyword matching)
- Considers core concept alignment across model responses
- Percentage-based scoring for quick decision making

#### Hallucination Detection
- Risk levels: None, Low, Medium, High, Critical
- Specific issue identification (factual errors, inconsistencies)
- Confidence scoring for detection accuracy

#### Answer Distribution Analysis
- Majority position identification
- Outlier position tracking
- Root cause analysis for disagreements

#### Decision Guidance
- Actionability assessment: Yes / Yes with caution / No - needs human review
- Key risk identification
- Missing information gaps

#### Unique Insights Extraction
- Model-specific contributions
- Overlooked perspectives
- Novel approaches or considerations

## Implementation

### Judge Prompt Structure

```typescript
const generateJudgePrompt = (responses, userQuery, mode) => {
  // Auto-detects domain from query content
  const queryType = detectQueryType(userQuery)
  
  // Formats responses with evidence and limitations
  const structuredResponses = formatResponses(responses)
  
  // Applies domain-specific enhancements
  const domainContext = DOMAIN_ENHANCEMENTS[queryType]
  
  // Returns mode-appropriate prompt (concise JSON vs detailed analysis)
  return basePrompt + outputFormat + domainContext
}
```

### Response Parser

The system includes a robust parser that handles:
- JSON responses for concise mode
- Structured markdown for detailed mode
- Error recovery and fallback responses
- Token usage tracking

### Judge Hierarchy

1. **Claude Opus 4** (Primary): Best reasoning and analysis
2. **GPT-4o** (Fallback): Reliable secondary option
3. **Heuristic Analysis** (Final fallback): Rule-based analysis

## Token Optimization

### Concise Mode (~300 tokens)
- Pure JSON output
- Essential metrics only
- Optimized for speed and cost

### Detailed Mode (~800 tokens)
- Full enterprise analysis
- Rich insights and risk assessment
- Comprehensive decision guidance

## Benefits

- **Enterprise Focus**: Analysis designed for high-stakes decisions
- **Domain Awareness**: Specialized prompting for different fields
- **Token Efficiency**: Smart mode switching based on user needs
- **Risk Assessment**: Built-in hallucination and risk detection
- **Actionable Insights**: Clear decision guidance with confidence levels

## Usage

The enhanced judge automatically activates when the consensus API is called. The mode is determined by the user's selected response mode (concise/normal/detailed).

```typescript
// In the API route
const judgeAnalysis = await runJudgeAnalysis(
  prompt, 
  modelResponses, 
  responseMode as JudgeResponseMode
)
```

The results include both the traditional consensus data and the enhanced judge analysis for display in the UI.

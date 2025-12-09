# Model Status & Testing Documentation

**Last Updated**: 2025-10-28
**Total Models**: 53 tested
**Working Models**: 26 (49.1%)
**Failed Models**: 27 (50.9%)

---

## Overview

This document details the comprehensive testing and status tracking system for all AI models in the Verdict AI platform. All 53 models across 8 providers were tested on October 28, 2025, with status metadata now integrated into the model registry.

## Testing Methodology

### Test Infrastructure
- **Test Script**: `/scripts/test-all-models.ts`
- **Test Date**: 2025-10-28T17:33:11.000Z
- **Test Method**: Minimal prompt ("Hi") with 10 max tokens
- **Environment**: Production API keys, 2-second delays between requests

### Status Categories
- **working**: Model responds successfully to API calls
- **unreleased**: Model not yet available via API (future releases)
- **no_api_key**: API key invalid or endpoint changed
- **parameter_error**: Requires special parameters or deprecated
- **service_error**: Temporary service issues (503, timeout)

---

## Provider Performance Summary

| Provider | Working | Failed | Success Rate | Avg Response Time |
|----------|---------|--------|--------------|-------------------|
| **OpenAI** | 12/15 | 3 | 80% | 1.8s |
| **Anthropic** | 7/12 | 5 | 58% | 0.9s |
| **xAI (Grok)** | 4/9 | 5 | 44% | 5.4s |
| **Groq** | 2/5 | 3 | 40% | 0.3s ⚡ |
| **Google** | 1/6 | 5 | 17% | 6.8s |
| **Perplexity** | 0/2 | 2 | 0% | - |
| **Mistral** | 0/2 | 2 | 0% | - |
| **Cohere** | 0/2 | 2 | 0% | - |

---

## Working Models (26)

### OpenAI (12 models) - 80% success rate
✅ **Flagship Models**:
- GPT-5 Chat (Latest) - `gpt-5-chat-latest`
- GPT-5 - `gpt-5`

✅ **Balanced Models**:
- GPT-5 Mini, GPT-5 Nano
- GPT-4.1, GPT-4.1 Mini, GPT-4.1 Nano
- GPT-4o, GPT-4 Turbo, GPT-4

✅ **Budget Models**:
- GPT-3.5 Turbo, GPT-3.5 Turbo 16k

### Anthropic (7 models) - 58% success rate
✅ **Flagship Models**:
- Claude 4.5 Sonnet - `claude-sonnet-4-5-20250929`
- Claude 4 Sonnet - `claude-sonnet-4-20250514`
- Claude 3.7 Sonnet - `claude-3-7-sonnet-20250219`

✅ **Balanced Models**:
- Claude 3.5 Sonnet (with internet) - `claude-3-5-sonnet-20241022`
- Claude 3.5 Haiku - `claude-3-5-haiku-20241022`

✅ **Budget Models**:
- Claude 3 Opus, Claude 3 Haiku

### xAI (4 models) - 44% success rate
✅ **Grok 4 Series**:
- Grok 4 Fast Reasoning
- Grok 4 Fast
- Grok 4 (0709)
- Grok Code Fast

### Groq (2 models) - 40% success rate
✅ **Free Models**:
- Llama 3.3 70B (with internet)
- Llama 3.1 8B Instant

### Google (1 model) - 17% success rate
✅ **Free Models**:
- Gemini 2.0 Flash (with internet)

---

## Failed Models (27)

### Unreleased Models (11)
🚧 Models not yet available via API:
- **OpenAI**: O3, O4 Mini
- **Anthropic**: Claude 4.5 Haiku, Claude 4 Opus
- **xAI**: Grok 3, Grok 3 Mini
- **Google**: Gemini 2.5 Pro, Gemini 2.5 Flash

### API Key Issues (6)
🔑 Providers with invalid/changed API endpoints:
- **Perplexity**: Sonar Pro, Sonar Small
- **Mistral**: Mistral Large, Mistral Small
- **Cohere**: Command R+, Command R

### Parameter/Deprecated Models (9)
⚙️ Models requiring special handling or deprecated:
- **OpenAI**: GPT-4o Realtime (requires WebSocket/SSE endpoint)
- **Anthropic**: Claude 3 Sonnet, Claude 2.1, Claude 2.0
- **Google**: Gemini 1.5 Flash, Gemini 1.5 Flash 8B
- **Groq**: Llama 3 70B Tool Use, Llama 3 8B Tool Use, Gemma 2 9B
- **xAI**: Grok 2 Vision, Grok 2 (1212), Grok 2 Latest

### Service Errors (1)
🔥 Temporary issues during testing:
- **Google**: Gemini 2.0 Flash Lite (503 overloaded - may work at other times)

---

## UI Integration

### Filtered Components
Model selectors automatically hide non-working models:

1. **Single Model Badge Selector** (`/components/trading/single-model-badge-selector.tsx`)
   - Used in: Paper Trading Individual mode
   - Filter: `!m.isLegacy && m.status === 'working'`
   - Shows: 26 working models only

2. **Ultra Model Badge Selector** (`/components/consensus/ultra-model-badge-selector.tsx`)
   - Used in: Consensus Ultra Mode
   - Filter: `!m.isLegacy && m.status === 'working'`
   - Shows: 26 working models only

### User Impact
- **Before**: Users saw 53+ models, many non-functional
- **After**: Users see only 26 verified working models
- **Benefit**: Reduced confusion, no failed API calls

---

## Model Registry Updates

### New Metadata Fields
Each model in `/lib/models/model-registry.ts` now includes:

```typescript
{
  id: string
  name: string
  provider: Provider
  tier: ModelTier
  badge?: string
  hasInternet?: boolean
  isLegacy?: boolean

  // NEW FIELDS:
  status?: 'working' | 'unreleased' | 'no_api_key' | 'rate_limited' |
           'parameter_error' | 'service_error' | 'empty_response' | 'untested'
  lastTested?: string  // ISO 8601 timestamp
  notes?: string       // Human-readable explanation
  testResponseTime?: number  // milliseconds
}
```

### Helper Functions
New utility functions for filtering:

```typescript
getWorkingModels(): ModelInfo[]
getWorkingModelsByProvider(provider: Provider): ModelInfo[]
isModelWorking(modelId: string): boolean
getModelsByStatus(status: ModelInfo['status']): ModelInfo[]
```

---

## Recommendations

### Immediate Actions
1. ✅ **UI Filters Applied** - Non-working models hidden from selectors
2. ⚠️ **Investigate 3 Providers** - Perplexity, Mistral, Cohere API keys need verification
3. ⚠️ **Google Models** - Most Gemini models failing, only 2.0 Flash works
4. ✅ **Test Report Generated** - `/docs/MODEL_TEST_RESULTS.md` available

### Future Maintenance
1. **Weekly Testing** - Run `npm run test-models` to catch API changes
2. **Model Updates** - Check for new releases (O3, Claude 4.5 Haiku, Grok 3)
3. **Retest Failed Models** - Use `npm run test-models:retest` for temporary failures
4. **Provider Monitoring** - Watch for API endpoint changes

---

## Testing Commands

```bash
# Test all models
npm run test-models

# Test specific provider
npm run test-models -- --provider openai

# Dry run (no API calls)
npm run test-models:dry-run

# Retest failed models only
npm run test-models:retest
```

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2025-10-28 | 1.0 | Initial comprehensive testing of 53 models |
| 2025-10-28 | 1.1 | Added status metadata to model registry |
| 2025-10-28 | 1.2 | Updated UI components to filter non-working models |

---

**Report Location**: `/docs/MODEL_TEST_RESULTS.md`
**Model Registry**: `/lib/models/model-registry.ts`
**Test Script**: `/scripts/test-all-models.ts`

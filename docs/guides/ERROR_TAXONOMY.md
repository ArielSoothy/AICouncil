# LLM Error Taxonomy

**Comprehensive guide to all AI model failure modes in Verdict AI**

## Overview

AI models can fail in 15+ distinct ways. This document categorizes every failure mode, how to detect it, how to fix it, and whether it occurs in Sub mode (subscription) vs API mode.

---

## Error Categories

### 1. Rate Limit Errors (QUOTA_LIMIT)

**Cause**: Too many requests in a time window
**Providers**:
- Groq: 30 requests/min, 14,400/day (free tier)
- Gemini free: 15 req/min (1.5), 2 req/min (2.0)
- OpenAI: Tier-dependent (5-10,000 req/min based on spend)
- Anthropic: 50-2,000 req/min based on tier

**Detection**:
- HTTP 429 status code
- Error message contains: "rate_limit", "ratelimit", "quota", "too many requests", "requests per minute"

**User Message**: `"Rate limit exceeded. Will retry in 60s."`

**Console Log** (YELLOW):
```bash
🔄 [QUOTA_LIMIT] GPT-4o → Gemini 2.5 Flash: rate limit
```

**Fix**:
- Wait and retry with exponential backoff (automatic)
- Reduce request frequency
- Upgrade to higher tier
- Use caching to reduce calls

**Prevention**:
- Implement research caching (saves 30-40 calls per query)
- Batch requests when possible
- Use free-tier models as fallbacks (Groq, Gemini free)

**Sub Mode**: Rare (CLI has higher limits)
**API Mode**: Common on free tiers

---

### 2. Budget Exhausted (BUDGET_LIMIT)

**Cause**: API credits depleted
**Providers**: Anthropic, OpenAI, Google (paid API tiers only)

**Detection**:
- HTTP 402 status code
- Error message contains: "billing", "credit", "payment", "insufficient", "exceeded budget", "credit balance"

**User Message**: `"API credits exhausted. Add credits or switch to Sub mode."`

**Console Log** (RED):
```bash
🔄 [BUDGET_LIMIT] Claude 4.5 Sonnet → Gemini 2.0 Flash: billing limit
```

**Fix**:
1. Add credits to API account:
   - Anthropic: https://console.anthropic.com/settings/billing
   - OpenAI: https://platform.openai.com/account/billing
   - Google: https://console.cloud.google.com/billing
2. Switch to Sub Pro/Max tier (subscription = unlimited)

**Prevention**:
- Set billing alerts
- Monitor credit balance regularly
- Use Sub tier for unlimited usage

**Sub Mode**: **NEVER HAPPENS** (subscriptions have no credit limits)
**API Mode**: Common when credits run out

**CRITICAL**:
```
🚨 If BUDGET_LIMIT error appears in Sub Pro/Max mode, IT'S A BUG!

Subscriptions don't have credit limits. This means:
- CLI is not properly authenticated with subscription
- CLI may be using API credits instead of subscription auth
- Run: npx @anthropic-ai/claude-code setup-token
```

---

### 3. Authentication Errors (AUTH_ERROR)

**Cause**: Invalid or missing API key / CLI not authenticated
**Providers**: All providers

**Detection**:
- HTTP 401 (Unauthorized) or 403 (Forbidden)
- Error message contains: "unauthorized", "invalid key", "api key", "authentication", "forbidden"

**User Message**: `"Authentication failed. Check API key."`

**Console Log** (RED):
```bash
🔄 [AUTH_ERROR] GPT-4o → Llama 3.3 70B: auth failed
```

**Fix**:

**API Mode**:
1. Check `.env.local` for missing/invalid keys:
   ```bash
   ANTHROPIC_API_KEY=sk-ant-...
   OPENAI_API_KEY=sk-...
   GOOGLE_API_KEY=AIza...
   ```
2. Verify key is active at provider dashboard
3. Restart dev server after adding keys

**Sub Mode**:
1. Install CLI if not present:
   ```bash
   npx @anthropic-ai/claude-code setup-token  # Claude
   codex login                                  # OpenAI
   gemini auth login                            # Google
   ```
2. Re-authenticate if token expired

**Prevention**:
- Use environment variable validation at startup
- Log warnings when API keys are missing
- Test auth before running queries

**Sub Mode**: Common if CLI not authenticated
**API Mode**: Common if API key missing/invalid

---

### 4. Model Deprecated (DEPRECATED)

**Cause**: Model ID no longer exists or was removed by provider
**Providers**: All providers (models get deprecated over time)

**Detection**:
- HTTP 404 or 400 status
- Error message contains: "deprecated", "removed", "not found model", "does not exist", "no longer available", "discontinued"

**User Message**: `"Model unavailable."`

**Console Log** (MAGENTA):
```bash
🔄 [DEPRECATED] Claude 3.5 Sonnet → Claude 4.5 Haiku: model unavailable
```

**Examples**:
- `gemma2-9b-it` - Decommissioned by Groq Nov 2025
- `gpt-3.5-turbo-0301` - Deprecated by OpenAI Jan 2024
- `claude-2.1` - Replaced by Claude 3/4 family

**Fix**:
1. Automatic fallback to next model in chain
2. Update model ID in `lib/models/model-registry.ts`
3. Mark as `isLegacy: true` in registry

**Prevention**:
- Monitor provider deprecation announcements
- Use latest model IDs in model registry
- Test model health regularly

**Sub Mode**: Yes
**API Mode**: Yes

---

### 5. Provider Service Down (SERVICE_DOWN)

**Cause**: Provider infrastructure outage or maintenance
**Providers**: All providers

**Detection**:
- HTTP 500, 502, 503, 504
- Error message contains: "unavailable", "service down", "internal server error", "bad gateway", "overloaded"

**User Message**: `"Service down."`

**Console Log** (RED):
```bash
🔄 [SERVICE_DOWN] Anthropic → Groq: service down
```

**Fix**:
- Automatic fallback to different provider
- Wait 5-10 minutes and retry
- Check provider status page:
  - Anthropic: https://status.anthropic.com
  - OpenAI: https://status.openai.com
  - Google: https://status.cloud.google.com

**Prevention**:
- Multi-provider fallback chains
- Health monitoring dashboard
- Provider status webhooks

**Sub Mode**: Yes
**API Mode**: Yes

---

### 6. Request Timeout (TIMEOUT)

**Cause**: Request took too long, connection dropped
**Providers**: All providers

**Detection**:
- Error message contains: "timeout", "ETIMEDOUT", "timed out", "deadline exceeded"

**User Message**: `"Timeout."`

**Console Log** (CYAN):
```bash
🔄 [TIMEOUT] GPT-4o → Gemini 2.5 Pro: timeout
```

**Fix**:
- Retry with same or fallback model
- Reduce prompt length if very large
- Check network connection

**Prevention**:
- Set reasonable timeouts (30-60s for decisions, 120s for research)
- Implement request cancellation
- Use streaming for long responses

**Sub Mode**: Yes
**API Mode**: Yes

---

### 7. Invalid Response (INVALID_RESPONSE)

**Cause**: Empty response, malformed JSON, unexpected format
**Providers**: All providers

**Detection**:
- Empty or whitespace-only response
- JSON parse errors
- Error message contains: "empty response", "parse error", "json invalid", "malformed", "unexpected token"

**User Message**: `"Invalid response."`

**Console Log** (GRAY):
```bash
🔄 [INVALID_RESPONSE] Llama 3.3 70B → Gemini 2.0 Flash: invalid response
```

**Examples**:
- Model returns markdown instead of JSON
- Incomplete JSON (missing closing braces)
- Empty string instead of decision object
- Prose explanation instead of structured data

**Fix**:
1. JSON repair (automatic via `extractJSON()`)
2. Retry with clearer prompt emphasizing JSON format
3. Fallback to different model if repair fails

**Prevention**:
- Use schema validation (Zod)
- Explicit JSON format instructions in prompts
- Test prompts with multiple models

**Sub Mode**: Yes
**API Mode**: Yes

---

### 8. CLI Not Installed (SUB_CLI_MISSING)

**Cause**: Sub mode selected but CLI tool not installed
**Providers**: Anthropic (claude-code), OpenAI (codex), Google (gemini)

**Detection**:
- Error message contains: "CLI not found", "command not found", "npx @anthropic-ai/claude-code"

**User Message**: `"CLI not installed. Install to use Sub mode."`

**Console Log** (RED):
```bash
❌ CLI provider check failed for anthropic: CLI not found
```

**Fix**:
```bash
# Claude CLI
npx @anthropic-ai/claude-code setup-token

# OpenAI Codex (if available)
npm install -g codex
codex login

# Google Gemini (if available)
npm install -g @google/gemini-cli
gemini auth login
```

**Prevention**:
- Check CLI availability at startup
- Show clear error in UI when Sub mode selected without CLI
- Provide installation instructions in error message

**Sub Mode**: Common if CLI not installed
**API Mode**: Never (doesn't use CLI)

---

### 9. CLI Not Authenticated (SUB_CLI_NOT_AUTH)

**Cause**: CLI installed but not logged in with subscription
**Providers**: Anthropic, OpenAI, Google

**Detection**:
- Error message contains: "not authenticated", "login required", "no valid session"

**User Message**: `"CLI not authenticated. Run setup command."`

**Console Log** (RED):
```bash
❌ CLI provider for anthropic not configured. Install the CLI tool or switch to Pro/Max tier.
```

**Fix**:
```bash
# Re-authenticate CLI with subscription
npx @anthropic-ai/claude-code setup-token  # Claude
codex login                                  # OpenAI
gemini auth login                            # Google
```

**Prevention**:
- Validate CLI auth before using Sub tier
- Show auth status in UI
- Periodic CLI health checks

**Sub Mode**: Common if token expired
**API Mode**: Never

---

### 10. Tool Calling Failure (TOOL_FAILURE)

**Cause**: Model tries to use tools but they error/timeout/loop
**Providers**: All providers that support tools

**Detection**:
- Research agents show 0 tool calls but model expects tools
- Tool execution errors in logs
- Infinite tool call loops

**User Message**: `"Tool execution failed."`

**Console Log** (YELLOW):
```bash
⚠️ [TOOL_FAILURE] Research agent returned 0 tool calls
```

**Examples**:
- Yahoo Finance API timeout during price lookup
- Alpha Vantage rate limit hit during research
- Tool schema mismatch (model expects different format)

**Fix**:
- Fallback to non-tool research if tools fail
- Retry tool execution with exponential backoff
- Use cached data if available

**Prevention**:
- Tool-specific error handling
- Tool execution timeouts (10s per tool)
- Validate tool schemas match provider expectations

**Sub Mode**: Yes
**API Mode**: Yes

---

### 11. Prompt Too Long (CONTEXT_EXCEEDED)

**Cause**: Prompt exceeds model's context window
**Providers**: All providers (limits vary)

**Detection**:
- HTTP 400 with "context length" or "too long"
- Error message contains: "exceeds", "context window", "max tokens", "too long"

**User Message**: `"Prompt too long for model."`

**Console Log** (YELLOW):
```bash
⚠️ [CONTEXT_EXCEEDED] Prompt length 150k > model limit 128k
```

**Context Limits**:
- GPT-4o: 128k tokens
- Claude 4.5 Sonnet: 200k tokens
- Gemini 2.5 Pro: 2M tokens
- Llama 3.3 70B: 128k tokens

**Fix**:
- Summarize research data before sending to decision models
- Use models with larger context (Gemini 2.5 Pro)
- Remove unnecessary prompt text

**Prevention**:
- Token counting before sending
- Progressive prompt compression
- Model-specific prompt templates

**Sub Mode**: Yes
**API Mode**: Yes

---

### 12. Database/Cache Error (DATABASE_ERROR)

**Cause**: Supabase connection failure, RLS policy blocks, cache unavailable
**Provider**: Internal (Supabase)

**Detection**:
- Error message contains: "permission denied", "RLS", "Supabase", "database", "cache"

**User Message**: `"Database error. Research cache unavailable."`

**Console Log** (RED):
```bash
❌ [DATABASE_ERROR] Research cache failed: permission denied for table research_cache
```

**Common Causes**:
- RLS policy blocking anonymous reads
- Supabase connection timeout
- Missing environment variables (SUPABASE_URL, SUPABASE_KEY)

**Fix**:
1. Check RLS policies in Supabase dashboard
2. Verify environment variables in `.env.local`
3. Fallback to uncached operation

**Prevention**:
- Test database connection at startup
- Graceful degradation when cache unavailable
- Log cache failures for monitoring

**Sub Mode**: Yes
**API Mode**: Yes

---

### 13. Streaming Connection Dropped (STREAM_INTERRUPTED)

**Cause**: SSE connection interrupted mid-response
**Providers**: All providers (SSE/streaming endpoints)

**Detection**:
- Incomplete response
- Connection closed unexpectedly
- Error message contains: "stream", "connection closed", "interrupted"

**User Message**: `"Stream interrupted. Retrying..."`

**Console Log** (CYAN):
```bash
⚠️ [STREAM_INTERRUPTED] SSE connection dropped at 45%
```

**Fix**:
- Retry from last successful chunk
- Fallback to non-streaming if repeated failures
- Resume from checkpoint if implemented

**Prevention**:
- Client-side connection monitoring
- Server-side heartbeat messages
- Automatic reconnection logic

**Sub Mode**: Yes
**API Mode**: Yes

---

### 14. JSON Parsing Error (JSON_PARSE)

**Cause**: Model returns valid text but invalid JSON structure
**Providers**: All providers

**Detection**:
- `JSON.parse()` throws SyntaxError
- Missing/extra braces, commas, quotes
- Model wraps JSON in markdown code blocks

**User Message**: `"JSON parse error. Using fallback."`

**Console Log** (GRAY):
```bash
⚠️ [JSON_PARSE] Unexpected token in JSON at position 42
```

**Examples**:
````json
// Model returns markdown wrapper
```json
{ "action": "BUY" }
```

// Model returns incomplete JSON
{ "action": "BUY", "confidence":

// Model uses single quotes (invalid JSON)
{ 'action': 'BUY' }
````

**Fix**:
1. Extract JSON from markdown (automatic via `extractJSON()`)
2. Repair common JSON errors (missing commas, trailing commas)
3. Retry with stricter prompt emphasizing valid JSON

**Prevention**:
- Use `extractJSON()` utility for all responses
- Schema validation with Zod
- Clear JSON format examples in prompts

**Sub Mode**: Yes
**API Mode**: Yes

---

### 15. Unknown Error (UNKNOWN)

**Cause**: Catch-all for unclassified errors
**Providers**: All providers

**Detection**:
- Doesn't match any other category pattern

**User Message**: `"Unknown error."`

**Console Log** (WHITE):
```bash
❌ [UNKNOWN] Unclassified error: <error message>
```

**Fix**:
- Log full error for investigation
- Fallback to next model in chain
- Report to monitoring if repeated

**Prevention**:
- Expand error classification patterns
- Add specific handlers for new error types
- Monitor UNKNOWN category frequency

**Sub Mode**: Yes
**API Mode**: Yes

---

## Error Classification System

### Detection Logic

Located in `lib/trading/model-fallback.ts` (lines 359-481):

```typescript
export function classifyError(error: string | Error): ErrorClassification {
  const errorStr = (error instanceof Error ? error.message : error).toLowerCase();

  // QUOTA_LIMIT
  if (errorStr.includes('429') || errorStr.includes('rate limit')) {
    return {
      category: ModelErrorCategory.QUOTA_LIMIT,
      userMessage: 'rate limit',
      consoleColor: CONSOLE_COLORS.YELLOW
    };
  }

  // BUDGET_LIMIT
  if (errorStr.includes('billing') || errorStr.includes('credit')) {
    return {
      category: ModelErrorCategory.BUDGET_LIMIT,
      userMessage: 'billing limit',
      consoleColor: CONSOLE_COLORS.RED
    };
  }

  // ... (full logic in file)
}
```

### Usage in Code

**Decision Models** (`app/api/trading/consensus/stream/route.ts:475`):
```typescript
catch (error) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  const classification = classifyError(errorMessage);

  sendEvent({
    errorCategory: classification.category,
    userMessage: classification.userMessage,
  });

  logFallbackWithColor(originalModel, fallbackModel, classification);
}
```

**Judge Model** (`app/api/trading/consensus/stream/route.ts:633`):
```typescript
catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const classification = classifyError(errorMessage);

  console.log(
    `\x1b[${classification.consoleColor}m🚨 [Judge ${classification.category}] ${errorMessage}\x1b[0m`
  );

  // SUB MODE BUG DETECTION
  if (useSubscription && classification.category === 'BUDGET_LIMIT') {
    console.error(`🐛 CRITICAL BUG: BUDGET_LIMIT in ${tier} mode!`);
  }
}
```

---

## Fallback Strategy

### Fallback Chains

All models have fallback chains defined in `lib/trading/model-fallback.ts`:

```typescript
const FALLBACK_CHAINS: Record<string, string[]> = {
  // Premium model → same-tier → lower-tier → free
  'claude-sonnet-4-5-20250929': [
    'gpt-4o',                      // OpenAI flagship
    'gemini-2.5-pro',              // Google flagship
    'gemini-2.0-flash',            // Google free
    'llama-3.3-70b-versatile',     // Groq free
  ],

  // All chains MUST end with free models
  'default': [
    'llama-3.3-70b-versatile',    // Best free model
    'llama-3.1-8b-instant',       // Fast free fallback
    'gemini-2.0-flash',           // Google free tier
  ],
}
```

### Retry Logic

**Current State**: Immediate fallback (no retries)
**Planned**: Exponential backoff for retryable errors

```typescript
// PLANNED: lib/errors/llm-error-handler.ts
export async function handleModelQuery(
  provider: AIProvider,
  prompt: string,
  options: QueryOptions
): Promise<QueryResult> {
  let attempts = 0;
  const maxRetries = 3;

  while (attempts < maxRetries) {
    try {
      const result = await provider.query(prompt, options);

      if (result.error) {
        const classification = classifyError(result.error, provider.name);

        // Retry rate limits with backoff
        if (classification.category === ModelErrorCategory.QUOTA_LIMIT) {
          await sleep(Math.pow(2, attempts) * 1000); // 1s, 2s, 4s
          attempts++;
          continue;
        }

        throw new LLMError(classification);
      }

      return result;

    } catch (error) {
      const classification = classifyError(error, provider.name);

      if (classification.retryable && attempts < maxRetries) {
        attempts++;
        await sleep(Math.pow(2, attempts) * 1000);
        continue;
      }

      throw error;
    }
  }
}
```

---

## Sub Mode vs API Mode

| Error Type | Sub Mode | API Mode | Notes |
|------------|----------|----------|-------|
| Rate Limit | Rare | Common | CLI has higher limits |
| Budget Exhausted | **NEVER** | Common | Subscriptions = unlimited |
| Auth Failed | Common | Common | Different auth methods |
| Model Deprecated | Yes | Yes | Same model availability |
| Service Down | Yes | Yes | Provider outages affect both |
| Timeout | Yes | Yes | Network issues affect both |
| Invalid Response | Yes | Yes | Model behavior same |
| CLI Missing | Only | Never | Sub mode requires CLI |
| CLI Not Auth | Only | Never | CLI auth separate from API |
| Tool Failure | Yes | Yes | Tool execution same |
| Context Exceeded | Yes | Yes | Model limits same |
| Database Error | Yes | Yes | Internal error |
| Stream Interrupted | Yes | Yes | Connection issues |
| JSON Parse | Yes | Yes | Model output format |
| Unknown | Yes | Yes | Catch-all |

---

## Critical Rules

### 1. Sub Mode Must Use CLI Providers

```typescript
// ❌ WRONG - Hardcoded API provider
const judgeProvider = PROVIDERS.anthropic;

// ✅ CORRECT - Tier-aware provider selection
const { provider: judgeProvider } = getProviderForModelAndTier('anthropic', researchTier);
```

### 2. Budget Errors in Sub Mode = BUG

```typescript
if (useSubscription && classification.category === 'BUDGET_LIMIT') {
  console.error(
    `🐛 CRITICAL BUG: BUDGET_LIMIT in ${tier} mode!\n` +
    `Subscriptions have NO credit limits. CLI not using subscription auth.`
  );
}
```

### 3. All Errors Must Be Classified

```typescript
// ❌ WRONG - Generic error logging
catch (error) {
  console.error('Error:', error);
}

// ✅ CORRECT - Structured error classification
catch (error) {
  const classification = classifyError(error);
  logErrorWithColor(classification);
}
```

### 4. Fallback Chains Must End with Free Models

```typescript
// ❌ WRONG - Chain ends with paid model
'gpt-4o': ['claude-sonnet-4-5-20250929', 'gemini-2.5-pro']

// ✅ CORRECT - Chain ends with free models
'gpt-4o': [
  'claude-sonnet-4-5-20250929',
  'gemini-2.5-pro',
  'gemini-2.0-flash',           // Google free
  'llama-3.3-70b-versatile'     // Groq free
]
```

---

## Implementation Status

### ✅ Implemented
- Error classification system (7 categories)
- Colored console logging
- Fallback chains for all models
- Tier-aware provider selection
- Sub mode bug detection (budget errors)
- Decision model error handling
- Judge model error handling

### ⏳ Planned
- Global `handleModelQuery()` wrapper
- Retry logic with exponential backoff
- Schema validation with Zod
- Health monitoring dashboard
- Provider status webhooks
- Tool-specific error handlers

---

## Related Documentation

- **Model Registry**: `lib/models/model-registry.ts` - All 46+ models
- **Model Fallback**: `lib/trading/model-fallback.ts` - Error classification & chains
- **Provider Factory**: `lib/ai-providers/provider-factory.ts` - Tier-aware provider selection
- **Features**: `docs/workflow/FEATURES.md` - Protected error handling features

---

## Quick Reference

**Need to add a new error type?**
1. Add to `ModelErrorCategory` enum in `lib/trading/model-fallback.ts`
2. Add detection logic in `classifyError()` function
3. Add console color mapping
4. Update this document with new category
5. Test with both Sub and API modes

**Need to debug an error?**
1. Check console for colored error log with category
2. Look up category in this document
3. Follow fix instructions
4. If Sub mode + BUDGET_LIMIT → investigate CLI auth

**Need to test error handling?**
1. Simulate error by removing API key
2. Check console for proper classification
3. Verify fallback chain activates
4. Verify user sees friendly error message

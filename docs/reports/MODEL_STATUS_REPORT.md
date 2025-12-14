# Model Status Report - December 14, 2025

**Test Type:** Ping (ultra-cheap verification)
**Total Models:** 43
**Passed:** 23 (53%)
**Failed:** 20 (47%)

---

## Working Models (23)

| Model | Provider | Response Time |
|-------|----------|---------------|
| GPT-5 Chat (Latest) | OpenAI | ~500ms |
| GPT-5 | OpenAI | ~500ms |
| GPT-5 Mini | OpenAI | ~500ms |
| GPT-5 Nano | OpenAI | ~500ms |
| GPT-5 Codex | OpenAI | ~500ms |
| GPT-5.1 Codex Max | OpenAI | ~500ms |
| Claude 4.5 Sonnet | Anthropic | ~600ms |
| Claude 4.5 Haiku | Anthropic | ~400ms |
| Claude 4.1 Opus | Anthropic | ~800ms |
| Claude 4 Opus | Anthropic | ~800ms |
| Claude 4 Sonnet | Anthropic | ~600ms |
| Claude 3.7 Sonnet | Anthropic | ~600ms |
| Claude 3.5 Haiku | Anthropic | ~400ms |
| Claude 3 Opus | Anthropic | ~800ms |
| Claude 3 Haiku | Anthropic | ~400ms |
| Gemini 2.5 Flash | Google | ~300ms |
| Gemini 2.5 Flash Lite | Google | ~300ms |
| Gemini 2.0 Flash | Google | ~300ms |
| Gemini 2.0 Flash Lite | Google | ~300ms |
| Llama 3.3 70B | Groq | ~200ms |
| Llama 3.1 8B Instant | Groq | ~150ms |
| Grok 4.1 Fast Reasoning | xAI | ~500ms |
| Grok 4 Fast Reasoning | xAI | ~500ms |

---

## Failed Models - Action Required

### Category 1: API Parameter Issue - maxTokens Too Low (9 models)
**Error:** `Invalid 'max_output_tokens': integer below minimum`
**Cause:** Ping test uses maxTokens=10, OpenAI requires minimum ~50
**Fix:** Increase maxTokens in ping test from 10 to 50

| Model | ID | Action |
|-------|------|--------|
| Codex Mini (Latest) | `codex-mini-latest` | FIX: Increase maxTokens |
| GPT-4.1 | `gpt-4.1` | FIX: Increase maxTokens |
| GPT-4.1 Mini | `gpt-4.1-mini` | FIX: Increase maxTokens |
| GPT-4.1 Nano | `gpt-4.1-nano` | FIX: Increase maxTokens |
| GPT-4o | `gpt-4o` | FIX: Increase maxTokens |
| GPT-4 Turbo | `gpt-4-turbo-preview` | FIX: Increase maxTokens |
| GPT-4 | `gpt-4` | FIX: Increase maxTokens |
| GPT-3.5 Turbo | `gpt-3.5-turbo` | FIX: Increase maxTokens |
| GPT-3.5 Turbo 16k | `gpt-3.5-turbo-16k` | FIX: Increase maxTokens |

### Category 2: Model Does Not Exist (1 model)
**Error:** `The requested model 'gpt-5-codex-mini' does not exist`
**Cause:** Wrong model ID in registry
**Fix:** Research correct model ID or remove

| Model | Current ID | Action |
|-------|------------|--------|
| GPT-5 Codex Mini | `gpt-5-codex-mini` | RESEARCH: Verify ID or REMOVE |

### Category 3: Wrong Model ID (1 model)
**Error:** `model: claude-opus-4-5-20251124`
**Cause:** Model ID has wrong date suffix
**Fix:** Research correct Anthropic model ID

| Model | Current ID | Action |
|-------|------------|--------|
| Claude 4.5 Opus | `claude-opus-4-5-20251124` | RESEARCH: Verify correct date |

### Category 4: Empty Response (3 models)
**Error:** `Google AI returned empty response`
**Cause:** Model IDs may be incorrect or models unreleased
**Fix:** Research correct Google model IDs

| Model | Current ID | Action |
|-------|------------|--------|
| Gemini 3 Pro | `gemini-3-pro-preview` | RESEARCH: Verify model exists |
| Gemini 3 Pro Image | `gemini-3-pro-image-preview` | RESEARCH: Verify model exists |
| Gemini 2.5 Pro | `gemini-2.5-pro` | RESEARCH: May need different endpoint |

### Category 5: Rate Limited (5 models)
**Error:** `Failed after 3 attempts. Last error: Too Many Requests`
**Cause:** xAI rate limiting (temporary)
**Fix:** Mark as rate_limited, will work later

| Model | ID | Action |
|-------|------|--------|
| Grok 4 Fast | `grok-4-fast-non-reasoning` | MARK: rate_limited (temporary) |
| Grok 4 (0709) | `grok-4-0709` | MARK: rate_limited (temporary) |
| Grok 3 Beta | `grok-3-beta` | MARK: rate_limited (temporary) |
| Grok 3 Mini Beta | `grok-3-mini-beta` | MARK: rate_limited (temporary) |
| Grok Code Fast | `grok-code-fast-1` | MARK: rate_limited (temporary) |

### Category 6: Bad Request (1 model)
**Error:** `Bad Request`
**Cause:** Model may require different parameters (image model)
**Fix:** Research correct API parameters or mark as not supported

| Model | ID | Action |
|-------|------|--------|
| Grok 2 Image | `grok-2-image` | RESEARCH: Image model, different API |

---

## Immediate Fixes Needed

### Fix 1: Increase maxTokens for Ping Test
**File:** `app/api/trading/test-model/route.ts`
**Change:** Line 139 `maxTokens = 10` → `maxTokens = 50`
**Impact:** Will fix 9 OpenAI models

### Fix 2: Remove/Fix GPT-5 Codex Mini
**File:** `lib/models/model-registry.ts`
**Action:** Remove `gpt-5-codex-mini` or research correct ID
**Note:** Model `gpt-5-codex` works, so `-mini` variant may not exist

### Fix 3: Fix Claude 4.5 Opus Model ID
**File:** `lib/models/model-registry.ts`
**Action:** Change `claude-opus-4-5-20251124` to correct date
**Note:** Other Claude 4.5 models use dates like `20250929`

### Fix 4: Remove/Mark Unreleased Gemini 3 Models
**File:** `lib/models/model-registry.ts`
**Action:** Mark `gemini-3-pro-preview` and `gemini-3-pro-image-preview` as unreleased
**Note:** May not be available via standard API yet

### Fix 5: Remove Gemini from Research Models ✅ DONE
**File:** `components/trading/research-model-selector.tsx`
**Action:** Removed Gemini 2.5 Flash option (5 req/min limit too low for 4 parallel agents)
**Note:** User specifically requested this - COMPLETED December 14, 2025

---

## Summary of Required Actions

| Priority | Action | Models Affected |
|----------|--------|-----------------|
| HIGH | Increase ping maxTokens to 50 | 9 OpenAI models |
| HIGH | Remove GPT-5 Codex Mini | 1 model |
| HIGH | Fix Claude 4.5 Opus ID | 1 model |
| MEDIUM | Mark Gemini 3 as unreleased | 2 models |
| MEDIUM | Research Gemini 2.5 Pro issue | 1 model |
| LOW | Mark Grok models as rate_limited | 5 models |
| LOW | Mark Grok 2 Image as not_supported | 1 model |
| ✅ DONE | Remove Gemini from research | 1 option |

---

*Report generated: December 14, 2025*
*Test module: Model Health Check (components/trading/model-tester.tsx)*

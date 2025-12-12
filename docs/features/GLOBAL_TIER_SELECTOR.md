# Global Tier Selector System

**Status:** ✅ Complete & Production Ready
**Date:** October 28, 2025
**Scope:** App-wide model tier management across all modes

## Overview

The Global Tier Selector provides a unified model selection system across the entire Verdict AI application. Users can switch between Free/Pro/Max tiers using a single selector in the header, and all modes automatically update their model selections accordingly.

## Architecture

### Core Components

1. **Global State Management**
   - **Context:** `contexts/trading-preset-context.tsx` (GlobalModelTierContext)
   - **Provider:** Wrapped at root level in `app/layout.tsx`
   - **Hook:** `useGlobalModelTier()` returns `{globalTier, setGlobalTier}`

2. **Model Presets Configuration**
   - **File:** `lib/config/model-presets.ts` (formerly `lib/trading/preset-configs.ts`)
   - **Exports:** `PRESET_CONFIGS`, `DEBATE_PRESETS`, helper functions
   - **Purpose:** Single source of truth for all tier definitions

3. **UI Components**
   - **Header Selector:** `components/trading/global-preset-selector.tsx`
   - **Smart Visibility:** Only shows on pages that use AI models
   - **Tier Indicators:** Each mode shows current tier with icon/color

### Data Flow

```
User clicks tier button in header
    ↓
GlobalModelTierContext state updates
    ↓
useEffect in each mode detects change
    ↓
Mode calls getModelsForPreset(newTier)
    ↓
Model selection automatically updates
```

## Tier Definitions

**December 2025 Data-Driven Rebuild Philosophy:**
- **Free:** Only $0 cost models (Google Gemini + Groq Llama)
- **Pro:** One mid-tier per working provider (best value models)
- **Max:** One flagship per working provider (highest AAII scores)

**Working Providers:** OpenAI, Anthropic, Google, Groq, xAI
**Data Sources:** MODEL_COSTS_PER_1K, MODEL_BENCHMARKS (AAII scores) from lib/model-metadata.ts

### ⚠️ Known Gemini Issues (December 11, 2025)

The following Gemini models have been removed due to known API issues:

| Model | Issue | Status | Source |
|-------|-------|--------|--------|
| gemini-2.5-flash | Truncated responses, malformed JSON even under token limits | Removed from Free tier | [Google Forum](https://discuss.ai.google.dev/t/truncated-response-issue-with-gemini-2-5-flash-preview/81258) |
| gemini-3-pro-preview | Fails after tool calls, requires temperature=1.0 | Removed from Max tier | [GitHub Issue](https://github.com/zed-industries/zed/issues/43024) |

**Workaround Applied:** Added `topP: 0.5` to all Gemini API calls to reduce premature stopping.

### Free Tier (🎁 Gift Icon)
- **Models:** 3 free models only ($0 cost)
- **Cost:** $0.00 per query
- **Use Case:** Testing, experimentation, unlimited usage
- **Quality:** Good for free tier (AAII 1100-1250)

**Multi-Model Modes (Consensus):**
- gemini-2.0-flash (Google FREE, AAII 1250) - Most stable free option
- llama-3.3-70b-versatile (Groq FREE, AAII 1250, 86% MMLU)
- llama-3.1-8b-instant (Groq FREE, AAII 1100)

**Debate Roles (Agents):**
- Analyst: gemini-2.0-flash (AAII 1250)
- Critic: llama-3.3-70b-versatile (AAII 1250)
- Judge: llama-3.3-70b-versatile (AAII 1250)
- Synthesizer: llama-3.1-8b-instant (AAII 1100)

### Pro Tier (⚡ Zap Icon)
- **Models:** 5 mid-tier models (one per provider, best value)
- **Cost:** ~$0.00025-0.01 per query
- **Use Case:** Production use, excellent quality-to-cost ratio
- **Quality:** Professional-grade analysis (AAII 1200-1380)

**Multi-Model Modes (Consensus):**
- claude-haiku-4-5-20251001 (Anthropic $0.006/1K, AAII 1200)
- gpt-5-mini (OpenAI $0.000125/1K, AAII 1200) - INSANE value
- gemini-2.5-pro (Google $0.01125/1K, AAII 1350, S-tier)
- llama-3.3-70b-versatile (Groq FREE, AAII 1250)
- grok-4-1-fast-reasoning (xAI $0.00025/1K, AAII 1380, S-tier!) - INSANE value

**Debate Roles (Agents):**
- Analyst: grok-4-1-fast-reasoning (AAII 1380, S-tier, nearly free!)
- Critic: gemini-2.5-pro (AAII 1350, S-tier)
- Judge: claude-haiku-4-5-20251001 (AAII 1200)
- Synthesizer: gpt-5-mini (AAII 1200)

### Max Tier (✨ Sparkles Icon)
- **Models:** 5 flagship models (one per provider, highest quality)
- **Cost:** ~$0.01-0.02 per query
- **Use Case:** Critical decisions, highest quality needed
- **Quality:** Best available AI models (AAII 1250-1380)

**Multi-Model Modes (Consensus):**
- claude-sonnet-4-5-20250929 (Anthropic $0.018/1K, AAII 1320)
- gpt-5-chat-latest (OpenAI $0.01125/1K, AAII 1380)
- gemini-2.5-pro (Google $0.01125/1K, AAII 1350, S-tier) - Most stable flagship
- llama-3.3-70b-versatile (Groq FREE, AAII 1250)
- grok-4-0709 (xAI $0.018/1K, AAII 1370, S-tier)

**Debate Roles (Agents):**
- Analyst: gemini-2.5-pro (AAII 1350, S-tier)
- Critic: gpt-5-chat-latest (AAII 1380)
- Judge: claude-sonnet-4-5-20250929 (AAII 1320)
- Synthesizer: grok-4-0709 (AAII 1370, S-tier)

## Connected Modes

### 1. Consensus Mode (`/`)
- **Component:** `components/consensus/query-interface.tsx`
- **Behavior:** Auto-applies preset models when tier changes
- **UI:** Shows global tier indicator above model selector
- **Notes:** Users can still add/remove individual models

### 2. Agents Mode (`/agents`)
- **Component:** `components/agents/debate-interface.tsx`
- **Behavior:** Updates Analyst, Critic, Synthesizer roles based on tier
- **UI:** Shows global tier indicator in Setup tab
- **Notes:** Auto-selects all 3 agents with preset models

### 3. Ultra Mode (`/ultra`)
- **Component:** `app/ultra/page.tsx`
- **Behavior:** Updates flagship model selection based on tier
- **UI:** Shows global tier indicator above question input
- **Notes:** Maintains "best answer, right now" philosophy

### 4. Trading Modes (`/trading`)
All three trading sub-modes connected:
- **Individual Mode:** Multi-model analysis
- **Consensus Trade:** Judge-based consensus
- **Debate Trade:** Role-based debate system

## Implementation Guide

### Adding Global Tier to a New Mode

1. **Import required dependencies:**
```typescript
import { useGlobalModelTier } from '@/contexts/trading-preset-context'
import { getModelsForPreset, getPresetConfig } from '@/lib/config/model-presets'
```

2. **Use the hook:**
```typescript
const { globalTier } = useGlobalModelTier()
```

3. **Add useEffect to auto-apply changes:**
```typescript
useEffect(() => {
  const presetModels = getModelsForPreset(globalTier)
  setSelectedModels(presetModels)
}, [globalTier])
```

4. **Add tier indicator UI:**
```typescript
<div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
  <div>
    <div className="text-sm font-medium">Global Model Tier</div>
    <div className="text-xs text-muted-foreground">
      Change tier using the selector in the header
    </div>
  </div>
  {(() => {
    const preset = getPresetConfig(globalTier)
    const Icon = preset.icon
    return (
      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border-2 ${preset.color}`}>
        <Icon className="w-4 h-4" />
        <span className="font-semibold">{preset.label}</span>
      </div>
    )
  })()}
</div>
```

5. **Update header visibility (if needed):**
Add your page path to `modelUsingPages` array in `components/ui/header.tsx`:
```typescript
const modelUsingPages = ['/', '/agents', '/trading', '/ultra', '/your-new-mode']
```

## Smart Visibility

The global tier selector only appears on pages that actually use AI models:

**Visible On:**
- `/` - Consensus mode
- `/agents` - Agent debate
- `/trading` - All trading modes
- `/ultra` - Ultra mode

**Hidden On:**
- `/marketing` - Marketing pages
- `/auth` - Authentication
- `/admin` - Admin dashboard
- `/arena` - Arena mode (model selection handled differently)

This prevents UI clutter on pages that don't need model tier selection.

## User Experience

### Visual Feedback
- **Active tier highlighted** in header with bold border
- **Tier indicator** in each mode shows current selection
- **Icon + Color coding** for quick visual identification:
  - 🎁 Free = Green
  - ⚡ Pro = Blue
  - ✨ Max = Purple

### Immediate Updates
- Click tier button → Models update instantly
- No page reload required
- Maintains user's prompt/configuration
- Only model selection changes

### State Persistence
- Tier selection survives page refresh
- Each mode can still override with manual selection
- User can add/remove individual models within a tier

## Testing

### Verified Scenarios ✅

1. **Tier Switching**
   - ✅ Free → Pro → Max transitions work smoothly
   - ✅ Models update correctly for each tier
   - ✅ No TypeScript errors
   - ✅ UI reflects changes immediately

2. **Cross-Mode Consistency**
   - ✅ Consensus mode: 3 models (Free) → 8 models (Max)
   - ✅ Agents mode: Roles update to tier-appropriate models
   - ✅ Ultra mode: Flagship selection updates correctly
   - ✅ Trading modes: All 3 sub-modes connected

3. **Edge Cases**
   - ✅ Navigation between modes preserves tier
   - ✅ Browser refresh maintains tier selection
   - ✅ Manual model overrides still work
   - ✅ No console warnings or errors

## File Structure

```
lib/
  config/
    model-presets.ts          # ✅ App-wide preset definitions (SINGLE SOURCE OF TRUTH)

contexts/
  trading-preset-context.tsx  # Global tier state management

components/
  ui/
    header.tsx               # Header with smart tier selector visibility
  trading/
    global-preset-selector.tsx  # Tier selector UI component
  consensus/
    query-interface.tsx      # ✅ Connected to global tier
  agents/
    debate-interface.tsx     # ✅ Connected to global tier

app/
  layout.tsx                 # GlobalModelTierProvider wrapper
  page.tsx                   # Consensus mode (✅ connected)
  ultra/
    page.tsx                 # Ultra mode (✅ connected)
  agents/
    page.tsx                 # Agents mode (✅ connected)
  trading/
    page.tsx                 # Trading modes (✅ connected)
```

## Migration Notes

### December 11, 2025 - Data-Driven Tier Rebuild
- **Philosophy:** Complete tier rebuild based on actual pricing (MODEL_COSTS_PER_1K) and benchmarks (AAII scores)
- **Free Tier:** Only $0 cost models - removed gpt-3.5-turbo, kept only Google Gemini + Groq Llama (4 models)
- **Pro Tier:** One mid-tier per working provider - grok-4-1-fast-reasoning discovered as INSANE value ($0.00025/1K, S-tier!) (5 models)
- **Max Tier:** One flagship per working provider - gemini-3-pro-preview is #1 LMArena (5 models)
- **Agent Presets:** Updated debate-interface.tsx and agent-selector.tsx to match new tier configuration
- **UI Cleanup:** Removed redundant inline preset buttons from Agents page (single source of truth via header)
- **Files Updated:**
  - `lib/config/model-presets.ts` - PRESET_CONFIGS and DEBATE_PRESETS
  - `components/agents/debate-interface.tsx` - AGENT_PRESETS (3 agents)
  - `components/agents/agent-selector.tsx` - AGENT_PRESETS (4 agents)
- **Status:** ✅ Complete, TypeScript compilation passes, all tiers tested in browser

### December 11, 2025 - Deprecated File Cleanup
- **Deleted:** `lib/trading/preset-configs.ts` (was orphaned, unused, contained deprecated models)
- **Kept:** `lib/config/model-presets.ts` (SINGLE SOURCE OF TRUTH)
- **Models Updated:** Removed gemma2-9b-it (decommissioned), gemini-1.5-flash (legacy)
- **Status:** ✅ Complete, TypeScript compilation passes

### October 28, 2025 - File Renaming
- **Old:** `lib/trading/preset-configs.ts`
- **New:** `lib/config/model-presets.ts`
- **Reason:** File is now app-wide, not trading-specific
- **Impact:** All 8 import statements updated automatically
- **Status:** ✅ Complete, TypeScript compilation passes

### Breaking Changes
None. Legacy exports maintained for backwards compatibility:
```typescript
// Still works for existing code:
export const TradingPresetProvider = GlobalModelTierProvider
export const useTradingPreset = useGlobalModelTier
```

## Future Enhancements

### Potential Additions
1. **User Preferences** - Save favorite tier per user in database
2. **Tier Limits** - Restrict tiers based on subscription level
3. **Custom Tiers** - Allow users to create personal presets
4. **Usage Tracking** - Analytics on tier usage patterns
5. **Cost Estimation** - Show projected costs per tier before query

### Not Implemented
- **Arena Mode** - Uses different model selection architecture (skipped intentionally)
- **Marketing Pages** - No AI model usage (correctly hidden)

## Troubleshooting

### Issue: Tier indicator not showing
**Solution:** Check if page is in `modelUsingPages` array in `header.tsx`

### Issue: Models not updating when tier changes
**Solution:** Ensure mode has `useEffect` with `globalTier` dependency

### Issue: Import error for model-presets
**Solution:** Update import path from `@/lib/trading/preset-configs` to `@/lib/config/model-presets`

### Issue: TypeScript errors after tier change
**Solution:** Run `npm run type-check` to verify all imports updated

## Related Documentation

- **Model Registry:** `lib/models/model-registry.ts` - All 46+ models defined
- **Model Metadata:** `lib/model-metadata.ts` - MODEL_COSTS_PER_1K, MODEL_BENCHMARKS (AAII scores)
- **Tier Presets:** `lib/config/model-presets.ts` - SINGLE SOURCE OF TRUTH for tiers
- **User Tiers:** `lib/user-tiers.ts` - Subscription tier definitions
- **Trading Config:** `lib/trading/models-config.ts` - Trading-specific model metadata
- **Context Pattern:** `contexts/trading-preset-context.tsx` - State management

## Support

For questions or issues with the global tier selector:
1. Check this documentation first
2. Verify TypeScript compilation: `npm run type-check`
3. Test in browser with DevTools console open
4. Review `lib/config/model-presets.ts` for tier definitions

---

**Last Updated:** December 11, 2025
**Maintainer:** Ariel Soothy
**Status:** Production Ready

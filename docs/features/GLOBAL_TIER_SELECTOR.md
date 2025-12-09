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

### Free Tier (🎁 Gift Icon)
- **Models:** 6 free models (Google Gemini + Groq Llama)
- **Cost:** $0.00 per query
- **Use Case:** Testing, experimentation, unlimited usage
- **Quality:** Excellent for free tier

**Multi-Model Modes:**
- gemini-2.5-flash
- gemini-2.0-flash
- gemini-1.5-flash
- llama-3.3-70b-versatile
- llama-3.1-8b-instant
- gemma2-9b-it

**Debate Roles:**
- Analyst: gemini-2.0-flash
- Critic: llama-3.3-70b-versatile
- Synthesizer: gemini-1.5-flash

### Pro Tier (⚡ Zap Icon)
- **Models:** 8 balanced/budget tier models
- **Cost:** ~$0.01-0.05 per query
- **Use Case:** Production use, good quality-to-cost ratio
- **Quality:** Professional-grade analysis

**Multi-Model Modes:**
- claude-3-5-sonnet-20241022
- claude-3-5-haiku-20241022
- gpt-4o
- gpt-5-mini
- gemini-2.5-pro
- llama-3.3-70b-versatile (free)
- grok-3
- mistral-large-latest

**Debate Roles:**
- Analyst: claude-3-5-sonnet-20241022
- Critic: gpt-4o
- Synthesizer: llama-3.3-70b-versatile

### Max Tier (✨ Sparkles Icon)
- **Models:** 8 flagship models (2025 releases)
- **Cost:** ~$0.05-0.15 per query
- **Use Case:** Critical decisions, highest quality needed
- **Quality:** Best available AI models

**Multi-Model Modes:**
- claude-sonnet-4-5-20250929 (Sep 2025)
- gpt-5-chat-latest (Aug 2025)
- gemini-2.5-pro
- grok-4-fast-reasoning
- grok-4-fast-non-reasoning
- grok-4-0709
- llama-3.3-70b-versatile (free)
- sonar-pro

**Debate Roles:**
- Analyst: claude-sonnet-4-5-20250929
- Critic: gpt-5-chat-latest
- Synthesizer: gemini-2.5-pro

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
    model-presets.ts          # ✅ NEW: App-wide preset definitions
  trading/
    preset-configs.ts         # ❌ DEPRECATED: Use lib/config/model-presets.ts

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

**Last Updated:** October 28, 2025
**Maintainer:** Ariel Soothy
**Status:** Production Ready

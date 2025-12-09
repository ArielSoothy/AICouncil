# Ultra Mode UI Redesign Plan
**Date:** October 3, 2025
**Goal:** Merge 3 separate sections into 1 unified card with clickable, brand-themed model badges

## User Requirements

1. **Merge 3 sections** - Question input, model info alert, and model selection button → 1 unified card
2. **Clickable model badges** - Each badge opens dropdown to swap that model
3. **Add/Remove models** - [+ Add Model] and [× Remove] buttons
4. **Brand-themed colors** for each provider
5. **Keep "Generate Question"** button
6. **Change CTA** to "Get Ultimate Answer"

## Brand Color Scheme

| Provider | Colors |
|----------|--------|
| Anthropic (Claude) | Orange `bg-orange-500` |
| OpenAI (GPT) | Gray/White `bg-gray-100 text-black` |
| Google (Gemini) | Blue `bg-blue-500` |
| Meta/Groq (Llama) | Purple `bg-purple-600` |
| xAI (Grok) | Black `bg-black` |
| Perplexity | Teal `bg-teal-500` |
| Mistral | Red `bg-red-500` |
| Cohere | Indigo `bg-indigo-500` |

## Implementation Tasks

### 1. Create Brand Colors Constants (5 min)
**File:** `lib/brand-colors.ts`

```typescript
export const PROVIDER_COLORS = {
  anthropic: 'bg-orange-500 hover:bg-orange-600 text-white',
  openai: 'bg-gray-100 hover:bg-gray-200 text-black',
  google: 'bg-blue-500 hover:bg-blue-600 text-white',
  groq: 'bg-purple-600 hover:bg-purple-700 text-white',
  xai: 'bg-black hover:bg-gray-900 text-white',
  perplexity: 'bg-teal-500 hover:bg-teal-600 text-white',
  mistral: 'bg-red-500 hover:bg-red-600 text-white',
  cohere: 'bg-indigo-500 hover:bg-indigo-600 text-white'
}

export const PROVIDER_NAMES = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  google: 'Google',
  groq: 'Groq',
  xai: 'xAI',
  perplexity: 'Perplexity',
  mistral: 'Mistral',
  cohere: 'Cohere'
}
```

### 2. Create UltraModelBadgeSelector Component (10 min)
**File:** `components/consensus/ultra-model-badge-selector.tsx`

**Features:**
- Display enabled models as clickable badges
- Each badge shows model name with brand color
- Click → dropdown to swap model (using shadcn DropdownMenu)
- [+ Add Model] button at end
- [× Remove] icon on each badge (if more than 1 model)
- Use existing `availableModels` from model-selector.tsx

**Component Structure:**
```tsx
<div className="flex flex-wrap gap-2 items-center">
  {models.filter(m => m.enabled).map((model, idx) => (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Badge className={PROVIDER_COLORS[model.provider]}>
          {getModelDisplayName(model)} ▼
          {models.filter(m => m.enabled).length > 1 && (
            <X onClick={remove} />
          )}
        </Badge>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {availableModels[model.provider].map(m => (
          <DropdownMenuItem onClick={() => swapModel(idx, m)}>
            {m}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  ))}
  <Button onClick={addModel}>+ Add Model</Button>
</div>
```

### 3. Refactor app/ultra/page.tsx (15 min)

**Remove:**
- Lines 274-304: Purple Alert component with hardcoded badges
- Lines 306-328: "Show Model Selection" collapsible button

**Replace with unified card:**
```tsx
<div className="model-card space-y-4 mb-6">
  {/* Header row */}
  <div className="flex items-center justify-between">
    <label htmlFor="prompt" className="text-sm font-medium">
      Enter your question
    </label>
    <Button variant="outline" size="sm" onClick={handleGenerateQuestion}>
      <Sparkles className="h-3 w-3 mr-1" />
      Generate Question
    </Button>
  </div>

  {/* Question textarea */}
  <Textarea
    id="prompt"
    placeholder="What should I have for dinner tonight?"
    value={prompt}
    onChange={(e) => setPrompt(e.target.value)}
    rows={4}
    className="resize-none ai-input"
  />

  {/* Branded clickable model badges */}
  <UltraModelBadgeSelector
    models={selectedModels}
    onChange={setSelectedModels}
  />

  {/* Info text */}
  <p className="text-xs text-muted-foreground">
    💡 {selectedModels.filter(m => m.enabled).length} models enabled • Concise mode • Web search enabled • Comparing with GPT-5 • Judge: Claude Sonnet 4.5
  </p>

  {/* CTA Button */}
  <div className="flex justify-end">
    <Button
      onClick={handleSubmit}
      disabled={!prompt.trim() || isLoading}
      className="min-w-[200px] py-4 text-lg ai-button"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Querying...
        </>
      ) : (
        <>
          <Send className="mr-2 h-5 w-5" />
          Get Ultimate Answer
        </>
      )}
    </Button>
  </div>
</div>
```

### 4. Testing Checklist

- [ ] All 5 default models show as branded badges
- [ ] Click badge → dropdown appears with all models for that provider
- [ ] Select model from dropdown → badge updates
- [ ] [+ Add Model] button works
- [ ] [× Remove] icon removes model (only shows if > 1 model)
- [ ] Brand colors correct for each provider
- [ ] "Get Ultimate Answer" button displays correctly
- [ ] Generate Question button works
- [ ] Page loads without TypeScript errors

## Visual Result

```
┌──────────────────────────────────────────────────────────┐
│ Enter your question              [Generate Question]     │
│                                                           │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ What are the best value for money top 3 scooters... │ │
│ │ (large textarea with default prompt)                 │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                           │
│ [GPT-5 ▼ ×][Claude 4.5 ▼ ×][Gemini 2.0 ▼ ×][+ Add]    │
│   gray        orange          blue                       │
│                                                           │
│ 💡 5 models • Concise • Web search • Judge: Claude       │
│                                                           │
│                            [Get Ultimate Answer] →       │
└──────────────────────────────────────────────────────────┘
```

## Files to Create/Modify

**New Files:**
- `lib/brand-colors.ts`
- `components/consensus/ultra-model-badge-selector.tsx`

**Modified Files:**
- `app/ultra/page.tsx` (merge sections, change button text)

## Success Criteria

1. ✅ 3 sections merged into 1 unified card
2. ✅ Model badges are clickable with dropdowns
3. ✅ Each provider has correct brand color
4. ✅ Add/Remove model functionality works
5. ✅ "Generate Question" button kept
6. ✅ Button text changed to "Get Ultimate Answer"
7. ✅ No TypeScript errors
8. ✅ All functionality preserved

## Notes

- Reuse existing model lists from `model-selector.tsx`
- Use shadcn DropdownMenu component for badge dropdowns
- Maintain existing model validation logic
- Keep tier checking (Pro/Free models)
- Preserve all existing functionality, just improve UI/UX

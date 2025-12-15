# Arena Mode Features

**SOURCE**: Split from `docs/workflow/FEATURES.md` for better navigation
**FEATURES**: 55-56 (Arena mode AI trading competition)
**PROTECTION RULE**: Always check this file before modifying arena-related features

---

### 55. Arena Mode - AI Trading Competition
- **Status**: ✅ ACTIVE & DEVELOPMENT (December 2025)
- **Location**:
  - `app/arena/page.tsx` - Main Arena Mode UI
  - `app/api/arena/execute/route.ts` - Research & execution API
  - `lib/arena/arena-research.ts` - Parallel model research
  - `lib/arena/stock-locks.ts` - Exclusive stock ownership
  - `lib/arena/rotation.ts` - Fair model rotation
- **Purpose**: Autonomous AI trading competition where models compete with real P&L
- **Key Features**:
  - **Uses Global Tier System**: Same `UltraModelBadgeSelector` component as other modes
  - **Uses Global Presets**: `getModelsForPreset()` from `lib/config/model-presets.ts`
  - **Modular Architecture**: Shares all model selection logic with Consensus/Trading modes
  - **Parallel Research Phase**: All models analyze simultaneously
  - **Bracket Orders**: Entry + stop-loss + take-profit
  - **Exclusive Stock Ownership**: One model per stock to prevent conflicts
  - **Rotation System**: Fair model priority rotation
  - **Real-time Leaderboard**: P&L, Win Rate, Sharpe Ratio
- **Architecture**:
  - Phase 1: Research (parallel) → Conflict detection
  - Phase 2: User review → Approve trades
  - Phase 3: Execute bracket orders via Alpaca
- **Tier Support**:
  - Free/Pro/Max: API providers (per-call billing)
  - Sub-Pro/Sub-Max: CLI providers (subscription billing)
- **Files**:
  - `supabase/migrations/20251215_arena_stock_locks.sql` - Stock locks table
  - `lib/alpaca/types.ts` - ArenaTradeDecision type
- **TypeScript**: 0 errors
- **Last Modified**: December 15, 2025
- **DO NOT**: Create separate model selector components, duplicate tier filtering functions

### 56. Arena Research Progress UI (Real-time SSE Streaming)
- **Status**: ✅ ACTIVE & COMPLETE (December 15, 2025)
- **Location**:
  - `app/api/arena/execute/stream/route.ts` - SSE streaming endpoint (NEW)
  - `components/trading/research-progress-panel.tsx` - Reused from Trading mode (ENHANCED)
  - `app/arena/page.tsx` - Progress panel integration
  - `types/research-progress.ts` - Event types with symbol support
  - `lib/arena/arena-research.ts` - Exported helpers for stream endpoint
- **Purpose**: Real-time progress display during Arena research showing each model being processed
- **Key Features**:
  - **SSE Streaming**: Server-Sent Events for real-time updates (same pattern as Trading mode)
  - **Reused Component**: `ResearchProgressPanel` with `mode="arena"` prop (no duplication!)
  - **Arena-specific UI**: Skips Phase 1 (Research Agents), shows purple "Analyzing" indicator
  - **Symbol Display**: Shows stock symbol each model selects (e.g., "NVDA")
  - **Color-coded Actions**: BUY=green, SELL=red, HOLD=default
  - **Progress Cards**: Model name, status, action, symbol, confidence, duration
- **Event Types Used**:
  - `phase_start` - Analysis phase beginning
  - `decision_start` - Model analysis starting
  - `decision_complete` - Model finished with symbol, action, confidence
  - `final_result` - All results with conflicts detection
  - `error` - Any errors during analysis
- **Architecture**:
  ```
  User clicks "Start Research"
      ↓
  Frontend: POST /api/arena/execute/stream
      ↓
  Backend emits SSE events:
      ├── phase_start (phase 2)
      ├── decision_start (Model 1)
      │   └── decision_complete (AAPL, BUY, 75%)
      ├── decision_start (Model 2)
      │   └── decision_complete (NVDA, BUY, 82%)
      └── final_result (all recommendations + conflicts)
      ↓
  Frontend: ResearchProgressPanel displays progress
  ```
- **Component Props Added**:
  - `mode?: 'trading' | 'arena'` - Controls phase display behavior
  - `title?: string` - Optional custom title
- **Type Changes**:
  - `DecisionCompleteEvent.symbol?: string` - Stock symbol selected
  - `DecisionProgress.symbol?: string` - Stock symbol for display
- **JSON Safety**: Added `sanitizeString()` to handle AI model responses with control characters
- **TypeScript**: 0 errors
- **Last Modified**: December 15, 2025
- **DO NOT**: Create separate progress panel for Arena (reuses Trading component), remove symbol display from decision cards

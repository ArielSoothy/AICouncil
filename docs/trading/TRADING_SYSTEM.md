# Trading System Features

**SOURCE**: Split from `docs/workflow/FEATURES.md` for better navigation
**FEATURES**: 19-54 (Ultra mode, trading system, model registry, providers, research)
**PROTECTION RULE**: Always check this file before modifying trading-related features

---

### 19. Ultra Mode - Flagship Models Consensus
- **Status**: ✅ ACTIVE & CRITICAL - PREMIUM FEATURE (LOCALHOST-ONLY)
- **Location**: `/app/ultra/page.tsx` (standalone simplified UI)
- **Purpose**: Premium "best answer now" mode with all flagship models pre-selected for maximum accuracy
- **Access Restriction**: **LOCALHOST-ONLY** - Shows "Coming Soon" page on production to prevent unauthorized costly usage
- **Key Components**:
  - **Flagship Model Selection** (7 models, 5 enabled by default):
    - **Enabled**: GPT-5 Chat (gpt-5-chat-latest), Claude Sonnet 4.5 (claude-sonnet-4-5-20250929), Gemini 2.0 Flash, Llama 3.3 70B, Grok 4 (grok-4-0709)
    - **Optional** (disabled, requires API keys): Sonar Pro, Mistral Large
  - **Ultra Mode Defaults**: Concise mode ON, Web search ON, GPT-5 comparison enabled
  - **Redesigned Unified UI** (October 3, 2025):
    - **Single Card Interface**: Merged question input, model selection, and info into 1 unified card
    - **Interactive Model Badges** (`components/consensus/ultra-model-badge-selector.tsx`):
      - Clickable badges with dropdown menus to swap models within same provider
      - Brand-themed colors from `lib/brand-colors.ts` (OpenAI white, Anthropic orange, Google blue, etc.)
      - Add/remove model functionality with [+ Add Model] button
      - Dark mode compatibility with `!important` modifiers
    - **CTA Button**: "Get Ultimate Answer" (premium positioning)
    - **Generate Question Button**: Top-right for AI-powered question generation
  - **Premium Positioning**: Purple branding, Gem icon, "💎 ULTRA MODE" badge
  - **Default Question**: Pre-filled with scooter comparison question for immediate testing
  - **Navigation**: Purple "Ultra Mode" link in header (desktop + mobile)
- **Technical Implementation**:
  - Localhost detection prevents production access (lines 40-75)
  - Standalone page with simplified UI (not using QueryInterface component)
  - DEFAULT_ULTRA_MODELS constant with flagship models pre-configured (lines 17-28)
  - Collapsible ModelSelector for advanced users who want to customize
  - testingTierOverride='enterprise' to bypass tier restrictions
  - Cost estimate: ~$0.02-0.05 per query (5 models, concise mode)
  - Judge model: claude-sonnet-4-5-20250929 for quality/cost balance
- **Model Configuration** (Updated October 2025):
  - **GPT-5 Chat** (gpt-5-chat-latest): $1.25/$10 per 1M tokens 🌐
  - **Claude Sonnet 4.5** (claude-sonnet-4-5-20250929): $3/$15 per 1M tokens 🌐
  - **Gemini 2.0 Flash** (gemini-2.0-flash): Free tier 🌐
  - **Llama 3.3 70B** (llama-3.3-70b-versatile): Free (Groq) 🌐
  - **Grok 4** (grok-4-0709): $3/$15 per 1M tokens 🌐
- **Grok Models Added** (9 models with official pricing):
  - grok-code-fast-1: $0.20/$1.50 per 1M
  - grok-4-fast-reasoning: $0.20/$0.50 per 1M
  - grok-4-fast-non-reasoning: $0.20/$0.50 per 1M
  - grok-4-0709: $3/$15 per 1M (default)
  - grok-3: $3/$15 per 1M
  - grok-3-mini: $0.30/$0.50 per 1M
  - grok-2-vision-1212: $2/$10 per 1M
  - grok-2-1212: $2/$10 per 1M
  - grok-2-latest: $2/$10 per 1M
- **User Tier Updates**:
  - Added 'xai' to Pro and Enterprise availableProviders
  - Updated TierConfig type to include all providers: openai, anthropic, google, groq, xai, perplexity, mistral, cohere
- **Native Search Handling**:
  - Perplexity Sonar's built-in search + DuckDuckGo web search for comprehensive coverage
  - Both search sources provide complementary information
- **File Locations**:
  - `app/ultra/page.tsx` - Ultra mode page (lines 17-28: model config, 40-75: localhost check)
  - `components/ui/header.tsx` - Navigation links (lines 41-46, 123-128)
  - `lib/model-metadata.ts` - Pricing/benchmarks for all flagship models + Grok models
  - `lib/ai-providers/openai.ts` - GPT-5 Chat support (line 10: gpt-5-chat-latest)
  - `lib/ai-providers/anthropic.ts` - Claude Sonnet 4.5 support (line 10)
  - `lib/ai-providers/xai.ts` - All 9 Grok models (lines 9-20)
  - `lib/user-tiers.ts` - xAI provider added to Pro/Enterprise (lines 8, 46, 61)
  - `components/consensus/model-selector.tsx` - All Grok models added (lines 68-81)
- **User Value Proposition**: "F*** it, I want the best answer now" - no configuration needed
- **Business Model**: Premium feature for paid tiers, validates willingness to pay
- **Security**: Localhost-only access prevents unauthorized costly API usage
- **Recent Updates** (January 2026):
  - ✅ **Claude Sonnet 4.5 Integration**: Added claude-sonnet-4-5-20250929 to all systems (metadata, providers, model selector, tier configs)
  - ✅ **Model Benchmark Fix**: Corrected GPT-5-chat-latest benchmarks (AAII: 1069 → 1340, MMLU: 87% → 89%) for accurate weight calculation
  - ✅ **Consensus Display Scrolling Fix**: Doubled max-height (150px → 300px) in comparison-display.tsx with visible scrollbars
  - ✅ **API Verification**: Direct API testing confirms Claude Sonnet 4.5 responds correctly
  - ✅ **Deterministic Ranking System** (CRITICAL FIX): Implemented algorithmic consensus ranking to override judge's non-deterministic summaries
    - **Problem**: Judge (LLM) generated inconsistent summaries that didn't match parsed rankings table
    - **Solution**: Created `parseAndRankAnswers()` function in app/api/consensus/route.ts (lines 30-94)
    - **Algorithm**: Extract numbered lists → Group by product name (first 3 words before : or -) → Rank by weighted score (sum of model weights)
    - **Result**: AI Consensus summary now shows deterministic rankings based on actual model agreement
    - **Philosophy**: "Make it structured as much as possible to be deterministic" - same inputs = same outputs
    - **Files Modified**: app/api/consensus/route.ts (parseAndRankAnswers function + override logic at lines 693-706)
  - ✅ **Anthropic API Fix**: Removed topP parameter that conflicted with temperature in Claude Sonnet 4.5 (lib/ai-providers/anthropic.ts line 48)
- **Model Weights** (Post-Fix):
  - gpt-5-chat-latest: 1.00 (was 0.66 - FIXED)
  - claude-sonnet-4-5-20250929: 0.88
  - gemini-2.0-flash: 0.75
  - llama-3.3-70b-versatile: 0.63
  - grok-4-0709: 0.50
- **Last Modified**: January 2026 (Claude Sonnet 4.5 integration, benchmark fixes, scrolling improvements)
- **DO NOT**: Remove localhost restriction, disable flagship models, revert benchmark fixes, or change premium positioning without user approval

### 20. Conversation Persistence & History System
- **Status**: ✅ ACTIVE & CRITICAL - CORE UX FEATURE (ALL 3 MODES)
- **Location**:
  - `hooks/use-conversation-persistence.ts` - Persistence hook
  - `components/conversation/conversation-history-dropdown.tsx` - History UI
  - `app/api/conversations/[id]/route.ts` - Fetch by ID
  - `app/api/conversations/route.ts` - Fetch all conversations
- **Purpose**: Enable URL-based conversation sharing, page refresh restoration, and conversation history browsing
- **Access**: ✅ Active on ALL modes (Ultra Mode, Consensus Mode, Agent Debate)
- **Privacy Model** (Anonymous Analytics):
  - 📊 **Guests**: Queries saved anonymously (user_id = NULL) for analytics & ML training
    - GET API returns empty array (can't see their own or others' history)
    - No URL sharing, no cross-device access
    - Admin can analyze all guest queries for product insights
    - Legal & privacy-compliant (industry standard anonymous analytics)
  - ☁️ **Authenticated**: Full cloud sync (URL sharing, cross-device, history, social sharing)
- **Key Components**:
  - **Custom Hook** (`useConversationPersistence`):
    - URL parameter detection (`?c=<conversation-id>`)
    - localStorage fallback for last conversation
    - Automatic restoration on mount
    - Loading states and error handling
    - Browser history support
  - **History Dropdown** (`ConversationHistoryDropdown`):
    - Shows last 5 conversations with query snippet, timestamp, model count
    - Lazy loading: fetches only when dropdown opens
    - Smart navigation: detects current path (/ultra, /agents, /)
    - Query truncation to 50 characters
    - Custom `formatRelativeTime` utility (no external dependencies)
    - Empty state: "No saved conversations yet"
    - "See all history" link to future `/history` page
    - Graceful 401 error handling for guest mode
  - **API Endpoints**:
    - POST `/api/conversations` - Save conversation with guest mode support
    - GET `/api/conversations/[id]` - Fetch conversation by ID
    - GET `/api/conversations` - Fetch all user conversations (for history dropdown)
  - **Database Integration**:
    - Nullable user_id for guest mode support
    - evaluation_data JSONB column for structured metrics
    - RLS policies for guest INSERT + SELECT operations
    - GIN index on evaluation_data for performance
  - **TypeScript Types** (`lib/types/conversation.ts`):
    - SavedConversation interface
    - ConversationPersistenceOptions
    - ConversationPersistenceReturn
- **Technical Implementation**:
  - **Authenticated Users**:
    - URL updates automatically on save: `http://localhost:3000/ultra?c=<uuid>`
    - Page refresh fetches conversation from `/api/conversations/[id]`
    - Restores: query text, model selection, complete results
    - Full cloud history accessible from any device
  - **Guest Users (Anonymous Analytics)**:
    - POST `/api/conversations` saves to database with `user_id = NULL`
    - GET `/api/conversations` returns empty array (guests can't retrieve)
    - Admin dashboard shows all guest conversations for analytics
    - Evaluation data captured for ML training
    - No URL sharing capability (conversion incentive)
    - No cross-device access (conversion incentive)
    - Privacy-protected: guests can't see each other's data
  - Toast notifications for restoration status
  - SSR-safe with 'use client' directive
- **Database Migrations Required** (User ran in Supabase Dashboard):
  ```sql
  -- Allow NULL user_id for guest conversations
  ALTER TABLE conversations ALTER COLUMN user_id DROP NOT NULL;

  -- Add evaluation_data column
  ALTER TABLE conversations ADD COLUMN evaluation_data JSONB;
  CREATE INDEX idx_conversations_evaluation_data ON conversations USING GIN (evaluation_data);

  -- RLS policies for guest mode
  CREATE POLICY "Allow user and guest conversation inserts" ON conversations FOR INSERT...
  CREATE POLICY "Allow user and guest conversation selects" ON conversations FOR SELECT...
  ```
- **User Value**:
  - **For Authenticated Users**:
    - Share expensive query results ($0.02-0.05) via URL
    - Refresh page without losing results
    - Send links to colleagues/clients
    - Access history from any device
    - Professional UX (like ChatGPT, Claude.ai)
  - **For Guest Users**:
    - Try product without signup barriers
    - Clear upgrade incentive (URL sharing, cloud sync, history access)
    - Privacy protected (can't see other guests' data)
  - **For Platform (Anonymous Analytics)**:
    - Product insights from guest behavior
    - ML training data collection (evaluation_data)
    - Query pattern analysis for improvement
    - Legal & privacy-compliant analytics
    - Clear conversion funnel (anonymous → authenticated)
    - Industry standard approach (Google Analytics, Mixpanel, etc.)
- **Testing Verified** (October 3, 2025 - All 3 Modes):
  - ✅ Query submission saves to database (all modes)
  - ✅ URL updates with conversation ID parameter (all modes)
  - ✅ Page refresh fully restores query + results (all modes)
  - ✅ History dropdown shows recent conversations (all modes)
  - ✅ Guest mode working (no authentication required)
  - ✅ 401 errors handled gracefully with empty state
  - ✅ $0 cost testing with free Llama model
  - ✅ Screenshots:
    - Ultra Mode: `conversation-history-dropdown-ui.png`
    - Consensus Mode: `consensus-history-dropdown-ui.png`
    - Agent Debate: `agent-debate-history-dropdown-ui.png`
- **Files**:
  - `hooks/use-conversation-persistence.ts` - Reusable custom hook (all modes)
  - `components/conversation/conversation-history-dropdown.tsx` - History dropdown UI
  - `lib/types/conversation.ts` - TypeScript types
  - `app/api/conversations/route.ts` - POST/GET endpoints (guest mode support)
  - `app/api/conversations/[id]/route.ts` - GET by ID endpoint
  - `app/ultra/page.tsx` - Ultra Mode integration
  - `components/consensus/query-interface.tsx` - Consensus Mode integration
  - `components/agents/debate-interface.tsx` - Agent Debate integration
  - `types/database.ts` - Nullable user_id support
  - `scripts/migrate-guest-conversations.js` - Database migration reference
- **Phase 4: Full History Page & Sharing Features** (October 3, 2025 - COMPLETE):
  - ✅ **Full History Page** (`/app/history/page.tsx`):
    - Search by query text with real-time filtering
    - Filter by mode (ultra/consensus/agent) with mode detection
    - Sort by newest/oldest conversations
    - Pagination (10 conversations per page)
    - Delete conversations with confirmation dialog
    - Smart mode detection from response structure
    - Professional table layout with responsive design
    - Empty states for no conversations/no results
  - ✅ **ShareButtons Component** (`components/conversation/share-buttons.tsx`):
    - Copy link to clipboard functionality with Clipboard API
    - Twitter/X sharing with Intent API
    - LinkedIn sharing with Share API
    - Dropdown menu UI for clean UX
    - Query truncation (100 chars) for social media
    - Mode-specific descriptions for sharing context
  - ✅ **Share Integration** (All 3 Modes):
    - Ultra Mode: Share section before feedback form
    - Consensus Mode: Share section before feedback form
    - Agent Debate: Share section after debate display
    - Conditional rendering (only when conversation saved)
    - Smart URL generation with mode detection
    - Format: `{origin}/{path}?c=<conversation-id>`
  - ✅ **API Enhancements**:
    - DELETE endpoint at `/api/conversations/[id]/route.ts`
    - RLS policies ensure users can only delete their own conversations
    - Guest conversations (null user_id) deletable by anyone
  - ✅ **UI Components Created**:
    - `components/ui/input.tsx` - Search input for history page
    - `components/ui/alert-dialog.tsx` - Confirmation dialog for deletions
- **Next Steps** (Planned):
  1. ✅ ~~Conversation history dropdown (last 5 conversations)~~ - COMPLETE
  2. ✅ ~~Extend to regular consensus mode (/)~~ - COMPLETE
  3. ✅ ~~Extend to agent debate mode (/agents)~~ - COMPLETE
  4. ✅ ~~Full history page (/history)~~ - COMPLETE
  5. ✅ ~~Share features (copy link, Twitter, LinkedIn)~~ - COMPLETE
  6. PDF export (future consideration if requested by users)
- **Last Modified**: October 3, 2025
  - Complete history page + sharing features across all modes
  - **ANONYMOUS ANALYTICS**: Guest queries saved anonymously (user_id = NULL)
  - Guests can't retrieve their own data (GET returns empty array)
  - Admin can analyze all guest queries for product insights & ML training
  - Privacy-protected: guests can't see each other's conversations
  - Legal & privacy-compliant (industry standard anonymous analytics)
- **DO NOT**: Remove URL persistence for authenticated users, change guest GET behavior, modify conversation data structure, remove sharing features, or modify without testing both auth and guest flows

### 19. AI Paper Trading System
- **Status**: ✅ ACTIVE & COMPLETE - PHASE 2: 100% COMPLETE (12/12 STEPS) - PRODUCTION READY
- **Location**: `/trading` route + `lib/alpaca/` + `components/trading/` + `app/api/trading/` + `scripts/test-*.ts`
- **Purpose**: Multi-model paper trading arena where AI models compete with trading decisions
- **Phase 1 Complete** (Backend Infrastructure):
  - ✅ Alpaca Trading API integration with lazy initialization
  - ✅ TypeScript types (`lib/alpaca/types.ts`): TradeDecision, AlpacaOrder, AlpacaAccount
  - ✅ Client functions (`lib/alpaca/client.ts`): testConnection(), getAccount(), placeMarketOrder(), saveTrade()
  - ✅ AI trading prompt generator (`lib/alpaca/prompts.ts`)
  - ✅ Database schema: `paper_trades` table (Supabase)
  - ✅ END-TO-END test suite (12 incremental steps with git checkpoints)
  - ✅ Real paper trades executed (AAPL, NVDA)
  - ✅ Claude AI decision generation validated
  - ✅ Database persistence working
- **Phase 2: 100% Complete (12/12 steps)** - ALL FEATURES OPERATIONAL & PRODUCTION READY:
  - ✅ **Step 1-2**: `/trading` route + Mode selector (3 tabs)
  - ✅ **Step 3**: Individual LLMs mode UI with mock data
  - ✅ **Step 4**: Individual mode API endpoint (`/api/trading/individual`)
    * Parallel calls to 4 AI providers (Claude, GPT-4o, Gemini, Llama)
    * Markdown code block stripping for robust JSON parsing
    * Side-by-side trading decision comparison
    * **Tested**: BUY NVDA (85%), BUY AAPL (80%)
  - ✅ **Step 5**: Consensus Trade mode UI
    * Vote breakdown display (BUY/SELL/HOLD counts)
    * Professional vote cards with color coding
    * Consensus decision card with action badge
    * Trade details and reasoning display
  - ✅ **Step 6**: Consensus mode API endpoint (`/api/trading/consensus`)
    * Majority vote consensus algorithm (>50% threshold)
    * Symbol selection: most common among agreeing models
    * Quantity/confidence averaging
    * **Tested**: Unanimous 3/3 BUY MSFT (100% agreement, 82% confidence)
  - ✅ **Step 7**: Debate Trade mode UI
    * Round selector (Round 1 vs Round 2)
    * 3-agent card grid (Analyst, Critic, Synthesizer)
    * Final Decision display with consensus summary
    * Professional round-based navigation
  - ✅ **Step 8**: Debate mode API endpoint (`/api/trading/debate`)
    * Multi-round agent debate system
    * Round 1: Analyst proposes, Critic challenges, Synthesizer balances
    * Round 2: All agents refine positions based on full debate
    * **Tested**: Round 1: Analyst BUY 75 (85%), Critic HOLD (65%), Synthesizer BUY 37 (75%)
    * **Tested**: Round 2: Analyst BUY 50 (80%), Critic BUY 37 (75%), Synthesizer BUY 25 (70%)
    * **Critic changed HOLD → BUY** after debate! (proves agents reason about arguments)
  - ✅ Navigation: Green "Trading" link in header (desktop + mobile)
  - ✅ **Step 9**: Trading history display component
    * API endpoint: `/api/trading/history` with filters (mode, action, symbol)
    * TradeHistory component with expandable reasoning
    * Professional card layout with confidence bars
    * **Tested**: 1 trade from database (50 × NVDA BUY, 85%)
  - ✅ **Step 10**: Portfolio balance + positions display
    * API endpoint: `/api/trading/portfolio`
    * PortfolioDisplay component with real-time Alpaca data
    * 4 key metric cards (Portfolio Value, Cash, Daily P&L, Total P&L)
    * Open positions table with P&L tracking
    * **Tested**: $100k portfolio displaying correctly
  - ✅ **Step 11**: END-TO-END UI test with browser
    * All 3 modes validated (Individual, Consensus, Debate)
    * Mode switching tested successfully
    * Portfolio persistent across modes
    * Trade History showing correctly
    * **Tested**: Full system validation complete
  - ✅ **Step 12**: Final documentation and deployment
    * FEATURES.md updated with 100% completion
    * All commits pushed to feature branch
    * Screenshots captured for all features
    * Production-ready system
  - ✅ **Step 13**: Start New Analysis button (October 24, 2025)
    * Reset button added to all 3 trading modes
    * Clears current results and allows starting fresh analysis
    * Removes `?c=` URL parameter to clear cache reference
    * Consistent `handleStartNew()` implementation across modes
    * RotateCcw icon with professional outline button styling
    * **Tested**: Individual Mode reset working correctly
    * **Commit**: 7d373ff
- **Key Features**:
  - **2 Trading Modes** (Consolidated October 24, 2025):
    1. **Consensus Trade**: Multi-model consensus + individual model responses in one unified view
       - Shows consensus decision (vote breakdown, agreement level, synthesized reasoning)
       - Displays individual model decisions (all 8 models with reasoning, confidence, symbols)
       - Matches Normal Consensus UX pattern (no tab switching needed)
    2. **Debate Trade**: Agent debate system (Analyst → Critic → Synthesizer) for trades
  - **Eliminated Individual Mode**: Merged into Consensus Trade for better UX (all info in one place)
  - **Paper Trading Only**: All trades are simulated ($100k paper balance)
  - **Database Tracking**: Full trade history with reasoning, confidence, outcomes
  - **Alpaca Integration**: Real market data, realistic paper trading environment
- **File Structure**:
  - Backend: `lib/alpaca/{types.ts, client.ts, prompts.ts}`
  - API Routes: `app/api/trading/{individual/route.ts, consensus/route.ts, debate/route.ts, history/route.ts, portfolio/route.ts}`
  - Frontend: `app/trading/page.tsx`
  - Components: `components/trading/{mode-selector.tsx, individual-mode.tsx, consensus-mode.tsx, debate-mode.tsx, trade-history.tsx, portfolio-display.tsx}`
  - Database: `scripts/create-trading-tables.sql`
  - Tests: `scripts/test-*.ts` (12-step test suite)
  - Docs: `PAPER_TRADE.MD`, `PHASE_2_PLAN.md`
- **Environment Variables Required**:
  ```
  ALPACA_API_KEY=<your_key>
  ALPACA_SECRET_KEY=<your_secret>
  ALPACA_BASE_URL=https://paper-api.alpaca.markets
  ```
- **Database Schema** (`paper_trades` table):
  - id (UUID), mode (VARCHAR), symbol (VARCHAR), action (VARCHAR)
  - quantity (INTEGER), price (DECIMAL), reasoning (TEXT)
  - confidence (DECIMAL), executed_at (TIMESTAMP)
  - alpaca_order_id (VARCHAR), created_at (TIMESTAMP)
- **Test Results** (Phase 1):
  - Claude Decision: BUY 50 NVDA @ 0.85 confidence
  - Order Executed: ID e2b2b2e1-978b-456a-b702-d4111d224077
  - Database Saved: Record ID 22c550da-348d-4063-a46e-9c7227a2e357
- **Last Modified**: October 24, 2025
  - Phase 1: Backend complete (commit: 67154a7)
  - Phase 2 Steps 1-3: UI foundation (commits: 4a09433, 2c8df2d, 8ae29d9, 1473a99)
  - Phase 2 Step 4: Individual mode API (commit: d1c272a)
  - Phase 2 Step 5: Consensus UI (commit: 607586d)
  - Phase 2 Step 6: Consensus API (commit: 75b2d58)
  - Phase 2 Step 7: Debate UI (commit: f9e0834)
  - Phase 2 Step 8: Debate API (commit: 7ae4625)
  - Documentation update Steps 7-8 (commit: 589a4e1)
  - Phase 2 Step 9: Trade history (commit: 16c3e91)
  - Phase 2 Step 10: Portfolio display (commit: 2515ea9)
  - Phase 2 Step 11: END-TO-END test (commit: ce61755)
  - Branch: `feature/paper-trading-phase2` (100% complete - PRODUCTION READY)
- **DO NOT**: Delete paper trading feature, remove Alpaca integration, modify database schema without migration, skip test validation steps

### 19a. Global Model Tier Selector (Trading)
- **Status**: ✅ ACTIVE & COMPLETE (Updated December 11, 2025)
- **Location**: `lib/config/model-presets.ts` + `contexts/trading-preset-context.tsx` + `components/trading/global-preset-selector.tsx`
- **Purpose**: Single centralized control for Free/Pro/Max model tier selection across ALL trading modes
- **Key Features**:
  - ✅ **Global Tier Selector**: One control affects Consensus, Debate modes simultaneously
  - ✅ **Three Tiers** (Updated December 2025):
    * Free: 4 free models (gemini-2.0-flash, llama-3.3-70b-versatile, llama-3.1-8b-instant, gpt-3.5-turbo)
    * Pro: 7 balanced models (claude-3-7-sonnet, claude-3-5-haiku, gpt-4o, gpt-5-mini, gemini-2.0-flash, llama-3.3-70b, grok-code-fast-1)
    * Max: 8 flagship models (claude-sonnet-4-5, gpt-5-chat-latest, gpt-5, grok-4 variants, llama-3.3-70b, gemini-2.0-flash)
  - ✅ **Smart Defaults**: Auto-syncs with user subscription tier (free → Free, pro → Pro, enterprise → Max)
  - ✅ **Visual Indicators**: Each mode shows current tier with badge (Free 🎁 / Pro ⚡ / Max ✨)
  - ✅ **React Context**: `TradingPresetProvider` with `useTradingPreset()` hook
  - ✅ **Centralized Config**: All preset definitions in `lib/config/model-presets.ts` (single source of truth)
- **UI Placement**: Between portfolio display and mode tabs on `/trading` page
- **Behavior**:
  - Switching tier updates all modes instantly via `useEffect` hooks
  - Consensus Mode: Updates multi-model selection
  - Debate Mode: Updates Analyst/Critic/Synthesizer role assignments
  - User can still customize individual model selection after preset applied
- **Files** (7 total):
  - `lib/config/model-presets.ts` (centralized presets - SINGLE SOURCE OF TRUTH)
  - `contexts/trading-preset-context.tsx` (global state)
  - `components/trading/global-preset-selector.tsx` (UI component)
  - `app/trading/page.tsx` (provider + selector)
  - `components/trading/consensus-mode.tsx` (connect to global)
  - `components/trading/debate-mode.tsx` (connect to global)
  - `components/trading/trading-model-selector.tsx` (show tier indicator)
- **Benefits**:
  - ✅ Eliminates duplicate Free/Pro/Max buttons in each mode
  - ✅ Better UX: One decision affects all modes (matches user mental model)
  - ✅ DRY Code: Single preset config instead of 3 duplicates
  - ✅ Mobile-friendly: Less UI clutter
  - ✅ Scalable: Prepares for subscription-based model access
- **Last Modified**: December 11, 2025 (cleaned up orphaned duplicate, updated model lists)
- **Tested**: Browser validated - switching tiers updates Consensus & Debate modes correctly
- **DO NOT**: Remove global preset selector, revert to per-mode presets, create duplicate preset configs (DELETED lib/trading/preset-configs.ts on Dec 11, 2025)

### 20. AI Tool Use - Real-Time Market Research
- **Status**: ✅ ACTIVE & PHASE 2 COMPLETE (October 25, 2025)
- **Location**: `lib/alpaca/market-data-tools.ts` + `lib/ai-providers/*.ts` (5 providers)
- **Purpose**: Enable AI models to research stocks via function calling instead of relying on training data
- **Key Features**:
  - ✅ **8 Trading Research Tools**:
    1. `get_stock_quote` - Real-time price, bid/ask, volume
    2. `get_price_bars` - Historical candlestick data (1Min, 5Min, 1Hour, 1Day)
    3. `get_stock_news` - Latest news articles for symbol
    4. `calculate_rsi` - Relative Strength Index (14-period)
    5. `calculate_macd` - MACD indicator (12, 26, 9)
    6. `get_volume_profile` - Trading volume analysis
    7. `get_support_resistance` - Key price levels from bars
    8. `check_earnings_date` - Upcoming earnings (placeholder)
  - ✅ **Tool Call Tracking**: `toolTracker.logCall()` monitors rate limits (200/min Alpaca limit)
  - ✅ **5 Providers Integrated** (Phase 2 Complete):
    * Anthropic (Claude) - All models support tools
    * OpenAI (GPT) - All models support tools
    * Google (Gemini) - All models support tools (switched to Vercel AI SDK)
    * xAI (Grok) - All models support tools
    * Groq (Llama) - Includes `llama-3-groq-70b-tool-use` (#1 Berkeley leaderboard)
  - ✅ **TypeScript Safety**: `ModelResponse.toolCalls` array tracks all tool usage
  - ✅ **Maximum Capability Mode**: 15 max tool calls per model, any stock research
- **Implementation Details**:
  - Framework: Vercel AI SDK `tool()` wrapper with Zod schema validation
  - Pattern: `config.useTools ? alpacaTools : undefined` in all providers
  - Callback: `onStepFinish` logs tool calls to console and tracker
  - API Integration: Uses existing `getAlpacaClient()` from `lib/alpaca/client.ts`
- **Dependencies**:
  - `@ai-sdk/*` packages (Vercel AI SDK)
  - Alpaca Paper Trading API v3 (async generators)
  - `types/consensus.ts` (ModelResponse with toolCalls)
- **Remaining Phases** (Pending):
  - Phase 3: Rate limiting (queue requests at 150 calls/min threshold)
  - Phase 4: Prompt updates (add research tools documentation)
  - Phase 5: Enable in Consensus Mode (`app/api/trading/consensus/route.ts`)
  - Phase 6: Enable in Debate Mode (all 3 agents)
  - Phase 7: UI for research activity logs
  - Phase 8: Documentation updates
- **Files Created**:
  - `lib/alpaca/market-data-tools.ts` (600+ lines, 8 tools + tracker)
- **Files Modified** (Phase 2):
  - `lib/ai-providers/anthropic.ts` ✅
  - `lib/ai-providers/openai.ts` ✅
  - `lib/ai-providers/google.ts` ✅ (SDK switched)
  - `lib/ai-providers/xai.ts` ✅
  - `lib/ai-providers/groq.ts` ✅
  - `types/consensus.ts` (added toolCalls to ModelResponse)
- **Testing Status**: Phase 2 complete, TypeScript 0 errors, ready for Phase 5 testing
- **DO NOT**: Remove tool use capability, delete market-data-tools.ts, revert provider changes without testing

### 21. Modular Data Provider Architecture
- **Status**: ✅ ACTIVE & PRODUCTION READY (October 26, 2025)
- **Location**: `lib/data-providers/` directory + `lib/alpaca/data-coordinator.ts`
- **Purpose**: Modular, extensible architecture for fetching market data from multiple sources (Yahoo Finance, Alpaca, IBKR)
- **Problem Solved**:
  - ❌ **Before**: Alpaca free tier blocking real-time data with 403 "subscription does not permit querying recent SIP data" errors
  - ✅ **After**: Yahoo Finance provides FREE real-time market data without restrictions
- **Key Benefits**:
  - 8-10x faster (1 API call vs 64 individual fetches)
  - 90% API call reduction
  - FREE data (no API keys required with Yahoo Finance)
  - All models analyze SAME data (fairest comparison)
  - Easy to switch providers via environment variable
- **Architecture** (SOLID Principles):
  - **Interface Segregation**: All providers implement `IDataProvider` interface
  - **Template Method Pattern**: Base class provides shared TA calculations
  - **Factory Pattern**: Easy provider switching via `getDataProvider()`
  - **Provider Registry**: Custom provider registration support
- **Files Created**:
  - `lib/data-providers/types.ts` (~170 lines) - Interface definitions, type safety
  - `lib/data-providers/base-provider.ts` (~290 lines) - Abstract base class with RSI, MACD, EMA, SMA, Bollinger Bands
  - `lib/data-providers/yahoo-finance-provider.ts` (~280 lines) - FREE Yahoo Finance integration
  - `lib/data-providers/provider-factory.ts` (~120 lines) - Factory pattern implementation
  - `lib/data-providers/index.ts` (~90 lines) - Clean exports with documentation
- **Files Modified**:
  - `lib/alpaca/data-coordinator.ts` (Simplified from ~450 to ~250 lines) - Now thin wrapper around provider factory
- **Data Provided**:
  - Real-time quote (price, volume, bid, ask, spread)
  - Historical bars (last 30-90 days)
  - Technical indicators (RSI, MACD, EMAs, SMAs, Bollinger Bands)
  - Support/resistance levels
  - Recent news (5 articles)
  - Trend analysis (direction, strength, analysis)
- **How to Switch Providers**:
  ```typescript
  // Option 1: Environment variable (recommended)
  DATA_PROVIDER=yahoo  # Default, FREE
  DATA_PROVIDER=alpaca # When Alpaca provider is implemented
  DATA_PROVIDER=ibkr   # When IBKR provider is implemented

  // Option 2: Programmatically
  const provider = getDataProvider('yahoo');
  const data = await provider.fetchMarketData('TSLA');

  // Option 3: Auto-fallback
  const provider = await getWorkingProvider(); // Tries all providers until one works
  ```
- **Browser Test Results** (Verified October 26, 2025):
  - ✅ Yahoo Finance fetching TSLA data successfully
  - ✅ All 7 models citing specific Yahoo Finance data (RSI 43.25, EMA $432.85, etc.)
  - ✅ NO more Alpaca 403 errors
  - ✅ TypeScript compilation: 0 errors
- **Dependencies**:
  - Native `fetch()` API (no external dependencies for Yahoo Finance)
  - Existing Alpaca client (for future Alpaca provider)
- **Future Extensibility**:
  - Easy to add IBKR provider
  - Easy to add Polygon.io provider
  - Easy to add Alpha Vantage provider
  - Provider registry supports custom implementations
- **Last Modified**: October 26, 2025 (Initial implementation + browser validation)
- **DO NOT**: Delete data-providers directory, remove Yahoo Finance provider, modify IDataProvider interface without updating all providers, bypass factory pattern

### 22. Research Caching System
- **Status**: ✅ ACTIVE & PRODUCTION READY - PHASE 1 COMPLETE (October 30, 2025)
- **Location**: `lib/trading/research-cache.ts` + `scripts/create-research-cache-table.sql` + Supabase `research_cache` table
- **Purpose**: Cache market research results to avoid redundant API calls and accelerate response times
- **Problem Solved**:
  - ❌ **Before**: Every Consensus Trade query ran 30-40 API calls (4 research agents × 7-10 tools each)
  - ✅ **After**: Cache hit = 0 API calls, instant research retrieval (<0.5s vs 8-12s)
- **Key Features**:
  - **Smart TTL Strategy** based on trading timeframe:
    - Day trading: 15min cache (intraday data volatility)
    - Swing trading: 1hr cache (daily timeframe updates)
    - Position trading: 4hr cache (weekly holds less urgent)
    - Long-term: 24hr cache (fundamental analysis stable)
  - **Cache Key**: `symbol + timeframe` (e.g., "TSLA-swing" different from "TSLA-day")
  - **Supabase Backend**: Persistent storage with PostgreSQL + JSONB
  - **Access Tracking**: Monitors cache hits, access counts, age
  - **Manual Invalidation**: Force refresh for breaking news/earnings
  - **Statistics API**: Monitor cache performance (`get_research_cache_stats()`)
- **Architecture**:
  ```typescript
  // Check cache first
  const cached = await researchCache.get(symbol, timeframe);
  if (cached) {
    // Cache hit - use existing research
    researchReport = cached;
  } else {
    // Cache miss - run fresh research
    researchReport = await runResearchAgents(...);
    // Cache for next time
    await researchCache.set(symbol, timeframe, researchReport);
  }
  ```
- **Database Schema** (`research_cache` table):
  - `symbol` (TEXT) + `timeframe` (TEXT) = unique cache key
  - `research_data` (JSONB) - Complete ResearchReport object
  - `cached_at`, `expires_at` - TTL management
  - `access_count`, `last_accessed_at` - Usage tracking
  - `is_stale`, `invalidated_reason` - Manual invalidation
  - Indexes on `(symbol, timeframe)` and `expires_at`
- **Expected Performance**:
  - **Cost Savings**: 45% reduction with 50% cache hit rate
  - **Response Time**: 2x faster (8-12s → 2s for cached queries)
  - **API Call Reduction**: 30-40 calls → 0 calls on cache hit
- **Integration Points**:
  - ✅ **Consensus Mode**: Integrated in `/app/api/trading/consensus/route.ts`
  - ⏳ **Individual Mode**: Not yet integrated (Phase 2)
  - ⏳ **Debate Mode**: Not yet integrated (Phase 2)
- **Monitoring**:
  - SQL function: `get_research_cache_stats()` returns:
    - Total/active/expired entries
    - Most cached symbols
    - Average access count
    - Cache age in hours
  - Cleanup function: `cleanup_expired_research_cache()` for maintenance
- **Files Created**:
  - `lib/trading/research-cache.ts` (~380 lines) - ResearchCache service class
  - `scripts/create-research-cache-table.sql` (~180 lines) - Database schema
  - `docs/guides/RESEARCH_CACHE_TESTING.md` (~450 lines) - Comprehensive testing guide
- **Files Modified**:
  - `app/api/trading/consensus/route.ts` - Integrated caching (lines 218-243)
- **Testing Guide**: See `docs/guides/RESEARCH_CACHE_TESTING.md` for complete testing instructions
- **Setup Required**: Must run SQL script in Supabase Dashboard before use
- **Cache Hit Rate Target**: 40%+ after 1 week of usage
- **Future Enhancements (Phase 2)**:
  - Extend to Individual/Debate modes
  - Incremental updates (fetch only quote/news, not full research)
  - Real-time cache invalidation on breaking news
- **Last Modified**: October 30, 2025 (Phase 1 complete, ready for testing)
- **DO NOT**: Remove research_cache table, bypass cache in Consensus mode, modify TTL strategy without data analysis, delete cache statistics functions

### 32. Model Testing & Status Tracking System
- **Status**: ✅ ACTIVE & PRODUCTION-READY
- **Location**: `lib/models/model-registry.ts`, `scripts/test-all-models.ts`, `lib/models/model-tester.ts`
- **Purpose**: Comprehensive testing infrastructure to validate all AI models and track their availability status
- **Key Features**:
  - Automated testing of all 53 models across 8 providers
  - Status metadata: working, unreleased, no_api_key, parameter_error, service_error
  - Test timestamp tracking (lastTested field)
  - Response time monitoring
  - Detailed error categorization with human-readable notes
  - UI components automatically filter to show only working models
  - Helper functions: `getWorkingModels()`, `isModelWorking()`, `getWorkingModelsByProvider()`
- **Test Results** (October 28, 2025):
  - 26 working models (49.1%): OpenAI 80%, Anthropic 58%, xAI 44%, Groq 40%
  - 27 failed models (50.9%): Unreleased, API key issues, deprecated
  - Average response time: 2.45 seconds
  - Fastest provider: Groq (0.3s average)
- **UI Components Updated**:
  - `components/trading/single-model-badge-selector.tsx` - Direct filtering for working models
  - `components/consensus/ultra-model-badge-selector.tsx` - Direct filtering for working models
  - `lib/user-tiers.ts` - Central model provider (FREE_MODELS, ALL_MODELS filtered)
  - `lib/trading/models-config.ts` - Trading models (TRADING_MODELS filtered)
  - All other components use filtered models via user-tiers.ts or trading/models-config.ts
  - Filter logic: `!m.isLegacy && m.status === 'working'`
- **Testing Commands**:
  ```bash
  npm run test-models               # Test all 53 models
  npm run test-models:dry-run       # Preview without API calls
  npm run test-models:provider openai  # Test specific provider
  npm run test-models:retest        # Retest failed models only
  ```
- **Key Findings**:
  - ✅ GPT-5, GPT-5 Mini, GPT-5 Nano confirmed working
  - ✅ Claude 4.5 Sonnet, Claude 4 Sonnet confirmed working
  - ✅ Grok 4 series (all 3 models) confirmed working
  - ⚠️ Perplexity, Mistral, Cohere API keys need verification
  - ⚠️ Most Gemini models failing (only 2.0 Flash works)
  - ⚠️ Grok 2 series deprecated (superseded by Grok 4)
- **Documentation**:
  - Full details: `docs/features/MODEL_STATUS.md`
  - Test results: `docs/MODEL_TEST_RESULTS.md`
  - Status data: `scripts/update-model-status.ts`
- **Dependencies**:
  - All AI provider modules (`lib/ai-providers/*.ts`)
  - Model registry (`lib/models/model-registry.ts`)
  - TypeScript test runner (tsx/npx)
- **Last Modified**: October 28, 2025 (Initial comprehensive testing)
- **DO NOT**: Remove status metadata from model registry, disable model filtering in UI components, delete test infrastructure

### 33. Debate Progress Flowchart
- **Status**: ✅ ACTIVE & USER-REQUESTED
- **Location**:
  - `components/debate/flowchart-node.tsx` - Individual step nodes
  - `components/debate/flowchart-connector.tsx` - SVG arrow connectors
  - `components/debate/debate-flowchart.tsx` - Main orchestrator
  - `components/agents/debate-interface.tsx` - Integration
- **Purpose**: Visual horizontal flowchart showing real-time debate progression during loading
- **Key Features**:
  - Collapsible panel with progress bar (e.g., "3/5 steps")
  - Animated nodes showing: Research → Analyst → Critic → Judge → Synthesizer → Synthesis
  - Status-based styling (pending=gray, active=blue+spinner, complete=green, error=red)
  - Model info displayed (provider/model) on each node
  - Duration tracking per step (e.g., "11.2s")
  - Response preview on hover via tooltip
  - Animated flow particles on active connectors
  - Works during loading state with real-time updates from streaming events
- **Streaming Event Integration**:
  - `web_search_started` / `web_search_completed` → Research step
  - `model_started` / `model_completed` → Agent steps (by role)
  - `synthesis_started` / `synthesis_completed` → Synthesis step
- **Helper Functions**:
  - `createDebateSteps()` - Initialize steps array
  - `updateStepStatus()` - Update individual step progress
- **Dependencies**:
  - `@/components/ui/tooltip` - Preview on hover
  - `@/components/ui/card` - Container
  - lucide-react icons
- **Last Modified**: November 2025 (Initial implementation)
- **DO NOT**: Remove flowchart from loading state, break streaming event integration

### 34. Pre-Debate Clarifying Questions
- **Status**: ✅ ACTIVE & USER-REQUESTED
- **Location**:
  - `app/api/agents/pre-debate-questions/route.ts` - Question generation API
  - `components/debate/pre-debate-questions.tsx` - UI component
  - `components/agents/debate-interface.tsx` - Integration (toggle + state)
- **Purpose**: AI-generated clarifying questions before debate to improve result quality
- **Key Features**:
  - Generates 3-4 contextual questions based on user query
  - Uses Groq first (free/fast), falls back to Claude
  - Optional answers - user can skip and start debate directly
  - Toggle in setup UI to enable/disable feature
  - Questions include hints for better user guidance
  - Seamlessly integrates answers into debate context
- **UI Flow**:
  1. User clicks "Start Debate" with toggle enabled
  2. Pre-debate questions panel appears with loading state
  3. AI generates 3-4 clarifying questions specific to query
  4. User can answer any/all questions or click "Skip & Start Debate"
  5. Debate begins with additional context from answers (if provided)
- **API Details**:
  - Endpoint: `POST /api/agents/pre-debate-questions`
  - Input: `{ query: string }`
  - Output: `{ success: true, questions: [{ question: string, hint?: string }] }`
  - Uses `@ai-sdk/groq` with `llama-3.3-70b-versatile` model
  - Fallback to `@ai-sdk/anthropic` with `claude-3-5-haiku-20241022`
- **Dependencies**:
  - `@ai-sdk/groq`, `@ai-sdk/anthropic`, `ai` (generateText)
  - shadcn/ui components (Card, Button, Textarea, Label)
  - lucide-react icons (HelpCircle, Lightbulb, SkipForward, etc.)
- **Related Fix**: Also fixed false "Failed to start" timeout error - now only shows error if NO models start within 15 seconds (prevents false positives for sequential agents)
- **Last Modified**: November 2025 (Initial implementation)
- **DO NOT**: Remove skip option, change to synchronous-only flow, disable toggle functionality

### 35. Centralized Model Registry System
- **Status**: ✅ ACTIVE & CRITICAL
- **Location**: `lib/models/model-registry.ts` - Single source of truth
- **Purpose**: Centralized model definitions ensuring consistency across all modes
- **Key Features**:
  - `MODEL_REGISTRY` - All 46+ models from 8 providers with metadata
  - `hasInternetAccess()` - Check if model has native web search
  - `PROVIDER_NAMES` - Display names for all providers
  - `getModelsByProvider()` - Get models for specific provider
  - Tier classification: free/budget/balanced/premium/flagship
  - Internet access flags for Claude, GPT, Gemini, Grok, Perplexity, Mistral, Cohere
  - Groq/Llama correctly marked as NO internet access
- **Consuming Files** (ALL use centralized registry):
  - `lib/user-tiers.ts` - Derives ALL_MODELS from registry
  - `lib/trading/models-config.ts` - Derives TRADING_MODELS from registry
  - `lib/config/model-presets.ts` - Uses TRADING_MODELS
  - `lib/services/model-service.ts` - Uses registry hasInternetAccess
  - `components/consensus/model-selector.tsx` - Uses registry
  - `components/consensus/enhanced-consensus-display-v3.tsx` - Derives from MODEL_COSTS_PER_1K
  - `components/consensus/ultra-model-badge-selector.tsx` - Uses registry directly
  - `components/arena/arena-model-selector.tsx` - Uses TRADING_MODELS
  - `components/trading/*.tsx` - Uses TRADING_MODELS
- **Related Files**:
  - `lib/model-metadata.ts` - MODEL_COSTS_PER_1K (centralized pricing)
- **Web Search Default**: Enabled by default (`useState(true)` in debate-interface.tsx)
- **Last Modified**: November 2025 (Audit & consolidation - removed duplicate lists)
- **DO NOT**: Create duplicate model lists in components, hardcode model definitions outside registry

### 36. Native Web Search Integration
- **Status**: ✅ ACTIVE & CRITICAL
- **Location**: `lib/ai-providers/*.ts` + `app/api/agents/debate-stream/route.ts`
- **Purpose**: Use each model's native web search capability instead of DuckDuckGo fallback
- **Key Features**:
  - **OpenAI**: Uses `openai.tools.webSearchPreview()` - works with GPT-4o+
  - **xAI**: Uses `searchParameters: { mode: 'auto' }` for Grok Live Search
  - **Google**: Uses `google.tools.googleSearch()` (requires SDK v2.x+)
  - **Anthropic**: Uses `anthropic.tools.webSearch_20250305()` (requires SDK v2.x+)
  - **Groq/Llama**: Falls back to DuckDuckGo (no native search capability)
- **SDK Requirements**:
  - `@ai-sdk/google`: ^2.0.42 (for google.tools.googleSearch)
  - `@ai-sdk/anthropic`: ^2.0.45 (for anthropic.tools.webSearch)
  - `@ai-sdk/openai`: ^2.0.42 (for openai.tools.webSearchPreview)
  - `ai`: ^5.0.99
- **Runtime Detection**: Code uses graceful fallback if SDK doesn't support native search
- **UI Indicator**: Shows "openai native" / "google native" instead of "duckduckgo"
- **Related Files**:
  - `lib/ai-providers/google.ts` - Google Search grounding
  - `lib/ai-providers/openai.ts` - OpenAI web search
  - `lib/ai-providers/anthropic.ts` - Claude web search
  - `lib/ai-providers/xai.ts` - Grok Live Search
- **Last Modified**: November 2025 (Initial native search implementation)
- **DO NOT**: Remove native search without ensuring DuckDuckGo fallback works, change SDK versions without testing

### 37. Pre-Research Stage for Agent Debates
- **Status**: ✅ ACTIVE - SMART DETECTION (November 2025)
- **Location**: `lib/web-search/pre-research-service.ts` + `app/api/agents/debate-stream/route.ts` + `lib/agents/agent-system.ts`
- **Purpose**: Gather research evidence BEFORE debate, using native search when available, DuckDuckGo as fallback
- **Smart Search Detection** (NEW - November 2025):
  - Models WITH native search (OpenAI, Anthropic, Google, xAI, Perplexity): Get instructions to use their native web search tools
  - Models WITHOUT native search (Groq/Llama, Mistral, Cohere): Get DuckDuckGo pre-research injected into prompts
  - Detection uses `hasInternetAccess()` from model registry
- **Native Search Providers**:
  - OpenAI: `webSearchPreview` tool
  - Anthropic: `webSearch_20250305` tool
  - Google: `googleSearch` grounding
  - xAI: Grok Live Search (`searchParameters: { mode: 'auto' }`)
  - Perplexity: Built-in search (Sonar models)
- **DuckDuckGo Fallback** (for non-native models):
  - Executes when ANY agent lacks native search capability
  - Generates 4 role-specific search queries (general, analyst, critic, synthesizer)
  - Injects formatted research context into prompts for non-native models only
- **UI Indicators**:
  - "Search Capabilities" card shows per-agent search provider
  - 🌐 = Native search (provider name shown)
  - 🦆 = DuckDuckGo Fallback
  - Summary: "X native, Y DuckDuckGo"
- **SSE Events**:
  - `search_capabilities` - Per-agent search provider info
  - `pre_research_skipped` - When all models have native search
  - `pre_research_status` - DuckDuckGo progress (only for fallback models)
- **Data Flow**:
  1. Analyze which models have native search vs need DuckDuckGo
  2. For native models: Add instructions to use their web search tools
  3. For non-native models: Run DuckDuckGo pre-research, inject results
  4. UI shows correct search provider per agent
- **Related Files**:
  - `lib/agents/agent-system.ts` - Smart search detection logic (lines 134-180)
  - `app/api/agents/debate-stream/route.ts` - SSE events for search status
  - `components/agents/debate-interface.tsx` - UI for search capabilities display
  - `lib/models/model-registry.ts` - `hasInternetAccess()` function
- **Last Modified**: November 2025 (Smart detection - native search priority, DuckDuckGo fallback)
- **DO NOT**: Use DuckDuckGo for models with native search, remove smart detection logic, hide search provider indicators

### 38. Model Fallback System
- **Status**: ✅ ACTIVE & CRITICAL (December 2025)
- **Location**: `lib/models/model-fallback.ts` + `app/api/agents/debate-stream/route.ts`
- **Purpose**: Automatic fallback when models fail, return empty responses, or hit rate limits
- **Key Components**:
  - `FALLBACK_CHAINS`: Tier-based fallbacks (free → budget → balanced → premium → flagship)
  - `PROVIDER_FALLBACKS`: Cross-provider fallbacks when a specific provider is down
  - `isResponseFailed()`: Detects empty/failed responses (null, empty, <10 chars, contains "error:")
  - `getFallbacksForModel()`: Returns combined provider + tier fallbacks, deduplicated
  - `queryWithFallback()`: Full retry logic with SSE event notification
- **Fallback Strategy**:
  1. Try primary model first
  2. If fails or returns empty → try provider-specific fallbacks
  3. Then try tier-based fallbacks (up to 3 retries)
  4. Emit `fallback_used` SSE event to notify frontend
- **Tested Scenario**: Google Gemini 429 quota error → fell back to Groq → debate completed
- **Related Files**:
  - `lib/models/model-fallback.ts` - Core fallback service (313 lines)
  - `app/api/agents/debate-stream/route.ts` - Integration point (lines 550-620)
  - `lib/models/model-registry.ts` - Model metadata for tier detection
- **Last Modified**: December 2025 (Initial implementation)
- **DO NOT**: Remove fallback logic, reduce retry attempts below 3, or remove empty response detection

### 39. Multi-Broker Support & IBKR Authentication
- **Status**: ✅ ACTIVE & COMPLETE (December 2025)
- **Location**:
  - `components/trading/broker-status-badge.tsx` - IBKRAuthButton component (simple auth button)
  - `app/api/trading/broker/ibkr-status/route.ts` - IBKR Gateway status API
  - `app/api/trading/broker/switch/route.ts` - Broker switching API with cookie persistence
  - `app/api/trading/portfolio/route.ts` - Portfolio API with cookie-based broker detection
  - `app/trading/page.tsx` - Trading page with seamless broker refresh
  - `lib/brokers/ibkr-broker.ts` - IBKR broker implementation
  - `lib/brokers/broker-factory.ts` - Multi-broker factory pattern
- **Purpose**: Enable switching between Alpaca (paper trading) and Interactive Brokers (live trading) with proper authentication flow
- **Key Features**:
  - **Simple IBKR Auth Button** (December 2025 - Simplified):
    - Shows Gateway status: Running/Offline, Authenticated/Not Authenticated
    - CONNECTED/DISCONNECTED badge
    - "Active: IBKR (Live)" or "Active: Alpaca (Paper)" indicator
    - "Login to IBKR Gateway" button (opens Gateway URL)
    - "Use Alpaca Paper" / "Use IBKR Live" toggle buttons
    - Auto-polls every 15 seconds for auth changes
    - Hidden on production (IBKR Gateway only works locally)
  - **Auto-Switch on Authentication** (December 2025):
    - When IBKR Gateway becomes authenticated, auto-switches broker
    - Calls `/api/trading/broker/switch` to set cookie
    - Portfolio data automatically loads from IBKR
  - **Ref-Based Callback Pattern** (December 2025 - Critical):
    - Uses `useRef` for `onAuthChange` callback to prevent infinite render loops
    - Inline arrow function props cause dependency chain issues
    - Only notifies parent on actual broker switch, not every poll
  - **Cookie-Based State Persistence** (December 2025):
    - Broker selection stored in HTTP cookie (`active_broker`)
    - Survives serverless function cold starts
    - 30-day expiration, httpOnly, secure in production
  - **Seamless UI Updates** (December 2025):
    - `brokerRefreshKey` state in trading page
    - React `key` prop forces component remount on broker change
    - Portfolio, status badge auto-refresh without manual reload
  - **API Endpoints**:
    - `GET /api/trading/broker/ibkr-status` - Check IBKR Gateway auth status
    - `POST /api/trading/broker/switch` - Switch active broker (sets cookie)
    - `GET /api/trading/broker/switch` - Get current broker info
  - **Visual Indicators**:
    - Green badge for Paper trading mode (Alpaca)
    - Orange badge for Live trading mode (IBKR)
    - Connection status icons (Gateway Running/Offline, Authenticated/Not)
- **IBKR Client Portal Gateway Requirements**:
  1. Download Client Portal Gateway from IBKR
  2. Run Gateway: `./bin/run.sh root/conf.yaml`
  3. Authenticate at https://localhost:5050
  4. Set `IBKR_GATEWAY_URL=https://localhost:5050/v1/api` in .env.local
- **Environment Variables**:
  ```
  # Alpaca (default on production)
  ALPACA_API_KEY=<your_key>
  ALPACA_SECRET_KEY=<your_secret>

  # IBKR (default on local - live trading)
  IBKR_GATEWAY_URL=https://localhost:5050/v1/api
  IBKR_ACCOUNT_ID=<optional_account_id>
  ```
- **Test Script**: `scripts/test-ibkr-connection.ts` - Validates Gateway connection
- **Playwright Tested**: Simple auth button, auto-switch, broker toggle verified working
- **Last Modified**: December 11, 2025 (Complete rebuild - fixed phone 2FA auto-reauthenticate)
- **PRODUCTION vs LOCAL** (Environment-Based Defaults):
  ```
  🌐 PRODUCTION (Vercel):
  - DEFAULT BROKER: Alpaca (paper trading)
  - IBKR option is HIDDEN (not available)
  - Reason: IBKR Gateway runs on localhost, Vercel can't access it

  💻 LOCAL DEVELOPMENT:
  - DEFAULT BROKER: IBKR (live trading)
  - Both Alpaca and IBKR available
  - IBKR requires Gateway running on localhost:5050
  - Switching to Alpaca opens Gateway URL if not authenticated
  ```
- **User-Configurable Gateway** (December 10, 2025):
  - Gateway URL saved to localStorage (`ibkr_gateway_url`)
  - Default: `https://localhost:5050`
  - Enables each user to connect their own local Gateway
- **CRITICAL IMPLEMENTATION NOTES**:
  ```
  ⚠️ IBKR Gateway has THREE critical requirements:

  1. SELF-SIGNED SSL CERTIFICATES
     - Must use Node.js built-in 'https' module, NOT fetch()/undici
     - Set rejectUnauthorized: false in https.request options
     - Native fetch() doesn't support this option

  2. USER-AGENT HEADER REQUIRED
     - Gateway returns 403 "Access Denied" without User-Agent
     - Must include: 'User-Agent': 'Mozilla/5.0 VerdictAI/1.0'
     - Empty User-Agent = instant rejection

  3. IPv4 ONLY (127.0.0.1, not ::1)
     - Gateway IP whitelist typically only allows 127.0.0.1
     - Convert 'localhost' to '127.0.0.1' to avoid IPv6 resolution
     - Node.js may prefer IPv6 (::1) which gets rejected

  DO NOT change to fetch() or remove User-Agent header!
  ```
- **December 11, 2025 Phone 2FA Fix** (Complete Rebuild):
  ```
  ROOT CAUSE: Two duplicate APIs existed - frontend used broken one
  - OLD: /api/trading/ibkr-auth (fetch() - can't handle self-signed SSL)
  - NEW: /api/trading/broker/ibkr-status (https module - worked but unused)

  SOLUTION: Deleted duplicate, rebuilt single clean API
  - Deleted: /api/trading/broker/ibkr-status/
  - Rewrote: /api/trading/ibkr-auth/route.ts with:
    • Node.js https module (rejectUnauthorized: false)
    • Auto-reauthenticate when competing=true (phone 2FA)
    • POST method for /iserver/auth/status per IBKR API
    • Force IPv4 (127.0.0.1) - Gateway blocks IPv6
  - Simplified: IBKRAuthButton with clean 10-second polling

  KEY INSIGHT: After phone 2FA, IBKR returns competing=true.
  Must call /iserver/reauthenticate to complete the handshake.
  ```
- **DO NOT**: Remove broker selector, bypass Gateway authentication for IBKR, change ibkr-auth to use fetch(), allow live trading without explicit user consent

### 40. Model Power/Cost Display System
- **Status**: ✅ ACTIVE & COMPLETE (December 2025)
- **Location**:
  - `lib/models/model-registry.ts` - Helper functions (getModelGrade, getModelCostTier, getSelectableModels)
  - `lib/model-metadata.ts` - Benchmark data, pricing, rank-based weights (MODEL_POWER)
  - `components/shared/model-badge.tsx` - Shared ModelBadge and ModelDropdownItem components
  - `components/consensus/ultra-model-badge-selector.tsx` - Multi-select badges with power/cost
  - `components/trading/single-model-badge-selector.tsx` - Single-select dropdown with power/cost
- **Purpose**: Display model power (benchmark-based weight) and cost tier next to each model for informed selection
- **Key Features**:
  - **Power Grade Display**: Hybrid letter grade + numeric weight (e.g., `A+(0.98)`, `B(0.74)`)
    - A+ (0.95-1.0): Top 5% - Best models
    - A (0.85-0.94): Top 15%
    - B+ (0.75-0.84): Top 30%
    - B (0.65-0.74): Top 50%
    - C+ (0.55-0.64): Top 70%
    - C (0.50-0.54): Bottom 30%
  - **Cost Tier Badges**: Visual indicators with color coding
    - FREE (green): $0 per 1K tokens
    - $ (blue): Budget tier (<$0.005/1K)
    - $$ (amber): Balanced tier (<$0.02/1K)
    - $$$ (rose): Premium tier (>$0.02/1K)
  - **Consistent UI**: Both selectors (multi-select and single-select) use same styling
  - **Dropdown Items**: Show power grade and cost tier for each model option
  - **Provider Grouping**: Models grouped by provider in dropdowns (Anthropic, OpenAI, Google, etc.)
- **Rank-Based Weight System**:
  - Weights derived from MODEL_BENCHMARKS (AAII score + MMLU + Arena tier)
  - Formula: `weight = 1.0 - ((rank-1)/(maxRank-1)) * 0.5`
  - Dynamic calculation via Proxy (MODEL_POWER)
  - Used by judge system for weighted consensus decisions
- **Helper Functions Added**:
  - `getModelGrade(modelId)` - Returns { grade, weight, display }
  - `getModelCostTier(modelId)` - Returns 'FREE' | '$' | '$$' | '$$$'
  - `getModelDisplayMetadata(modelId)` - Full metadata for display
  - `getSelectableModels()` - Returns only working, non-legacy models
  - `getSelectableModelsByProvider()` - Grouped by provider
  - `isModelSelectable(modelId)` - Check if model can be selected
- **UI Components**:
  - `ModelBadge` - Shared badge component with power/cost display
  - `ModelDropdownItem` - Dropdown item with power/cost for menus
- **Files Modified**:
  - `lib/models/model-registry.ts` - Added 6 helper functions + types
  - `components/shared/model-badge.tsx` - NEW: Shared badge components
  - `components/consensus/ultra-model-badge-selector.tsx` - Refactored to show power/cost
  - `components/trading/single-model-badge-selector.tsx` - Refactored to show power/cost
- **Browser Tested**: All 3 trading modes (Consensus, Debate, Individual) validated
- **Last Modified**: December 9, 2025 (Initial implementation)
- **DO NOT**: Remove power/cost display from selectors, create duplicate model lists, bypass single source of truth

### 41. Model Registry & Metadata Completeness
- **Status**: ✅ ACTIVE & COMPLETE (December 2025)
- **Location**:
  - `lib/model-metadata.ts` - Complete cost/benchmark data for all models
  - `lib/models/model-registry.ts` - Model status and availability
  - `components/consensus/ultra-model-badge-selector.tsx` - Sorted model display
  - `components/trading/single-model-badge-selector.tsx` - Sorted model display
- **Purpose**: Ensure all models have proper cost/benchmark data and are sorted by power
- **Key Features**:
  - **Complete xAI Grok Costs**: All Grok models now have pricing data (no false "FREE" display)
    - `grok-4-1-fast-reasoning`, `grok-3-beta`, `grok-3-mini-beta`, `grok-2-image-1212` added
  - **Complete Grok Benchmarks**: All Grok models have AAII/MMLU scores for proper ranking
  - **Expanded Google Models**: 5 Gemini models now available (was 3)
    - `gemini-2.5-pro` status changed from `rate_limited` to `working`
    - `gemini-2.0-flash-lite` status changed from `rate_limited` to `working`
    - `gemini-2.5-flash-lite` benchmark data added
  - **Power-Sorted Dropdowns**: Models in all dropdowns sorted by power weight (highest first)
- **Files Modified**:
  - `lib/model-metadata.ts` - Added 4 Grok cost entries, 4 Grok benchmarks, 1 Gemini benchmark
  - `lib/models/model-registry.ts` - Updated 2 Gemini models from rate_limited to working
  - `components/consensus/ultra-model-badge-selector.tsx` - Sort by power weight
  - `components/trading/single-model-badge-selector.tsx` - Sort by power weight
- **Browser Tested**: Verified Grok models no longer show "FREE", models sorted by power
- **Last Modified**: December 9, 2025 (Fixed Grok cost display + power sorting)
- **DO NOT**: Remove model costs from metadata, change sorting logic without reason

### 42. Model Registry Consistency & New Flagship Models
- **Status**: ✅ ACTIVE & COMPLETE (December 2025)
- **Location**:
  - `lib/models/model-registry.ts` - Single source of truth for all models
  - `lib/model-metadata.ts` - Costs and benchmarks
  - `components/agents/agent-selector.tsx` - Agent debate model selector
- **Purpose**: Ensure all model selectors use MODEL_REGISTRY as single source of truth + add newest flagship models
- **Key Features**:
  - **NEW Claude 4.5 Opus** (`claude-opus-4-5-20251124`): Released Nov 24, 2025, 80.9% SWE-bench, $5/$25 per M tokens
  - **Gemini 3 Pro** (`gemini-3-pro-preview`): Status changed to `working`, #1 on LMArena
  - **NEW Gemini 3 Pro Image** (`gemini-3-pro-image-preview`): Image generation with reasoning
  - **Agent Selector Rewrite**: Removed 44 hardcoded model names, now uses `getModelInfo()` from registry
  - **Preset Models Fixed**: Max preset now uses working models (Gemini 3 Pro, Claude 4.5 Opus, GPT-5, Grok 4.1)
  - **Power/Cost Badges**: Agent selector now shows power grades and cost tiers like other selectors
- **Files Modified**:
  - `lib/models/model-registry.ts` - Added 3 new models (Opus 4.5, Gemini 3 Pro, Gemini 3 Image)
  - `lib/model-metadata.ts` - Added costs/benchmarks for new models
  - `components/agents/agent-selector.tsx` - Full rewrite to use MODEL_REGISTRY
- **Problem Solved**:
  - Agent debate was failing due to presets using untested models (`gpt-5.1`)
  - Model selectors showed different models in different places
  - Claude 4.5 Opus and Gemini 3 Pro were missing from registry
- **Browser Tested**: Agent debate mode, model dropdowns show power/cost badges
- **Last Modified**: December 9, 2025 (Registry consistency + new models)
- **DO NOT**: Add hardcoded model lists to components, use presets with untested models

### 43. Trading Data Taxonomy & Deterministic Scoring Engine
- **Status**: ✅ ACTIVE & COMPLETE (December 2025)
- **Location**:
  - `lib/data-providers/types.ts` - FundamentalData interface (25+ fields)
  - `lib/data-providers/yahoo-finance-provider.ts` - Fundamental data fetching
  - `lib/trading/scoring-engine.ts` - Deterministic signal scoring
  - `lib/alpaca/data-coordinator.ts` - Shared data with fundamentals
  - `docs/architecture/TRADING_DATA_TAXONOMY.md` - Complete documentation
- **Purpose**: Add comprehensive fundamental data + deterministic scoring for trading decisions
- **Key Features**:
  - **Fundamental Data (FREE via Yahoo Finance)**:
    - P/E Ratio (trailing & forward)
    - EPS (earnings per share)
    - Market Cap, Beta, Dividend Yield
    - Analyst Target Price & Recommendation
    - Earnings Date, 52-week performance
  - **Deterministic Scoring Engine**:
    - Technical scoring (RSI, MACD, MAs, Bollinger, S/R)
    - Fundamental scoring (P/E, EPS, Analyst targets)
    - Trend scoring (Direction, Strength)
    - Sentiment scoring (News keyword analysis)
    - Timeframe-adjusted weights (Day/Swing/Position/Long-term)
    - Input hash for reproducibility audit
  - **Academic Foundation**:
    - Hybrid ML-LLM optimal weight: 0.40-0.45 (PMC 2025)
    - Multi-agent debate: 13.2% improvement (ACL 2025)
- **Problem Solved**:
  - Trading prompts referenced P/E, EPS but system didn't fetch them
  - AI decisions were not reproducible (same inputs, different outputs)
  - No formal weighting system for combining signals
- **Files Created/Modified**:
  - `lib/data-providers/types.ts` - Added FundamentalData, FundamentalSignal interfaces
  - `lib/data-providers/yahoo-finance-provider.ts` - Added fetchFundamentals method
  - `lib/trading/scoring-engine.ts` - NEW: Complete scoring system (500+ lines)
  - `lib/alpaca/data-coordinator.ts` - Updated format functions with fundamentals
  - `lib/alpaca/enhanced-prompts.ts` - Updated fundamental analysis guidance
- **Build Tested**: ✅ TypeScript compiles, Next.js build succeeds
- **Last Modified**: December 11, 2025
- **DO NOT**: Remove fundamental data fetching, change scoring weights without user approval

### 44. Scoring Engine Integration & Low Temperature Trading
- **Status**: ✅ ACTIVE & COMPLETE (December 11, 2025)
- **Location**:
  - `app/api/trading/consensus/route.ts` - Consensus mode integration
  - `app/api/trading/individual/route.ts` - Individual mode integration
  - `app/api/trading/debate/route.ts` - Debate mode integration
  - `lib/trading/scoring-engine.ts` - Core deterministic scoring
- **Purpose**: Integrate deterministic scoring into ALL trading routes + reduce LLM randomness for consistent decisions
- **Key Features**:
  - **Deterministic Score Pre-Calculation**: Score calculated BEFORE AI analysis
  - **Score in Prompt**: AI models receive score to explain/validate (not override)
  - **Low Temperature (0.2)**: All trading decisions use temperature 0.2 (was 0.7)
  - **Score in API Response**: Full score breakdown returned to frontend
  - **Input Hash**: For audit trail and reproducibility verification
- **Implementation Pattern**:
  ```typescript
  // Step 2.5: CALCULATE DETERMINISTIC SCORE (before AI analysis)
  const sharedData = await fetchSharedTradingData(targetSymbol);
  const deterministicScore = calculateTradingScore(sharedData, timeframe);
  // Score added to prompt, AI explains WHY score recommends this action
  ```
- **Temperature Changes**:
  - Consensus: 1 change (provider.query temperature)
  - Individual: 1 change (provider.query temperature)
  - Debate: 7 changes (Round 1: Analyst, Critic, Synthesizer + Round 2: all three + setup)
- **API Response Structure**:
  ```typescript
  deterministicScore: {
    recommendation: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL',
    weightedScore: number,     // -1 to +1
    confidence: number,        // 0 to 1
    inputHash: string,         // For audit trail
    technical: number,         // -1 to +1
    fundamental: number,       // -1 to +1
    sentiment: number,         // -1 to +1
    trend: number,             // -1 to +1
    bullishFactors: string[],
    bearishFactors: string[],
    suggestedStopLoss: number,
    suggestedTakeProfit: number,
    riskRewardRatio: string
  }
  ```
- **Files Modified**:
  - `app/api/trading/consensus/route.ts` - imports, score calc, prompt, temp 0.2, response
  - `app/api/trading/individual/route.ts` - imports, score calc, prompt, temp 0.2, response
  - `app/api/trading/debate/route.ts` - imports, score calc, prompt, temp 0.2 (7 locations)
- **TypeScript**: 0 errors after changes
- **Last Modified**: December 11, 2025
- **DO NOT**: Remove deterministic scoring, increase temperature above 0.3 for trading, remove score from response

### 45. Advanced Math Methods - Kelly Criterion & Risk Metrics
- **Status**: ✅ ACTIVE & COMPLETE (December 11, 2025)
- **Location**:
  - `lib/trading/position-sizing.ts` - Kelly Criterion and position sizing methods
  - `lib/trading/risk-metrics.ts` - ATR, Std Dev, VaR, Sharpe, Sortino, Max Drawdown
- **Purpose**: Professional position sizing and risk measurement for trading system
- **Key Features**:
  - **Position Sizing Methods** (`position-sizing.ts`):
    - `kellyPositionSize()` - Kelly Criterion: f* = (p * b - q) / b
    - `halfKelly()` - Safer 50% Kelly for reduced volatility
    - `quarterKelly()` - Conservative 25% Kelly
    - `fixedFractionalSize()` - Fixed percentage of portfolio
    - `volatilityAdjustedSize()` - Size based on ATR
    - `calculateOptimalPosition()` - Combined method with multiple strategies
  - **Risk Metrics** (`risk-metrics.ts`):
    - `calculateATR()` - Average True Range (volatility)
    - `atrStopLoss()` - Stop-loss based on ATR × multiplier
    - `atrTakeProfit()` - Take-profit based on ATR × multiplier
    - `standardDeviation()` - Price volatility measurement
    - `valueAtRisk()` - VaR at 95% confidence
    - `maxDrawdown()` - Maximum peak-to-trough decline
    - `sharpeRatio()` - Risk-adjusted return
    - `sortinoRatio()` - Downside risk-adjusted return
    - `calculateRiskRewardRatio()` - Entry/Stop/Target ratio
    - `calculateRiskMetrics()` - Complete analysis bundle
- **Kelly Criterion Formula**:
  ```typescript
  // f* = (p * b - q) / b
  // p = win probability, b = win/loss ratio, q = 1-p
  function kellyPositionSize(winRate: number, avgWin: number, avgLoss: number) {
    const b = avgWin / avgLoss;
    const kelly = (winRate * b - (1 - winRate)) / b;
    return Math.max(0, Math.min(0.25, kelly)); // Cap at 25%
  }
  ```
- **ATR Stop-Loss Calculation**:
  ```typescript
  // Stop = Entry - (ATR × multiplier)
  function atrStopLoss(entryPrice: number, atr: number, multiplier = 2) {
    return entryPrice - (atr * multiplier);
  }
  ```
- **Timeframe-Adjusted Parameters**:
  - Day Trading: 1.0× ATR multiplier, risk 0.5-1%
  - Swing Trading: 2.0× ATR multiplier, risk 1-2%
  - Position Trading: 3.0× ATR multiplier, risk 2-3%
  - Long-term: 4.0× ATR multiplier, risk 3-5%
- **Files Created**:
  - `lib/trading/position-sizing.ts` - Complete position sizing module
  - `lib/trading/risk-metrics.ts` - Complete risk metrics module
- **TypeScript**: 0 errors, fully typed interfaces
- **Last Modified**: December 11, 2025
- **DO NOT**: Remove Kelly Criterion capping (25% max), change ATR multiplier defaults without data

### 46. Research Progress UI Components
- **Status**: ✅ ACTIVE & COMPLETE (December 11, 2025)
- **Location**:
  - `components/trading/research-progress.tsx` - Research pipeline visualization
  - `components/trading/deterministic-score-card.tsx` - Score visualization card
- **Purpose**: Visual display of research agents, tools used, and deterministic score during trading analysis
- **Key Features**:
  - **Research Progress Component** (`research-progress.tsx`):
    - Expandable pipeline view showing all 4 research agents
    - Per-agent cards: Technical, Fundamental, Sentiment, Risk
    - Tool count badges per agent
    - Status indicators: pending (gray), active (blue spinner), complete (green), error (red)
    - Expandable details showing tool names used
    - Duration tracking per agent
    - Summary stats: total tools used, research duration
    - Compact variant for inline display
    - Custom hook `useResearchProgress()` for real-time updates
  - **Deterministic Score Card** (`deterministic-score-card.tsx`):
    - Color-coded recommendation badges (STRONG_BUY green to STRONG_SELL red)
    - Weighted score display with +/- percentage
    - Confidence percentage
    - Risk:Reward ratio
    - Category breakdown with score bars (Technical, Fundamental, Sentiment, Trend)
    - Expandable bullish/bearish factors list
    - Stop-loss and take-profit levels
    - Input hash for audit trail
    - Compact variant for inline display
- **Component Exports**:
  ```typescript
  // Research Progress
  export { ResearchProgress, ResearchProgressCompact, useResearchProgress }
  export type { ResearchProgressData, ResearchAgentProgress }

  // Score Card
  export { DeterministicScoreCard, DeterministicScoreCompact }
  export type { DeterministicScoreData }
  ```
- **Design Principles**:
  - Modular & reusable components
  - Expandable/collapsible for space efficiency
  - Color-coded status indicators
  - Professional trading UI patterns
  - TypeScript interfaces for type safety
- **Files Created**:
  - `components/trading/research-progress.tsx` (~426 lines)
  - `components/trading/deterministic-score-card.tsx` (~422 lines)
- **TypeScript**: 0 errors, full type exports
- **Last Modified**: December 11, 2025
- **DO NOT**: Remove expandable functionality, change status color scheme, remove compact variants

### 47. LLM Seed Parameter for Reproducibility
- **Status**: ✅ ACTIVE & COMPLETE (December 11, 2025)
- **Location**:
  - `lib/trading/scoring-engine.ts` - `hashToSeed()` and `generateTradingSeed()` utilities
  - `lib/ai-providers/openai.ts` - Seed parameter passed via `experimental_providerMetadata`
  - `lib/ai-providers/google.ts` - Seed logging (limited support)
  - `types/consensus.ts` - `seed?: number` added to ModelConfig interface
  - `app/api/trading/consensus/route.ts` - Seed from deterministic score
  - `app/api/trading/individual/route.ts` - Seed from deterministic score
  - `app/api/trading/debate/route.ts` - Seed from deterministic score (6 calls)
- **Purpose**: Enable reproducible AI outputs for trading decisions using seed parameter
- **Key Features**:
  - **Hash to Seed Conversion**: `hashToSeed()` converts inputHash (hex) to numeric seed
  - **OpenAI Support**: Uses `experimental_providerMetadata: { openai: { seed } }` in Vercel AI SDK
  - **Deterministic Flow**: Score inputHash → seed → passed to all AI provider calls
  - **Trading Routes**: All 3 routes (consensus, individual, debate) pass seed to providers
  - **Google Logging**: Logs seed value (Gemini has limited seed support)
- **Implementation Details**:
  ```typescript
  // Seed generation from input hash
  export function hashToSeed(inputHash: string): number {
    const seed = parseInt(inputHash, 16);
    return Math.abs(seed) % Number.MAX_SAFE_INTEGER;
  }

  // Usage in trading routes
  const seed = deterministicScore ? hashToSeed(deterministicScore.inputHash) : undefined;
  const result = await provider.query(prompt, { ...config, seed });
  ```
- **OpenAI Documentation Quote**: "If specified, our system will make a best effort to sample deterministically, such that repeated requests with the same seed and parameters should return the same result."
- **Provider Support**:
  - OpenAI: ✅ Full support (GPT models)
  - Google Gemini: ⚠️ Limited support (logged but not enforced)
  - Anthropic Claude: ❌ Not supported (no seed parameter)
  - Groq/Llama: ❌ Not supported
- **Combined with Low Temperature**: seed + temperature=0.2 for maximum reproducibility
- **Files Modified**:
  - `lib/trading/scoring-engine.ts` - Added `hashToSeed()`, `generateTradingSeed()`
  - `types/consensus.ts` - Added `seed?: number` to ModelConfig
  - `lib/ai-providers/openai.ts` - Added seed via `experimental_providerMetadata`
  - All 3 trading routes - Added seed generation and passing
- **TypeScript**: 0 errors after changes
- **Last Modified**: December 11, 2025
- **DO NOT**: Remove seed parameter support, change hash-to-seed algorithm without testing

### 48. Trading Audit Trail Logging System
- **Status**: ✅ ACTIVE & COMPLETE (December 11, 2025)
- **Location**: `lib/trading/audit-logger.ts`
- **Purpose**: Log all trading decisions for reproducibility verification and compliance
- **Key Features**:
  - **Immutable Audit Records**: Complete decision context capture with timestamps
  - **Verification Hash**: Tamper detection via hash of entire record
  - **Input Hash Tracking**: Same inputs = same hash for reproducibility verification
  - **Query Interface**: Filter by symbol, timeframe, mode, date range
  - **Export Capabilities**: JSON and CSV export for compliance reporting
  - **Statistics**: Decision distribution, confidence metrics, date ranges
  - **localStorage Persistence**: Client-side storage (expandable to database)
- **AuditRecord Interface**:
  ```typescript
  interface AuditRecord {
    id: string;
    timestamp: string;
    inputHash: string;           // From scoring engine
    symbol: string;
    timeframe: 'day' | 'swing' | 'position' | 'longterm';
    mode: 'consensus' | 'individual' | 'debate';
    marketData: { price, rsi, macd, trend };
    deterministicScore: { recommendation, weightedScore, confidence, ... };
    aiDecision: { action, confidence, reasoning, models[], temperature, seed };
    riskParameters: { suggestedStopLoss, suggestedTakeProfit, riskRewardRatio };
    researchMetadata?: { totalToolCalls, researchDuration, agentRoles };
    execution?: { executed, orderId, executedPrice, slippage };
    verificationHash: string;    // Tamper detection
  }
  ```
- **API Methods**:
  - `auditLogger.log(record)` - Log a trading decision
  - `auditLogger.query(params)` - Query records with filters
  - `auditLogger.getById(id)` - Get specific record
  - `auditLogger.getByInputHash(hash)` - Find records by input hash
  - `auditLogger.verifyRecord(record)` - Verify tamper detection hash
  - `auditLogger.getStats()` - Get audit statistics
  - `auditLogger.exportJSON()` / `auditLogger.exportCSV()` - Export data
- **Helper Functions**:
  - `createAuditRecord()` - Create record from trading route data
  - `checkReproducibility()` - Verify same inputs produce same outputs
- **Storage**: localStorage with MAX_RECORDS=1000 limit
- **TypeScript**: 0 errors, full type exports
- **Last Modified**: December 11, 2025
- **DO NOT**: Remove verification hash, reduce MAX_RECORDS below 500, delete records without logging

### 49. Portfolio Auto-Refresh System
- **Status**: ✅ ACTIVE & IMPLEMENTED
- **Location**: `components/trading/portfolio-display.tsx`
- **Purpose**: Automatically refresh portfolio data every 30 seconds to show current stock prices
- **Key Features**:
  - **30-second polling interval**: Fetches fresh data from broker API every 30 seconds
  - **"Updated X ago" timestamp**: Shows data freshness next to Refresh button with Clock icon
  - **Tab visibility handling**: Pauses polling when browser tab is hidden, resumes when visible
  - **Immediate refresh on tab focus**: When user returns to tab, immediately fetches fresh data
  - **Non-blocking background refresh**: No loading spinner during auto-refresh (only manual refresh shows spinner)
  - **Memory leak prevention**: Properly cleans up interval and event listeners on unmount
- **Implementation Details**:
  - `PORTFOLIO_REFRESH_INTERVAL = 30000` (30 seconds)
  - Uses `useRef` for interval tracking
  - Uses `document.visibilitychange` event for tab handling
  - `formatTimeAgo()` helper for "just now", "Xs ago", "Xm ago" display
- **Dependencies**:
  - `/api/trading/portfolio` endpoint (Alpaca or IBKR)
  - `lucide-react` Clock icon
- **TypeScript**: 0 errors
- **Last Modified**: December 11, 2025
- **DO NOT**: Remove auto-refresh, reduce interval below 15 seconds (API rate limits), remove visibility handling

### 50. Model Health Check / Tester
- **Status**: ✅ ACTIVE & IMPLEMENTED
- **Location**:
  - API: `app/api/trading/test-model/route.ts`
  - UI: `components/trading/model-tester.tsx`
- **Purpose**: Test individual AI models before running full consensus to catch JSON/API errors early
- **Key Features**:
  - **Single model test**: Select any model from dropdown, test with simple trading prompt
  - **Test all models**: Batch test all configured models, see pass/fail summary
  - **Error diagnosis**: Shows raw response, cleaned JSON, error messages for debugging
  - **Response time tracking**: Shows latency for each model
  - **Token usage**: Displays prompt/completion/total tokens used
- **Test Prompt**: Simple AAPL analysis with JSON output format requirement
- **Architecture**: Uses SAME provider infrastructure as consensus mode (no duplicate code)
- **UI Features**:
  - Green checkmark for passed models
  - Red X for failed models
  - Expandable raw response view
  - Failed models list summary
- **TypeScript**: 0 errors
- **Last Modified**: December 11, 2025
- **DO NOT**: Change test prompt format (models are trained on it), remove error details from response

### 51. Real-Time Research Progress Visibility (SSE Streaming)
- **Status**: ✅ ACTIVE & IMPLEMENTED
- **Location**:
  - UI Panel: `components/trading/research-progress-panel.tsx`
  - SSE Endpoint: `app/api/trading/consensus/stream/route.ts`
  - Integration: `components/trading/consensus-mode.tsx`
  - Types: `types/research-progress.ts`
- **Purpose**: Show real-time visibility into which tools/research is being conducted during trading analysis
- **Key Features**:
  - **3-Phase Progress Display**: Shows Phase 1 (Research Agents), Phase 2 (Decision Models), Phase 3 (Judge Consensus)
  - **4 Research Agent Cards**: Technical Analyst, Fundamental Analyst, Sentiment Analyst, Risk Manager
  - **Real-Time Tool Calls**: Shows tool call counts updating as agents work
  - **Agent Status Indicators**: pending → running → complete with duration and token usage
  - **Decision Model Results**: Shows BUY/SELL/HOLD with confidence % for each model
  - **Judge Consensus Phase**: Shows final weighted consensus being calculated
  - **Always Visible**: Panel shows automatically during analysis (no expand/collapse needed)
- **SSE Event Types**:
  - `phase_start` - New phase begins (1, 2, or 3)
  - `agent_start` / `agent_complete` - Research agent lifecycle
  - `tool_call` - Individual tool invocation
  - `decision_start` / `decision_complete` - Model decision lifecycle
  - `judge_start` / `judge_complete` - Judge consensus lifecycle
  - `final_result` - Complete analysis results
- **Implementation Details**:
  - Uses `useRef<ResearchProgressPanelHandle>` for event forwarding
  - `processEvent()` method exposed via `useImperativeHandle`
  - SSE parsing with `ReadableStream` reader and buffer handling
  - `isStreaming` state controls panel visibility
- **Architecture**:
  - Replaces POST to `/api/trading/consensus` with POST to `/api/trading/consensus/stream`
  - Real-time updates via Server-Sent Events (SSE)
  - Final results populate consensus/decisions/research state
- **Dependencies**:
  - `ResearchProgressPanel` component (513 lines)
  - `ResearchActivityPanel` shows after completion (summary view)
- **TypeScript**: 0 errors
- **Last Modified**: December 11, 2025
- **DO NOT**: Remove SSE streaming, hide progress panel during analysis, change event types without updating panel

### 52. CLI Subscription Providers (Sub Pro/Max Tiers)
- **Status**: ✅ ACTIVE & IMPLEMENTED
- **Location**:
  - Claude CLI: `lib/ai-providers/cli/claude-cli.ts`
  - Codex CLI: `lib/ai-providers/cli/codex-cli.ts`
  - Google CLI: `lib/ai-providers/cli/google-cli.ts`
  - Index: `lib/ai-providers/cli/index.ts`
  - Integration: `app/api/trading/consensus/stream/route.ts`
- **Purpose**: Use user's existing AI subscriptions (Claude Pro/Max, ChatGPT Plus/Pro, Gemini Advanced) instead of API keys for Sub Pro/Max tiers
- **Key Features**:
  - **Claude Code CLI**: Shells out to `npx @anthropic-ai/claude-code -p` with stdin for prompts
  - **OpenAI Codex CLI**: Shells out to `/opt/homebrew/bin/codex exec` with stdin for prompts
  - **Google Gemini CLI**: Shells out to `/opt/homebrew/bin/gemini -o json --approval-mode yolo` with stdin
  - **stdin-based prompts**: Complex trading prompts sent via stdin to avoid shell escaping issues
  - **JSONL parsing**: Robust JSON extraction handles multi-JSON lines and JSON+text combos
  - **NO API FALLBACK**: Sub tiers use ONLY subscription - errors if CLI fails (user explicitly requested)
- **Architecture Decision (IMPORTANT)**:
  - **Research Phase** = API providers (needs tool calling for 30-40 research tools)
  - **Decision Phase** = CLI providers (subscription-based, no tools needed)
  - CLI providers DON'T support custom tools (get_stock_quote, calculate_rsi, etc.)
  - Built-in CLI tools (WebFetch, Read, Grep) work but custom trading tools don't
- **Authentication**:
  - Claude: Requires `claude` CLI authenticated (macOS Keychain)
  - Codex: Requires `codex` CLI authenticated (~/.codex/auth.json)
  - Gemini: Requires `gemini` CLI authenticated (~/.gemini/settings.json with oauth-personal)
- **Tier Routing**:
  - `sub-pro` tier → Uses CLI providers for decision models
  - `sub-max` tier → Uses CLI providers for decision models
  - Other tiers → Uses standard API key providers
- **Error Handling**:
  - CLI errors → Show clear error message (NO API fallback for sub tiers!)
  - Codex JSON parse error → Robust bracket-counting JSON extraction
  - CLI timeout → 2-3 minute timeout for complex prompts
- **TypeScript**: 0 errors
- **Last Modified**: December 12, 2025
- **DO NOT**: Remove stdin-based prompt handling (breaks on complex prompts), bypass CLI for sub tiers, change research to use CLI (needs tools)

### 53. SEC EDGAR Integration for Obscure Stocks
- **Status**: ✅ ACTIVE & CRITICAL - Data coverage for ALL US public companies
- **Location**:
  - `lib/data-providers/sec-edgar/` - SEC EDGAR module (types, cik-mapper, xbrl-parser, provider)
  - `lib/data-providers/sparse-data-detector.ts` - Detect when Yahoo data is insufficient
  - `lib/data-providers/data-enhancer.ts` - Merge Yahoo + SEC data
  - `lib/alpaca/sec-edgar-tools.ts` - 3 new research tools
  - `lib/alpaca/enhanced-prompts.ts` - SEC tools added to prompts (lines 146-164, 741-761, 872-885)
- **Purpose**: Provide fundamental data for obscure stocks (biotech, small-cap) where Yahoo Finance has sparse data
- **Key Components**:
  - **CIK Mapper** (`cik-mapper.ts`): Maps ticker symbols to SEC CIK numbers (10,200+ tickers cached 24h)
  - **XBRL Parser** (`xbrl-parser.ts`): Parses SEC Company Facts API for structured financial data
  - **SEC EDGAR Provider** (`sec-edgar-provider.ts`): Fetches 10-K/10-Q data from SEC (FREE, no API key)
  - **Sparse Data Detector**: Scores Yahoo data completeness (0-100%), triggers fallback at <80%
  - **Data Enhancer**: Merges Yahoo prices with SEC fundamentals for complete data
  - **Research Agent Tools**: `get_10k_data`, `get_company_filings`, `get_rnd_spending`
- **API Endpoints** (100% FREE, no auth required):
  - Company Facts: `https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json`
  - Submissions: `https://data.sec.gov/submissions/CIK{cik}.json`
  - Ticker Map: `https://www.sec.gov/files/company_tickers.json`
- **Rate Limit**: 10 requests/second (SEC fair use policy)
- **User-Agent Required**: `AICouncil/1.0 (contact@aicouncil.app)`
- **Example RLMD Data** (obscure biotech):
  - Revenue: $13,070 (pre-revenue biotech)
  - Net Income: -$79.98M
  - R&D Spending: $46.18M (high - typical biotech)
  - EPS: -2.65
- **Problem Solved**: Models like Sonnet/GPT were saying "Unable to evaluate RLMD" because:
  1. Yahoo Finance had sparse data (15% completeness)
  2. SEC EDGAR tools weren't listed in research prompts
  3. Now prompts include SEC tools → Models use them → Real data for ALL US companies
- **TypeScript**: 0 errors
- **Last Modified**: December 12, 2025
- **DO NOT**: Remove SEC tools from prompts, disable sparse data detection, remove User-Agent header (SEC requirement)

### 54. Research Findings Pipeline Fix
- **Status**: ✅ ACTIVE & CRITICAL - Research data flow to decision models
- **Location**:
  - `lib/ai-providers/anthropic.ts` - Tool results extraction fix
  - `lib/agents/research-agents.ts` - Findings synthesis from tool calls
  - `app/api/trading/consensus/stream/route.ts` - Debug logging
- **Purpose**: Ensure research agent findings (76+ tool calls) reach decision models
- **Root Cause Fixed**:
  - AI SDK stores tool results in `step.toolResults[]` with `output` field
  - NOT in `toolCalls[]` with `result` field (common misconception)
  - Anthropic provider wasn't merging these correctly
- **Key Components**:
  - **Tool Results Mapping**: Create Map of `toolCallId → output` from `step.toolResults`
  - **Merge with toolCalls**: Match each toolCall to its result via toolCallId
  - **Fallback Synthesis**: `synthesizeFindingsFromToolCalls()` extracts data when model response is empty
- **Before Fix**: Research agents made 76 tool calls but findings = 0 chars
- **After Fix**: Technical 6,233 chars, Fundamental 8,686 chars, Sentiment 7,263 chars, Risk 6,060 chars
- **Commits**: `9f58047` (main fix), `4253a4c` (debug logging)
- **TypeScript**: 0 errors
- **Last Modified**: December 13, 2025

### 55. TWS Pre-Market Screening System (Database-Backed Architecture)
- **Status**: ✅ ACTIVE & CRITICAL - Pre-market stock screening with TWS API
- **Location**:
  - `lib/trading/screening/` - All TWS client modules (scanner, fundamentals, short data, ratios, bars)
  - `lib/trading/screening/screening_orchestrator.py` - Complete screening pipeline
  - `lib/trading/screening/finnhub_sentiment.py` - Social sentiment client
  - `api/routes/screening.py` - FastAPI endpoints (database-backed)
  - `api/models/screening.py` - Pydantic models
  - `scripts/create-screening-results-table.sql` - Supabase schema
  - `scripts/run-screening-cron.sh` - Cron scheduler
- **Purpose**: Find high-probability pre-market trading opportunities by combining 6 data sources
- **Architecture Decision** (Gemini AI Consultation - January 2026):
  - ❌ **REJECTED**: Direct FastAPI + ib_insync integration (event loop conflicts)
  - ✅ **ACCEPTED**: Database-backed architecture (Gemini's Option C)
    - **Layer 1**: Orchestrator runs on schedule (cron/GitHub Actions) → writes to Supabase
    - **Layer 2**: Supabase PostgreSQL (`screening_results` table)
    - **Layer 3**: FastAPI reads from database (no ib_insync code!)
    - **Layer 4**: Next.js displays pre-market opportunities
  - **Benefits**: No event loop conflicts, <100ms API responses (vs 20-30s), unlimited concurrent users, historical data included
- **Data Sources** (6 sources combined):
  1. **TWS Scanner**: Find pre-market gappers (TOP_PERC_GAIN scan code)
  2. **TWS Fundamentals**: P/E ratio, EPS, Market Cap
  3. **TWS Short Data**: Shortable shares, borrow fee rate (critical for squeeze potential)
  4. **TWS Ratios**: 60+ fundamental ratios (ROE, debt-to-equity, etc.)
  5. **TWS Bars**: Pre-market gap %, volume, price action
  6. **Social Sentiment**: ❌ NOT AVAILABLE FREE - Finnhub requires Premium (~$50/mo)
- **Composite Scoring Algorithm** (0-100):
  - Gap magnitude: 30 points (larger gaps = more momentum)
  - Volume: 20 points (higher volume = more interest)
  - Short squeeze potential: 20 points (low shortable shares = squeeze risk)
  - Fundamentals: 15 points (reasonable P/E = quality stock)
  - Social sentiment: 15 points (bullish sentiment = retail interest)
- **Database Schema**:
  - Table: `screening_results` with JSONB stocks array
  - Indexes: created_at DESC (fast latest queries), scan params, GIN on stocks (symbol search)
  - RLS Policies: Public read, inserts allowed (for orchestrator)
- **FastAPI Endpoints**:
  - `GET /api/health` - Health check with database status
  - `GET /api/screening/latest` - Latest screening results (< 100ms)
  - `GET /api/screening/history` - Historical screenings with pagination
- **Test Results** (January 3, 2026):
  - Database Write: ✅ PASS (~200ms)
  - Database Read: ✅ PASS (~50ms)
  - FastAPI `/health`: ✅ PASS (<50ms)
  - FastAPI `/latest`: ✅ PASS (<100ms)
  - FastAPI `/history`: ✅ PASS (<100ms)
  - **Performance**: 200-300x faster than attempted synchronous approach!
- **Scheduling**:
  - Cron job: Runs every 15 minutes during pre-market hours (4:00-9:30am ET, Mon-Fri)
  - GitHub Actions: Reference workflow provided (TWS not available in cloud)
  - Logs: Daily log files in `logs/screening-YYYYMMDD.log`
- **Documentation**:
  - `docs/trading/DATABASE_BACKED_ARCHITECTURE.md` - Complete architecture guide (600+ lines)
  - `docs/trading/SCREENING_INTEGRATION.md` - Frontend integration guide
  - `TESTING_SUMMARY.md` - User testing guide
  - `TEST_RESULTS.md` - Comprehensive test results
- **Frontend Integration** (Phase 9 - ✅ COMPLETE):
  - `components/trading/PreMarketScreening.tsx` - React component (500+ lines)
    - Auto-refresh every 5 minutes
    - Stats dashboard (total scanned, opportunities, execution time, avg score)
    - Detailed stock cards with all data fields
    - Score color-coding (green ≥80, yellow ≥60, red <60)
    - Loading states and error handling
  - `app/trading/screening/page.tsx` - Next.js page wrapper
  - `components/ui/header.tsx` - Added Screening navigation links (desktop + mobile)
  - Environment: `NEXT_PUBLIC_FASTAPI_URL=http://localhost:8001`
- **Session Enhancements** (January 5, 2026 - ✅ COMPLETE):
  - **TWS Restart Detection**: 10-second timeout per stock (was 60s default), amber warning banner when all requests fail suggesting TWS restart
  - **Sorting Mechanism**: 5 sort options - Top Gainers (gap%), Highest Score, Most Volume, Price, Scanner Rank
  - **Data Caching (Hybrid Architecture)**:
    - `lib/trading/screening-cache.ts` - Cache service for localStorage + Supabase
    - `scripts/create-screening-scans-table.sql` - Supabase table for historical scans
    - localStorage: Instant page refresh persistence (single key, last scan only)
    - Supabase: Historical scan storage with all filters and stocks
  - **History Panel**: Modal showing past scans from Supabase database
  - **Browser Tested**: Playwright verified localStorage persistence across refreshes
- **Dependencies**:
  - ib-insync (TWS API client)
  - supabase (Python package for database)
  - finnhub-python (social sentiment)
  - fastapi + uvicorn (API server)
- **Requirements**:
  - TWS Desktop or IB Gateway running on port 7496
  - API enabled in TWS settings
  - Supabase credentials in environment
  - Optional: Finnhub API key (free tier: 60 calls/min)
- **Pending**:
  - ⏳ User testing with real TWS Desktop
  - ⏳ Test frontend with FastAPI backend
  - ⏳ Production cron job deployment
- **Files Created**: 10 new files (SQL schema, test scripts, cron scheduler, React components, pages, documentation)
- **Files Modified**: 4 files (orchestrator, FastAPI routes, Pydantic models, header navigation)
- **Commits**: TBD (pending final testing)
- **Last Modified**: January 3, 2026
- **DO NOT**: Attempt to run ib_insync directly in FastAPI (will fail with event loop conflicts), remove database layer, or modify RLS policies without testing

---

### 58. Screening-to-Debate Pipeline
- **Status**: ✅ ACTIVE & CRITICAL
- **Purpose**: Connect pre-market screening system to AI debate engine. Each morning's top screened stocks are automatically debated by AI agents (Analyst, Critic, Synthesizer) and a Judge makes actionable BUY/WATCH/SKIP decisions with optional paper trade execution.
- **Architecture**: `Screening Scan → Supabase → Pipeline (Research + 2-Round Debate + Judge) → Trade Execution → Briefing UI`
- **Key Components**:
  - **Bridge Types**: `lib/trading/screening-debate/types.ts` - ScreeningDebateConfig, StockDebateResult, DailyBriefing, ScreeningJudgeResult
  - **Prompts**: `lib/trading/screening-debate/prompts.ts` - Screening-enhanced debate prompts with ground truth TWS data injection
  - **Judge System**: `lib/trading/judge-system.ts` - Extended with `generateScreeningJudgePrompt()` + `parseScreeningJudgeResponse()` for BUY/WATCH/SKIP verdicts
  - **Pipeline Orchestrator**: `lib/trading/screening-debate/pipeline.ts` - Core engine: fetch top N stocks → research → 2-round debate → judge → optional trade execution
  - **Trade Executor**: `lib/trading/screening-debate/trade-executor.ts` - Multi-broker trade execution via BrokerFactory (Alpaca paper + IBKR paper)
  - **SSE API**: `app/api/trading/screening/debate/route.ts` - Streaming endpoint with real-time debate progress events
  - **Results API**: `app/api/trading/screening/debate/results/route.ts` - Fetch latest/historical debate results
  - **React Hook**: `components/trading/screening-debate/use-screening-debate.ts` - SSE streaming state management
  - **Config Modal**: `components/trading/screening-debate/debate-config-modal.tsx` - topN, model selection, auto-trade settings
  - **Progress Bar**: `components/trading/screening-debate/debate-progress-bar.tsx` - Real-time debate progress UI
  - **Briefing Page**: `app/trading/briefing/page.tsx` + `components/trading/briefing/daily-briefing.tsx` - Historical briefing viewer
  - **Stock Card Integration**: `components/trading/screening/stock-card.tsx` - Debate verdict badges on screening cards
  - **Database**: `screening_debates` table (Supabase, JSONB) - SQL at `scripts/create-screening-debates-table.sql`
- **Design Decisions**:
  - Sequential stock debates (not parallel) to respect API rate limits
  - Default free models (Groq Llama 3.3 70B) for zero-cost operation
  - Auto-trade OFF by default, paper only
  - Research cache integration for cost savings
  - Provider factory for tier billing protection
- **Navigation**: Briefing link in header (desktop + mobile)
- **Academic Foundation**: Google 2023 (17.7% reasoning improvement), Microsoft 2024 (31% hallucination reduction)
- **Last Modified**: February 7, 2026
- **DO NOT**: Remove auto-trade safety checks, bypass paper mode enforcement, change verdict types (BUY/WATCH/SKIP), or break existing screening system

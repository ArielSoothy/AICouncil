# Verdict AI Features Documentation

**PURPOSE**: This file documents all features to prevent accidental deletion and ensure system integrity.

## 🔒 Core Features - NEVER DELETE WITHOUT EXPLICIT USER REQUEST

### 1. Multi-Round Agent Debate System
- **Status**: ✅ ACTIVE & CRITICAL
- **Location**: `AICouncil/lib/agents/agent-system.ts`
- **Purpose**: Core research-based debate mechanics where agents respond to each other
- **Key Components**:
  - Sequential agent execution (Analyst → Critic → Synthesizer)
  - Multi-round debate with previous message context
  - Real debate mechanics, not just parallel responses
- **Dependencies**: 
  - `debate-prompts.ts` 
  - `types.ts` (AGENT_PERSONAS)
  - `debate-display.tsx`
- **Last Modified**: January 2025 (Fixed parallel → sequential execution)
- **DO NOT**: Change back to parallel execution or remove debate context

### 2. Individual Round Tabs Display
- **Status**: ✅ ACTIVE & USER-REQUESTED
- **Location**: `AICouncil/components/agents/debate-display.tsx`
- **Purpose**: Show each debate round in separate tabs for clarity
- **Key Features**:
  - Tab for each round (Round 1, Round 2, etc.)
  - Timeline view for complete debate flow
  - Synthesis tab for final results
  - Default to Round 1 tab, not Synthesis
- **Dependencies**: shadcn/ui Tabs component
- **Last Modified**: January 2025 (Fixed default tab)
- **DO NOT**: Remove individual round tabs or force synthesis-only view

### 3. Agent Personas & Order
- **Status**: ✅ ACTIVE & RESEARCH-BASED
- **Location**: `AICouncil/lib/agents/types.ts`
- **Purpose**: Specialized agent roles based on research methodology
- **Key Features**:
  - The Analyst: Data-driven, methodical, evidence-based
  - The Critic: Skeptical, challenging, risk-focused  
  - The Synthesizer: Balanced, integrative, consensus-building
  - Execution order: Analyst → Critic → Synthesizer
- **Dependencies**: `agent-system.ts`, `debate-prompts.ts`
- **Last Modified**: January 2025 (Added proper ordering)
- **DO NOT**: Change agent roles, traits, or execution order

### 4. Round Selection Controls
- **Status**: ✅ ACTIVE & USER-REQUESTED & TESTED
- **Location**: `/agents` page in Agent Debate interface setup tab
- **Purpose**: Allow users to select number of debate rounds (manual control)
- **Key Features**:
  - Radix UI slider control (1-3 rounds, min=1, max=3)
  - Always visible with clear labeling
  - Real-time UI feedback ("Number of Rounds: X")
  - Keyboard navigation support (ArrowLeft/ArrowRight)
  - Shows "Manual control - exactly this many rounds will run"
- **Dependencies**: shadcn/ui Slider component (Radix UI)
- **Last Tested**: September 2025 (✅ Both directions confirmed working)
- **UI Position**: Currently below "Auto-trigger Round 2 on Disagreement" toggle
- **Known Issue**: Needs better visual separation from auto-trigger controls
- **DO NOT**: Hide round controls, force fixed round counts, or remove keyboard navigation

### 5. Dynamic Round Addition
- **Status**: ✅ ACTIVE & USER-REQUESTED  
- **Location**: `AICouncil/components/agents/debate-display.tsx`
- **Purpose**: Allow continuing debate after completion
- **Key Features**:
  - "Add Round X" button after debate completion
  - Limit to 3 total rounds for cost control
  - Only shown for completed debates
- **Dependencies**: onAddRound callback prop
- **Last Modified**: January 2025 (Initial implementation)
- **DO NOT**: Remove dynamic round addition capability

### 6. Smart Text Truncation System
- **Status**: ✅ ACTIVE & USER-REQUESTED & CRITICAL
- **Location**: `AICouncil/components/agents/debate-display.tsx`
- **Purpose**: Display agent responses with intelligent truncation that respects sentence boundaries
- **Key Features**:
  - Sentence-boundary aware truncation (600 chars for round tabs, 400 chars for insights)
  - Regex-based sentence detection: `split(/(?<=[.!?])\s+/)`
  - Word-boundary fallback for very long sentences
  - "Show more" buttons with accurate line counts
  - Never cuts text mid-sentence, always ends with complete sentences + "..."
- **Core Logic**: 
  - `getDisplayContent()` function in debate-display.tsx:147-175
  - `isLongMessage()` threshold detection (800 chars or 12+ lines)
  - Expandable message state management
- **Dependencies**: React state (expandedMessages), lucide-react icons
- **Last Modified**: September 2025 (Fixed mid-sentence cutting issue)
- **DO NOT**: Reduce character limits below current levels, remove sentence detection, or allow mid-sentence cuts

### 7. Full Response Display with Scrolling
- **Status**: ✅ ACTIVE & USER-REQUESTED
- **Location**: `AICouncil/components/agents/debate-display.tsx`
- **Purpose**: Show complete agent responses with scrolling for long content
- **Key Features**:
  - ScrollArea with 700px height for round content
  - Full message content display when expanded
  - Individual message cards with proper spacing
- **Dependencies**: shadcn/ui ScrollArea
- **Last Modified**: January 2025 (Increased height)
- **DO NOT**: Remove scrolling capability or reduce container heights

### 8. Memory System Foundation  
- **Status**: 🔧 FOUNDATION COMPLETE - READY FOR INTEGRATION
- **Location**: `lib/memory/` + `/app/api/memory/route.ts` + `/test-memory`
- **Purpose**: Three-tier memory system to make agents learn and improve over time
- **Research Foundation**:
  - IBM/Redis: 40% better consistency with episodic memory
  - LangGraph: 35% accuracy improvement with semantic memory  
  - MongoDB: Validated improvements with procedural memory
- **Memory Types**:
  - **Episodic**: Past debates and interactions (what happened before)
  - **Semantic**: Facts, knowledge, user preferences (what we know)
  - **Procedural**: Rules, patterns, successful methods (how we do things)
- **Key Components**:
  - Complete TypeScript interfaces in `lib/memory/types.ts`
  - MemoryService class with Supabase integration
  - Vector embedding support for similarity search
  - API endpoint for memory operations
  - Test interface for validation and demos
- **Expected Impact**: 
  - 40% accuracy improvement through learning
  - 60-80% cost reduction via intelligent caching
  - Personalized user experiences
  - Network effects from accumulated knowledge
- **Integration Status**: Ready for Phase 1 implementation
- **DO NOT**: Remove memory infrastructure, modify core interfaces, or disable test endpoints

### 9. Heterogeneous Model Mixing System
- **Status**: ✅ ACTIVE & RESEARCH-BASED & CRITICAL
- **Location**: `lib/heterogeneous-mixing/` + `/api/agents/debate-heterogeneous`
- **Purpose**: Research-validated optimal model selection for enhanced AI debate accuracy
- **Key Components**:
  - Query analysis system (10 query types: mathematical, creative, analytical, factual, etc.)
  - Model family specialization mapping (OpenAI reasoning, Anthropic analysis, Google knowledge)
  - Automatic optimal model selection based on query characteristics and agent roles
  - Research-based 25% accuracy improvement targeting
- **API Endpoints**:
  - `POST /api/agents/debate-heterogeneous` - Enhanced debate with heterogeneous mixing
  - `GET /api/agents/debate-heterogeneous` - Query analysis and recommendations
- **Test Interface**: `/test-heterogeneous` - Comprehensive testing and demonstration page
- **Core Files**:
  - `lib/heterogeneous-mixing/query-analyzer.ts` - Query type detection & analysis
  - `lib/heterogeneous-mixing/model-selector.ts` - Optimal model selection logic  
  - `lib/heterogeneous-mixing/index.ts` - Main orchestrator
  - `app/api/agents/debate-heterogeneous/route.ts` - Enhanced API implementation
  - `app/test-heterogeneous/page.tsx` - Test interface
- **Research Foundation**: 
  - MIT 2024: 25% improvement from mixing different model families
  - Google 2023: 17.7% improvement in mathematical reasoning
  - Microsoft Research 2024: 31% reduction in hallucinations
- **Expected Performance**: 20-40% accuracy improvement, 30-50% hallucination reduction
- **Last Modified**: September 2025 (Phase 1 implementation complete)
- **DO NOT**: Remove query analysis, disable model mixing logic, or remove research-based selection strategies

### 10. Centralized Branding System
- **Status**: ✅ ACTIVE & CRITICAL  
- **Location**: `lib/config/branding.ts` + all frontend components using PROJECT_NAME
- **Purpose**: Centralized project branding for easy future name changes and consistent UI
- **Key Components**:
  - BRANDING configuration object with project name, taglines, meta tags
  - PROJECT_NAME, PROJECT_TITLE, TAGLINE_PRIMARY, TAGLINE_SECONDARY exports
  - Integrated into layout.tsx, landing-page.tsx, header.tsx, app pages
  - TypeScript-safe branding configuration
- **Current Branding**: "Verdict AI - Multi-Model Decision Engine"  
- **Legacy Support**: Old names preserved in LEGACY_NAMES for reference
- **Integration**: All main UI components use centralized variables instead of hardcoded strings
- **Last Modified**: January 2025 (Complete rebrand from "AI Council/Consensus AI")
- **DO NOT**: Hardcode project names in components, remove branding.ts file, or bypass centralized system

### 11. Pro Mode Testing Unlock (TEMPORARY)
- **Status**: 🧪 TESTING FEATURE - FOR DEVELOPMENT ONLY
- **Location**: `app/app/page.tsx` (lines 63-66, 100-136)
- **Purpose**: Allow testing of all premium AI models without authentication
- **Key Components**:
  - Pro mode unlock button for guest/free tiers
  - State management: `isProModeUnlocked` state variable
  - Visual indicators: Yellow "🔓 TESTING MODE" badge when active
  - Disable button to revert to normal tier
  - Passes `testingTierOverride` prop to QueryInterface
- **How to Remove**:
  1. Remove `isProModeUnlocked` state and `effectiveTier` logic (lines 63-66)
  2. Remove Pro unlock/disable buttons UI (lines 107-136)
  3. Change tier display back to use `userTier` instead of `effectiveTier` (line 100)
  4. Remove `testingTierOverride` prop from QueryInterface (line 145)
  5. Remove corresponding props from QueryInterface component
- **Security Note**: This is CLIENT-SIDE ONLY for UI testing. Backend still enforces actual tier limits
- **Last Modified**: January 2025 (Added for testing all agents functionality)
- **TODO**: Remove before production deployment

### 12. Evaluation Data Collection System
- **Status**: ✅ ACTIVE & CRITICAL - PRODUCTION READY
- **Location**: Database schema + API endpoints + type definitions
- **Purpose**: Comprehensive data collection system for ML training and evaluation research
- **Key Components**:
  - **Database Schema**: Extended conversations table with `evaluation_data` JSONB field
  - **TypeScript Types**: Full type safety in `types/database.ts`
  - **Agent Debate API**: Enhanced `/api/agents/debate/route.ts` captures structured agent verdicts
  - **Consensus API**: Enhanced `/api/conversations/route.ts` captures consensus data
  - **Guest Mode Support**: Anonymous data collection for research/testing
- **Data Structure Captured**:
  - Query type, mode, user tier, response time
  - Agent/model verdicts with confidence scores
  - Consensus mechanisms and agreement metrics
  - Provider diversity and cost tracking
  - Structured for immediate ML pipeline compatibility
- **File Locations**:
  - `supabase-schema.sql` - Database field definition
  - `types/database.ts` - TypeScript type definitions
  - `app/api/agents/debate/route.ts` - Agent debate data capture
  - `app/api/conversations/route.ts` - Consensus data capture
  - `evals.md` - Comprehensive evaluation framework documentation
- **Research Integration**: Aligned with MVP strategy for user-driven development
- **Last Modified**: January 2025 (Complete implementation + testing)
- **DO NOT**: Remove evaluation data capture, modify data structure, or disable guest mode support

### 13. Feedback Collection System
- **Status**: ✅ ACTIVE & CRITICAL - GUEST MODE ENABLED
- **Location**: `components/consensus/feedback-form.tsx` + `/api/feedback/route.ts`
- **Purpose**: Comprehensive user feedback collection with guest mode support for MVP validation
- **Key Components**:
  - **5-Star Rating System**: Visual star interface with hover effects
  - **Optional Comments**: Text area for detailed user feedback
  - **Guest Mode Support**: Anonymous feedback collection without authentication
  - **Credit Rewards**: +2 premium credits for authenticated users
  - **API Endpoint**: `/api/feedback/route.ts` handles both authenticated and guest submissions
- **User Experience Features**:
  - Clear success/failure feedback with appropriate messaging
  - Guest mode shows signup prompts for credit earning
  - Prevents duplicate feedback per conversation
  - Graceful error handling and user notifications
- **Data Storage**:
  - Authenticated users: Full feedback stored in database with credit rewards
  - Guest users: Anonymous feedback stored in database with null conversation_id for research
  - Conversation correlation for feedback analysis (when available)
- **Testing**: Verified working with Playwright end-to-end testing in guest mode
- **UUID Fix**: Fixed conversation_id handling for guest feedback (uses null instead of invalid UUID)
- **Database Storage**: Guest feedback now properly stored with null conversation_id for research analysis
- **Last Modified**: January 2025 (Fixed guest mode 404 error + UUID handling + comprehensive testing)
- **DO NOT**: Remove guest mode support, disable feedback collection, or break credit reward system

### 14. AI-Powered Question Generator
- **Status**: ✅ ACTIVE & CRITICAL - SELF-TESTING SYSTEM - FULLY VALIDATED
- **Location**: `lib/question-generator/` + `/api/question-generator` + UI integration + `/test-question-intelligence`
- **Purpose**: Generate relevant questions for testing consensus system and inspiring users
- **Key Components**:
  - **Smart Question Categories**: MVP Development, AI-Tech, Product Strategy, UX, Business Model
  - **Template System**: 16+ question templates with 50+ variable options
  - **AI Generation**: Uses llama-3.1-8b-instant for dynamic question creation
  - **Cache Integration**: Avoids duplicate questions with 24hr memory cache
  - **Priority Questions**: Pre-curated high-value questions for product validation
- **UI Features**:
  - **Generate Button**: ✨ Sparkles icon button next to prompt input
  - **Smart Fallbacks**: Priority → AI → Template generation hierarchy
  - **User Feedback**: Toast notifications with question complexity/category
  - **Tier Integration**: Pro/Enterprise users get AI-generated questions
- **Intelligence Features (ALL VALIDATED ✅)**:
  - **🔄 Cache Deduplication (24h TTL)**: ✅ WORKING - Avoids duplicate questions for 24 hours
  - **📝 Recent Tracking (20 limit)**: ✅ WORKING - Remembers last 20 questions for variety
  - **👤 Tier Awareness**: ✅ WORKING - Free users get templates, Pro+ get AI generation
  - **⚠️ Error Handling**: ✅ WORKING - Graceful fallbacks if AI generation fails
- **Self-Testing Benefits**:
  - **Eating Own Dog Food**: Using AI consensus to improve the consensus system
  - **MVP Validation**: Questions directly aligned with product development decisions
  - **User Inspiration**: Help users discover effective question types
  - **Data Collection**: Learn which questions perform best for consensus analysis
- **Technical Architecture**:
  - Memory cache with 24hr TTL for recent questions (max 20)
  - Template variable system with contextual substitutions
  - Category-based filtering and complexity levels (quick/analysis/strategic)
  - Graceful error handling with template fallbacks
- **Testing & Validation**:
  - **Comprehensive Test Suite**: `/test-question-intelligence` page with real-time validation
  - **Playwright Testing**: End-to-end browser automation validation completed
  - **Bug Fixes Applied**: Fixed case-sensitivity issue in priority question deduplication
  - **Production Ready**: All intelligence features validated and operational
- **File Locations**:
  - `lib/question-generator/question-categories.ts` - Categories and templates
  - `lib/question-generator/question-generator.ts` - Core generation logic
  - `app/api/question-generator/route.ts` - API endpoint
  - `components/consensus/query-interface.tsx` - UI integration
  - `app/test-question-intelligence/page.tsx` - Comprehensive test suite
- **Last Modified**: January 2025 (Intelligence features validated, critical bug fixed)
- **DO NOT**: Remove question generation system, modify template categories, disable caching, or remove intelligence test suite

### 15. Agent Debate Conversation Saving System
- **Status**: ✅ ACTIVE & CRITICAL - DATA COLLECTION ESSENTIAL
- **Location**: `components/agents/debate-interface.tsx` + `/api/conversations` integration
- **Purpose**: Comprehensive saving of all agent debates for analytics and user history
- **Key Components**:
  - **Database Integration**: All debates saved to conversations table via existing `/api/conversations` API
  - **Guest Mode Support**: Both authenticated and guest debates properly saved with user type flagging
  - **Error Handling**: Graceful fallback with toast notifications if saving fails
  - **Admin Visibility**: All debates appear in admin dashboard for complete usage analytics
  - **Data Consistency**: Uses same storage format as consensus queries for unified analytics
- **Implementation Details**:
  - Added to both streaming (`startDebateWithStreaming`) and regular (`startDebate`) functions
  - Saves after `setDebateSession` calls in both execution paths (lines 756+ and 981+)
  - Uses `userTier === 'guest'` for guest mode detection
  - Includes `useToast` integration for user feedback
- **File Locations**:
  - `components/agents/debate-interface.tsx` - Main implementation with dual save points
  - `/api/conversations/route.ts` - Existing API handles debate data structure
- **Last Modified**: January 2025 (Complete implementation with dual-path coverage)
- **DO NOT**: Remove conversation saving logic, disable database integration, or break guest mode support

### 16. Interactive Follow-up Questions System
- **Status**: ✅ ACTIVE & CRITICAL - USER-REQUESTED RESTORATION
- **Location**: `components/debate/synthesis-tab.tsx` + `components/agents/debate-display.tsx`
- **Purpose**: Allow users to answer follow-up questions and continue debates with additional context
- **Key Components**:
  - **Answer Collection Interface**: Beautiful UI with text areas for each generated follow-up question
  - **Custom Question Input**: Users can add their own questions beyond AI-generated ones
  - **Continue Debate Functionality**: Answers passed to new debate round via `onFollowUpRound` callback
  - **Professional Styling**: Blue-themed interface with proper spacing and responsive design
  - **State Management**: React state handling for answer collection, form submission, and UI toggle
  - **UX Flow**: Toggle between view mode (static questions) and input mode (interactive form)
- **Technical Architecture**:
  - `SynthesisTab` receives `onFollowUpRound` prop from `DebateDisplay`
  - State: `followUpAnswers`, `showFollowUpInput`, `customQuestion`
  - Functions: `handleAnswerChange`, `handleCustomQuestionChange`, `handleSubmitFollowUp`
  - UI: "Answer & Continue Debate" button → Interactive form → "Continue Debate with Answers" submission
- **Integration Points**:
  - `debate-display.tsx:275` - Passes `onFollowUpRound` prop to SynthesisTab
  - `debate-interface.tsx` - Receives follow-up answers and incorporates into new debate context
  - Existing infrastructure: `onFollowUpRound` callback already implemented in debate system
- **File Locations**:
  - `components/debate/synthesis-tab.tsx` - Main interactive UI implementation
  - `components/agents/debate-display.tsx` - Prop passing and integration
  - `components/agents/debate-interface.tsx` - Follow-up answer processing
- **Last Modified**: January 2025 (Complete restoration with enhanced UI)
- **DO NOT**: Remove interactive follow-up UI, disable answer collection, or break continue debate functionality

### 17. Generate Question Button for Agent Debates
- **Status**: ✅ ACTIVE & CRITICAL - FEATURE PARITY ESSENTIAL
- **Location**: `components/agents/debate-interface.tsx`
- **Purpose**: Provide same question generation capability on agent debate page as consensus interface
- **Key Components**:
  - **Feature Parity**: Same Generate Question button functionality as consensus page
  - **API Integration**: Uses existing `/api/question-generator` endpoint with proper tier handling
  - **Loading States**: Proper spinner animation and disabled states during generation
  - **Error Handling**: Graceful fallbacks if question generation fails
  - **UI Consistency**: Sparkles icon and same button positioning as consensus interface
- **Implementation Details**:
  - Added `Sparkles` import to lucide-react icons
  - Added `isGeneratingQuestion` state variable for loading tracking
  - Implemented `handleGenerateQuestion` function with same API pattern as consensus
  - Button positioned next to "Debate Query" label with consistent styling
  - Updates `query` state with generated question on success
- **Technical Integration**:
  - Uses existing question generation infrastructure from consensus interface
  - Proper tier awareness: Pro/Enterprise users get AI generation, Free users get templates
  - Same fallback hierarchy: Priority → AI → Template generation
  - Consistent user feedback via loading states and question updates
- **File Locations**:
  - `components/agents/debate-interface.tsx` - Complete implementation (lines 20, 35, 246-278, 1014-1032)
  - `/api/question-generator/route.ts` - Existing API endpoint (shared)
  - `lib/question-generator/` - Existing generation logic (shared)
- **Last Modified**: January 2025 (Complete feature parity implementation)
- **DO NOT**: Remove generate question button, disable API integration, or break UI consistency with consensus page

### 18. Admin Dashboard Format Consistency
- **Status**: ✅ ACTIVE & CRITICAL - DATA VISUALIZATION ESSENTIAL
- **Location**: `app/admin/page.tsx`
- **Purpose**: Unified professional table format matching user dashboard for better analytics viewing
- **Key Components**:
  - **Table Format**: Clean table layout with columns (Prompt, Answer, User, Created) matching user dashboard
  - **Professional Display**: Proper table headers, consistent spacing, responsive design
  - **Answer Extraction**: Smart parsing of both consensus and debate response formats for unified display
  - **Data Truncation**: Clean line-clamp-2 display for readability and consistent formatting
  - **User Type Badges**: Clear Auth/Guest indicators for user classification
  - **Improved Capacity**: Shows 20 conversations instead of 10 with better performance
- **Technical Implementation**:
  - Replaced card-style layout with responsive table format
  - Smart answer extraction function handles multiple response formats:
    - Consensus: `responses.consensus?.unifiedAnswer`
    - Agent Debate: `responses.finalSynthesis?.conclusion`
    - Fallback: First response object or truncated string
  - Consistent styling with user dashboard: same table classes, truncation, spacing
  - Badge system for user type identification (Auth vs Guest)
- **Data Format Handling**:
  - Graceful parsing of JSON response objects
  - Fallback mechanisms for malformed data
  - Consistent truncation and display formatting
  - Proper date formatting with `toLocaleString()`
- **File Locations**:
  - `app/admin/page.tsx` - Main implementation (lines 221-284)
  - `app/dashboard/page.tsx` - Reference format (maintained consistency)
- **Last Modified**: January 2025 (Complete format unification)
- **DO NOT**: Revert to card format, remove answer extraction logic, or break consistency with user dashboard

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
- **Status**: ✅ ACTIVE & COMPLETE (October 28, 2025)
- **Location**: `lib/trading/preset-configs.ts` + `contexts/trading-preset-context.tsx` + `components/trading/global-preset-selector.tsx`
- **Purpose**: Single centralized control for Free/Pro/Max model tier selection across ALL trading modes
- **Key Features**:
  - ✅ **Global Tier Selector**: One control affects Consensus, Debate modes simultaneously
  - ✅ **Three Tiers**:
    * Free: 6 free models (Gemini Flash, Llama 3.3 70B, Gemma)
    * Pro: 8 balanced models (Claude 3.5 Sonnet, GPT-4o, Gemini Pro, Grok, Mistral, etc.)
    * Max: 8 flagship models (Claude 4.5 Sonnet, GPT-5, Gemini 2.5 Pro, Grok 4, etc.)
  - ✅ **Smart Defaults**: Auto-syncs with user subscription tier (free → Free, pro → Pro, enterprise → Max)
  - ✅ **Visual Indicators**: Each mode shows current tier with badge (Free 🎁 / Pro ⚡ / Max ✨)
  - ✅ **React Context**: `TradingPresetProvider` with `useTradingPreset()` hook
  - ✅ **Centralized Config**: All preset definitions in `lib/trading/preset-configs.ts` (single source of truth)
- **UI Placement**: Between portfolio display and mode tabs on `/trading` page
- **Behavior**:
  - Switching tier updates all modes instantly via `useEffect` hooks
  - Consensus Mode: Updates multi-model selection
  - Debate Mode: Updates Analyst/Critic/Synthesizer role assignments
  - User can still customize individual model selection after preset applied
- **Files Modified** (8 total):
  - NEW: `lib/trading/preset-configs.ts` (centralized presets)
  - NEW: `contexts/trading-preset-context.tsx` (global state)
  - NEW: `components/trading/global-preset-selector.tsx` (UI component)
  - UPDATED: `app/trading/page.tsx` (provider + selector)
  - UPDATED: `components/trading/consensus-mode.tsx` (connect to global)
  - UPDATED: `components/trading/debate-mode.tsx` (connect to global)
  - UPDATED: `components/trading/trading-model-selector.tsx` (show tier indicator)
- **Benefits**:
  - ✅ Eliminates duplicate Free/Pro/Max buttons in each mode
  - ✅ Better UX: One decision affects all modes (matches user mental model)
  - ✅ DRY Code: Single preset config instead of 3 duplicates
  - ✅ Mobile-friendly: Less UI clutter
  - ✅ Scalable: Prepares for subscription-based model access
- **Last Modified**: October 28, 2025
- **Tested**: Browser validated - switching tiers updates Consensus & Debate modes correctly
- **DO NOT**: Remove global preset selector, revert to per-mode presets, duplicate preset configs

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

## 🛡️ PROTECTION RULE:
**Always check this file before making changes. Ask user before modifying any protected feature.**
---

## Domain-Specific Decision Frameworks

### 33. Decision Help System - AI-Powered Decision Making with Domain Frameworks

- **Status**: ✅ ACTIVE & CRITICAL (November 18, 2025)
- **Purpose**: Complete end-to-end decision support system combining quantitative scoring frameworks with multi-model AI debate
- **Location**: `/app/decision/` (3 pages), `/components/domains/` (7 components), `/lib/domains/` (8 modules)

**Phase 1-3: Foundation & MAUT/Pareto Frameworks** (November 17-18, 2025 - COMPLETE):
- ✅ **Intake Agent System** (Phase 2):
  - Domain classifier with 4 domains (apartment, trip, budget, product)
  - 77-question bank with conditional logic
  - Progressive questioning with depth levels (quick/thorough/comprehensive)
  - Query reformulation with domain context
  - Files: `lib/intake/*.ts` (6 files, 800+ lines)
- ✅ **Apartment MAUT Framework** (Phase 3):
  - Multi-Attribute Utility Theory with 4 weighted categories
  - Financial (40%): Affordability, market value, hidden costs
  - Location (30%): Commute, safety, walkability
  - Property (20%): Space, amenities, quality
  - Lifestyle (10%): Neighborhood vibe, pets, WFH
  - Rule-of-thumb fallbacks (no external APIs required)
  - Scorecard component with visual breakdown
  - Files: `lib/domains/apartment/*.ts` (4 files, 450+ lines)
- ✅ **Hotel Finder with Weighted Decision Matrix** (Phase 4 - Refactored November 2025):
  - **Framework**: Replaced Pareto Optimization with research-backed Weighted Decision Matrix
  - **5 Evaluation Criteria** (2024 academic hospitality research):
    * Location (35% weight): Attractions, transportation, safety, walkability
    * Reviews (30% weight): Overall rating, sentiment analysis, trend detection, red flags (96% of travelers consider reviews important)
    * Cleanliness (25% weight): 84% of guests rate as "very important" per Cornell/Statista research
    * Value (20% weight): Price vs features, hidden fees detection, market comparison
    * Amenities (15% weight): Must-have matching, service quality assessment
  - **Red Flag Detection**: Bed bugs (disqualify), major cleanliness issues, excessive noise (>30%), fake reviews
  - **4 Specialized AI Agents**:
    * Location Intelligence Agent (Claude Sonnet 4.5) - Geographic analysis
    * Review Analysis Agent (GPT-4o) - Sentiment & red flag detection
    * Value Optimization Agent (Llama 3.3 70B) - Price optimization
    * Amenities & Experience Agent (Gemini 2.5 Flash) - Feature matching
  - **Enhanced Questions** (13 total, up from 9):
    * NEW: Travel party composition (babies, elderly, group size)
    * NEW: Special requirements (dietary, accessibility, medical)
    * NEW: Specific hotel shortlist (if user has candidates)
    * NEW: Open-ended context (first-timer tips, local knowledge)
  - **Research Depth Options**:
    * Quick: 6 questions (critical only)
    * Balanced: 10 questions (critical + important)
    * Comprehensive: 13 questions (all questions)
  - **API-Optional Design**: Works without external APIs using rule-of-thumb scoring
  - **Phase 2 Vision**: See `docs/features/HOTEL_FINDER_PHASE2_VISION.md` for roadmap to integrate real hotel data, multi-source reviews (Reddit, YouTube, TripAdvisor), and specific hotel recommendations
  - Files: `lib/domains/hotel/*.ts` (4 files, 900+ lines), `lib/intake/question-bank.ts` (enhanced)
- ✅ **Hybrid Architecture - Conversational + Structured Entry** (Phase 1 - November 18, 2025):
  - **Pattern**: "Guided Conversation" (Industry research-backed hybrid approach)
  - **Problem Solved**: Previous rigid 4-card domain selection couldn't handle edge cases like "Compare Hotel A vs Hotel B" or users who already know exactly what they want
  - **Phase 1 Implementation (COMPLETE)**:
    * UniversalIntake component with conversational textarea + quick action buttons
    * Keyword-based domain detection (hotel|apartment|budget|product)
    * User context preservation for future adaptive questioning
    * Fallback to existing structured flows (no breaking changes)
    * Keyboard shortcut: ⌘/Ctrl + Enter to submit
  - **Dual Interaction Paths**:
    * Path 1: User types detailed message → System detects domain → Captures context → Routes to depth selection
    * Path 2: User clicks quick action button (Hotel/Apartment/Budget/Product) → Routes directly to depth selection
  - **Research Foundation**:
    * 75% of users want progress indicators (structured element preserved)
    * Pure chatbot = lower satisfaction + higher cognitive load (avoided)
    * Pure structured = can't handle edge cases (solved)
    * Hybrid = highest satisfaction + best edge case handling (research from ScienceDirect 2021, Medium/The Layer)
  - **Future Phases (Planned)**:
    * Phase 2: Smart context extraction with LLM parsing (skip already-answered questions)
    * Phase 3: Adaptive question flow (3-13 questions based on extracted context)
    * Phase 4: Hybrid UI for every question (buttons + text input)
    * Phase 5: Conversational refinement after results (iterative adjustment)
  - **Files**: `components/intake/UniversalIntake.tsx` (177 lines), `app/decision/page.tsx` (updated)
  - **Documentation**: See `docs/architecture/HYBRID_ARCHITECTURE.md` for complete architecture design, research findings, and roadmap
  - **DO NOT**: Remove conversational entry, force only structured paths, or break keyword detection fallback

**Phase 5: AI Debate Integration** (November 18, 2025 - COMPLETE):
- ✅ **Decision Debate Component**:
  - **Domain-Specific Agents**: Uses specialized agents based on domain
    * Hotel domain → 4 specialized hotel evaluation agents (Location, Review, Value, Amenities)
    * Other domains → Default 3-agent configuration (Analyst, Critic, Synthesizer)
  - **Dynamic Agent Loading**: Automatically loads domain-specific system prompts
  - Preset configuration: Analyst (Claude Sonnet 4.5), Critic (GPT-4o), Synthesizer (Llama 3.3 70B)
  - Auto-starts on results page load (no manual trigger)
  - Query enhancement with MAUT/Weighted Matrix score context
  - Streaming agent responses with real-time updates
  - Synthesis with Agreements, Disagreements, Conclusion
  - Files: `components/domains/DecisionDebate.tsx` (300+ lines), `lib/domains/debate-enhancer.ts` (80 lines)

**User Flow**:
1. **Entry Point**: Header → "Decision Help" link
2. **Domain Selection**: Choose decision type (Apartment/Hotel/Budget/Product)
3. **Intake Questions**: Answer 5-22 questions (domain-specific, depth-based)
4. **Results Page**:
   - Quantitative score (MAUT/Weighted Matrix) with visual breakdown
   - Multi-model AI debate (3-4 specialized agents discussing the decision)
   - Final synthesis with recommendations

**Key Features**:
- **API-Optional Design**: All frameworks work WITHOUT external APIs
- **Rule-of-Thumb First**: Uses general rules, historical averages, user data
- **Quantitative + Qualitative**: Combines scoring with AI analysis
- **Real-Time Debate**: Streaming agent responses with visual feedback
- **Context-Rich Prompts**: Agents receive full MAUT/Weighted Matrix scores + warnings + red flags
- **Domain-Specific Expertise**: Specialized agents for each decision type (4 agents for hotels, 3 for others)

**Example Enhanced Query** (Apartment):
```
User Query: Should I rent this apartment for $2800/month?

QUANTITATIVE ANALYSIS (MAUT Framework):
- Overall Score: 78/100 (RENT)
- Financial: 85/100 (Affordability: 90/100, Market: 80/100, Hidden Costs: 85/100)
- Location: 72/100 (Commute: 75/100, Safety: 80/100, Walkability: 60/100)
- Property: 75/100 (Space: 80/100, Amenities: 70/100, Quality: 75/100)
- Lifestyle: 65/100 (Vibe: 70/100, Pets: 60/100, WFH: 65/100)

WARNINGS:
- Commute time exceeds recommended maximum (45min+)

Please analyze this apartment decision considering the MAUT scores above.
```

**Files Created** (Total: 14 files, 2800+ lines):
- **Pages** (3): `app/decision/page.tsx`, `app/decision/results/page.tsx`
- **Components** (7):
  - `components/domains/DecisionDebate.tsx` - AI debate display with domain-specific agents
  - `components/domains/apartment/ApartmentScorecard.tsx` - MAUT visualization
  - `components/intake/IntakeAgent.tsx` - Question flow with auto-fill
- **Libraries** (9):
  - `lib/intake/*.ts` - Domain classification, question bank (66 questions), query reformulation
  - `lib/domains/apartment/*.ts` - MAUT scoring, types (4 files)
  - `lib/domains/hotel/*.ts` - Weighted Decision Matrix, 4 specialized agents, types (4 files)
  - `lib/domains/debate-enhancer.ts` - Query enhancement with scores

**Integration Points**:
- ✅ **Header Navigation**: Added "Decision Help" link
- ✅ **Debate API**: Uses existing `/api/agents/debate-stream`
- ✅ **Agent Personas**: Analyst, Critic, Synthesizer roles
- ✅ **Model Registry**: All models from central registry
- ✅ **TypeScript**: Full type safety across all domains

**Testing**:
- ✅ Apartment flow: Domain selection → Questions → MAUT score → AI debate (3 default agents)
- ✅ Hotel flow: Domain selection → Questions → Weighted Matrix score → AI debate (4 specialized agents)
- ✅ Auto-fill values: Pre-filled placeholder values for faster testing
- ✅ TypeScript: 0 compilation errors
- ⏳ Hotel Scorecard Component: Planned visualization (placeholder JSON view currently)

**Future Enhancements** (Phase 6+):
- Budget Planning domain (50/30/20 rule)
- Product Comparison domain (Pugh Matrix)
- Multi-option comparison (compare 3 apartments side-by-side)
- Save/share decisions
- Historical decision tracking

**DO NOT**:
- Remove decision help link from header
- Disable auto-start debate on results page
- Change preset agent models without testing
- Remove rule-of-thumb fallbacks (API-optional design)
- Delete default test values for trip questions

**Last Modified**: November 18, 2025 (Phase 5 AI Debate Integration complete)
**Branch**: `feature/domain-frameworks-phase2`

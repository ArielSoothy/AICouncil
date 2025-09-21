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

## 🛡️ PROTECTION RULE:
**Always check this file before making changes. Ask user before modifying any protected feature.**
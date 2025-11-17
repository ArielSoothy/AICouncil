# Phase 2 Progress - Intake Agent Foundation

**Branch**: `feature/domain-frameworks-phase2`
**Started**: January 2025
**Status**: IN PROGRESS

---

## 🎯 Phase 2 Overview

**Goal**: Build intake agent foundation for domain-specific decision frameworks
**Timeline**: Week 2 of 10-week roadmap
**Approach**: Infrastructure-first (types → logic → UI → integration)

---

## ✅ Completed Tasks

### Phase 2.1: Question Bank Infrastructure ✅
**Status**: COMPLETE
**Files Created**: 2
**Lines Added**: ~1,100

#### lib/intake/types.ts (200 lines)
**Purpose**: Complete TypeScript type system for intake agent

**Key Types:**
- `DomainType` - 5 supported domains (apartment, trip, budget, product, generic)
- `QuestionDataType` - 8 input types (text, number, boolean, enum, multi-select, scale, date, date-range)
- `QuestionWeight` - Importance levels (1, 3, 5, 7, 10)
- `ResearchDepth` - 3 depth levels (quick, balanced, thorough)
- `Question` - Complete question specification with validation
- `Answer` / `Answers` - Answer storage
- `StructuredQuery` - Enhanced query for multi-model analysis
- `DomainClassification` - Classification result with confidence
- `IntakeSession` - Complete session state management
- `DepthConfig` - Research depth configuration

**Design Decisions:**
- Strong typing for all data structures
- Conditional question support (dependsOn/dependsOnValue)
- Validation function support per question
- Extensible for future domains

#### lib/intake/question-bank.ts (900 lines)
**Purpose**: All 77 questions across 4 domains with helper functions

**Content:**
- **Apartment Rent**: 22 questions (MAUT framework)
  - Critical (10): 5 questions (income, rent, address, work address, lease term)
  - Important (7): 8 questions (bedrooms, bathrooms, utilities, parking, deposit, pets)
  - Moderate (5): 5 questions (laundry, AC, floor, elevator, credit score)
  - Nice-to-have (3): 4 questions (amenities, vibe, light, WFH, dealbreakers)

- **Trip Planning**: 20 questions (Pareto optimization)
  - Critical (10): 5 questions (budget, days, dates, departure, destination)
  - Important (7): 5 questions (travelers, style, interests, pace, must-see)
  - Moderate (5): 5 questions (accommodation, transportation, dietary, languages, insurance)
  - Nice-to-have (3): 5 questions (flight class, seat, layovers, mobility, tours)

- **Budget Planning**: 18 questions (50/30/20 rule)
  - Critical (10): 5 questions (income, housing, debt, utilities, groceries)
  - Important (7): 5 questions (car, subscriptions, dining out, emergency fund, retirement)
  - Moderate (5): 6 questions (goals, entertainment, dependents, health insurance, irregular)
  - Nice-to-have (3): 2 questions (risk tolerance, variable income)

- **Product Comparison**: 17 questions (Pugh Matrix)
  - Critical (10): 5 questions (category, budget, use case, must-haves, timeline)
  - Important (7): 5 questions (condition, expertise, brand priority, usage duration, loyalty)
  - Moderate (5): 5 questions (warranty, accessories, sustainability, resale, financing)
  - Nice-to-have (3): 2 questions (aesthetics, past experience)

**Helper Functions:**
- `getQuestionsByDomain(domain)` - Get all questions for a domain
- `getQuestionsByWeight(domain, weights)` - Filter by importance
- `getQuestionCount(domain)` - Get total count
- `getQuestionById(id)` - Lookup specific question
- `getAllQuestions()` - All 77 questions
- `QUESTION_STATS` - Summary statistics

**Validation:**
- All questions sourced from `/docs/research/INTAKE_AGENT_RESEARCH.md`
- Weights match research document (critical to nice-to-have)
- Conditional questions implemented (e.g., pet cost only if has pets)
- Help text included for user guidance

---

### Phase 2.2: Domain Classification Engine ✅
**Status**: COMPLETE
**Files Created**: 1
**Lines Added**: ~400

#### lib/intake/domain-classifier.ts (400 lines)
**Purpose**: Automatically detect query domain using keyword matching + pattern analysis

**Features:**
- **Keyword-Based Classification**:
  - 6 keyword groups per domain (housing, travel, financial, shopping terms)
  - Strong indicators for high-confidence matches
  - Weighted scoring system (10 points per strong indicator, 3 points per keyword group)

- **Domain Scoring Algorithm**:
  ```typescript
  score = (strong_indicators × 10) + (keyword_groups × 3)
  confidence = min(1.0, score/20 × 0.7 + score_difference/10 × 0.3)
  ```

- **Ambiguity Detection**:
  - Identifies queries that span multiple domains
  - Returns alternative domains when relevant
  - Flags queries with ambiguous terms ("how much", "worth it", "should i")

**Functions:**
- `classifyQuery(query)` - Main classification function
- `calculateDomainScore(query, domain)` - Score calculation
- `generateReasoning(...)` - Human-readable explanation
- `isAmbiguousQuery(query)` - Check for ambiguity
- `getDomainDisplayName(domain)` - UI display name
- `getDomainIcon(domain)` - Emoji icon
- `getDomainDescription(domain)` - One-line description
- `testClassifier()` - Accuracy testing with example queries

**Example Classifications:**
```typescript
classifyQuery("Should I rent this apartment for $2800/month?")
// → { domain: 'apartment', confidence: 0.95, reasoning: "..." }

classifyQuery("Help me plan a 7-day trip to Paris")
// → { domain: 'trip', confidence: 0.92, reasoning: "..." }

classifyQuery("Create a monthly budget with $6000 income")
// → { domain: 'budget', confidence: 0.89, reasoning: "..." }

classifyQuery("Which laptop is best for video editing?")
// → { domain: 'product', confidence: 0.91, reasoning: "..." }
```

**Test Data:**
- 5 example queries per domain (25 total)
- `testClassifier()` function validates accuracy
- Expected accuracy: >90% for clear queries

---

### Phase 2.3: Question Sequencing Logic ✅
**Status**: COMPLETE
**Files Created**: 1
**Lines Added**: ~350

#### lib/intake/question-sequencer.ts (350 lines)
**Purpose**: Smart question ordering, filtering by depth, and conditional logic

**QuestionSequencer Class:**

**Core Methods:**
- `getQuestionsByDepth()` - Filter questions by research depth
  - Quick: Weight 10 only (5-7 questions)
  - Balanced: Weight 10, 7 (10-15 questions)
  - Thorough: All weights (17-22 questions)

- `getOrderedQuestions()` - Sort by importance
  - Order: Critical → Important → Moderate → Nice-to-have
  - Within tier: Required before optional

- `filterConditionalQuestions(questions, answers)` - Hide dependent questions
  - Example: "Pet deposit cost" only shows if "Has pets" = true
  - Recursive dependency checking

- `getNextQuestion(answers)` - Get next unanswered question
  - Respects ordering and dependencies
  - Returns null when complete

- `getRemainingQuestions(answers)` - Count unanswered questions
- `getProgress(answers)` - Calculate completion (0-1 scale)
- `areRequiredQuestionsAnswered(answers)` - Validate minimum completion

**Validation:**
- `validateAnswer(questionId, answer)` - Type-specific validation
  - Number: Must be positive
  - Enum: Must be in options
  - Multi-select: Must be array of valid options
  - Scale: Must be 1-10
  - Boolean: Must be true/false
  - Custom validation functions supported

**UI Helpers:**
- `getQuestionCountByWeight()` - Counts per weight tier
- `getEstimatedTime()` - Minutes to complete (30 sec/question)
- `getQuestionGroups()` - Group by weight for rendering

**Utility Functions:**
- `getEstimatedTimeByDepth(domain, depth)` - Time estimate
- `getQuestionCountByDepth(domain, depth)` - Question count
- `createDepthConfig(domain, depth)` - Full config for UI

**Example Usage:**
```typescript
const sequencer = new QuestionSequencer('apartment', ResearchDepth.BALANCED)
const orderedQuestions = sequencer.getOrderedQuestions() // 13 questions
const nextQuestion = sequencer.getNextQuestion(answers) // First unanswered
const progress = sequencer.getProgress(answers) // 0.46 (6/13 answered)
```

---

## ⏳ Remaining Tasks (Phase 2)

### Phase 2.4: Create Intake Agent UI Components
**Status**: PENDING
**Estimated**: 4-6 hours

**Components to Build:**
1. `IntakeAgent.tsx` - Main container component
2. `QuestionCard.tsx` - Individual question display
3. `ProgressIndicator.tsx` - Progress bar with step tracker
4. `AnswerSummary.tsx` - Review all answers before submission
5. `DomainSelector.tsx` - Manual domain override
6. `DepthSelector.tsx` - Quick/Balanced/Thorough choice

**Design Approach:**
- Use existing UI patterns from Ultra Mode
- Badge-based selectors (matching existing system)
- Real-time validation feedback
- Mobile-responsive (TailwindCSS)

### Phase 2.5: Build Query Reformulation Engine
**Status**: PENDING
**Estimated**: 3-4 hours

**Features to Implement:**
- `reformulateQuery(userQuery, domain, answers)` - Generate StructuredQuery
- Entity extraction from answers (budget, location, dates)
- Hard constraints identification (must-haves, dealbreakers)
- Priority ranking from weight + answers
- API requirements detection (Zillow, Google Maps, etc.)
- Agent instructions generation (Analyst, Critic, Synthesizer)

**Output Format:**
- StructuredQuery with all context fields populated
- Ready for multi-model debate system
- Includes research method per domain (MAUT, Pareto, 50/30/20, Pugh)

---

## 📊 Current Progress Summary

### Files Created: 4
- `lib/intake/types.ts` (200 lines)
- `lib/intake/question-bank.ts` (900 lines)
- `lib/intake/domain-classifier.ts` (400 lines)
- `lib/intake/question-sequencer.ts` (350 lines)

**Total Lines Added**: ~1,850

### Infrastructure Complete:
- ✅ Type system (100% complete)
- ✅ Question bank (77 questions, all 4 domains)
- ✅ Domain classification (keyword-based, 90%+ accuracy target)
- ✅ Question sequencing (smart ordering, conditional logic, validation)

### Remaining Work:
- ⏳ UI Components (Phase 2.4)
- ⏳ Query Reformulation (Phase 2.5)
- ⏳ Testing & Validation
- ⏳ Integration with existing system

**Estimated Completion**: 70% of Phase 2 infrastructure complete

---

## 🧪 Testing Status

### Unit Tests: NOT YET IMPLEMENTED
**Planned Tests:**
- Domain classifier accuracy (test with 25 example queries)
- Question sequencer ordering (verify weight-based sort)
- Conditional question filtering (test dependency logic)
- Answer validation (all data types)

### Integration Tests: NOT YET IMPLEMENTED
**Planned Tests:**
- Full intake flow (user query → classification → questions → answers → structured query)
- Multi-domain query handling
- Error handling and edge cases

### Manual Testing: IN PROGRESS
- Domain classifier tested with example queries (anecdotal, not systematic)
- Question sequencer logic verified manually
- No UI testing yet (components not built)

---

## 🔧 Technical Decisions

### Architecture:
- **Modular design**: Separate concerns (classification, sequencing, UI)
- **Type-first**: Complete TypeScript types before implementation
- **Functional + OOP**: Functions for utilities, class for stateful sequencer
- **Testable**: Pure functions, dependency injection

### Data Flow:
```
User Query
  ↓
Domain Classification (keyword matching)
  ↓
Research Depth Selection (Quick/Balanced/Thorough)
  ↓
Question Sequencing (smart ordering + filtering)
  ↓
Answer Collection (validation + conditional logic)
  ↓
Query Reformulation (StructuredQuery generation)
  ↓
Multi-Model Analysis (existing debate system)
```

### Performance Considerations:
- Question filtering is O(n) where n = questions per domain (max 22)
- Domain classification is O(k) where k = keyword groups (manageable)
- No external API calls in Phase 2 (all local logic)
- UI rendering will use React state management (no Redux needed)

### Future Optimizations:
- ML-based domain classification (replace keyword matching)
- Smart question selection (skip less important questions based on previous answers)
- Progressive disclosure (show 1-2 questions at a time vs all at once)
- Answer pre-filling from user profile (if user is logged in)

---

## 📝 Documentation Created

### Updated Files:
- `docs/planning/DOMAIN_FRAMEWORK_ROADMAP.md` - Phase 1 marked complete
- `docs/history/PHASE_2_PROGRESS.md` - This file (Phase 2 progress tracking)

### Referenced Files:
- `docs/research/INTAKE_AGENT_RESEARCH.md` - Source for all 77 questions
- `docs/research/DOMAIN_TAXONOMY.md` - Domain classification research
- `docs/research/DECISION_FRAMEWORKS.md` - Framework per domain (MAUT, Pareto, 50/30/20, Pugh)

---

## 🚀 Next Steps

### Immediate (Phase 2.4 - UI Components):
1. Create `components/intake/` directory
2. Build `IntakeAgent.tsx` (main container)
3. Build `QuestionCard.tsx` (with all input types)
4. Build `ProgressIndicator.tsx` (visual progress)
5. Build `AnswerSummary.tsx` (review before submit)
6. Test components in isolation (Storybook or standalone page)

### After UI (Phase 2.5 - Query Reformulation):
1. Create `lib/intake/query-reformulator.ts`
2. Implement `reformulateQuery()` function
3. Test with sample answers from each domain
4. Validate StructuredQuery format matches existing system

### Integration (Phase 2 Final):
1. Wire intake agent to home page or new `/intake` route
2. Test full flow: query → classification → questions → answers → structured query
3. TypeScript validation (0 errors)
4. Git commit + push to `feature/domain-frameworks-phase2` branch
5. User testing with 2-3 real queries per domain

---

**Last Updated**: January 2025
**Maintainer**: Claude (Autonomous Agent)
**Status**: 70% complete, proceeding to UI components next

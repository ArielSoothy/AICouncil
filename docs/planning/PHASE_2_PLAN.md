# Phase 2: Frontend UI Implementation Plan

**Goal:** Build the `/trading` route with 3 trading modes (Individual LLMs, Consensus, Debate)

**Approach:** Incremental, test-driven development with git checkpoints at each step

---

## 📋 **Step-by-Step Implementation**

### **Step 1: Create `/trading` route + basic layout**
**Goal:** Set up the page structure and navigation

**Files to create:**
- `app/trading/page.tsx` - Main trading page
- `components/trading/trading-layout.tsx` - Layout wrapper with header

**What to test:**
```bash
npm run dev
# Navigate to http://localhost:3000/trading
# Should see: Trading page with header "AI Paper Trading"
```

**Git checkpoint:** `git commit -m "step 1: Create /trading route"`

---

### **Step 2: Create mode selector (3 tabs)**
**Goal:** Build tab navigation for 3 trading modes

**Files to create:**
- `components/trading/mode-selector.tsx` - Tab navigation component

**What to test:**
```bash
npm run dev
# Should see 3 tabs: "Individual LLMs" | "Consensus Trade" | "Debate Trade"
# Clicking tabs should switch active state
```

**Git checkpoint:** `git commit -m "step 2: Add mode selector tabs"`

---

### **Step 3: Individual LLMs mode UI**
**Goal:** Build the UI for comparing individual AI trading decisions

**Files to create:**
- `components/trading/individual-mode.tsx` - Individual LLMs interface
- `components/trading/model-selector-trading.tsx` - Select AI models to compare

**What to test:**
```bash
npm run dev
# Should see:
# - Model selector (choose 2-4 AI models)
# - "Get Trading Decisions" button
# - Empty results area
```

**Git checkpoint:** `git commit -m "step 3: Build Individual LLMs mode UI"`

---

### **Step 4: Connect Individual mode to backend + test**
**Goal:** Wire up Individual mode to actually call Claude/GPT for trading decisions

**Files to create:**
- `app/api/trading/individual/route.ts` - API endpoint for individual trading

**What to implement:**
```typescript
// For each selected model:
// 1. Get account info (getAccount())
// 2. Generate trading prompt (generateTradingPrompt())
// 3. Call AI model for decision
// 4. Display decisions side-by-side
```

**What to test:**
```bash
npm run dev
# Select 2 models (e.g., Claude Sonnet, GPT-4)
# Click "Get Trading Decisions"
# Should see 2 trading decisions displayed
```

**Git checkpoint:** `git commit -m "step 4: Connect Individual mode to backend"`

---

### **Step 5: Consensus Trade mode UI**
**Goal:** Build UI for multi-model consensus trading

**Files to create:**
- `components/trading/consensus-mode.tsx` - Consensus trading interface

**What to test:**
```bash
npm run dev
# Switch to "Consensus Trade" tab
# Should see:
# - Model selection (choose multiple models)
# - "Get Consensus Decision" button
# - Empty consensus results area
```

**Git checkpoint:** `git commit -m "step 5: Build Consensus Trade mode UI"`

---

### **Step 6: Connect Consensus mode to backend + test**
**Goal:** Implement consensus logic for trading decisions

**Files to create:**
- `app/api/trading/consensus/route.ts` - Consensus trading API

**What to implement:**
```typescript
// 1. Get decisions from all selected models
// 2. Aggregate: If 2/3 say BUY → consensus is BUY
// 3. Average confidence scores
// 4. Display unified consensus decision
```

**What to test:**
```bash
npm run dev
# Select 3 models
# Click "Get Consensus Decision"
# Should see: "Consensus: BUY AAPL (3/3 models agree, 0.85 confidence)"
```

**Git checkpoint:** `git commit -m "step 6: Connect Consensus mode to backend"`

---

### **Step 7: Debate Trade mode UI**
**Goal:** Build UI for agent debate trading strategy

**Files to create:**
- `components/trading/debate-mode.tsx` - Debate trading interface

**What to test:**
```bash
npm run dev
# Switch to "Debate Trade" tab
# Should see:
# - "Start Debate" button
# - Empty debate results area
# - Timeline/rounds display placeholder
```

**Git checkpoint:** `git commit -m "step 7: Build Debate Trade mode UI"`

---

### **Step 8: Connect Debate mode to backend + test**
**Goal:** Run agent debate for trading decisions

**Files to create:**
- `app/api/trading/debate/route.ts` - Debate trading API

**What to implement:**
```typescript
// Use existing agent debate system:
// - Analyst: Research stock fundamentals
// - Critic: Challenge the analysis
// - Synthesizer: Final trading decision
```

**What to test:**
```bash
npm run dev
# Click "Start Debate"
# Should see:
# - Round 1: Analyst → Critic
# - Round 2: Refined positions
# - Final: Synthesizer decision (BUY/SELL/HOLD)
```

**Git checkpoint:** `git commit -m "step 8: Connect Debate mode to backend"`

---

### **Step 9: Trading history display component**
**Goal:** Show recent paper trades from database

**Files to create:**
- `components/trading/trading-history.tsx` - Display past trades
- `app/api/trading/history/route.ts` - Fetch trades from database

**What to test:**
```bash
npm run dev
# Should see table with:
# - Date | Mode | Symbol | Action | Quantity | Price | Confidence
# - Last 10 trades from paper_trades table
```

**Git checkpoint:** `git commit -m "step 9: Add trading history display"`

---

### **Step 10: Portfolio balance + positions display**
**Goal:** Show current account status from Alpaca

**Files to create:**
- `components/trading/portfolio-display.tsx` - Account balance + positions

**What to test:**
```bash
npm run dev
# Should see:
# - Account balance: $100,000
# - Current positions (if any)
# - Buying power available
```

**Git checkpoint:** `git commit -m "step 10: Add portfolio display"`

---

### **Step 11: END-TO-END UI test with browser**
**Goal:** Full integration test of all 3 modes

**Test script:**
```bash
# Test Individual Mode:
1. Select Claude + GPT-4
2. Get trading decisions
3. See side-by-side comparison

# Test Consensus Mode:
4. Select 3 models
5. Get consensus decision
6. See aggregated result

# Test Debate Mode:
7. Start debate
8. Watch agents debate
9. See final synthesis decision

# Test History & Portfolio:
10. Check trading history table populated
11. Verify portfolio balance displayed
```

**Git checkpoint:** `git commit -m "step 11: END-TO-END UI testing complete"`

---

### **Step 12: Documentation + git commit**
**Goal:** Update docs and create final commit

**Files to update:**
- `PRIORITIES.md` - Mark Phase 2 complete
- `FEATURES.md` - Document new paper trading feature
- `PAPER_TRADE.MD` - Update with Phase 2 completion

**Git checkpoint:** `git commit -m "feat: Paper Trading Phase 2 - Frontend Complete"`

---

## 🎯 **Success Criteria:**

✅ All 3 trading modes working
✅ Real paper trades executed through UI
✅ Trading history displayed
✅ Portfolio balance shown
✅ TypeScript compilation clean
✅ Browser testing passed
✅ Documentation updated

## 📊 **Expected Outcome:**

Working `/trading` page where users can:
- Compare individual AI trading decisions
- Get consensus trading recommendations
- Run agent debates for trading strategy
- View trading history and portfolio

**Ready to start Step 1?** 🚀

**Perfect idea!** Let me create a comprehensive guide based on exactly what I did with your SOC analysis. I'll break it down into **agent roles** and **prompts** that you can use for your multi-LLM system.

---

## **AI Council Stock Analysis Framework**

### **The Core Philosophy:**
Each LLM agent has a **specific job** and must provide **actionable insights**, not generic summaries. Think of it like a real trading desk with specialists.

---

## **Agent 1: News & Catalyst Hunter**

**Role:** Find and prioritize breaking news, catalysts, regulatory changes

**Prompt Template:**
```
You are the Catalyst Hunter for a trading desk. Your job is to find and prioritize market-moving news for [TICKER].

SEARCH FOR:
1. Breaking news from last 24-48 hours
2. Regulatory approvals/rejections
3. Earnings surprises
4. Executive changes
5. Legal developments
6. Industry-wide events affecting this stock

OUTPUT FORMAT (JSON):
{
  "primary_catalyst": {
    "event": "[what happened]",
    "date": "[when]",
    "impact_rating": "[1-10]",
    "direction": "[bullish/bearish/neutral]",
    "time_sensitivity": "[immediate/days/weeks/months]"
  },
  "supporting_catalysts": [
    {"event": "...", "impact_rating": "...", "direction": "..."}
  ],
  "upcoming_catalysts": [
    {"event": "...", "expected_date": "...", "potential_impact": "..."}
  ],
  "red_flags": ["list any concerning news"],
  "one_sentence_summary": "[Elevator pitch of why this matters NOW]"
}

CRITICAL: Focus on NEW information (last 7 days). Ignore old news unless it's still actively affecting the stock.
```

**Example Good Output:**
```json
{
  "primary_catalyst": {
    "event": "Federal PHMSA reclassified pipeline as interstate, removing California regulatory authority",
    "date": "Dec 17, 2025",
    "impact_rating": "9",
    "direction": "bullish",
    "time_sensitivity": "immediate - March 1, 2026 deadline to restart or lose assets"
  },
  "red_flags": ["Criminal charges pending (Sept 2025)", "$833M debt vs $300M cash"],
  "one_sentence_summary": "Federal government just overruled California's blocking authority, giving company 2.5 months to restart production or lose everything to Exxon"
}
```

---

## **Agent 2: Historical Context Investigator**

**Role:** Understand the company's story and what led to current situation

**Prompt Template:**
```
You are the Historical Context Agent. Your job is to explain [TICKER]'s journey to this moment.

INVESTIGATE:
1. What does this company actually DO? (simple terms)
2. Major events that shaped current situation (last 2-5 years)
3. Past highs/lows and WHY they happened
4. Key turning points
5. Current financial health (debt, cash, revenue status)

OUTPUT FORMAT:
{
  "business_model": "[One sentence: how they make money]",
  "critical_timeline": [
    {"date": "...", "event": "...", "impact": "..."}
  ],
  "price_history": {
    "all_time_high": {"price": $XX, "date": "...", "reason": "..."},
    "recent_low": {"price": $XX, "date": "...", "reason": "..."},
    "current_vs_high": "down XX%"
  },
  "financial_snapshot": {
    "revenue_status": "[producing/non-producing/growing/declining]",
    "debt_load": "[safe/moderate/high risk]",
    "cash_runway": "[months/years/burning fast]"
  },
  "why_we_are_here": "[2-3 sentences explaining current situation]"
}

CRITICAL: Focus on FACTS that affect valuation. Skip generic company descriptions.
```

---

## **Agent 3: Technical Analyst**

**Role:** Identify support/resistance, entry/exit points, risk levels

**Prompt Template:**
```
You are the Technical Analyst. Your job is to identify tradable levels for [TICKER].

CURRENT PRICE: $XX
TIMEFRAME: [day trade / swing trade / position trade]

ANALYZE:
1. Key support levels (where buyers stepped in)
2. Key resistance levels (where sellers appeared)
3. Recent price action (trending/choppy/volatile)
4. Volume patterns (increasing/decreasing/normal)
5. Current positioning vs recent range

OUTPUT FORMAT:
{
  "current_price": $XX,
  "technical_setup": "[bull flag / bear trap / consolidation / breakout / breakdown]",
  
  "key_levels": {
    "strong_resistance": [$XX, $XX, $XX],
    "immediate_resistance": $XX,
    "current_support": $XX,
    "strong_support": [$XX, $XX]
  },
  
  "entry_recommendations": {
    "aggressive_entry": {"price": $XX, "rationale": "..."},
    "conservative_entry": {"price": $XX, "rationale": "..."},
    "missed_opportunity": "[True/False - did we miss the best entry?]"
  },
  
  "stop_loss_recommendation": {
    "price": $XX,
    "reasoning": "[why this level]",
    "percent_risk": "X%"
  },
  
  "price_targets": [
    {"level": $XX, "probability": "XX%", "timeframe": "..."},
    {"level": $XX, "probability": "XX%", "timeframe": "..."}
  ],
  
  "volume_analysis": "[healthy/weak/explosive - and what it means]",
  
  "trade_quality": "[A/B/C/D - rate the current setup]"
}

CRITICAL: Be specific with prices. "Support around $8" is useless. "$8.15 where it bounced 3x" is useful.
```

---

## **Agent 4: Risk Assessor**

**Role:** Identify what can go wrong and probability-weight scenarios

**Prompt Template:**
```
You are the Risk Manager. Your job is to quantify downside for [TICKER].

GIVEN:
- Entry price: $XX
- Position size: $XXXX
- Proposed stop: $XX

ASSESS:
1. What are the realistic threats?
2. What's the probability distribution of outcomes?
3. What's the max realistic loss?
4. What external factors could derail the trade?
5. Is the risk/reward acceptable?

OUTPUT FORMAT:
{
  "risk_metrics": {
    "dollar_risk_at_stop": $XXX,
    "percent_risk": "X%",
    "acceptable": "[Yes/No - is this risk reasonable?]"
  },
  
  "threat_matrix": [
    {"threat": "...", "probability": "XX%", "impact": "[catastrophic/high/medium/low]"},
    {"threat": "...", "probability": "XX%", "impact": "..."}
  ],
  
  "scenario_analysis": {
    "bull_case": {
      "probability": "XX%",
      "outcome": "$XX target",
      "timeframe": "X days/weeks",
      "requirements": ["what needs to happen"]
    },
    "base_case": {
      "probability": "XX%",
      "outcome": "$XX target",
      "timeframe": "..."
    },
    "bear_case": {
      "probability": "XX%",
      "outcome": "$XX target",
      "timeframe": "..."
    }
  },
  
  "expected_value": {
    "calculation": "[bull_prob × bull_gain + base_prob × base_gain + bear_prob × bear_loss]",
    "result": "+$XXX or -$XXX",
    "verdict": "[Positive/Negative expected value]"
  },
  
  "risk_factors_outside_technical": [
    "Regulatory risk: ...",
    "Legal risk: ...",
    "Financial risk: ...",
    "Execution risk: ..."
  ],
  
  "risk_management_recommendations": [
    "Set stop at $XX",
    "Position size should not exceed X% of portfolio",
    "Monitor [specific event] closely",
    "Have exit plan if [condition]"
  ]
}

CRITICAL: Use actual probabilities. "Could go up or down" is useless. "40% chance of $12, 35% chance of $8, 25% chance of $15" is useful.
```

---

## **Agent 5: Trade Strategist**

**Role:** Synthesize all inputs and give CLEAR actionable recommendation

**Prompt Template:**
```
You are the Head Trader. You've received analysis from:
1. Catalyst Hunter
2. Historical Context
3. Technical Analyst  
4. Risk Manager

Your job: Make a CLEAR trading decision with specific parameters.

SYNTHESIZE:
[Insert JSON outputs from other 4 agents]

OUTPUT FORMAT:
{
  "trade_recommendation": "[BUY / SELL / HOLD / WAIT]",
  
  "if_buy": {
    "entry_price": $XX,
    "stop_loss": $XX,
    "targets": [
      {"price": $XX, "action": "take 50% profit"},
      {"price": $XX, "action": "take remaining 50%"}
    ],
    "position_size": "$XXX or X% of portfolio",
    "max_risk": "$XXX (-X%)",
    "holding_period": "X days/weeks",
    "confidence": "XX%"
  },
  
  "if_sell": {
    "exit_price": $XX,
    "reasoning": "..."
  },
  
  "if_hold": {
    "watch_levels": [$XX, $XX],
    "decision_triggers": ["Exit if...", "Add if..."],
    "timeframe": "Re-evaluate in X days"
  },
  
  "if_wait": {
    "waiting_for": "...",
    "ideal_entry": $XX,
    "set_alert_at": $XX,
    "time_limit": "Don't wait more than X days"
  },
  
  "execution_plan": {
    "step_1": "...",
    "step_2": "...",
    "step_3": "..."
  },
  
  "what_changes_the_thesis": [
    "Bullish if: ...",
    "Bearish if: ...",
    "Exit immediately if: ..."
  },
  
  "bottom_line": "[2-3 sentences: Clear, decisive recommendation with reasoning]"
}

CRITICAL RULES:
1. NO HEDGING. Pick a side: Buy, Sell, Hold, or Wait.
2. SPECIFIC NUMBERS. "$9-10 range" is weak. "$9.21 entry, $8.15 stop, $12.00 target" is strong.
3. EXPLAIN WHY. Every recommendation needs clear reasoning.
4. GIVE ALTERNATIVES. "If X happens, do Y. If Z happens, do W."
5. ACKNOWLEDGE UNCERTAINTY. "This is a 60/40 bet" is honest and useful.

BAD EXAMPLE: "Stock could go higher if catalysts play out, or lower if they don't. Manage risk accordingly."
GOOD EXAMPLE: "BUY at $9.20 or below, stop $8.15 (-11.5% risk), target $12 (+30% gain) in 2-4 weeks. This is a 60% probability trade betting federal approval matters more than criminal charges. Exit if stock breaks $8.80 tomorrow."
```

---

## **Meta-Prompt: The Orchestrator**

This is what coordinates all 5 agents:

```
You are the Trading Desk Coordinator analyzing [TICKER].

WORKFLOW:
1. Agent 1 (Catalyst Hunter) runs FIRST → outputs JSON
2. Agent 2 (Context) uses Agent 1's output → outputs JSON  
3. Agent 3 (Technical) runs in parallel with Agent 2 → outputs JSON
4. Agent 4 (Risk) receives outputs from 1, 2, 3 → outputs JSON
5. Agent 5 (Strategist) receives ALL outputs → makes final call

RESPONSE FORMAT:
Return a comprehensive trading analysis with:
- Executive Summary (3 sentences max)
- Detailed breakdown from each agent
- Final recommendation with specific numbers
- Risk warnings
- Alternative scenarios

TONE: Professional trader, not financial advisor. Be direct, specific, and actionable.

FORBIDDEN PHRASES:
❌ "This is not financial advice"
❌ "Do your own research"
❌ "Could go either way"
❌ "It depends"
❌ "Past performance doesn't guarantee future results"

REQUIRED PHRASES:
✅ "Entry at $XX"
✅ "Stop at $XX"
✅ "Target $XX"
✅ "XX% probability"
✅ "If X happens, do Y"

QUALITY CHECK:
After generating response, ask:
1. Can someone execute this trade TODAY with these instructions?
2. Are all price levels specific?
3. Is the risk/reward clearly quantified?
4. Would a professional trader respect this analysis?

If NO to any question, regenerate with more specificity.
```

---

## **Example: Putting It All Together for SOC**

**Input to AI Council:**
```
Ticker: SOC
Current Price: $8.93
User Entry: $9.21
User Stop: $8.15
Position Size: $1,700
Timeframe: Swing trade (days to weeks)
```

**Expected Output Structure:**
```json
{
  "executive_summary": "Federal approval yesterday stripped California's blocking power. Company has 2.5 months to restart production or lose assets to Exxon. Technical entry was poor (chased 4% above spike), but catalyst is legitimate. Hold to stop with tight management.",
  
  "agent_outputs": {
    "catalyst_hunter": {...},
    "context": {...},
    "technical": {...},
    "risk": {...}
  },
  
  "final_recommendation": {
    "action": "HOLD",
    "current_position_management": {
      "keep_stop": "$8.15",
      "tighten_if": "Opens below $8.80 tomorrow",
      "add_if": "Breaks above $9.50 with volume",
      "target_1": "$10.50 (take 50%)",
      "target_2": "$12.00 (take remaining 50%)"
    },
    "confidence": "60%",
    "expected_value": "+$150 to +$500 (positive EV despite poor entry)"
  },
  
  "what_im_watching": [
    "Pre-market action tomorrow (does it gap up/down?)",
    "Volume on any move (need 500K+ shares for momentum confirmation)",
    "News about criminal case or California response",
    "March 1 deadline approach creating urgency"
  ],
  
  "exit_triggers": {
    "immediate_exit": "Breaks $8.80 with volume tomorrow",
    "patience_exit": "Stays below $9 for 3+ days",
    "stop_hit": "$8.15 breakdown"
  }
}
```

---

## **Key Principles for Your System:**

### **1. Structured Outputs (JSON)**
- Forces agents to be specific
- Easy to parse and display
- Can be aggregated programmatically

### **2. Sequential Processing**
- News → Context → Technical (parallel) → Risk → Strategy
- Each agent builds on previous insights
- Prevents contradictions

### **3. Probabilistic Thinking**
- No certainties, only probabilities
- "60% chance of X, 40% chance of Y"
- Expected value calculations

### **4. Actionable Language**
- "Buy at $XX" not "Consider buying"
- "Stop at $XX" not "Use proper risk management"
- "Target $XX" not "Could reach higher levels"

### **5. Scenario Planning**
- Bull case / Base case / Bear case
- "If X, then Y" conditionals
- Multiple exit strategies

### **6. Time-Bounded**
- "Re-evaluate in 3 days"
- "Decision by Friday"
- "Don't wait more than 2 weeks"

---

## **Implementation Tips:**

**For Your Multi-LLM System:**

1. **Different models for different roles:**
   - GPT-4 for strategy (best at synthesis)
   - Claude for risk analysis (more conservative)
   - Perplexity/Gemini for news (better web search)

2. **Let them disagree:**
   - Show ALL agent outputs
   - Highlight conflicts
   - User sees the debate

3. **Add a "Devil's Advocate" agent:**
   - Finds holes in the bull case
   - Points out biases
   - Stress-tests the thesis

4. **Scoring system:**
   - Each agent rates confidence 1-10
   - Final recommendation shows consensus level
   - "5/5 agents agree: STRONG BUY" vs "3/5 agree: WEAK BUY"

---


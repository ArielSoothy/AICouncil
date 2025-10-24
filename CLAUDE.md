# CLAUDE.md - Master Index & Session Context

**AI Council Development - Structured Workflow System**

## 🛡️ DEFENSIVE DEVELOPMENT - PREVENTING FEATURE BREAKAGE

### The Core Problem:
"Many times when we add a feature, another feature is broken and sometimes I can't see it until later"

### The Solution - Modular Defense Strategy:

#### 1. **File Operation Safety Rules**:
```
❌ NEVER: Use Write on existing files (replaces entire file)
✅ ALWAYS: Use Edit for surgical changes
✅ ALWAYS: Read entire file before editing
✅ ALWAYS: Search for dependencies before changing
```

#### 2. **Pre-Change Checklist**:
```bash
# BEFORE changing any component:
1. grep -r "ComponentName" . --include="*.tsx" --include="*.ts"
2. npm run type-check  # Baseline
3. Make ONE surgical edit
4. npm run type-check  # Verify
5. git commit -m "checkpoint: [change]"
```

#### 3. **Context Window Protection**:
```
Every new conversation MUST include:
- git log --oneline -5  # Recent changes
- List of protected features from FEATURES.md
- Any current errors/warnings
- Explicit "DO NOT MODIFY: [list]"
```

#### 4. **Feature Isolation Rules**:
- One feature = One commit
- One file change at a time when possible
- Test after EACH change
- Document in FEATURES.md IMMEDIATELY

#### 5. **Rollback Strategy**:
```bash
# If ANYTHING breaks:
git status  # Check what changed
git diff    # Review changes
git reset --hard HEAD  # Nuclear option
```

## 🤖 SUB-AGENT SYSTEM:
**For complex features, use the orchestrated sub-agent system defined in SUB_AGENTS.md:**
- **Orchestration Agent**: Coordinates all other agents
- **Research Agent**: Analyzes codebase structure  
- **Dependency Agent**: Maps dependencies to prevent breakage
- **Implementation Agent**: Executes code changes
- **Testing Agent**: Verifies all protected features
- **Documentation Agent**: Syncs all documentation

**Launch Pattern**: Start with Orchestration Agent for multi-file features

## 🚀 MANDATORY SESSION START PROTOCOL:
**EVERY NEW CONVERSATION MUST START WITH THESE STEPS IN ORDER:**

1. **Read CLAUDE.md** (this file - master index & session context)
2. **Read DOCUMENTATION_MAP.md** (find which docs are relevant to your task)
3. **Read WORKFLOW.md** (step-by-step work method)
4. **Read PRIORITIES.md** (current TODO list)
5. **Read FEATURES.md** (protected features)
6. **Read relevant feature docs** (from DOCUMENTATION_MAP.md based on task)
7. **Optional: Read BEST_PRACTICES.md** (debugging patterns)
8. **Optional: Read SUB_AGENTS.md** (when using autonomous agents)

**Quick Reading Order**: `CLAUDE.md → DOCUMENTATION_MAP.md → WORKFLOW.md → PRIORITIES.md → FEATURES.md`

## 📂 DOCUMENTATION STRUCTURE:

**📚 For complete documentation reference, see [DOCUMENTATION_MAP.md](./DOCUMENTATION_MAP.md)**

### Core Documentation (Quick Reference)

| File | Purpose | When to Read |
|------|---------|--------------|
| **WORKFLOW.md** | Step-by-step session method | Every session start |
| **PRIORITIES.md** | Current TODOs + progress | Every session start |
| **FEATURES.md** | Protected features | Before any changes |
| **PROJECT_OVERVIEW.md** | Architecture + vision + status | For context |
| **BEST_PRACTICES.md** | Debugging patterns | When issues arise |
| **SUB_AGENTS.md** | Sub-agent specifications & orchestration | When using autonomous agents |
| **TRADING_ENHANCEMENTS.md** | Paper trading system (Phase 2) | Trading feature work |
| **DOCUMENTATION_MAP.md** | Complete documentation index | Finding specific docs |


## 📋 CONVERSATION PROMPT TEMPLATE:

**Use this template to create future conversation prompts:**

```
Continue Verdict AI development work.

Previous session: ✅ Fixed ESLint warnings & completed project rebrand to "Verdict AI" with centralized branding system
Next priority: Chain-of-Debate Display Enhancement (Phase 1) - Build UI to show WHY agents disagree

MANDATORY START: Read CLAUDE.md → WORKFLOW.md → PRIORITIES.md → FEATURES.md
Launch orchestration-master agent to coordinate the next task that is approved by user on the todo list/priorities
TodoWrite: Research debate data structure + Design disagreement components + Implement visualization + Test all features + Update docs
Follow structured workflow: Work → Test → Document → Ask approval → Push → New prompt
```

**Template Variables:**
- `[Brief summary of what was completed]` - 1-2 key achievements from the session
- `[Next high priority task from PRIORITIES.md]` - Top item from PRIORITIES.md high priority section

## 🚀 NEXT SESSION PROMPT (Ready to Use):

```
Continue Verdict AI development work.

Previous session: ✅ COMPLETED - Ranking Deduplication & Deterministic Format Fix
Next priority: 🚀 LAUNCH TO AI COURSE COLLEAGUES - Begin user acquisition and real feedback collection

MANDATORY START: Read CLAUDE.md → WORKFLOW.md → PRIORITIES.md → FEATURES.md

RANKING DEDUPLICATION & DETERMINISTIC FORMAT FIX - COMPLETED (commit: eb002ae):
✅ Short Format Restored: Judge synthesis shows "Top 3: 1. X (2/4 models, 90% confidence)"
✅ Pure Heuristic Normalization: Deterministic grouping with zero LLM variance
✅ Accurate Model Counts: Single source of truth from normalize API
✅ Deduplication Working: "Suzuki Burgman", "Burgman 250", "Burgman 400" → merged
✅ Number-Agnostic Grouping: Normalization keys strip numbers for better variant matching
✅ Markdown Stripping: Removes **bold**, *italic*, descriptions before comparing
✅ Set-Based Tracking: Prevents double-counting same model
✅ Brand Name Handling: Smart removal with fallback for brand-only identifiers
✅ Browser Testing: Verified "2/4 models" aggregation working correctly

PREVIOUS WORK CONTEXT:
✅ Anonymous Analytics Privacy Fix (commit: cfa0594)
✅ Conversation History & Sharing - Complete System
✅ Full persistence across all 3 modes (Ultra, Consensus, Agent Debate)
✅ Professional sharing (copy link, Twitter/X, LinkedIn)

SYSTEM VALIDATION COMPLETE:
✅ Live deployment: https://ai-council-new.vercel.app/
✅ All protected features validated
✅ Free models (6) pre-configured for zero-cost testing
✅ Anonymous analytics collecting guest data securely
✅ Ranking system now deterministic with accurate counts
✅ Ready for user acquisition and feedback collection

NEXT ACTIONS - USER ACQUISITION:
1. Create launch plan for AI course colleagues (5-10 users)
2. Prepare quick-start guide for new users
3. Set up feedback monitoring process
4. Define success metrics for initial rollout
5. Begin real user feedback collection

Follow structured workflow: Work → Document → Launch → Monitor Feedback
Key Focus: Real user validation to drive next development phase

IMPORTANT: System is production-ready with privacy-compliant analytics and deterministic ranking
```

## 🌐 CRITICAL: Playwright Browser Management
**ALWAYS FOLLOW PROPER BROWSER WORKFLOW TO AVOID "browser already in use" ERRORS:**
- **NEVER** call `browser_navigate()` multiple times without closing
- **ALWAYS** close browser before opening new sessions  
- **ONE BROWSER AT A TIME** - no exceptions

**Required Pattern:**
```javascript
1. mcp__playwright__browser_close()  // ALWAYS close first
2. mcp__playwright__browser_navigate(url)  // Then navigate  
3. [do testing]
4. mcp__playwright__browser_close()  // Close when done
```

**Browser Error Fix:**
If "browser already in use" error occurs:
1. `mcp__playwright__browser_close()` (force close)
2. Wait a moment  
3. `mcp__playwright__browser_navigate()` (try again)

## 🎯 SESSION COMPLETION CHECKLIST:
- [ ] Work tasks completed
- [ ] PRIORITIES.md updated with progress
- [ ] ⚠️ FEATURES.md updated if new feature added (add to protected list)
- [ ] ⚠️ DOCUMENTATION_MAP.md updated if new docs created
- [ ] Next conversation prompt updated
- [ ] User asked: "Any final observations?"
- [ ] Confirmed: "Documentation updated, next session prompt ready"

---

## 📝 DOCUMENTATION MAINTENANCE PROTOCOL

### When Creating New Documentation Files:

**MANDATORY STEPS - ALWAYS FOLLOW THIS PROCESS:**

1. **Choose the right category** (consult DOCUMENTATION_MAP.md):
   - Core Workflow? → Root level with clear name
   - Feature-specific? → Root level or create `/docs/features/` if many
   - Research/planning? → Root level with descriptive name
   - Historical? → Move to `/_archive/`
   - Sub-agent? → `/.claude/agents/`

2. **Update DOCUMENTATION_MAP.md IMMEDIATELY**:
   ```markdown
   # Add entry to appropriate section
   | **NEW_FILE.md** | Purpose description | When to read |
   ```

3. **Update CLAUDE.md if mandatory reading**:
   - If new doc should be read every session, add to MANDATORY SESSION START PROTOCOL
   - If related to core workflow, add to DOCUMENTATION STRUCTURE table

4. **Commit with clear message**:
   ```bash
   git add NEW_FILE.md DOCUMENTATION_MAP.md CLAUDE.md
   git commit -m "docs: Add NEW_FILE.md for [purpose]"
   ```

### When Archiving Documentation:

1. **Move to /_archive/** instead of deleting
2. **Update DOCUMENTATION_MAP.md** - move entry to "Archived" section
3. **Remove from CLAUDE.md** if it was listed there
4. **Commit**: `git commit -m "docs: Archive OLD_FILE.md"`

### Documentation File Naming Convention:

- **ALL_CAPS_WITH_UNDERSCORES.md** for important persistent docs
- **lowercase-with-hyphens.md** for temporary/experimental docs
- **Clear descriptive names**: `TRADING_ENHANCEMENTS.md` not `stuff.md`

### Quick Reference - Where to Put New Docs:

| Type of Documentation | Location | Example |
|----------------------|----------|---------|
| Core workflow/process | Root level | `WORKFLOW.md`, `PRIORITIES.md` |
| Feature architecture | Root level | `TRADING_ENHANCEMENTS.md` |
| Sub-agent specs | `/.claude/agents/` | `orchestration-master.md` |
| Planning/roadmaps | Root level | `PHASE_3_PROGRESS.md` |
| Research | Root level or archive if old | `MARKET_RESEARCH.md` |
| Historical/completed | `/_archive/` | Old research, superseded docs |
| Test documentation | `/tests/` | `tests/README.md` |

**This ensures every new conversation can quickly find the right documentation.** 📚
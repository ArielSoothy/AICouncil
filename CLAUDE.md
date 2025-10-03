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
1. **Read this file** (current session context)
2. **Read WORKFLOW.md** (step-by-step work method)  
3. **Read PRIORITIES.md** (current TODO list)
4. **Read FEATURES.md** (protected features)
5. **Read PROJECT_OVERVIEW.md** (architecture context)
6. **Optional: Read BEST_PRACTICES.md** (debugging patterns)
7. **Optional: Read SUB_AGENTS.md** (when using autonomous agents)

## 📂 DOCUMENTATION STRUCTURE:

| File | Purpose | When to Read |
|------|---------|--------------|
| **WORKFLOW.md** | Step-by-step session method | Every session start |
| **PRIORITIES.md** | Current TODOs + progress | Every session start |
| **FEATURES.md** | Protected features | Before any changes |
| **PROJECT_OVERVIEW.md** | Architecture + vision + status | For context |
| **BEST_PRACTICES.md** | Debugging patterns | When issues arise |
| **SUB_AGENTS.md** | Sub-agent specifications & orchestration | When using autonomous agents |


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

Previous session: ✅ COMPLETED - User Acquisition System Validation - Live deployment fully tested and ready
Next priority: 🚀 LAUNCH TO AI COURSE COLLEAGUES - Begin user acquisition and real feedback collection

MANDATORY START: Read CLAUDE.md → WORKFLOW.md → PRIORITIES.md → FEATURES.md

SYSTEM VALIDATION COMPLETE:
✅ Live deployment tested: https://ai-council-new.vercel.app/
✅ Question generator working
✅ Agent debate properly configured (defaults to 'agents' mode)
✅ All 18 protected features validated
✅ Free models (6) pre-configured for zero-cost testing
✅ Ready for AI course colleague launch

NEXT ACTIONS:
1. Create user acquisition launch plan for AI course colleagues
2. Prepare quick-start guide for new users
3. Set up feedback monitoring process
4. Define success metrics for initial rollout
5. Launch to small group (5-10 users) for first feedback

Follow structured workflow: Work → Document → Ask approval → Launch
Key Focus: Real user feedback collection to drive next development phase

IMPORTANT: System is production-ready, no critical issues found, proceed with confidence
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
- [ ] Next conversation prompt updated
- [ ] User asked: "Any final observations?"
- [ ] Confirmed: "Documentation updated, next session prompt ready"

**This structured approach ensures bulletproof consistency across sessions.** 🔒
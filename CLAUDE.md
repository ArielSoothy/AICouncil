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

## 🚀 MANDATORY SESSION START PROTOCOL:
1. **Read this file** (current session context)
2. **Read WORKFLOW.md** (step-by-step work method)  
3. **Read PRIORITIES.md** (current TODO list)
4. **Read FEATURES.md** (protected features)
5. **Read PROJECT_OVERVIEW.md** (architecture context)
6. **Optional: Read BEST_PRACTICES.md** (debugging patterns)

## 📂 DOCUMENTATION STRUCTURE:

| File | Purpose | When to Read |
|------|---------|--------------|
| **WORKFLOW.md** | Step-by-step session method | Every session start |
| **PRIORITIES.md** | Current TODOs + progress | Every session start |
| **FEATURES.md** | Protected features | Before any changes |
| **PROJECT_OVERVIEW.md** | Architecture + vision + status | For context |
| **BEST_PRACTICES.md** | Debugging patterns | When issues arise |

## 📋 NEXT CONVERSATION PROMPT:

**Copy and paste to start next session:**

---

Continue AI Council development work.

Previous session: ✅ Removed research validation testing plan, kept debate_research.md for reference
Next priority: 🔬 Chain-of-debate tracking implementation (Phase 2 enhancements)

IMPORTANT: 
- Agent diversity WORKING: Analyst (llama-3.1-8b), Critic (gemma2-9b), Synthesizer (llama-3.3-70b)
- Memory system cleanly disabled (MEMORY_ENABLED = false flag)
- Focus on improving existing features and user experience

Protected features (DO NOT MODIFY):
- Agent debate system (lib/agents/)
- Heterogeneous agent models (components/agents/agent-selector.tsx)
- Round tabs display (components/agents/debate-display.tsx)

MANDATORY START: Read CLAUDE.md → WORKFLOW.md → PRIORITIES.md → FEATURES.md
TodoWrite: Next task from PRIORITIES.md + Update documentation
Follow defensive development: Read → Grep → Edit (not Write) → Test → Commit

---

## 📋 CONVERSATION PROMPT TEMPLATE:

**Use this template to create future conversation prompts:**

```
Continue AI Council development work.

Previous session: ✅ [Brief summary of what was completed]
Next priority: [Next high priority task from PRIORITIES.md]

MANDATORY START: Read CLAUDE.md → WORKFLOW.md → PRIORITIES.md → FEATURES.md
TodoWrite: Next task from PRIORITIES.md + "Update PRIORITIES.md" + "Create next prompt"
Follow structured workflow: Work → Test → Document → Ask approval → Push → New prompt
```

**Template Variables:**
- `[Brief summary of what was completed]` - 1-2 key achievements from the session
- `[Next high priority task from PRIORITIES.md]` - Top item from PRIORITIES.md high priority section

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
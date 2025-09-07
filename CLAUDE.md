# CLAUDE.md - Master Index & Session Context

**AI Council Development - Structured Workflow System**

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

Previous session: ✅ Heterogeneous Model Mixing (Phase 1) COMPLETE + Research-based enhancement system implemented + Query analysis + Model selection + Test interface
Next priority: 🧪 Test heterogeneous mixing system + 🔬 Phase 2: Chain-of-debate tracking (track WHY models disagree)

IMPORTANT: First verify implementation works - test /test-heterogeneous page and /api/agents/debate-heterogeneous endpoint, then push to remote

MANDATORY START: Read CLAUDE.md → WORKFLOW.md → PRIORITIES.md → FEATURES.md  
TodoWrite: Test heterogeneous mixing + Next task from PRIORITIES.md + "Update PRIORITIES.md" + "Push changes" + "Create next prompt"
Follow structured workflow: Work → Test → Document → Commit → Push → New prompt

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
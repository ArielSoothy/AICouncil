# 🔒 SESSION WORKFLOW - STRUCTURED METHOD

## 🛡️ DEFENSIVE DEVELOPMENT RULES (PREVENT FEATURE BREAKAGE):

### Critical: How to Prevent Breaking Existing Features
1. **NEVER use `Write` on existing files** - Always use `Edit` for surgical changes
2. **ALWAYS read entire file first** - Understand context before changing
3. **Search for dependencies** - Use Grep to find where components are used
4. **Make MINIMAL changes** - Smallest possible diff = lowest risk
5. **Comment, don't delete** - If unsure, comment out instead of removing
6. **Test incrementally** - Run type-check after EACH change
7. **Git commit checkpoints** - Commit after each successful feature

### The "Feature Protection Protocol":
```bash
Before ANY change:
1. grep -r "ComponentName" .  # Find all usages
2. npm run type-check          # Baseline check
3. [Make surgical edit]
4. npm run type-check          # Verify no breaks
5. git add -A && git commit -m "checkpoint: [change]"
```

## 📋 START PROTOCOL:
1. **Read all relevant files**: CLAUDE.md → PRIORITIES.md → FEATURES.md → PROJECT_OVERVIEW.md
2. **TodoWrite with:**
   - Next task from PRIORITIES.md TODO list  
   - "Update PRIORITIES.md with session progress"
   - "Create next conversation prompt"

## 🔨 WORK PHASE:
- **Start with next TODO** from PRIORITIES.md
- **Use best practices**: Modular, scalable, stable development
- **Follow BEST_PRACTICES.md** guidelines
- **Mark todos completed** as you go

## 🧪 TESTING PHASE:
- **NEVER ASSUME - ALWAYS TEST**: Every feature, every change, every time
- **Test thoroughly**: `npm run type-check` + `npm run lint`
- **Use MCP Playwright** for comprehensive UI testing
- **Test multiple times**: Run same test 2-3 times to confirm consistency
- **Test all features**: Don't just test what you changed - test related features too
- **Document what you tested**: Keep record of test results
- **Fix and re-test**: If something breaks, fix it and test again until it works
- **Ensure all tests pass** before proceeding

## 📝 DOCUMENTATION PHASE:
- **Document progress** in PRIORITIES.md
- **Update completed work** and next priorities
- **⚠️ CRITICAL: If new feature added, update FEATURES.md** - Add to protected features list to prevent future deletion
- **Ask user to test**: "Ready for your testing/approval"

## 🚀 COMPLETION PROTOCOL:
- **When user approves**: Push to git with descriptive commit
- **After push**: Create next conversation prompt in CLAUDE.md
- **If task took many tokens**: Stop here, don't continue to next task
- **Goal**: Avoid conversation compacting

## 🎯 TOKEN MANAGEMENT:
- **One major task per conversation** if complex
- **Test → Document → User approval → Git push → New prompt**
- **Keep conversations focused** and avoid overloading
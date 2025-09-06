# 🔒 SESSION WORKFLOW - STRUCTURED METHOD

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
- **Test thoroughly**: `npm run type-check` + `npm run lint`
- **Use MCP Playwright** for online/UI testing when applicable
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
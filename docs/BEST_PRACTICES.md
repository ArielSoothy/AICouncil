# 🎯 DEVELOPMENT BEST PRACTICES

## 🚨 CRITICAL RULES:
- **Agent Debate System MUST default to 'agents' mode**, not 'llm' mode
- **Never fake UI progress** - always show real backend data
- **Always test changes**: `npm run type-check` + `npm run lint`
- **Read docs/FEATURES.md before changes** - avoid breaking protected features

## 🛡️ FEATURE PROTECTION WORKFLOW:

### BEFORE Making Changes:
1. **Check docs/FEATURES.md first** - Ensure feature isn't protected
2. **Understand the purpose** - Read why the feature exists
3. **Check dependencies** - Understand what might break
4. **Get explicit approval** - If user hasn't requested the change

### NEVER Do These Without User Request:
- Delete or disable protected features
- Change core agent behavior (roles, order, execution)
- Remove UI components that users specifically requested
- Modify debate mechanics to be less functional
- Hide user controls that were specifically made visible

### ALWAYS Do These:
- **Archive instead of delete** - Move to `archived/` folder
- **Add deprecation warnings** - Before any removal
- **Document changes** - Update files with reasons
- **Test thoroughly** - Ensure no regressions

## 🚨 WARNING SIGNS - STOP AND CHECK:
- Removing individual round tabs
- Making agents run in parallel instead of sequential
- Hiding round selection controls
- Truncating agent responses
- Changing default UI to synthesis-only
- Removing agent personas or changing their order
- Disabling debate mechanics

## 🔧 DEBUGGING PATTERNS:
- **If debugging >30min without progress** → Remove feature and rebuild cleanly
- **UI bugs are usually data problems** → Fix data flow, not display
- **Screenshot + CSS class search** → Fastest issue location method
- **Console logging at each step** → Track data flow systematically

## 📋 LESSONS LEARNED (January 2025):
### Issues Fixed:
- **Parallel → Sequential Execution**: Agents now actually debate with each other
- **Agent Order**: Proper Analyst → Critic → Synthesizer sequence
- **Round 1 Debate**: First round now includes debate mechanics
- **UI Default**: Round tabs now show first, not synthesis
- **Scrolling**: Full responses visible with proper scroll areas
- **Round Controls**: Always visible, not hidden behind autoRound2
- **Dynamic Rounds**: Add Round button for continued debate

### Breaking Changes Prevented:
- Individual round tabs (user specifically requested these)
- Agent debate mechanics (core research-based functionality)
- Full response display (user complained about truncation)
- Manual round selection (user wanted control)

## 📊 TESTING APPROACH:
- **Behavioral testing** over implementation testing
- **Multi-agent cross-validation** for consistency 
- **Output format validation** with regex patterns
- **Real data only** - no simulated progress or fake timers

## 🏗️ CODE PATTERNS:
- **Provider fallbacks**: Google ↔ Groq automatic switching
- **Cost transparency** before and after operations
- **Type safety** - strict TypeScript, no any types
- **User control** - manual triggers for expensive operations

## 📊 TESTING EXAMPLES:

### Successful Test Case: Electric Scooter Query
**Query**: "what is the best e-scooter?"
**Configuration**: 
- Round 1 Mode: LLM (fast consensus)
- Round 2: Agents (if disagreement detected)
- Auto Round 2: Enabled
- Disagreement Threshold: 0.6

**Expected Results**:
- Top 3 specific scooter recommendations
- Brief reasons for each recommendation
- Disclaimer about what additional info would help

**Example Good Output**:
```
Based on available data, here are 3 top options:
1. Segway Ninebot Max - Excellent range (40mi) and reliability
2. Xiaomi Mi Electric Scooter Pro 2 - Best value for money
3. Apollo City - Premium build quality and features

Note: These recommendations would be more precise with your budget range and intended use.
```

## 📞 WHEN IN DOUBT:
**Always ask the user before removing or significantly changing protected features.**
**Archive, don't delete. Warn, don't surprise.**
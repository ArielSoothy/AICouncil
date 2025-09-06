# AI Council Features Documentation

**PURPOSE**: This file documents all features to prevent accidental deletion and ensure system integrity.

## 🔒 Core Features - NEVER DELETE WITHOUT EXPLICIT USER REQUEST

### 1. Multi-Round Agent Debate System
- **Status**: ✅ ACTIVE & CRITICAL
- **Location**: `AICouncil/lib/agents/agent-system.ts`
- **Purpose**: Core research-based debate mechanics where agents respond to each other
- **Key Components**:
  - Sequential agent execution (Analyst → Critic → Synthesizer)
  - Multi-round debate with previous message context
  - Real debate mechanics, not just parallel responses
- **Dependencies**: 
  - `debate-prompts.ts` 
  - `types.ts` (AGENT_PERSONAS)
  - `debate-display.tsx`
- **Last Modified**: January 2025 (Fixed parallel → sequential execution)
- **DO NOT**: Change back to parallel execution or remove debate context

### 2. Individual Round Tabs Display
- **Status**: ✅ ACTIVE & USER-REQUESTED
- **Location**: `AICouncil/components/agents/debate-display.tsx`
- **Purpose**: Show each debate round in separate tabs for clarity
- **Key Features**:
  - Tab for each round (Round 1, Round 2, etc.)
  - Timeline view for complete debate flow
  - Synthesis tab for final results
  - Default to Round 1 tab, not Synthesis
- **Dependencies**: shadcn/ui Tabs component
- **Last Modified**: January 2025 (Fixed default tab)
- **DO NOT**: Remove individual round tabs or force synthesis-only view

### 3. Agent Personas & Order
- **Status**: ✅ ACTIVE & RESEARCH-BASED
- **Location**: `AICouncil/lib/agents/types.ts`
- **Purpose**: Specialized agent roles based on research methodology
- **Key Features**:
  - The Analyst: Data-driven, methodical, evidence-based
  - The Critic: Skeptical, challenging, risk-focused  
  - The Synthesizer: Balanced, integrative, consensus-building
  - Execution order: Analyst → Critic → Synthesizer
- **Dependencies**: `agent-system.ts`, `debate-prompts.ts`
- **Last Modified**: January 2025 (Added proper ordering)
- **DO NOT**: Change agent roles, traits, or execution order

### 4. Round Selection Controls
- **Status**: ✅ ACTIVE & USER-REQUESTED & TESTED
- **Location**: `/agents` page in Agent Debate interface setup tab
- **Purpose**: Allow users to select number of debate rounds (manual control)
- **Key Features**:
  - Radix UI slider control (1-3 rounds, min=1, max=3)
  - Always visible with clear labeling
  - Real-time UI feedback ("Number of Rounds: X")
  - Keyboard navigation support (ArrowLeft/ArrowRight)
  - Shows "Manual control - exactly this many rounds will run"
- **Dependencies**: shadcn/ui Slider component (Radix UI)
- **Last Tested**: September 2025 (✅ Both directions confirmed working)
- **UI Position**: Currently below "Auto-trigger Round 2 on Disagreement" toggle
- **Known Issue**: Needs better visual separation from auto-trigger controls
- **DO NOT**: Hide round controls, force fixed round counts, or remove keyboard navigation

### 5. Dynamic Round Addition
- **Status**: ✅ ACTIVE & USER-REQUESTED  
- **Location**: `AICouncil/components/agents/debate-display.tsx`
- **Purpose**: Allow continuing debate after completion
- **Key Features**:
  - "Add Round X" button after debate completion
  - Limit to 3 total rounds for cost control
  - Only shown for completed debates
- **Dependencies**: onAddRound callback prop
- **Last Modified**: January 2025 (Initial implementation)
- **DO NOT**: Remove dynamic round addition capability

### 6. Full Response Display with Scrolling
- **Status**: ✅ ACTIVE & USER-REQUESTED
- **Location**: `AICouncil/components/agents/debate-display.tsx`
- **Purpose**: Show complete agent responses without truncation
- **Key Features**:
  - ScrollArea with 700px height for round content
  - Full message content display
  - Individual message cards with proper spacing
- **Dependencies**: shadcn/ui ScrollArea
- **Last Modified**: January 2025 (Increased height)
- **DO NOT**: Truncate responses or remove scrolling

## 🛡️ PROTECTION RULE:
**Always check this file before making changes. Ask user before modifying any protected feature.**
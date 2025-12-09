/**
 * Feature Flags System
 * 
 * Purpose: Protect features from accidental deletion and provide
 * controlled feature rollouts/rollbacks.
 * 
 * IMPORTANT: These flags protect user-requested features.
 * DO NOT disable flags without explicit user approval.
 */

export const FEATURE_FLAGS = {
  // Core Debate System Features (CRITICAL - DO NOT DISABLE)
  SEQUENTIAL_AGENT_EXECUTION: true,  // Agents debate sequentially, not parallel
  MULTI_ROUND_DEBATE: true,          // Multiple rounds with context passing
  AGENT_ROLE_PERSONAS: true,         // Analyst, Critic, Synthesizer roles
  
  // UI/UX Features (USER-REQUESTED)
  INDIVIDUAL_ROUND_TABS: true,       // Separate tab for each round
  FULL_RESPONSE_DISPLAY: true,       // Show complete responses with scrolling
  ROUND_SELECTION_CONTROLS: true,    // User controls for number of rounds
  DYNAMIC_ROUND_ADDITION: true,      // Add rounds after completion
  
  // Display Preferences (USER-REQUESTED)
  DEFAULT_TO_ROUND_TABS: true,       // Default to Round 1, not Synthesis
  EXPANDED_SCROLL_AREAS: true,       // 700px height for responses
  ALWAYS_SHOW_ROUND_CONTROLS: true,  // Don't hide behind autoRound2
  
  // Advanced Features
  DEBATE_COST_TRANSPARENCY: true,    // Show costs and explain rounds
  WEB_SEARCH_INTEGRATION: true,      // Optional web search for agents
  COMPARISON_MODES: true,            // Single vs multi-model comparison
} as const

export type FeatureFlag = keyof typeof FEATURE_FLAGS

/**
 * Check if a feature is enabled
 * 
 * @param feature - Feature flag to check
 * @returns boolean - True if feature is enabled
 */
export function isFeatureEnabled(feature: FeatureFlag): boolean {
  return FEATURE_FLAGS[feature] ?? false
}

/**
 * Runtime feature validation
 * 
 * Throws error if critical features are disabled
 */
export function validateCriticalFeatures(): void {
  const criticalFeatures: FeatureFlag[] = [
    'SEQUENTIAL_AGENT_EXECUTION',
    'MULTI_ROUND_DEBATE', 
    'AGENT_ROLE_PERSONAS',
    'INDIVIDUAL_ROUND_TABS'
  ]
  
  for (const feature of criticalFeatures) {
    if (!isFeatureEnabled(feature)) {
      throw new Error(
        `CRITICAL FEATURE DISABLED: ${feature}. ` +
        `This feature is required for core functionality and ` +
        `was specifically requested by the user. ` +
        `See FEATURES.md for details.`
      )
    }
  }
}

/**
 * Feature deprecation warnings
 * 
 * Add warnings before removing features
 */
export const DEPRECATED_FEATURES = {
  // Example: PARALLEL_AGENT_EXECUTION: 'Use SEQUENTIAL_AGENT_EXECUTION instead',
} as const

/**
 * Check for deprecated feature usage
 */
export function checkDeprecatedFeatures(): void {
  // Add deprecation warnings as needed
  // Example:
  // if (someCondition) {
  //   console.warn('DEPRECATED: Feature X is deprecated. Use Feature Y instead.');
  // }
}

// Auto-validate on import
validateCriticalFeatures()
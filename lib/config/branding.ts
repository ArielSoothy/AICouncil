/**
 * Centralized branding configuration for easy project name changes
 * This file contains all project branding elements that can be easily modified
 */

export const BRANDING = {
  // Main project name - change this to rebrand the entire application
  PROJECT_NAME: "Verdict AI",
  
  // Full project title with tagline
  PROJECT_TITLE: "Verdict AI - Multi-Model AI Debates for Better Decisions",

  // Short taglines
  TAGLINE_PRIMARY: "Multi-Model AI Debates for Better Decisions",
  TAGLINE_SECONDARY: "Get better answers through AI model debates",

  // 3-Step Value Proposition
  VALUE_STEPS: [
    { step: 1, title: "Ask", description: "Submit your question or decision" },
    { step: 2, title: "Models Debate", description: "AI models discuss and challenge each other" },
    { step: 3, title: "Clear Verdict", description: "Get consensus and recommended action" }
  ] as const,

  // Action-oriented messaging
  ACTION_VERBS: {
    ASK: "Ask Verdict",
    QUERY: "Query Council",
    CONSULT: "Consult Verdict"
  },
  
  // URL-safe identifier (for routes, APIs, etc.)
  PROJECT_SLUG: "verdict-ai",
  
  // Domain/branding consistency
  DOMAIN_NAME: "verdict.ai", // Future domain consideration
  
  // Meta tags and SEO
  META_DESCRIPTION: "Get better answers through AI model debates. Verdict AI lets multiple AI models discuss your questions and reach clear consensus for better decisions.",
  META_KEYWORDS: ["AI debates", "multi-model", "decision engine", "AI consensus", "verdict", "AI discussion"] as string[],
  
  // Social/sharing
  TWITTER_HANDLE: "@VerdictAI",
  
  // Legacy names for reference (DO NOT USE - for migration tracking only)
  LEGACY_NAMES: {
    OLD_NAME: "AI Council",
    OLD_TITLE: "Consensus AI",
    OLD_SLUG: "ai-council"
  }
} as const;

// Type-safe export for component usage
export type BrandingConfig = typeof BRANDING;

// Convenience exports for most common usage
export const PROJECT_NAME = BRANDING.PROJECT_NAME;
export const PROJECT_TITLE = BRANDING.PROJECT_TITLE;
export const PROJECT_SLUG = BRANDING.PROJECT_SLUG;
export const TAGLINE_PRIMARY = BRANDING.TAGLINE_PRIMARY;
export const TAGLINE_SECONDARY = BRANDING.TAGLINE_SECONDARY;
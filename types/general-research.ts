/**
 * General Research Types for Debate Mode
 *
 * Adapts Trading Mode's research pattern for general decision-making
 * Pattern: Web Search → Fact-Checking → Structured Findings
 */

/**
 * Progress callback for real-time research updates
 */
export type ResearchProgressCallback = (event: ResearchProgressEvent) => void;

export interface ResearchProgressEvent {
  type: 'research_start' | 'search_complete' | 'analysis_complete' | 'research_complete';
  step?: string;
  toolCount?: number;
  duration?: number;
  timestamp: number;
}

/**
 * General Research Report (similar to Trading's ResearchReport)
 */
export interface GeneralResearchReport {
  query: string;
  sources: string[]; // URLs from web search
  factualFindings: string; // Key facts extracted
  expertPerspectives: string[]; // Different viewpoints found
  evidenceQuality: 'high' | 'medium' | 'low';
  confidence: number; // 0-100%
  totalSources: number;
  researchDuration: number; // ms
  timestamp: Date;
}

/**
 * Structured Debate Response (replaces essay format)
 */
export interface DebateResponse {
  agentRole: 'analyst' | 'critic' | 'synthesizer';
  recommendation: string; // Specific option/answer
  confidenceScore: number; // 0-100
  rankingScore: number; // 1-5 scale
  topEvidence: string[]; // Max 3 points from research
  topConcerns: string[]; // Max 2 risks
  reasoning: string; // Brief explanation (150 words max)
  basedOnResearch: boolean; // Did this use real data?
}

/**
 * Clear Synthesis Output (replaces "it depends")
 */
export interface SynthesisOutput {
  topRecommendation: string;
  confidence: number; // 0-100%
  evidenceScore: number; // 1-5 scale
  supportingEvidence: string[]; // Top 3 facts
  keyRisks: string[]; // Top 2 concerns
  alternatives: Array<{
    option: string;
    score: number;
    reasoning: string;
  }>;
  researchBased: boolean;
}

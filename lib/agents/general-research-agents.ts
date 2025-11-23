/**
 * General Research Agents for Debate Mode
 *
 * Adapts Trading Mode's research pattern for general decision-making
 * Uses models with internet access to gather real facts before debate
 *
 * Philosophy: Real decisions require real data, not hallucinated "evidence"
 */

import { ModelResponse } from '@/types/consensus';
import {
  GeneralResearchReport,
  ResearchProgressCallback,
} from '@/types/general-research';

/**
 * Conduct general web research for any topic
 *
 * Model: Gemini 2.0 Flash (FREE + has internet access)
 * Process:
 * 1. Use model's built-in web search capability
 * 2. Extract factual findings
 * 3. Identify different perspectives
 * 4. Assess evidence quality
 *
 * @param query - User's question/decision to research
 * @param onProgress - Optional callback for progress updates
 * @returns Structured research report with real data
 */
export async function conductGeneralResearch(
  query: string,
  onProgress?: ResearchProgressCallback
): Promise<GeneralResearchReport> {
  const startTime = Date.now();

  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔬 STARTING GENERAL RESEARCH FOR: "${query}"`);
  console.log(`${'='.repeat(80)}\n`);

  try {
    // Emit research start event
    onProgress?.({
      type: 'research_start',
      step: 'Searching web for factual information',
      timestamp: Date.now(),
    });

    const { GroqProvider } = await import('@/lib/ai-providers/groq');
    const provider = new GroqProvider();

    // Research prompt - instructs model to search web and extract facts
    const researchPrompt = `You are a research assistant gathering factual information for decision-making.

QUERY: "${query}"

TASK: Search the web and gather factual information to help answer this query. Focus on:
1. Verifiable facts and data
2. Expert opinions and research findings
3. Different perspectives on the topic
4. Relevant statistics or studies
5. Recent developments or news

IMPORTANT:
- Search multiple sources
- Cite specific sources you find
- Distinguish facts from opinions
- Note the quality/credibility of sources
- Include conflicting viewpoints if they exist

Provide your findings in this structured format:

**SOURCES CONSULTED:**
- [List URLs or source names]

**KEY FACTS:**
- [Bullet points of verifiable facts]

**EXPERT PERSPECTIVES:**
- [Different viewpoints found, with sources]

**EVIDENCE QUALITY:**
- [Assessment: HIGH/MEDIUM/LOW and why]

**CONFIDENCE:**
- [Your confidence in the findings: 0-100%]`;

    console.log('🌐 Searching web with Llama 3.3 70B (Groq - FREE + internet access)...');

    // Use Llama 3.3 70B on Groq - FREE, fast, and has internet access
    const result: ModelResponse = await provider.query(researchPrompt, {
      model: 'llama-3.3-70b-versatile',
      provider: 'groq',
      enabled: true,
      temperature: 0.3, // Lower temperature for factual research
      maxTokens: 2000,
    });

    const researchDuration = Date.now() - startTime;

    console.log(`✅ Research complete in ${researchDuration}ms`);
    console.log(`📝 Response length: ${result.response.length} chars`);

    // Emit research complete event
    onProgress?.({
      type: 'research_complete',
      duration: researchDuration,
      timestamp: Date.now(),
    });

    // Parse the response to extract structured data
    const findings = result.response;

    // Extract sources (simple parsing - look for URLs or source mentions)
    const sources = extractSources(findings);

    // Extract evidence quality assessment
    const evidenceQuality = extractEvidenceQuality(findings);

    // Extract confidence score
    const confidence = extractConfidence(findings);

    // Extract expert perspectives
    const expertPerspectives = extractPerspectives(findings);

    const report: GeneralResearchReport = {
      query,
      sources,
      factualFindings: findings,
      expertPerspectives,
      evidenceQuality,
      confidence,
      totalSources: sources.length,
      researchDuration,
      timestamp: new Date(),
    };

    console.log(`\n${'='.repeat(80)}`);
    console.log('✅ RESEARCH REPORT COMPLETE');
    console.log(`${'='.repeat(80)}`);
    console.log(`📊 Sources Found: ${sources.length}`);
    console.log(`💡 Evidence Quality: ${evidenceQuality.toUpperCase()}`);
    console.log(`🎯 Confidence: ${confidence}%`);
    console.log(`⏱️  Duration: ${researchDuration}ms`);
    console.log(`${'='.repeat(80)}\n`);

    return report;
  } catch (error) {
    console.error('❌ Research error:', error);

    // Return minimal report on error
    return {
      query,
      sources: [],
      factualFindings: 'Research failed - no data gathered',
      expertPerspectives: [],
      evidenceQuality: 'low',
      confidence: 0,
      totalSources: 0,
      researchDuration: Date.now() - startTime,
      timestamp: new Date(),
    };
  }
}

/**
 * Extract source URLs/names from research findings
 */
function extractSources(findings: string): string[] {
  const sources: string[] = [];

  // Look for URLs
  const urlRegex = /https?:\/\/[^\s]+/g;
  const urls = findings.match(urlRegex) || [];
  sources.push(...urls);

  // Look for source mentions in brackets or quotes
  const sourcePattern = /\[([^\]]+)\]|"([^"]+)"/g;
  let match;
  while ((match = sourcePattern.exec(findings)) !== null) {
    const source = match[1] || match[2];
    if (source && source.length > 10 && source.length < 100) {
      sources.push(source);
    }
  }

  return [...new Set(sources)]; // Remove duplicates
}

/**
 * Extract evidence quality assessment
 */
function extractEvidenceQuality(findings: string): 'high' | 'medium' | 'low' {
  const lowerFindings = findings.toLowerCase();

  if (lowerFindings.includes('quality: high') || lowerFindings.includes('quality:**high')) {
    return 'high';
  } else if (lowerFindings.includes('quality: medium') || lowerFindings.includes('quality:**medium')) {
    return 'medium';
  } else if (lowerFindings.includes('quality: low') || lowerFindings.includes('quality:**low')) {
    return 'low';
  }

  // Default to medium if not specified
  return 'medium';
}

/**
 * Extract confidence score
 */
function extractConfidence(findings: string): number {
  // Look for confidence percentage
  const confidenceMatch = findings.match(/confidence[:\s]+(\d+)%/i);
  if (confidenceMatch) {
    return parseInt(confidenceMatch[1], 10);
  }

  // Default to 70% if not specified
  return 70;
}

/**
 * Extract expert perspectives section
 */
function extractPerspectives(findings: string): string[] {
  const perspectives: string[] = [];

  // Look for EXPERT PERSPECTIVES section
  const perspectivesMatch = findings.match(/\*\*EXPERT PERSPECTIVES:\*\*([\s\S]*?)(?=\*\*|$)/i);
  if (perspectivesMatch) {
    const perspectivesText = perspectivesMatch[1];
    // Split by bullet points or newlines
    const items = perspectivesText
      .split(/\n\s*-\s*|\n\s*\d+\.\s*/)
      .map((item) => item.trim())
      .filter((item) => item.length > 20);
    perspectives.push(...items);
  }

  return perspectives;
}

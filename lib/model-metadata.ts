// Centralized model pricing, benchmarks, and weights
// Prices are per 1K tokens (USD)

export type ModelCost = { input: number; output: number; source?: string; lastUpdated?: string };
export type ModelBenchmark = {
  arenaTier?: 'S' | 'A' | 'B' | 'C';
  arenaNote?: string;
  mmlu?: number; // %
  aaii?: number; // artificialanalysis.ai index
  source?: string;
  lastUpdated?: string;
};

// Pricing per model (per 1K tokens, converted from per 1M)
// Sources: Official documentation from each provider (December 2025)
export const MODEL_COSTS_PER_1K: Record<string, ModelCost> = {
  // ============================================================================
  // OpenAI - Source: openai.com/api/pricing
  // ============================================================================
  // GPT-5 Series (Released August 2025)
  'gpt-5-chat-latest': { input: 0.00125, output: 0.01, source: 'OpenAI GPT-5 per 1M ($1.25 in / $10 out)', lastUpdated: '2025-12-09' },
  'gpt-5': { input: 0.00125, output: 0.01, source: 'OpenAI GPT-5 per 1M ($1.25 in / $10 out)', lastUpdated: '2025-12-09' },
  'gpt-5-mini': { input: 0.000125, output: 0.001, source: 'OpenAI GPT-5 Mini per 1M ($0.125 in / $1 out)', lastUpdated: '2025-12-09' },
  'gpt-5-nano': { input: 0.000025, output: 0.0002, source: 'OpenAI GPT-5 Nano per 1M ($0.025 in / $0.20 out)', lastUpdated: '2025-12-09' },
  // GPT-4.1 Series
  'gpt-4.1': { input: 0.002, output: 0.008, source: 'OpenAI GPT-4.1 per 1M ($2 in / $8 out)', lastUpdated: '2025-12-09' },
  'gpt-4.1-mini': { input: 0.0004, output: 0.0016, source: 'OpenAI GPT-4.1 Mini per 1M ($0.40 in / $1.60 out)', lastUpdated: '2025-12-09' },
  'gpt-4.1-nano': { input: 0.0001, output: 0.0004, source: 'OpenAI GPT-4.1 Nano per 1M ($0.10 in / $0.40 out)', lastUpdated: '2025-12-09' },
  // Reasoning Models
  'o3': { input: 0.002, output: 0.008, source: 'OpenAI o3 per 1M ($2 in / $8 out)', lastUpdated: '2025-12-09' },
  'o4-mini': { input: 0.0011, output: 0.0044, source: 'OpenAI o4-mini per 1M ($1.10 in / $4.40 out)', lastUpdated: '2025-12-09' },
  // GPT-4o
  'gpt-4o': { input: 0.0025, output: 0.01, source: 'OpenAI GPT-4o per 1M ($2.50 in / $10 out)', lastUpdated: '2025-12-09' },
  'gpt-4o-realtime-preview': { input: 0.005, output: 0.02, source: 'OpenAI GPT-4o Realtime per 1M ($5 in / $20 out)', lastUpdated: '2025-12-09' },
  // Legacy
  'gpt-4': { input: 0.03, output: 0.06, source: 'OpenAI GPT-4 Legacy', lastUpdated: '2025-05-01' },
  'gpt-4-turbo-preview': { input: 0.01, output: 0.03, source: 'OpenAI GPT-4 Turbo', lastUpdated: '2024-12-01' },
  'gpt-3.5-turbo': { input: 0.0015, output: 0.002, source: 'OpenAI GPT-3.5', lastUpdated: '2024-11-01' },
  'gpt-3.5-turbo-16k': { input: 0.001, output: 0.002, source: 'OpenAI GPT-3.5 16K', lastUpdated: '2024-11-01' },

  // ============================================================================
  // Anthropic - Source: docs.anthropic.com/claude/docs/models-overview
  // Official pricing per 1M tokens, converted to per 1K
  // ============================================================================
  // Claude 4.5 Series (Latest - November 2025)
  'claude-opus-4-5-20251101': { input: 0.005, output: 0.025, source: 'Anthropic per 1M ($5 in / $25 out)', lastUpdated: '2025-12-09' },
  'claude-sonnet-4-5-20250929': { input: 0.003, output: 0.015, source: 'Anthropic per 1M ($3 in / $15 out)', lastUpdated: '2025-12-09' },
  'claude-haiku-4-5-20251001': { input: 0.001, output: 0.005, source: 'Anthropic per 1M ($1 in / $5 out)', lastUpdated: '2025-12-09' },
  // Aliases for Claude 4.5 (some systems use shorter names)
  'claude-haiku-4-5-20250715': { input: 0.001, output: 0.005, source: 'Anthropic per 1M ($1 in / $5 out) - older date alias', lastUpdated: '2025-12-09' },
  // Claude 4 Series (Legacy but still available)
  'claude-opus-4-1-20250805': { input: 0.015, output: 0.075, source: 'Anthropic per 1M ($15 in / $75 out)', lastUpdated: '2025-12-09' },
  'claude-opus-4-1-20250514': { input: 0.015, output: 0.075, source: 'Anthropic per 1M ($15 in / $75 out) - May release alias', lastUpdated: '2025-12-09' },
  'claude-opus-4-20250514': { input: 0.015, output: 0.075, source: 'Anthropic per 1M ($15 in / $75 out)', lastUpdated: '2025-12-09' },
  'claude-sonnet-4-20250514': { input: 0.003, output: 0.015, source: 'Anthropic per 1M ($3 in / $15 out)', lastUpdated: '2025-12-09' },
  // Claude 3.x Series
  'claude-3-7-sonnet-20250219': { input: 0.003, output: 0.015, source: 'Anthropic per 1M ($3 in / $15 out)', lastUpdated: '2025-12-09' },
  'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015, source: 'Anthropic per 1M ($3 in / $15 out)', lastUpdated: '2025-12-09' },
  'claude-3-5-haiku-20241022': { input: 0.0008, output: 0.004, source: 'Anthropic per 1M ($0.80 in / $4 out)', lastUpdated: '2025-12-09' },
  'claude-3-opus-20240229': { input: 0.015, output: 0.075, source: 'Anthropic per 1M ($15 in / $75 out)', lastUpdated: '2024-02-29' },
  'claude-3-sonnet-20240229': { input: 0.003, output: 0.015, source: 'Anthropic per 1M ($3 in / $15 out)', lastUpdated: '2024-02-29' },
  'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125, source: 'Anthropic per 1M ($0.25 in / $1.25 out)', lastUpdated: '2025-12-09' },
  // Claude 2.x (Legacy)
  'claude-2.1': { input: 0.008, output: 0.024, source: 'Anthropic Legacy', lastUpdated: '2023-11-01' },
  'claude-2.0': { input: 0.008, output: 0.024, source: 'Anthropic Legacy', lastUpdated: '2023-07-01' },

  // ============================================================================
  // Google Gemini - Source: ai.google.dev/gemini-api/docs/pricing
  // Free tier for Flash models, paid for Pro
  // ============================================================================
  'gemini-2.5-pro': { input: 0.00125, output: 0.01, source: 'Google per 1M ($1.25 in / $10 out)', lastUpdated: '2025-12-09' },
  'gemini-2.5-flash': { input: 0.0, output: 0.0, source: 'Google FREE tier (paid option: $0.30/$2.50 per 1M)', lastUpdated: '2025-12-09' },
  'gemini-2.0-flash': { input: 0.0, output: 0.0, source: 'Google FREE tier', lastUpdated: '2025-12-09' },
  'gemini-2.0-flash-lite': { input: 0.0, output: 0.0, source: 'Google FREE tier', lastUpdated: '2025-12-09' },
  'gemini-1.5-flash': { input: 0.0, output: 0.0, source: 'Google FREE tier (legacy)', lastUpdated: '2025-12-09' },
  'gemini-1.5-flash-8b': { input: 0.0, output: 0.0, source: 'Google FREE tier (legacy)', lastUpdated: '2025-12-09' },

  // ============================================================================
  // Groq - Source: groq.com/pricing
  // Free tier for most models
  // ============================================================================
  'llama-3.3-70b-versatile': { input: 0.0, output: 0.0, source: 'Groq FREE tier', lastUpdated: '2025-12-09' },
  'llama-3.1-8b-instant': { input: 0.0, output: 0.0, source: 'Groq FREE tier', lastUpdated: '2025-12-09' },
  'gemma2-9b-it': { input: 0.0, output: 0.0, source: 'Groq FREE tier', lastUpdated: '2025-12-09' },
  'llama-3-groq-70b-tool-use': { input: 0.0, output: 0.0, source: 'Groq FREE tier', lastUpdated: '2025-12-09' },
  'llama-3-groq-8b-tool-use': { input: 0.0, output: 0.0, source: 'Groq FREE tier', lastUpdated: '2025-12-09' },

  // ============================================================================
  // xAI Grok - Source: xAI API documentation (https://x.ai/api)
  // All Grok models are PAID - no free tier
  // ============================================================================
  // Grok 4.1 Series (Newest)
  'grok-4-1-fast-reasoning': { input: 0.0002, output: 0.0005, source: 'xAI per 1M ($0.20 in / $0.50 out)', lastUpdated: '2025-12-09' },
  // Grok 4 Series
  'grok-4-0709': { input: 0.003, output: 0.015, source: 'xAI per 1M ($3 in / $15 out)', lastUpdated: '2025-12-09' },
  'grok-4-fast-reasoning': { input: 0.0002, output: 0.0005, source: 'xAI per 1M ($0.20 in / $0.50 out)', lastUpdated: '2025-12-09' },
  'grok-4-fast-non-reasoning': { input: 0.0002, output: 0.0005, source: 'xAI per 1M ($0.20 in / $0.50 out)', lastUpdated: '2025-12-09' },
  // Grok 3 Series
  'grok-3-beta': { input: 0.003, output: 0.015, source: 'xAI per 1M ($3 in / $15 out)', lastUpdated: '2025-12-09' },
  'grok-3-mini-beta': { input: 0.0003, output: 0.0005, source: 'xAI per 1M ($0.30 in / $0.50 out)', lastUpdated: '2025-12-09' },
  'grok-3': { input: 0.003, output: 0.015, source: 'xAI per 1M ($3 in / $15 out)', lastUpdated: '2025-12-09' },
  'grok-3-mini': { input: 0.0003, output: 0.0005, source: 'xAI per 1M ($0.30 in / $0.50 out)', lastUpdated: '2025-12-09' },
  // Grok 2 Series
  'grok-2-image-1212': { input: 0.002, output: 0.01, source: 'xAI per 1M ($2 in / $10 out)', lastUpdated: '2025-12-09' },
  'grok-2-vision-1212': { input: 0.002, output: 0.01, source: 'xAI per 1M ($2 in / $10 out)', lastUpdated: '2025-12-09' },
  'grok-2-1212': { input: 0.002, output: 0.01, source: 'xAI per 1M ($2 in / $10 out)', lastUpdated: '2025-12-09' },
  'grok-2-latest': { input: 0.002, output: 0.01, source: 'xAI per 1M ($2 in / $10 out)', lastUpdated: '2025-12-09' },
  // Grok Code
  'grok-code-fast-1': { input: 0.0002, output: 0.0015, source: 'xAI per 1M ($0.20 in / $1.50 out)', lastUpdated: '2025-12-09' },

  // ============================================================================
  // Perplexity - Source: perplexity.ai/pricing
  // ============================================================================
  'sonar-pro': { input: 0.003, output: 0.015, source: 'Perplexity per 1M ($3 in / $15 out)', lastUpdated: '2025-12-09' },
  'sonar-small': { input: 0.001, output: 0.001, source: 'Perplexity per 1M ($1 in / $1 out)', lastUpdated: '2025-12-09' },

  // ============================================================================
  // Mistral - Source: mistral.ai/pricing
  // ============================================================================
  'mistral-large-latest': { input: 0.002, output: 0.006, source: 'Mistral per 1M ($2 in / $6 out)', lastUpdated: '2025-12-09' },
  'mistral-small-latest': { input: 0.0002, output: 0.0006, source: 'Mistral per 1M ($0.20 in / $0.60 out)', lastUpdated: '2025-12-09' },

  // ============================================================================
  // Cohere - Source: cohere.com/pricing
  // ============================================================================
  'command-r-plus': { input: 0.0025, output: 0.01, source: 'Cohere per 1M ($2.50 in / $10 out)', lastUpdated: '2025-12-09' },
  'command-r': { input: 0.00015, output: 0.0006, source: 'Cohere per 1M ($0.15 in / $0.60 out)', lastUpdated: '2025-12-09' },
};

// Benchmarks and derived power weights (0.0-1.0)
// Sources: ArtificialAnalysis.ai, Official provider docs, LMArena (December 2025)
// MMLU = Massive Multitask Language Understanding (% accuracy)
// AAII = Artificial Analysis Intelligence Index (higher = better)
export const MODEL_BENCHMARKS: Record<string, ModelBenchmark> = {
  // ============================================================================
  // OpenAI - Source: openai.com, ArtificialAnalysis.ai
  // ============================================================================
  // GPT-5 (Released Aug 2025) - SWE-bench: 74.9%, AIME: 94.6%, MMMU: 84.2%
  'gpt-5-chat-latest': { arenaTier: 'S', aaii: 1380, mmlu: 92, source: 'OpenAI/AA - SWE-bench 74.9%', lastUpdated: '2025-12-09' },
  'gpt-5': { arenaTier: 'S', aaii: 1380, mmlu: 92, source: 'OpenAI/AA - SWE-bench 74.9%', lastUpdated: '2025-12-09' },
  'gpt-5-mini': { arenaTier: 'A', aaii: 1200, mmlu: 85, source: 'OpenAI/AA', lastUpdated: '2025-12-09' },
  'gpt-5-nano': { arenaTier: 'B', aaii: 1100, mmlu: 78, source: 'OpenAI/AA', lastUpdated: '2025-12-09' },
  // GPT-4.1 - MMLU: 90.2%, SWE-bench: 55%
  'gpt-4.1': { arenaTier: 'A', aaii: 1250, mmlu: 90, source: 'OpenAI - MMLU 90.2%', lastUpdated: '2025-12-09' },
  'gpt-4.1-mini': { arenaTier: 'B', aaii: 1150, mmlu: 82, source: 'OpenAI/AA', lastUpdated: '2025-12-09' },
  'gpt-4.1-nano': { arenaTier: 'C', aaii: 1050, mmlu: 80, source: 'OpenAI - MMLU 80.1%', lastUpdated: '2025-12-09' },
  // Reasoning models
  'o3': { arenaTier: 'S', aaii: 1350, mmlu: 88, source: 'OpenAI/AA - GPQA 88.8%', lastUpdated: '2025-12-09' },
  'o4-mini': { arenaTier: 'A', aaii: 1220, mmlu: 84, source: 'OpenAI/AA', lastUpdated: '2025-12-09' },
  // GPT-4o
  'gpt-4o': { arenaTier: 'S', aaii: 1300, mmlu: 87, source: 'OpenAI/AA', lastUpdated: '2025-12-09' },
  'gpt-4o-realtime-preview': { arenaTier: 'S', aaii: 1300, mmlu: 87, source: 'OpenAI (same as GPT-4o)', lastUpdated: '2025-12-09' },
  // Legacy
  'gpt-4': { arenaTier: 'A', aaii: 1200, mmlu: 86, source: 'Legacy', lastUpdated: '2025-05-01' },
  'gpt-4-turbo-preview': { arenaTier: 'A', aaii: 1230, mmlu: 85, source: 'Legacy', lastUpdated: '2025-02-01' },
  'gpt-3.5-turbo': { arenaTier: 'B', aaii: 950, mmlu: 70, source: 'Legacy', lastUpdated: '2024-11-01' },

  // ============================================================================
  // Anthropic - Source: Anthropic docs, ArtificialAnalysis.ai
  // ============================================================================
  // Claude 4.5 Series - Opus 4.5: MMLU-Pro 89.5%, Sonnet 4.5: MMLU-Pro 87.5%
  'claude-opus-4-5-20251101': { arenaTier: 'S', aaii: 1400, mmlu: 90, source: 'Anthropic/AA - MMLU-Pro 89.5%', lastUpdated: '2025-12-09' },
  'claude-sonnet-4-5-20250929': { arenaTier: 'S', aaii: 1320, mmlu: 88, source: 'Anthropic/AA - MMLU-Pro 87.5%', lastUpdated: '2025-12-09' },
  'claude-haiku-4-5-20251001': { arenaTier: 'A', aaii: 1200, mmlu: 80, source: 'Anthropic/AA', lastUpdated: '2025-12-09' },
  'claude-haiku-4-5-20250715': { arenaTier: 'A', aaii: 1200, mmlu: 80, source: 'Anthropic/AA - older date alias', lastUpdated: '2025-12-09' },
  // Claude 4 Series - Opus 4.1: MMLU 87.4%, SWE-bench 72.5%; Sonnet 4: SWE-bench 72.7%
  'claude-opus-4-1-20250805': { arenaTier: 'S', aaii: 1350, mmlu: 87, source: 'Anthropic - MMLU 87.4%', lastUpdated: '2025-12-09' },
  'claude-opus-4-1-20250514': { arenaTier: 'S', aaii: 1350, mmlu: 87, source: 'Anthropic - alias for older release', lastUpdated: '2025-12-09' },
  'claude-opus-4-20250514': { arenaTier: 'S', aaii: 1330, mmlu: 87, source: 'Anthropic - MMLU 87.4%', lastUpdated: '2025-12-09' },
  'claude-sonnet-4-20250514': { arenaTier: 'S', aaii: 1310, mmlu: 85, source: 'Anthropic - SWE-bench 72.7%', lastUpdated: '2025-12-09' },
  // Claude 3.x Series
  'claude-3-7-sonnet-20250219': { arenaTier: 'A', aaii: 1280, mmlu: 84, source: 'Anthropic/AA', lastUpdated: '2025-12-09' },
  'claude-3-5-sonnet-20241022': { arenaTier: 'A', aaii: 1260, mmlu: 83, source: 'Anthropic/AA - MMLU-Pro 77.8%', lastUpdated: '2025-12-09' },
  'claude-3-5-haiku-20241022': { arenaTier: 'B', aaii: 1150, mmlu: 75, source: 'Anthropic/AA', lastUpdated: '2025-12-09' },
  'claude-3-opus-20240229': { arenaTier: 'A', aaii: 1250, mmlu: 86, source: 'Legacy', lastUpdated: '2024-02-29' },
  'claude-3-sonnet-20240229': { arenaTier: 'B', aaii: 1180, mmlu: 80, source: 'Legacy', lastUpdated: '2024-02-29' },
  'claude-3-haiku-20240307': { arenaTier: 'C', aaii: 1050, mmlu: 72, source: 'Legacy', lastUpdated: '2024-03-07' },

  // ============================================================================
  // Google Gemini - Source: Google docs, ArtificialAnalysis.ai
  // ============================================================================
  // Gemini 2.5 Pro: MMLU 81.7%, Flash: MMLU 78.9%
  'gemini-2.5-pro': { arenaTier: 'S', aaii: 1350, mmlu: 82, source: 'Google/AA - MMLU 81.7%', lastUpdated: '2025-12-09' },
  'gemini-2.5-flash': { arenaTier: 'A', aaii: 1280, mmlu: 79, source: 'Google/AA - MMLU 78.9%', lastUpdated: '2025-12-09' },
  'gemini-2.5-flash-lite': { arenaTier: 'B', aaii: 1200, mmlu: 75, source: 'Google - lite variant', lastUpdated: '2025-12-09' },
  // Gemini 2.0 Flash: MMLU-Pro 77.4%
  'gemini-2.0-flash': { arenaTier: 'A', aaii: 1250, mmlu: 77, source: 'Google/AA - MMLU-Pro 77.4%', lastUpdated: '2025-12-09' },
  'gemini-2.0-flash-lite': { arenaTier: 'B', aaii: 1150, mmlu: 72, source: 'Google/AA', lastUpdated: '2025-12-09' },
  'gemini-1.5-flash': { arenaTier: 'A', aaii: 1200, mmlu: 75, source: 'Google/AA', lastUpdated: '2025-12-09' },
  'gemini-1.5-flash-8b': { arenaTier: 'B', aaii: 1100, mmlu: 70, source: 'Google/AA', lastUpdated: '2025-12-09' },

  // ============================================================================
  // Groq (Open models) - Source: Meta, Groq, Community benchmarks
  // ============================================================================
  // Llama 3.3 70B: MMLU 86.0%, competitive with 405B
  'llama-3.3-70b-versatile': { arenaTier: 'A', aaii: 1250, mmlu: 86, source: 'Meta/Groq - MMLU 86.0%', lastUpdated: '2025-12-09' },
  'llama-3.1-8b-instant': { arenaTier: 'B', aaii: 1100, mmlu: 68, source: 'Meta/Groq', lastUpdated: '2025-12-09' },
  // Groq Tool-Use Models (Berkeley Function Calling Leaderboard top performers)
  'llama-3-groq-70b-tool-use': { arenaTier: 'A', aaii: 1230, mmlu: 82, source: 'BFCL #1 - 90.76% accuracy', lastUpdated: '2025-12-09' },
  'llama-3-groq-8b-tool-use': { arenaTier: 'B', aaii: 1120, mmlu: 70, source: 'BFCL #3 - 89.06% accuracy', lastUpdated: '2025-12-09' },
  'gemma2-9b-it': { arenaTier: 'B', aaii: 1080, mmlu: 68, source: 'Google/Community', lastUpdated: '2025-12-09' },

  // ============================================================================
  // xAI Grok - Source: xAI docs, ArtificialAnalysis.ai
  // ============================================================================
  // Grok 4.1 (Newest - Nov 2025)
  'grok-4-1-fast-reasoning': { arenaTier: 'S', aaii: 1380, mmlu: 89, source: 'xAI - Nov 2025, best tool-calling', lastUpdated: '2025-12-09' },
  // Grok 4: MMLU 86.6%, MMLU-Pro 87%, GPQA 88%
  'grok-4-0709': { arenaTier: 'S', aaii: 1370, mmlu: 87, source: 'xAI/AA - MMLU-Pro 87%', lastUpdated: '2025-12-09' },
  'grok-4-fast-reasoning': { arenaTier: 'S', aaii: 1340, mmlu: 88, source: 'xAI - reasoning variant', lastUpdated: '2025-12-09' },
  'grok-4-fast-non-reasoning': { arenaTier: 'A', aaii: 1280, mmlu: 85, source: 'xAI - speed optimized', lastUpdated: '2025-12-09' },
  // Grok 3
  'grok-3-beta': { arenaTier: 'A', aaii: 1300, mmlu: 86, source: 'xAI - 131K context', lastUpdated: '2025-12-09' },
  'grok-3-mini-beta': { arenaTier: 'B', aaii: 1150, mmlu: 75, source: 'xAI - fast, efficient', lastUpdated: '2025-12-09' },
  'grok-3': { arenaTier: 'A', aaii: 1300, mmlu: 86, source: 'xAI/AA', lastUpdated: '2025-12-09' },
  'grok-3-mini': { arenaTier: 'B', aaii: 1150, mmlu: 75, source: 'xAI/AA', lastUpdated: '2025-12-09' },
  // Grok Code
  'grok-code-fast-1': { arenaTier: 'A', aaii: 1200, mmlu: 82, source: 'xAI - 256K context, coding optimized', lastUpdated: '2025-12-09' },
  // Grok 2
  'grok-2-image-1212': { arenaTier: 'A', aaii: 1270, mmlu: 84, source: 'xAI - text-to-image', lastUpdated: '2025-12-09' },
  'grok-2-vision-1212': { arenaTier: 'A', aaii: 1270, mmlu: 84, source: 'xAI - multimodal', lastUpdated: '2025-12-09' },
  'grok-2-1212': { arenaTier: 'A', aaii: 1270, mmlu: 84, source: 'xAI/AA', lastUpdated: '2025-12-09' },
  'grok-2-latest': { arenaTier: 'A', aaii: 1270, mmlu: 84, source: 'xAI/AA', lastUpdated: '2025-12-09' },

  // ============================================================================
  // Perplexity - Source: Perplexity docs, benchable.ai
  // ============================================================================
  // Sonar Pro: SimpleQA F-score 0.858, Search Arena leader
  'sonar-pro': { arenaTier: 'A', aaii: 1250, mmlu: 80, source: 'Perplexity - SimpleQA 0.858', lastUpdated: '2025-12-09' },
  'sonar-small': { arenaTier: 'B', aaii: 1100, mmlu: 72, source: 'Perplexity - SimpleQA 0.773', lastUpdated: '2025-12-09' },

  // ============================================================================
  // Mistral - Source: mistral.ai, ArtificialAnalysis.ai
  // ============================================================================
  // Mistral Large 3: MMLU-Pro 73.1%, Large 2: MMLU 84%
  'mistral-large-latest': { arenaTier: 'A', aaii: 1280, mmlu: 84, source: 'Mistral - MMLU 84%', lastUpdated: '2025-12-09' },
  // Mistral Small 3: MMLU 81%
  'mistral-small-latest': { arenaTier: 'B', aaii: 1180, mmlu: 81, source: 'Mistral - MMLU 81%', lastUpdated: '2025-12-09' },

  // ============================================================================
  // Cohere - Source: cohere.com, ArtificialAnalysis.ai
  // ============================================================================
  // Command R+: MMLU 88.2%
  'command-r-plus': { arenaTier: 'A', aaii: 1260, mmlu: 88, source: 'Cohere - MMLU 88.2%', lastUpdated: '2025-12-09' },
  'command-r': { arenaTier: 'B', aaii: 1150, mmlu: 75, source: 'Cohere/AA', lastUpdated: '2025-12-09' },
};

// --- Rank-based system (replaces weight-first approach) ---

// Compute a comparable score from benchmarks for ranking
function computeBenchmarkScore(model: string): number {
  const b = MODEL_BENCHMARKS[model];
  if (!b) return 0;
  // Primary: AAII if available; Secondary: MMLU; Tier bonus: S>A>B>C
  const tierBonus = b.arenaTier === 'S' ? 40 : b.arenaTier === 'A' ? 20 : b.arenaTier === 'B' ? 10 : 0;
  const aaiiScore = typeof b.aaii === 'number' ? b.aaii : 1000; // default baseline
  const mmluScore = typeof b.mmlu === 'number' ? b.mmlu : 60;    // default baseline
  return aaiiScore + tierBonus + (mmluScore / 2);
}

// Precompute ranks for all benchmarked models
const PRECOMPUTED_RANKS: { model: string; rank: number }[] = (() => {
  const entries = Object.keys(MODEL_BENCHMARKS)
    .map((m) => ({ model: m, score: computeBenchmarkScore(m) }))
    .sort((a, b) => b.score - a.score);
  return entries.map((e, idx) => ({ model: e.model, rank: idx + 1 }));
})();

const MODEL_TO_RANK: Record<string, number> = PRECOMPUTED_RANKS.reduce((acc, { model, rank }) => {
  acc[model] = rank;
  return acc;
}, {} as Record<string, number>);

export function getMaxRank(): number {
  return PRECOMPUTED_RANKS.length > 0 ? PRECOMPUTED_RANKS.length : 10;
}

export function getModelRank(model: string): number {
  const direct = MODEL_TO_RANK[model];
  if (typeof direct === 'number') return direct;
  // Fallback: try to map common preview/variant names to base model
  const base = model.replace(/:.*$/, '').replace(/-preview|-beta|-latest/g, '');
  if (MODEL_TO_RANK[base]) return MODEL_TO_RANK[base];
  // Default to median rank if unknown
  const median = Math.ceil((getMaxRank() + 1) / 2);
  return median;
}

export function rankToInfluenceWeight(rank: number): number {
  const maxRank = getMaxRank();
  if (maxRank <= 1) return 1.0;
  // Map rank 1..maxRank to weight 1.0..0.5 (linear)
  const t = (rank - 1) / (maxRank - 1);
  const w = 1.0 - (t * 0.5);
  return Math.max(0.5, Math.min(1.0, Number(w.toFixed(2))));
}

// Back-compat alias: MODEL_POWER now derives from ranks
export const MODEL_POWER: Record<string, number> = new Proxy({}, {
  get(_target, prop: string) {
    const rank = getModelRank(prop);
    return rankToInfluenceWeight(rank);
  }
}) as Record<string, number>;

export function getRankedModels(): { model: string; rank: number }[] {
  return PRECOMPUTED_RANKS.map(({ model, rank }) => ({ model, rank }));
}

export function getInfluenceWeights(): { model: string; weight: number }[] {
  return PRECOMPUTED_RANKS.map(({ model, rank }) => ({ model, weight: rankToInfluenceWeight(rank) }))
    .sort((a, b) => b.weight - a.weight);
}



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

// Pricing per model (1K tokens)
export const MODEL_COSTS_PER_1K: Record<string, ModelCost> = {
  // OpenAI
  'gpt-5': { input: 0.00125, output: 0.01, source: 'OpenAI Flex pricing per 1K', lastUpdated: '2025-07-22' },
  'gpt-5-mini': { input: 0.000125, output: 0.001, source: 'OpenAI Flex pricing per 1K', lastUpdated: '2025-07-22' },
  'gpt-5-nano': { input: 0.000025, output: 0.0002, source: 'OpenAI Flex pricing per 1K', lastUpdated: '2025-07-22' },
  'gpt-4.1': { input: 0.002, output: 0.008, source: 'OpenAI Standard pricing per 1K', lastUpdated: '2025-07-22' },
  'gpt-4.1-mini': { input: 0.0004, output: 0.0016, source: 'OpenAI Standard pricing per 1K', lastUpdated: '2025-07-22' },
  'gpt-4.1-nano': { input: 0.0001, output: 0.0004, source: 'OpenAI Standard pricing per 1K', lastUpdated: '2025-07-22' },
  'o3': { input: 0.002, output: 0.008, source: 'OpenAI Standard pricing per 1K', lastUpdated: '2025-07-22' },
  'o4-mini': { input: 0.0011, output: 0.0044, source: 'OpenAI Standard pricing per 1K', lastUpdated: '2025-07-22' },
  'gpt-4o': { input: 0.0025, output: 0.01, source: 'OpenAI Standard pricing per 1K', lastUpdated: '2025-07-22' },
  'gpt-4o-realtime-preview': { input: 0.005, output: 0.02, source: 'OpenAI Standard pricing per 1K', lastUpdated: '2025-07-22' },
  // Legacy/compat
  'gpt-4': { input: 0.03, output: 0.06, source: 'OpenAI pricing', lastUpdated: '2025-05-01' },
  'gpt-4-turbo-preview': { input: 0.01, output: 0.03, source: 'OpenAI pricing', lastUpdated: '2024-12-01' },
  'gpt-3.5-turbo': { input: 0.0015, output: 0.002, source: 'OpenAI pricing', lastUpdated: '2024-11-01' },
  'gpt-3.5-turbo-16k': { input: 0.001, output: 0.002, source: 'OpenAI pricing', lastUpdated: '2024-11-01' },

  // Anthropic
  'claude-opus-4-20250514': { input: 0.015, output: 0.075, source: 'Anthropic pricing', lastUpdated: '2025-05-14' },
  'claude-sonnet-4-20250514': { input: 0.003, output: 0.015, source: 'Anthropic pricing', lastUpdated: '2025-05-14' },
  'claude-3-7-sonnet-20250219': { input: 0.003, output: 0.015, source: 'Anthropic pricing', lastUpdated: '2025-02-19' },
  'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015, source: 'Anthropic pricing', lastUpdated: '2024-10-22' },
  'claude-3-5-haiku-20241022': { input: 0.0008, output: 0.004, source: 'Anthropic pricing', lastUpdated: '2024-10-22' },
  'claude-3-opus-20240229': { input: 0.015, output: 0.075, source: 'Anthropic pricing', lastUpdated: '2024-02-29' },
  'claude-3-sonnet-20240229': { input: 0.003, output: 0.015, source: 'Anthropic pricing', lastUpdated: '2024-02-29' },
  'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125, source: 'Anthropic pricing', lastUpdated: '2024-03-07' },
  'claude-2.1': { input: 0.008, output: 0.024, source: 'Anthropic pricing', lastUpdated: '2023-11-01' },
  'claude-2.0': { input: 0.008, output: 0.024, source: 'Anthropic pricing', lastUpdated: '2023-07-01' },

  // Google Gemini
  // Pro remains paid; Flash variants treated as FREE for guest/free demo tiers
  'gemini-2.5-pro': { input: 0.00125, output: 0.01, source: 'Google Gemini 2.5 Pro pricing', lastUpdated: '2025-06-17' },
  'gemini-2.5-flash': { input: 0.0, output: 0.0, source: 'Demo tier treated as FREE', lastUpdated: '2025-06-17' },
  'gemini-2.0-flash': { input: 0.0, output: 0.0, source: 'Demo tier treated as FREE', lastUpdated: '2025-04-24' },
  'gemini-2.0-flash-lite': { input: 0.0, output: 0.0, source: 'Demo tier treated as FREE', lastUpdated: '2025-04-24' },
  'gemini-1.5-flash': { input: 0.0, output: 0.0, source: 'Demo tier treated as FREE', lastUpdated: '2024-10-03' },
  'gemini-1.5-flash-8b': { input: 0.0, output: 0.0, source: 'Demo tier treated as FREE', lastUpdated: '2024-10-03' },

  // Groq (often effectively $0 for promotional/free tiers; keep 0 unless set by env/business rules)
  'llama-3.3-70b-versatile': { input: 0.0, output: 0.0, source: 'Groq free tier', lastUpdated: '2025-05-01' },
  'llama-3.1-8b-instant': { input: 0.0, output: 0.0, source: 'Groq free tier', lastUpdated: '2025-05-01' },
  'gemma2-9b-it': { input: 0.0, output: 0.0, source: 'Groq free tier', lastUpdated: '2025-05-01' },

  // xAI (approx from public calculators; verify in console as xAI evolves)
  'grok-4-0709': { input: 0.003, output: 0.015, source: 'xAI pricing per 1M ($3 in / $15 out)', lastUpdated: '2025-07-22' },
  'grok-3': { input: 0.003, output: 0.015, source: 'xAI pricing per 1M ($3 in / $15 out)', lastUpdated: '2025-07-22' },
  'grok-3-mini': { input: 0.0003, output: 0.0005, source: 'xAI pricing per 1M ($0.30 in / $0.50 out)', lastUpdated: '2025-07-22' },
  'grok-2-latest': { input: 0.002, output: 0.01, source: 'xAI Grok-2 calc (indicative)', lastUpdated: '2025-04-20' },
  'grok-2-mini': { input: 0.0005, output: 0.0025, source: 'xAI Grok-2 mini calc (indicative)', lastUpdated: '2025-04-20' },

  // Perplexity
  'sonar-pro': { input: 0.003, output: 0.015, source: 'OpenRouter/Perplexity Sonar Pro', lastUpdated: '2025-03-07' },
  'sonar-small': { input: 0.001, output: 0.001, source: 'OpenRouter/Perplexity Sonar', lastUpdated: '2025-01-27' },

  // Mistral
  'mistral-large-latest': { input: 0.008, output: 0.024, source: 'Mistral pricing', lastUpdated: '2025-05-01' },
  'mistral-small-latest': { input: 0.0002, output: 0.0006, source: 'Mistral pricing', lastUpdated: '2025-06-01' },

  // Cohere
  'command-r-plus': { input: 0.0025, output: 0.01, source: 'Cohere pricing', lastUpdated: '2024-08-30' },
  'command-r': { input: 0.00015, output: 0.0006, source: 'Cohere pricing', lastUpdated: '2024-08-30' },
};

// Benchmarks and derived power weights (0.0-1.0)
export const MODEL_BENCHMARKS: Record<string, ModelBenchmark> = {
  // OpenAI
  // Updated using Artificial Analysis data (Intelligence Index and MMLU-Pro)
  // Source: https://artificialanalysis.ai/leaderboards/models
  'gpt-5': { arenaTier: 'S', aaii: 1069, mmlu: 87, source: 'ArtificialAnalysis', lastUpdated: '2025-08-08' },
  'gpt-5-mini': { arenaTier: 'A', aaii: 1064, mmlu: 83, source: 'ArtificialAnalysis', lastUpdated: '2025-08-08' },
  'gpt-5-nano': { arenaTier: 'B', aaii: 1054, mmlu: 77, source: 'ArtificialAnalysis', lastUpdated: '2025-08-08' },
  'gpt-4.1': { arenaTier: 'A', aaii: 1047, mmlu: 81, source: 'ArtificialAnalysis', lastUpdated: '2025-08-08' },
  'gpt-4.1-mini': { arenaTier: 'B', aaii: 1042, mmlu: 78, source: 'ArtificialAnalysis', lastUpdated: '2025-08-08' },
  'gpt-4.1-nano': { arenaTier: 'C', aaii: 1030, mmlu: 66, source: 'ArtificialAnalysis', lastUpdated: '2025-08-08' },
  'gpt-4': { arenaTier: 'A', aaii: 1200, mmlu: 86, source: 'Chatbot Arena/ArtificialAnalysis', lastUpdated: '2025-05-01' },
  'gpt-4-turbo-preview': { arenaTier: 'A', aaii: 1230, mmlu: 83, source: 'ArtificialAnalysis', lastUpdated: '2025-02-01' },
  'gpt-4o': { arenaTier: 'S', aaii: 1297, mmlu: 80, source: 'OpenLM.ai Arena/AA', lastUpdated: '2025-03-26' },
  // Map realtime preview to gpt-4o for ranking purposes
  'gpt-4o-realtime-preview': { arenaTier: 'S', aaii: 1297, mmlu: 80, source: 'OpenLM.ai Arena/AA (mapped to gpt-4o)', lastUpdated: '2025-03-26' },
  'gpt-3.5-turbo': { arenaTier: 'B', aaii: 950, mmlu: 70, source: 'Historical averages', lastUpdated: '2024-11-01' },
  'o3': { arenaTier: 'S', aaii: 1067, mmlu: 85, source: 'ArtificialAnalysis', lastUpdated: '2025-08-08' },
  'o4-mini': { arenaTier: 'A', aaii: 1065, mmlu: 83, source: 'ArtificialAnalysis', lastUpdated: '2025-08-08' },

  // Anthropic
  'claude-opus-4-20250514': { arenaTier: 'S', aaii: 1212, mmlu: 87, source: 'Anthropic/AA', lastUpdated: '2025-05-14' },
  'claude-sonnet-4-20250514': { arenaTier: 'S', aaii: 1212, mmlu: 84, source: 'Anthropic/AA', lastUpdated: '2025-05-14' },
  'claude-3-7-sonnet-20250219': { arenaTier: 'A', aaii: 1205, mmlu: 83, source: 'Anthropic/AA', lastUpdated: '2025-02-19' },
  'claude-3-5-sonnet-20241022': { arenaTier: 'A', aaii: 1200, mmlu: 82, source: 'AA', lastUpdated: '2024-10-22' },
  'claude-3-5-haiku-20241022': { arenaTier: 'B', aaii: 1100, mmlu: 75, source: 'AA', lastUpdated: '2024-10-22' },

  // Google
  'gemini-2.5-pro': { arenaTier: 'S', aaii: 1318, mmlu: 65, source: 'OpenLM.ai Arena/Google', lastUpdated: '2025-06-17' },
  'gemini-2.5-flash': { arenaTier: 'A', aaii: 1280, mmlu: 58, source: 'OpenLM.ai Arena/Google', lastUpdated: '2025-06-17' },
  'gemini-2.0-flash': { arenaTier: 'A', aaii: 1241, mmlu: 38, source: 'OpenLM.ai Arena/Google', lastUpdated: '2025-04-24' },
  'gemini-2.0-flash-lite': { arenaTier: 'B', aaii: 1147, mmlu: 30, source: 'OpenLM.ai Arena/Google', lastUpdated: '2025-04-24' },
  'gemini-1.5-flash': { arenaTier: 'A', aaii: 1208, mmlu: 34, source: 'OpenLM.ai Arena', lastUpdated: '2024-09-24' },
  'gemini-1.5-flash-8b': { arenaTier: 'B', aaii: 1140, mmlu: 30, source: 'Google blog', lastUpdated: '2024-10-03' },

  // Groq (open models; weights reflect typical quality, not speed)
  'llama-3.3-70b-versatile': { arenaTier: 'A', aaii: 1180, mmlu: 75, source: 'Community evals', lastUpdated: '2025-05-01' },
  'llama-3.1-8b-instant': { arenaTier: 'B', aaii: 1100, mmlu: 65, source: 'Community evals', lastUpdated: '2024-07-01' },
  'gemma2-9b-it': { arenaTier: 'B', aaii: 1120, mmlu: 68, source: 'Community evals', lastUpdated: '2024-08-01' },

  // xAI
  // Align Grok 4 to AA row (Intelligence ~68, MMLU-Pro ~87). AA index normalized to ~1000+score
  'grok-4-0709': { arenaTier: 'S', aaii: 1068, mmlu: 87, source: 'ArtificialAnalysis/xAI', lastUpdated: '2025-08-08' },
  'grok-3': { arenaTier: 'A', aaii: 1250, mmlu: 86, source: 'xAI/pricing page (approx)', lastUpdated: '2025-07-22' },
  'grok-3-mini': { arenaTier: 'B', aaii: 1150, mmlu: 75, source: 'xAI/pricing page (approx)', lastUpdated: '2025-07-22' },
  'grok-2-latest': { arenaTier: 'S', aaii: 1273, mmlu: 87, source: 'OpenLM.ai Arena/xAI blog', lastUpdated: '2025-03-01' },
  'grok-2-mini': { arenaTier: 'A', aaii: 1220, mmlu: 86, source: 'Calculators/xAI', lastUpdated: '2025-03-01' },

  // Perplexity
  'sonar-pro': { arenaTier: 'A', aaii: 1200, mmlu: 78, source: 'OpenRouter/AA', lastUpdated: '2025-03-07' },
  'sonar-small': { arenaTier: 'B', aaii: 1100, mmlu: 70, source: 'OpenRouter/AA', lastUpdated: '2025-01-27' },

  // Mistral
  'mistral-large-latest': { arenaTier: 'A', aaii: 1196, mmlu: 76, source: 'OpenLM.ai Arena/AA', lastUpdated: '2025-05-01' },
  'mistral-small-latest': { arenaTier: 'B', aaii: 1183, mmlu: 68, source: 'OpenLM.ai Arena/AA', lastUpdated: '2025-06-01' },

  // Cohere
  'command-r-plus': { arenaTier: 'A', aaii: 1214, mmlu: 71, source: 'ArtificialAnalysis/DocsBot', lastUpdated: '2024-08-30' },
  'command-r': { arenaTier: 'B', aaii: 1180, mmlu: 60, source: 'ArtificialAnalysis', lastUpdated: '2024-08-30' },
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



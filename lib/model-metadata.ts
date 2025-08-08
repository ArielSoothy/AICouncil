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
  'gpt-4': { input: 0.03, output: 0.06, source: 'OpenAI pricing', lastUpdated: '2025-05-01' },
  'gpt-4-turbo-preview': { input: 0.01, output: 0.03, source: 'OpenAI pricing', lastUpdated: '2024-12-01' },
  'gpt-4o': { input: 0.005, output: 0.015, source: 'OpenAI GPT-4o pricing (per 1M: $5/$15)', lastUpdated: '2025-04-21' },
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
  'gpt-4': { arenaTier: 'A', aaii: 1200, mmlu: 86, source: 'Chatbot Arena/ArtificialAnalysis', lastUpdated: '2025-05-01' },
  'gpt-4-turbo-preview': { arenaTier: 'A', aaii: 1230, mmlu: 83, source: 'ArtificialAnalysis', lastUpdated: '2025-02-01' },
  'gpt-4o': { arenaTier: 'S', aaii: 1297, mmlu: 80, source: 'OpenLM.ai Arena/AA', lastUpdated: '2025-03-26' },
  'gpt-3.5-turbo': { arenaTier: 'B', aaii: 950, mmlu: 70, source: 'Historical averages', lastUpdated: '2024-11-01' },

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
  'grok-4-0709': { arenaTier: 'S', aaii: 1300, mmlu: 88, source: 'xAI/pricing page (approx)', lastUpdated: '2025-07-22' },
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

// Convert arena tier and aaii into a 0..1 weight
export function computePowerWeight(model: string): number {
  const b = MODEL_BENCHMARKS[model];
  if (!b) return 0.7; // default neutral weight
  const tierBase = b.arenaTier === 'S' ? 0.95 : b.arenaTier === 'A' ? 0.85 : b.arenaTier === 'B' ? 0.72 : 0.6;
  const aaiiAdj = b.aaii ? Math.min(Math.max((b.aaii - 1000) / 400, -0.1), 0.1) : 0; // small adjustment
  const mmluAdj = b.mmlu ? Math.min(Math.max((b.mmlu - 75) / 50, -0.08), 0.08) : 0;
  const w = tierBase + aaiiAdj + mmluAdj;
  return Math.max(0.5, Math.min(1.0, Number(w.toFixed(2))));
}

export const MODEL_POWER: Record<string, number> = new Proxy({}, {
  get(_target, prop: string) {
    return computePowerWeight(prop);
  }
}) as Record<string, number>;

export function getRankedModels(): { model: string; weight: number }[] {
  const models = Object.keys(MODEL_BENCHMARKS);
  return models
    .map(m => ({ model: m, weight: computePowerWeight(m) }))
    .sort((a, b) => b.weight - a.weight);
}



/**
 * Environment variable validation
 *
 * Validates required and optional env vars at startup.
 * Import and call validateEnv() in server-side code to get
 * early, clear errors instead of cryptic runtime failures.
 *
 * Usage:
 *   import { env, validateEnv } from '@/lib/config/env'
 *   validateEnv() // throws with clear message if required vars missing
 *   const key = env.OPENAI_API_KEY // typed access
 */

// Required: app won't function without these
const REQUIRED_SERVER = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const

// Optional: features degrade gracefully without these
const OPTIONAL_SERVER = {
  // AI Providers (at least one should be set)
  OPENAI_API_KEY: 'OpenAI models (GPT-4o, etc.)',
  ANTHROPIC_API_KEY: 'Anthropic models (Claude)',
  GOOGLE_GENERATIVE_AI_API_KEY: 'Google models (Gemini)',
  GROQ_API_KEY: 'Groq models (Llama, Gemma)',
  XAI_API_KEY: 'xAI models (Grok)',
  PERPLEXITY_API_KEY: 'Perplexity models (Sonar)',
  MISTRAL_API_KEY: 'Mistral models',
  COHERE_API_KEY: 'Cohere models (Command)',

  // Trading
  ALPACA_API_KEY: 'Alpaca paper trading',
  ALPACA_SECRET_KEY: 'Alpaca paper trading',
  IBKR_ACCOUNT_ID: 'Interactive Brokers trading',
  FINNHUB_API_KEY: 'Finnhub sentiment data',

  // Screening
  SCREENING_ACCESS_KEY: 'Screening password protection',

  // Auth
  NEXTAUTH_SECRET: 'NextAuth session encryption',
} as const

type RequiredKey = (typeof REQUIRED_SERVER)[number]
type OptionalKey = keyof typeof OPTIONAL_SERVER

export interface EnvValidationResult {
  valid: boolean
  missing: string[]
  warnings: string[]
  availableProviders: string[]
}

/**
 * Validate environment variables and return a report.
 * Does NOT throw - returns a result object.
 */
export function checkEnv(): EnvValidationResult {
  const missing: string[] = []
  const warnings: string[] = []
  const availableProviders: string[] = []

  // Check required vars
  for (const key of REQUIRED_SERVER) {
    if (!process.env[key]) {
      missing.push(key)
    }
  }

  // Check AI providers - warn if none configured
  const providerKeys: OptionalKey[] = [
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY',
    'GOOGLE_GENERATIVE_AI_API_KEY',
    'GROQ_API_KEY',
    'XAI_API_KEY',
    'PERPLEXITY_API_KEY',
    'MISTRAL_API_KEY',
    'COHERE_API_KEY',
  ]

  for (const key of providerKeys) {
    const val = process.env[key]
    if (val && val !== `your_${key.toLowerCase().replace('_api_key', '')}_api_key_here`) {
      availableProviders.push(OPTIONAL_SERVER[key])
    }
  }

  if (availableProviders.length === 0) {
    warnings.push('No AI provider API keys configured - AI features will not work')
  }

  // Check placeholder values
  if (process.env.NEXTAUTH_SECRET === 'your_nextauth_secret_here') {
    warnings.push('NEXTAUTH_SECRET is still the placeholder value')
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
    availableProviders,
  }
}

/**
 * Validate env vars and throw if required ones are missing.
 * Call this at app startup for fail-fast behavior.
 */
export function validateEnv(): void {
  const result = checkEnv()

  if (!result.valid) {
    throw new Error(
      `Missing required environment variables:\n${result.missing.map(k => `  - ${k}`).join('\n')}\n\nAdd them to .env.local`
    )
  }

  if (result.warnings.length > 0) {
    for (const w of result.warnings) {
      console.warn(`[env] ${w}`)
    }
  }
}

/**
 * Typed environment access. Use this instead of process.env directly
 * for better autocomplete and documentation.
 */
export const env = {
  // Supabase (required)
  get SUPABASE_URL() { return process.env.NEXT_PUBLIC_SUPABASE_URL! },
  get SUPABASE_ANON_KEY() { return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
  get SUPABASE_SERVICE_ROLE_KEY() { return process.env.SUPABASE_SERVICE_ROLE_KEY! },

  // AI Providers (optional)
  get OPENAI_API_KEY() { return process.env.OPENAI_API_KEY },
  get ANTHROPIC_API_KEY() { return process.env.ANTHROPIC_API_KEY },
  get GOOGLE_API_KEY() { return process.env.GOOGLE_GENERATIVE_AI_API_KEY },
  get GROQ_API_KEY() { return process.env.GROQ_API_KEY },
  get XAI_API_KEY() { return process.env.XAI_API_KEY },
  get PERPLEXITY_API_KEY() { return process.env.PERPLEXITY_API_KEY },
  get MISTRAL_API_KEY() { return process.env.MISTRAL_API_KEY },
  get COHERE_API_KEY() { return process.env.COHERE_API_KEY },

  // Trading
  get ALPACA_API_KEY() { return process.env.ALPACA_API_KEY },
  get ALPACA_SECRET_KEY() { return process.env.ALPACA_SECRET_KEY },
  get IBKR_ACCOUNT_ID() { return process.env.IBKR_ACCOUNT_ID },
  get FINNHUB_API_KEY() { return process.env.FINNHUB_API_KEY },

  // Screening
  get SCREENING_ACCESS_KEY() { return process.env.SCREENING_ACCESS_KEY },

  // Flags
  get IS_PRODUCTION() { return process.env.VERCEL === '1' || process.env.NODE_ENV === 'production' },
  get NODE_ENV() { return process.env.NODE_ENV },
} as const

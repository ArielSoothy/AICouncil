/**
 * Environment detection utilities for AI Council / Verdict AI
 *
 * Production = Vercel production deployment (Free tier only)
 * Development = Local development or Vercel preview (All tiers available)
 *
 * This ensures paid AI models are not abused when app is publicly deployed.
 *
 * NOTE: NEXT_PUBLIC_VERCEL_ENV is exposed via next.config.js for client-side access
 */

// Use NEXT_PUBLIC_ prefix for client-side access (set in next.config.js)
const VERCEL_ENV = process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.VERCEL_ENV

// IMPORTANT: Only Vercel production should hide dev tools
// Preview deployments and local dev should show everything
// Note: NODE_ENV is 'production' on ALL Vercel deployments, so don't use it for this check
export const IS_VERCEL_PRODUCTION = VERCEL_ENV === 'production'
export const IS_PRODUCTION = IS_VERCEL_PRODUCTION  // Alias for backwards compatibility
export const IS_PREVIEW = VERCEL_ENV === 'preview'
export const IS_DEVELOPMENT = !IS_VERCEL_PRODUCTION && !IS_PREVIEW

/**
 * Allowed subscription tiers based on environment
 * - Production: Only 'free' tier (6 free models: Llama 3.3 70B, Gemini 2.0/1.5 Flash)
 * - Development/Preview: All tiers (Free, Pro, Max with 46+ models)
 */
export const ALLOWED_TIERS = IS_PRODUCTION
  ? (['free'] as const)
  : (['free', 'pro', 'max'] as const)

export type AllowedTier = typeof ALLOWED_TIERS[number]

/**
 * Check if a tier is allowed in current environment
 */
export function isTierAllowed(tier: string): boolean {
  return ALLOWED_TIERS.includes(tier as any)
}

/**
 * Get environment display name for debugging
 */
export function getEnvironmentName(): string {
  if (IS_PRODUCTION) return 'Production'
  if (IS_PREVIEW) return 'Preview'
  return 'Development'
}

/**
 * Log environment info (useful for debugging)
 */
export function logEnvironmentInfo(): void {
  console.log(`🌍 Environment: ${getEnvironmentName()}`)
  console.log(`📊 Allowed Tiers: ${ALLOWED_TIERS.join(', ')}`)
  console.log(`🔒 Production Mode: ${IS_PRODUCTION}`)
}

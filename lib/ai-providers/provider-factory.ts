/**
 * Central Provider Factory - SINGLE SOURCE OF TRUTH for provider selection
 *
 * CRITICAL RULES:
 * 1. Sub tiers (sub-pro, sub-max) MUST use CLI providers ONLY
 * 2. If CLI fails for sub tier → throw error, NEVER fall back to API
 * 3. User pays monthly subscription → should NEVER be charged per-call API fees
 *
 * This factory MUST be used by ALL API routes. Direct provider instantiation is forbidden.
 */

import type { PresetTier } from '@/lib/config/model-presets';

// API Providers (per-call billing via API keys)
import { AnthropicProvider } from './anthropic';
import { OpenAIProvider } from './openai';
import { GoogleProvider } from './google';
import { GroqProvider } from './groq';
import { MistralProvider } from './mistral';
import { PerplexityProvider } from './perplexity';
import { CohereProvider } from './cohere';
import { XAIProvider } from './xai';

// CLI Providers (subscription billing - monthly fee)
import { ClaudeCLIProvider, CodexCLIProvider, GoogleCLIProvider } from './cli';

// Provider type definitions
export type ProviderType =
  | 'anthropic'
  | 'openai'
  | 'google'
  | 'groq'
  | 'mistral'
  | 'perplexity'
  | 'cohere'
  | 'xai';

// API Providers singleton instances
const API_PROVIDERS: Record<ProviderType, any> = {
  anthropic: new AnthropicProvider(),
  openai: new OpenAIProvider(),
  google: new GoogleProvider(),
  groq: new GroqProvider(),
  mistral: new MistralProvider(),
  perplexity: new PerplexityProvider(),
  cohere: new CohereProvider(),
  xai: new XAIProvider(),
};

// CLI Providers singleton instances (only for providers that have CLI support)
const CLI_PROVIDERS: Partial<Record<ProviderType, any>> = {
  anthropic: new ClaudeCLIProvider(),   // Claude Pro/Max subscription
  openai: new CodexCLIProvider(),       // ChatGPT Plus/Pro subscription
  google: new GoogleCLIProvider(),      // Gemini Advanced subscription
  // Note: groq, mistral, perplexity, cohere, xai do NOT have CLI providers
  // Sub tier users cannot use these providers - they MUST use anthropic/openai/google
};

// Providers that are FREE (no billing concern)
const FREE_PROVIDERS: ProviderType[] = ['groq'];

/**
 * Check if tier is a subscription tier
 */
export function isSubscriptionTier(tier: PresetTier): boolean {
  return tier === 'sub-pro' || tier === 'sub-max';
}

/**
 * Get provider for a specific tier and provider type
 *
 * @param tier - User's selected tier (free, pro, max, sub-pro, sub-max)
 * @param providerType - The provider type (anthropic, openai, google, etc.)
 * @returns Object with provider or error message
 *
 * @throws Error if sub tier attempts to use non-CLI provider
 */
export function getProviderForTier(
  tier: PresetTier,
  providerType: ProviderType | string
): { provider: any; error?: string } {
  const provider = providerType as ProviderType;

  // Validate provider type
  if (!API_PROVIDERS[provider]) {
    return {
      provider: null,
      error: `Unknown provider type: ${providerType}`,
    };
  }

  // SUB TIERS: CLI providers ONLY - NO API FALLBACK
  if (isSubscriptionTier(tier)) {
    return getProviderForSubTier(tier, provider);
  }

  // REGULAR TIERS (free, pro, max): Use API providers
  console.log(`🔷 Using API provider for ${providerType} (${tier} tier)`);
  return { provider: API_PROVIDERS[provider] };
}

/**
 * Get provider for subscription tier - CLI ONLY, NO FALLBACK
 */
function getProviderForSubTier(
  tier: PresetTier,
  providerType: ProviderType
): { provider: any; error?: string } {
  // Check if this provider has CLI support
  const cliProvider = CLI_PROVIDERS[providerType];

  // If no CLI provider exists, check if it's a free provider (like Groq)
  if (!cliProvider) {
    if (FREE_PROVIDERS.includes(providerType)) {
      console.log(`🆓 Using free API provider for ${providerType} (${tier} tier - no billing)`);
      return { provider: API_PROVIDERS[providerType] };
    }

    // NO CLI PROVIDER AND NOT FREE = ERROR
    const errorMsg =
      `No CLI provider available for ${providerType}. ` +
      `Sub tier (${tier}) requires CLI-supported providers (anthropic, openai, google) or free providers (groq). ` +
      `Switch to Pro/Max tier for API access to ${providerType}.`;
    console.error(`❌ BILLING PROTECTION: ${errorMsg}`);
    return { provider: null, error: errorMsg };
  }

  // CLI provider exists - check if it's configured
  try {
    if (cliProvider.isConfigured && cliProvider.isConfigured()) {
      console.log(`🔑 Using CLI SUBSCRIPTION provider for ${providerType} (${tier} tier)`);
      return { provider: cliProvider };
    } else {
      // CLI not configured - DO NOT FALL BACK TO API
      const errorMsg =
        `CLI provider for ${providerType} not configured. ` +
        `Install the CLI tool (npx @anthropic-ai/claude-code --version) or switch to Pro/Max tier for API access.`;
      console.error(`❌ BILLING PROTECTION: ${errorMsg}`);
      return { provider: null, error: errorMsg };
    }
  } catch (error) {
    // CLI check failed - DO NOT FALL BACK TO API
    const errorMsg =
      `CLI provider check failed for ${providerType}: ${error instanceof Error ? error.message : error}. ` +
      `Install the CLI tool or switch to Pro/Max tier.`;
    console.error(`❌ BILLING PROTECTION: ${errorMsg}`);
    return { provider: null, error: errorMsg };
  }
}

/**
 * Get ALL providers for a tier - returns a map of provider types to providers
 * Used by routes that need to query multiple providers
 *
 * For sub tiers: Only returns CLI providers + free providers (Groq)
 * For regular tiers: Returns all API providers
 */
export function getProvidersForTier(tier: PresetTier): Record<ProviderType, any> {
  if (isSubscriptionTier(tier)) {
    console.log(`🔑 Building CLI provider map for ${tier} tier`);

    // For sub tiers: Only CLI providers + free providers
    const providers: Partial<Record<ProviderType, any>> = {};

    for (const [providerType, cliProvider] of Object.entries(CLI_PROVIDERS)) {
      if (cliProvider && cliProvider.isConfigured && cliProvider.isConfigured()) {
        providers[providerType as ProviderType] = cliProvider;
      }
    }

    // Add free providers (like Groq)
    for (const freeProvider of FREE_PROVIDERS) {
      providers[freeProvider] = API_PROVIDERS[freeProvider];
    }

    return providers as Record<ProviderType, any>;
  }

  // Regular tiers: Return all API providers
  console.log(`🔷 Building API provider map for ${tier} tier`);
  return { ...API_PROVIDERS };
}

/**
 * Validate that a provider is appropriate for the given tier
 * Use this for runtime protection - call BEFORE making any API calls
 *
 * @throws Error if sub tier would be charged API fees
 */
export function assertProviderAllowedForTier(
  tier: PresetTier,
  providerType: ProviderType | string,
  provider: any
): void {
  if (!isSubscriptionTier(tier)) {
    return; // Regular tiers can use any provider
  }

  const type = providerType as ProviderType;

  // Check if this is a CLI provider
  const cliProvider = CLI_PROVIDERS[type];
  if (provider === cliProvider) {
    return; // CLI provider is OK for sub tier
  }

  // Check if this is a free provider
  if (FREE_PROVIDERS.includes(type) && provider === API_PROVIDERS[type]) {
    return; // Free API provider is OK for sub tier
  }

  // This is an API provider being used with sub tier = BILLING VIOLATION
  throw new Error(
    `CRITICAL BILLING VIOLATION: Sub tier ${tier} attempted to use API provider ${providerType}. ` +
    `This would charge per-call API fees instead of using the subscription. ` +
    `Report this bug immediately!`
  );
}

/**
 * Get list of available providers for a tier
 * Used by frontend to show which providers can be selected
 */
export function getAvailableProvidersForTier(tier: PresetTier): ProviderType[] {
  if (isSubscriptionTier(tier)) {
    // Sub tiers: Only CLI-supported + free providers
    const available: ProviderType[] = [...FREE_PROVIDERS];

    for (const [providerType, cliProvider] of Object.entries(CLI_PROVIDERS)) {
      if (cliProvider && cliProvider.isConfigured && cliProvider.isConfigured()) {
        available.push(providerType as ProviderType);
      }
    }

    return available;
  }

  // Regular tiers: All providers
  return Object.keys(API_PROVIDERS) as ProviderType[];
}

// Re-export individual providers for routes that need direct access
// (but they should use getProviderForTier instead!)
export {
  API_PROVIDERS,
  CLI_PROVIDERS,
  FREE_PROVIDERS,
};

/**
 * Data Provider Factory
 *
 * Factory Pattern for creating data providers
 *
 * This makes it trivially easy to switch between providers:
 * - Set environment variable: DATA_PROVIDER=yahoo
 * - Or programmatically: getDataProvider('yahoo')
 *
 * Benefits:
 * - ✅ Single source of truth for provider selection
 * - ✅ Easy A/B testing between providers
 * - ✅ Graceful fallback if primary provider fails
 * - ✅ Easy to add new providers (IBKR, Polygon, etc.)
 *
 * Usage:
 * ```typescript
 * const provider = getDataProvider(); // Uses env var or default
 * const data = await provider.fetchMarketData('TSLA');
 * ```
 */

import type { IDataProvider, ProviderConfig } from './types';
import { YahooFinanceProvider } from './yahoo-finance-provider';

// We'll add AlpacaProvider later after refactoring
// import { AlpacaProvider } from './alpaca-provider';

/**
 * Get data provider instance based on configuration
 *
 * @param providerType - Which provider to use (defaults to env var or 'yahoo')
 * @returns Data provider instance
 *
 * @example
 * ```typescript
 * // Use default provider (from env or yahoo)
 * const provider = getDataProvider();
 *
 * // Explicitly use Yahoo Finance
 * const yahooProvider = getDataProvider('yahoo');
 *
 * // Explicitly use Alpaca
 * const alpacaProvider = getDataProvider('alpaca');
 * ```
 */
export function getDataProvider(
  providerType?: 'alpaca' | 'yahoo' | 'ibkr'
): IDataProvider {
  // Determine which provider to use
  const provider =
    providerType ||
    (process.env.DATA_PROVIDER as 'alpaca' | 'yahoo' | 'ibkr') ||
    'yahoo'; // Default to Yahoo Finance (free!)

  console.log(`📊 Using data provider: ${provider.toUpperCase()}`);

  switch (provider) {
    case 'yahoo':
      return new YahooFinanceProvider();

    case 'alpaca':
      // TODO: Uncomment when AlpacaProvider is created
      // return new AlpacaProvider({
      //   apiKey: process.env.ALPACA_API_KEY!,
      //   apiSecret: process.env.ALPACA_SECRET_KEY!,
      //   paper: true,
      // });
      throw new Error('Alpaca provider not yet implemented in new architecture');

    case 'ibkr':
      throw new Error('IBKR provider not yet implemented');

    default:
      console.warn(
        `Unknown provider '${provider}', falling back to Yahoo Finance`
      );
      return new YahooFinanceProvider();
  }
}

/**
 * Provider registry for advanced use cases
 *
 * Allows registering custom providers or overriding defaults
 */
class ProviderRegistry {
  private providers = new Map<string, () => IDataProvider>();

  /**
   * Register a custom provider
   *
   * @param name - Provider name
   * @param factory - Factory function to create provider instance
   *
   * @example
   * ```typescript
   * providerRegistry.register('custom', () => new CustomProvider());
   * const provider = providerRegistry.get('custom');
   * ```
   */
  register(name: string, factory: () => IDataProvider): void {
    this.providers.set(name, factory);
    console.log(`✅ Registered provider: ${name}`);
  }

  /**
   * Get provider by name
   *
   * @param name - Provider name
   * @returns Provider instance
   */
  get(name: string): IDataProvider {
    const factory = this.providers.get(name);
    if (!factory) {
      throw new Error(`Provider '${name}' not registered`);
    }
    return factory();
  }

  /**
   * Check if provider is registered
   *
   * @param name - Provider name
   * @returns true if registered
   */
  has(name: string): boolean {
    return this.providers.has(name);
  }

  /**
   * List all registered providers
   *
   * @returns Array of provider names
   */
  list(): string[] {
    return Array.from(this.providers.keys());
  }
}

/**
 * Global provider registry instance
 */
export const providerRegistry = new ProviderRegistry();

// Register default providers
providerRegistry.register('yahoo', () => new YahooFinanceProvider());
// TODO: Add more providers as they're implemented
// providerRegistry.register('alpaca', () => new AlpacaProvider());
// providerRegistry.register('ibkr', () => new IBKRProvider());

/**
 * Helper to test if a provider is working
 *
 * @param providerType - Provider to test
 * @returns Promise<boolean> - true if provider is healthy
 *
 * @example
 * ```typescript
 * const isHealthy = await testProvider('yahoo');
 * if (!isHealthy) {
 *   console.log('Yahoo Finance is down, switching to Alpaca...');
 * }
 * ```
 */
export async function testProvider(
  providerType: 'alpaca' | 'yahoo' | 'ibkr'
): Promise<boolean> {
  try {
    const provider = getDataProvider(providerType);
    const isHealthy = await provider.healthCheck();
    console.log(`[${providerType}] Health check: ${isHealthy ? '✅' : '❌'}`);
    return isHealthy;
  } catch (error) {
    console.error(`[${providerType}] Health check failed:`, error);
    return false;
  }
}

/**
 * Helper to get a working provider with automatic fallback
 *
 * Tries providers in order until one works:
 * 1. Yahoo Finance (free, usually reliable)
 * 2. Alpaca (if configured)
 * 3. IBKR (if configured)
 *
 * @returns Promise<IDataProvider> - First working provider
 *
 * @example
 * ```typescript
 * const provider = await getWorkingProvider();
 * const data = await provider.fetchMarketData('TSLA');
 * ```
 */
export async function getWorkingProvider(): Promise<IDataProvider> {
  const providersToTry: Array<'yahoo' | 'alpaca' | 'ibkr'> = [
    'yahoo', // Try free option first
    // 'alpaca', // TODO: Uncomment when implemented
    // 'ibkr',   // TODO: Uncomment when implemented
  ];

  for (const providerType of providersToTry) {
    try {
      const provider = getDataProvider(providerType);
      const isHealthy = await provider.healthCheck();
      if (isHealthy) {
        console.log(`✅ Using ${providerType} provider`);
        return provider;
      }
    } catch (error) {
      console.warn(`⚠️  ${providerType} provider failed, trying next...`);
    }
  }

  // If all providers fail, throw error
  throw new Error('No working data providers available');
}

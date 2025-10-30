/**
 * Data Providers Module - Clean Exports
 *
 * This module provides a clean, modular architecture for fetching market data
 * from different sources (Yahoo Finance, Alpaca, IBKR, etc.).
 *
 * Key Design Principles:
 * 1. **Interface-based**: All providers implement IDataProvider
 * 2. **Factory pattern**: Easy to switch providers via config
 * 3. **Modular**: Each provider is independent
 * 4. **Testable**: Easy to mock providers for testing
 * 5. **Scalable**: Easy to add new providers
 *
 * Quick Start:
 * ```typescript
 * import { getDataProvider } from '@/lib/data-providers';
 *
 * const provider = getDataProvider(); // Uses env var or default (Yahoo)
 * const data = await provider.fetchMarketData('TSLA');
 * ```
 *
 * Switching Providers:
 * ```typescript
 * // Set environment variable
 * DATA_PROVIDER=yahoo  # Free, no API key
 * DATA_PROVIDER=alpaca # Requires API key
 * DATA_PROVIDER=ibkr   # Requires IB account
 *
 * // Or programmatically
 * const provider = getDataProvider('yahoo');
 * ```
 */

// Core types and interfaces
export type {
  IDataProvider,
  SharedTradingData,
  QuoteData,
  PriceBar,
  TechnicalIndicators,
  PriceLevels,
  NewsArticle,
  TrendAnalysis,
  ProviderConfig,
} from './types';

export { DataProviderError } from './types';

// Base provider class (for creating custom providers)
export { BaseDataProvider } from './base-provider';

// Concrete provider implementations
export { YahooFinanceProvider } from './yahoo-finance-provider';
// export { AlpacaProvider } from './alpaca-provider'; // TODO: Implement

// Factory functions (most commonly used)
export {
  getDataProvider,
  getWorkingProvider,
  testProvider,
  providerRegistry,
} from './provider-factory';

/**
 * Usage Examples:
 *
 * @example Basic usage with default provider
 * ```typescript
 * import { getDataProvider } from '@/lib/data-providers';
 *
 * const provider = getDataProvider();
 * const data = await provider.fetchMarketData('AAPL');
 * console.log(`Current price: $${data.quote.price}`);
 * console.log(`RSI: ${data.technical.rsi}`);
 * ```
 *
 * @example Switch providers programmatically
 * ```typescript
 * import { getDataProvider } from '@/lib/data-providers';
 *
 * // Use Yahoo Finance (free)
 * const yahoo = getDataProvider('yahoo');
 * const data1 = await yahoo.fetchMarketData('TSLA');
 *
 * // Use Alpaca (requires API key)
 * const alpaca = getDataProvider('alpaca');
 * const data2 = await alpaca.fetchMarketData('TSLA');
 * ```
 *
 * @example Health check before using provider
 * ```typescript
 * import { getDataProvider, testProvider } from '@/lib/data-providers';
 *
 * const isYahooWorking = await testProvider('yahoo');
 * if (isYahooWorking) {
 *   const provider = getDataProvider('yahoo');
 *   const data = await provider.fetchMarketData('NVDA');
 * }
 * ```
 *
 * @example Get working provider with automatic fallback
 * ```typescript
 * import { getWorkingProvider } from '@/lib/data-providers';
 *
 * // Automatically tries Yahoo, then Alpaca, then IBKR
 * const provider = await getWorkingProvider();
 * const data = await provider.fetchMarketData('MSFT');
 * ```
 *
 * @example Create custom provider
 * ```typescript
 * import { BaseDataProvider, providerRegistry } from '@/lib/data-providers';
 *
 * class MyCustomProvider extends BaseDataProvider {
 *   readonly name = 'My Provider';
 *
 *   async fetchMarketData(symbol: string) {
 *     // Your implementation
 *   }
 *
 *   async healthCheck() {
 *     return true;
 *   }
 * }
 *
 * // Register it
 * providerRegistry.register('custom', () => new MyCustomProvider());
 *
 * // Use it
 * const provider = providerRegistry.get('custom');
 * ```
 */

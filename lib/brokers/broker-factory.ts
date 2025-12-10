/**
 * Broker Factory
 *
 * Creates and manages broker instances.
 * Provides a singleton pattern for broker access.
 *
 * Usage:
 *   const broker = BrokerFactory.getBroker('alpaca');
 *   const account = await broker.getAccount();
 *
 *   // Or get the active broker (configured via env)
 *   const activeBroker = BrokerFactory.getActiveBroker();
 */

import { IBroker, BrokerId, BrokerEnvironment, BrokerConfig } from './types';
import { AlpacaBroker } from './alpaca-broker';
import { IBKRBroker } from './ibkr-broker';

// Broker configurations
export const BROKER_CONFIGS: Record<BrokerId, BrokerConfig> = {
  alpaca: {
    id: 'alpaca',
    name: 'Alpaca Markets',
    environment: 'paper',
    capabilities: {
      paperTrading: true,
      liveTrading: true,
      fractionalShares: true,
      extendedHours: true,
      options: false,
      crypto: true,
      forex: false,
      marginTrading: true,
      shortSelling: true,
      realTimeQuotes: true,
      historicalData: true,
      streaming: true,
    },
    apiKeyEnvVar: 'ALPACA_API_KEY',
    secretKeyEnvVar: 'ALPACA_SECRET_KEY',
    baseUrl: 'https://paper-api.alpaca.markets',
  },
  ibkr: {
    id: 'ibkr',
    name: 'Interactive Brokers',
    environment: 'live',
    capabilities: {
      paperTrading: true,
      liveTrading: true,
      fractionalShares: false,
      extendedHours: true,
      options: true,
      crypto: true,
      forex: true,
      marginTrading: true,
      shortSelling: true,
      realTimeQuotes: true,
      historicalData: true,
      streaming: true,
    },
    apiKeyEnvVar: 'IBKR_GATEWAY_URL',
    secretKeyEnvVar: 'IBKR_ACCOUNT_ID',
  },
};

class BrokerFactoryClass {
  private brokers: Map<string, IBroker> = new Map();
  private activeBrokerId: BrokerId | null = null;

  /**
   * Get or create a broker instance
   */
  getBroker(
    brokerId: BrokerId,
    environment?: BrokerEnvironment
  ): IBroker {
    const key = `${brokerId}-${environment || 'default'}`;

    if (!this.brokers.has(key)) {
      const broker = this.createBroker(brokerId, environment);
      this.brokers.set(key, broker);
    }

    return this.brokers.get(key)!;
  }

  /**
   * Get the active broker (configured via ACTIVE_BROKER env var)
   * Defaults to Alpaca paper trading
   *
   * NOTE: On production (Vercel), IBKR is not available because it requires
   * a local Gateway. Only Alpaca works on production.
   */
  getActiveBroker(): IBroker {
    if (this.activeBrokerId) {
      return this.getBroker(this.activeBrokerId);
    }

    // Determine active broker from environment
    const activeBrokerEnv = process.env.ACTIVE_BROKER as BrokerId | undefined;
    const activeEnvironment = process.env.BROKER_ENVIRONMENT as
      | BrokerEnvironment
      | undefined;

    // On production (Vercel), force Alpaca - IBKR requires local Gateway
    const isProduction = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
    if (isProduction && activeBrokerEnv === 'ibkr') {
      console.warn('IBKR not available on production (requires local Gateway). Falling back to Alpaca.');
      this.activeBrokerId = 'alpaca';
      return this.getBroker('alpaca', 'paper');
    }

    // Default to Alpaca paper trading
    this.activeBrokerId = activeBrokerEnv || 'alpaca';

    return this.getBroker(
      this.activeBrokerId,
      activeEnvironment || (this.activeBrokerId === 'ibkr' ? 'live' : 'paper')
    );
  }

  /**
   * Set the active broker programmatically
   */
  setActiveBroker(brokerId: BrokerId, environment?: BrokerEnvironment): void {
    this.activeBrokerId = brokerId;
    // Pre-create the broker
    this.getBroker(brokerId, environment);
  }

  /**
   * Check if a broker is available (has required env vars)
   */
  isBrokerAvailable(brokerId: BrokerId): boolean {
    const config = BROKER_CONFIGS[brokerId];
    if (!config) return false;

    // Check if required env vars are set
    const hasApiKey = !!process.env[config.apiKeyEnvVar];
    const hasSecret = !!process.env[config.secretKeyEnvVar];

    // Alpaca requires both keys
    if (brokerId === 'alpaca') {
      return hasApiKey && hasSecret;
    }

    // IBKR only requires gateway URL (account ID is optional)
    if (brokerId === 'ibkr') {
      return hasApiKey;
    }

    return hasApiKey;
  }

  /**
   * Get list of available brokers
   */
  getAvailableBrokers(): BrokerConfig[] {
    return Object.values(BROKER_CONFIGS).filter((config) =>
      this.isBrokerAvailable(config.id)
    );
  }

  /**
   * Get all supported brokers (regardless of configuration)
   */
  getSupportedBrokers(): BrokerConfig[] {
    return Object.values(BROKER_CONFIGS);
  }

  /**
   * Clear all broker instances (useful for testing)
   */
  clearBrokers(): void {
    // Disconnect all brokers
    for (const broker of this.brokers.values()) {
      broker.disconnect().catch(() => {});
    }
    this.brokers.clear();
    this.activeBrokerId = null;
  }

  private createBroker(
    brokerId: BrokerId,
    environment?: BrokerEnvironment
  ): IBroker {
    switch (brokerId) {
      case 'alpaca':
        return new AlpacaBroker(environment || 'paper');
      case 'ibkr':
        return new IBKRBroker(environment || 'live');
      default:
        throw new Error(`Unknown broker: ${brokerId}`);
    }
  }
}

// Export singleton instance
export const BrokerFactory = new BrokerFactoryClass();

// Export convenience functions

/**
 * Get or create a broker instance by ID.
 * @param brokerId - The broker identifier ('alpaca' or 'ibkr')
 * @param environment - Optional trading environment ('paper' or 'live')
 * @returns The broker instance implementing IBroker interface
 */
export function getBroker(
  brokerId: BrokerId,
  environment?: BrokerEnvironment
): IBroker {
  return BrokerFactory.getBroker(brokerId, environment);
}

/**
 * Get the currently active broker configured via ACTIVE_BROKER env var.
 * @returns The active broker instance, defaults to Alpaca paper trading
 */
export function getActiveBroker(): IBroker {
  return BrokerFactory.getActiveBroker();
}

/**
 * Check if a broker has required environment variables configured.
 * @param brokerId - The broker identifier to check
 * @returns True if the broker's required credentials are available
 */
export function isBrokerAvailable(brokerId: BrokerId): boolean {
  return BrokerFactory.isBrokerAvailable(brokerId);
}

/**
 * Get list of brokers that have required credentials configured.
 * @returns Array of BrokerConfig objects for available brokers
 */
export function getAvailableBrokers(): BrokerConfig[] {
  return BrokerFactory.getAvailableBrokers();
}

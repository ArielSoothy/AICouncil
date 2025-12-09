/**
 * Broker Abstraction Layer
 *
 * Unified interface for multiple brokers:
 * - Alpaca: Paper trading (default)
 * - IBKR: Real money trading (Israel)
 *
 * Usage:
 *   import { getActiveBroker, getBroker } from '@/lib/brokers';
 *
 *   // Get the active broker (configured via env)
 *   const broker = getActiveBroker();
 *   const account = await broker.getAccount();
 *
 *   // Get a specific broker
 *   const alpaca = getBroker('alpaca', 'paper');
 *   const ibkr = getBroker('ibkr', 'live');
 */

// Types
export * from './types';

// Broker implementations
export { AlpacaBroker } from './alpaca-broker';
export { IBKRBroker } from './ibkr-broker';

// Factory and utilities
export {
  BrokerFactory,
  BROKER_CONFIGS,
  getBroker,
  getActiveBroker,
  isBrokerAvailable,
  getAvailableBrokers,
} from './broker-factory';

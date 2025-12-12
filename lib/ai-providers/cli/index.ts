/**
 * CLI-Based AI Providers for Subscription Mode
 *
 * These providers use CLI tools or OAuth authentication to access
 * AI models via the user's subscriptions instead of API keys.
 *
 * Usage:
 * - Sub Pro/Max tiers → Use these CLI providers (subscription billing)
 * - Free/Pro/Max tiers → Use standard API providers (API key billing)
 */

export { ClaudeCLIProvider } from './claude-cli';
export { CodexCLIProvider } from './codex-cli';
export { GoogleCLIProvider } from './google-cli';

/**
 * Shared types for conversation persistence across the application
 * Used by Ultra Mode, regular consensus queries, and agent debates
 */

import { EnhancedConsensusResponse } from '@/types/consensus'

/**
 * Evaluation data JSONB field from Supabase
 */
export interface ConversationEvaluationData {
  metadata?: ConversationMetadata
  target_symbol?: string
  timeframe?: string
  [key: string]: unknown
}

export interface ConversationMetadata {
  timeframe?: string
  targetSymbol?: string
  selectedModels?: string[]
  analystModel?: string
  criticModel?: string
  synthesizerModel?: string
  [key: string]: unknown
}

/**
 * Trading conversation responses shape (consensus/individual/debate modes).
 * Uses loose typing since this comes from JSONB in Supabase.
 * Callers should narrow types at the point of use.
 */
export interface TradingConversationResponses {
  consensus?: any
  decisions?: any[]
  context?: any
  debate?: any
  models?: { model: string; [key: string]: unknown }[]
  rounds?: { messages?: { agentId?: string }[] }[]
  [key: string]: unknown
}

/**
 * Saved conversation structure from Supabase database
 */
export interface SavedConversation {
  id: string
  user_id: string | null
  query: string
  responses: EnhancedConsensusResponse | TradingConversationResponses | unknown
  evaluation_data?: ConversationEvaluationData
  is_guest_mode: boolean
  created_at: string
  updated_at?: string
}

/**
 * Options for conversation persistence hook
 */
export interface ConversationPersistenceOptions {
  /**
   * Unique key for localStorage (e.g., 'ultra-mode', 'consensus', 'agent-debate')
   */
  storageKey: string

  /**
   * Callback when conversation is successfully restored
   */
  onRestored?: (conversation: SavedConversation) => void

  /**
   * Callback when restoration fails
   */
  onError?: (error: Error) => void

  /**
   * Whether to automatically restore on mount (default: true)
   */
  autoRestore?: boolean
}

/**
 * Return type from useConversationPersistence hook
 */
export interface ConversationPersistenceReturn {
  /**
   * Save conversation ID and update URL/localStorage
   */
  saveConversation: (conversationId: string) => void

  /**
   * Whether a conversation is currently being restored
   */
  isRestoring: boolean

  /**
   * Restored conversation data (null if not restored)
   */
  restoredData: SavedConversation | null

  /**
   * Error that occurred during restoration (null if no error)
   */
  error: Error | null

  /**
   * Manually trigger restoration from a conversation ID
   */
  restoreConversation: (conversationId: string) => Promise<void>
}

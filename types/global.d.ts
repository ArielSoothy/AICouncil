/**
 * Global type augmentations
 */

declare global {
  interface Window {
    /** Temporary storage for consensus comparison data during debate streaming */
    tempConsensusData?: Record<string, unknown>
  }
}

export {}

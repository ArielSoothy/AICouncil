// Test file to verify imports work correctly
import { providerRegistry } from '@/lib/ai-providers'
import { checkRateLimit } from '@/lib/rate-limit'
import { calculateConsensusScore } from '@/lib/utils'
import type { ModelResponse, QueryRequest } from '@/types/consensus'

// This file is just for testing import resolution
// It can be deleted after deployment verification
export const testImports = () => {
  console.log('All imports resolved successfully')
}

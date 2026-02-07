/**
 * Next.js Instrumentation - runs once on server startup
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { checkEnv } = await import('@/lib/config/env')
    const result = checkEnv()

    if (!result.valid) {
      console.error(`[startup] Missing required env vars: ${result.missing.join(', ')}`)
    }

    if (result.warnings.length > 0) {
      for (const w of result.warnings) {
        console.warn(`[startup] ${w}`)
      }
    }

    if (result.availableProviders.length > 0) {
      console.info(`[startup] AI providers configured: ${result.availableProviders.join(', ')}`)
    }
  }
}

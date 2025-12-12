/**
 * IBKR Authentication API
 *
 * CRITICAL FIXES:
 * 1. Uses GET method for /iserver/auth/status (POST returns "Bad Request")
 * 2. Calls ssodh/init to complete 2FA handshake after phone authentication
 *
 * The flow after user completes phone 2FA:
 * 1. GET /iserver/auth/status - may still show authenticated:false
 * 2. POST /iserver/auth/ssodh/init - completes the 2FA handshake
 * 3. GET /iserver/auth/status - now shows authenticated:true
 *
 * @see https://interactivebrokers.github.io/cpwebapi/
 */

import { NextResponse } from 'next/server'
import https from 'https'

const DEFAULT_GATEWAY_URL = 'https://localhost:5050'

// Get Gateway URL from env or default
function getGatewayUrl(): string {
  const url = process.env.IBKR_GATEWAY_URL || DEFAULT_GATEWAY_URL
  return url.replace('/v1/api', '').replace(/\/$/, '')
}

/**
 * Make HTTPS request to IBKR Gateway with self-signed cert support
 * DEFAULT: GET method (IBKR Gateway returns "Bad Request" for POST on auth/status)
 */
function makeGatewayRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  body?: string
): Promise<T> {
  return new Promise((resolve, reject) => {
    const fullPath = `/v1/api${endpoint}`

    const req = https.request(
      {
        hostname: '127.0.0.1',
        port: 5050,
        path: fullPath,
        method,
        rejectUnauthorized: false,
        headers: {
          'User-Agent': 'Mozilla/5.0 VerdictAI/1.0',
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      },
      (res) => {
        let responseBody = ''
        res.on('data', (chunk) => (responseBody += chunk))
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(responseBody ? JSON.parse(responseBody) : ({} as T))
            } catch {
              resolve({} as T)
            }
          } else {
            reject(new Error(`Gateway returned ${res.statusCode}: ${responseBody}`))
          }
        })
      }
    )

    req.on('error', (err) => {
      reject(new Error(`Gateway connection failed: ${err.message}`))
    })

    req.setTimeout(5000, () => {
      req.destroy()
      reject(new Error('Gateway request timeout'))
    })

    if (body) {
      req.write(body)
    }
    req.end()
  })
}

interface AuthStatus {
  authenticated: boolean
  connected: boolean
  competing?: boolean
}

interface SsodhInitResponse {
  passed?: boolean
  authenticated?: boolean
  connected?: boolean
}

/**
 * GET /api/trading/ibkr-auth
 *
 * Check auth status and attempt to complete 2FA if Gateway is running but not authenticated.
 * This handles the case where user completed phone 2FA but Gateway page didn't update.
 */
export async function GET() {
  const gatewayUrl = getGatewayUrl()

  if (!process.env.IBKR_GATEWAY_URL) {
    return NextResponse.json({
      configured: false,
      authenticated: false,
      gatewayRunning: false,
      message: 'IBKR_GATEWAY_URL not set in environment',
      loginUrl: gatewayUrl,
    })
  }

  try {
    // First check current status
    let status = await makeGatewayRequest<AuthStatus>('/iserver/auth/status', 'GET')
    console.log('[IBKR] Initial status:', JSON.stringify(status))

    // If Gateway is running but not authenticated, try ssodh/init to complete 2FA
    // This handles the case where user completed phone 2FA but page didn't update
    if (!status.authenticated) {
      try {
        console.log('[IBKR] Not authenticated, trying ssodh/init to complete 2FA...')
        const initResult = await makeGatewayRequest<SsodhInitResponse>(
          '/iserver/auth/ssodh/init',
          'POST',
          JSON.stringify({ publish: true, compete: true })
        )
        console.log('[IBKR] ssodh/init result:', JSON.stringify(initResult))

        // If init succeeded, check status again
        if (initResult.authenticated || initResult.passed) {
          status = await makeGatewayRequest<AuthStatus>('/iserver/auth/status', 'GET')
          console.log('[IBKR] Status after ssodh/init:', JSON.stringify(status))
        }
      } catch (initError) {
        // ssodh/init may fail if user hasn't completed 2FA yet - that's OK
        console.log('[IBKR] ssodh/init failed (normal if 2FA not done):', initError)
      }
    }

    return NextResponse.json({
      configured: true,
      authenticated: status.authenticated || false,
      connected: status.connected || false,
      competing: status.competing || false,
      gatewayRunning: true,
      message: status.authenticated
        ? 'IBKR Gateway authenticated'
        : 'Not authenticated - login required',
      loginUrl: gatewayUrl,
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[IBKR] Gateway error:', errorMsg)

    return NextResponse.json({
      configured: true,
      authenticated: false,
      gatewayRunning: false,
      message: `Gateway offline: ${errorMsg}`,
      loginUrl: gatewayUrl,
    })
  }
}

/**
 * POST /api/trading/ibkr-auth
 *
 * Manual refresh trigger - just re-check status.
 */
export async function POST() {
  const gatewayUrl = getGatewayUrl()

  if (!process.env.IBKR_GATEWAY_URL) {
    return NextResponse.json(
      { success: false, message: 'IBKR_GATEWAY_URL not configured' },
      { status: 400 }
    )
  }

  try {
    const status = await makeGatewayRequest<AuthStatus>('/iserver/auth/status', 'GET')
    console.log('[IBKR] Manual check:', JSON.stringify(status))

    return NextResponse.json({
      success: status.authenticated || false,
      authenticated: status.authenticated || false,
      connected: status.connected || false,
      competing: status.competing || false,
      message: status.authenticated
        ? 'Authenticated'
        : 'Not authenticated - please login via Gateway',
      loginUrl: gatewayUrl,
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[IBKR] Manual check failed:', errorMsg)

    return NextResponse.json({
      success: false,
      message: `Gateway offline: ${errorMsg}`,
      loginUrl: gatewayUrl,
    })
  }
}

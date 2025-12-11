/**
 * IBKR Authentication API - Clean Rebuild
 *
 * Single endpoint for IBKR Gateway authentication:
 * - GET: Check status + AUTO-reauthenticate if phone 2FA completed
 * - POST: Manual reauthenticate trigger (backup)
 *
 * CRITICAL: Uses Node.js https module because IBKR Gateway uses self-signed SSL certs.
 * fetch() cannot handle self-signed certs (no rejectUnauthorized option).
 *
 * @see https://interactivebrokers.github.io/cpwebapi/
 */

import { NextResponse } from 'next/server'
import https from 'https'

const DEFAULT_GATEWAY_URL = 'https://localhost:5050'

// Get Gateway URL from env or default
function getGatewayUrl(): string {
  const url = process.env.IBKR_GATEWAY_URL || DEFAULT_GATEWAY_URL
  // Remove /v1/api suffix if present (we add it per-request)
  return url.replace('/v1/api', '').replace(/\/$/, '')
}

/**
 * Make HTTPS request to IBKR Gateway with self-signed cert support
 */
function makeGatewayRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' = 'POST'
): Promise<T> {
  return new Promise((resolve, reject) => {
    const gatewayUrl = getGatewayUrl()
    const fullPath = `/v1/api${endpoint}`

    const req = https.request(
      {
        // Force IPv4 - IBKR Gateway only allows 127.0.0.1, not ::1
        hostname: '127.0.0.1',
        port: 5050,
        path: fullPath,
        method,
        rejectUnauthorized: false, // CRITICAL: Accept self-signed certs
        headers: {
          'User-Agent': 'Mozilla/5.0 VerdictAI/1.0', // Required by IBKR
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      },
      (res) => {
        let body = ''
        res.on('data', (chunk) => (body += chunk))
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(body ? JSON.parse(body) : ({} as T))
            } catch {
              // Some endpoints return empty or non-JSON
              resolve({} as T)
            }
          } else {
            reject(new Error(`Gateway returned ${res.statusCode}: ${body}`))
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

    req.end()
  })
}

interface AuthStatus {
  authenticated: boolean
  connected: boolean
  competing?: boolean
  message?: string
}

/**
 * GET /api/trading/ibkr-auth
 *
 * Check IBKR Gateway authentication status.
 * AUTO-HANDLES phone 2FA by calling /iserver/reauthenticate when competing=true.
 */
export async function GET() {
  const gatewayUrl = getGatewayUrl()

  // Check if configured
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
    // 1. Check auth status (POST method per IBKR API)
    let status = await makeGatewayRequest<AuthStatus>(
      '/iserver/auth/status',
      'POST'
    )

    // 2. AUTO-HANDLE phone 2FA completion
    // When user completes 2FA on phone, Gateway returns competing=true
    // We must call /iserver/reauthenticate to complete the handshake
    if (status.competing && !status.authenticated) {
      console.log('[IBKR] Phone 2FA detected (competing=true) - completing handshake...')
      try {
        await makeGatewayRequest('/iserver/reauthenticate', 'POST')
        // Re-check status after handshake
        status = await makeGatewayRequest<AuthStatus>(
          '/iserver/auth/status',
          'POST'
        )
        console.log('[IBKR] After reauthenticate:', status.authenticated ? 'SUCCESS' : 'STILL NOT AUTH')
      } catch (reauthErr) {
        console.error('[IBKR] Reauthenticate failed:', reauthErr)
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
        : status.competing
          ? 'Phone 2FA detected - completing...'
          : 'Not authenticated - login required',
      loginUrl: gatewayUrl,
    })
  } catch (error) {
    // Gateway not reachable
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
 * Manually trigger reauthentication (backup if auto doesn't work).
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
    console.log('[IBKR] Manual reauthenticate triggered')
    await makeGatewayRequest('/iserver/reauthenticate', 'POST')

    // Check new status
    const status = await makeGatewayRequest<AuthStatus>(
      '/iserver/auth/status',
      'POST'
    )

    return NextResponse.json({
      success: true,
      authenticated: status.authenticated || false,
      message: status.authenticated
        ? 'Reauthentication successful'
        : 'Reauthentication sent - check status',
      loginUrl: gatewayUrl,
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[IBKR] Manual reauthenticate failed:', errorMsg)

    return NextResponse.json({
      success: false,
      message: `Reauthentication failed: ${errorMsg}`,
      loginUrl: gatewayUrl,
    })
  }
}

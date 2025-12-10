import { NextRequest, NextResponse } from 'next/server'
import https from 'https'

/**
 * Check IBKR Gateway authentication status
 * GET /api/trading/broker/ibkr-status?gatewayUrl=https://localhost:5050
 *
 * Query Parameters:
 * - gatewayUrl: User's IBKR Gateway URL (optional, defaults to env or localhost:5050)
 * - accountId: User's IBKR Account ID (optional, for future use)
 *
 * IMPORTANT: This endpoint uses Node.js built-in 'https' module instead of fetch/undici.
 * Reason: IBKR Client Portal Gateway uses self-signed SSL certificates.
 * - Native fetch() doesn't support rejectUnauthorized option
 * - undici package was tried but causes build issues (must be installed separately)
 * - Node's https module is built-in and handles self-signed certs with rejectUnauthorized: false
 *
 * DO NOT change to fetch() or external packages without testing self-signed cert handling!
 *
 * @see https://interactivebrokers.github.io/cpwebapi/ - IBKR Client Portal API docs
 */
export async function GET(request: NextRequest) {
  // Accept Gateway URL from query params (user-configurable) or fall back to env/default
  const searchParams = request.nextUrl.searchParams
  const userGatewayUrl = searchParams.get('gatewayUrl')

  // Ensure the URL includes the API path
  let gatewayUrl = userGatewayUrl || process.env.IBKR_GATEWAY_URL || 'https://localhost:5050'
  if (!gatewayUrl.includes('/v1/api')) {
    gatewayUrl = gatewayUrl.replace(/\/$/, '') + '/v1/api'
  }

  try {
    // Check IBKR Gateway auth status using https module (handles self-signed certs)
    const data = await new Promise<{ authenticated: boolean; competing: boolean; connected: boolean }>((resolve, reject) => {
      const url = new URL(`${gatewayUrl}/iserver/auth/status`)

      const req = https.request({
        // Force IPv4 (127.0.0.1) instead of IPv6 (::1) - IBKR Gateway only allows 127.0.0.1
        hostname: url.hostname === 'localhost' ? '127.0.0.1' : url.hostname,
        port: url.port || 5050,
        path: url.pathname,
        method: 'GET',
        rejectUnauthorized: false, // Accept self-signed certs from IBKR Gateway
        headers: {
          'User-Agent': 'Mozilla/5.0 VerdictAI/1.0', // Required - IBKR rejects empty User-Agent
          'Accept': '*/*',
        },
      }, (res) => {
        let body = ''
        res.on('data', (chunk) => body += chunk)
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(body))
            } catch {
              reject(new Error('Invalid JSON response'))
            }
          } else {
            reject(new Error(`Gateway returned ${res.statusCode}`))
          }
        })
      })

      req.on('error', reject)
      req.setTimeout(10000, () => {
        req.destroy()
        reject(new Error('Request timeout'))
      })
      req.end()
    })

    return NextResponse.json({
      connected: true,
      authenticated: data.authenticated || false,
      competing: data.competing || false,
      message: data.authenticated
        ? 'IBKR Gateway is authenticated and ready'
        : 'IBKR Gateway is running but not authenticated. Please login via the web interface.',
    })
  } catch (error) {
    // Gateway not reachable
    return NextResponse.json(
      {
        connected: false,
        authenticated: false,
        error:
          'IBKR Gateway not reachable. Ensure Client Portal Gateway is running on ' +
          gatewayUrl,
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 200 }
    )
  }
}

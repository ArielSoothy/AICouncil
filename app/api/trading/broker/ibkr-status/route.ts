import { NextResponse } from 'next/server'

/**
 * Check IBKR Gateway authentication status
 * GET /api/trading/broker/ibkr-status
 */
export async function GET() {
  const gatewayUrl = process.env.IBKR_GATEWAY_URL || 'https://localhost:5050/v1/api'

  try {
    // Check IBKR Gateway auth status
    const response = await fetch(`${gatewayUrl}/iserver/auth/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // @ts-expect-error - Node.js fetch supports this for self-signed certs
      rejectUnauthorized: false,
    })

    if (!response.ok) {
      return NextResponse.json(
        {
          connected: false,
          authenticated: false,
          error: `Gateway returned ${response.status}`,
        },
        { status: 200 }
      )
    }

    const data = await response.json()

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

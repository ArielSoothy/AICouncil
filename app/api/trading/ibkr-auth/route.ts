/**
 * IBKR Authentication API
 *
 * Provides endpoints to:
 * 1. Check IBKR Gateway authentication status
 * 2. Get the Gateway login URL
 * 3. Trigger a reauthentication
 *
 * The IBKR Client Portal Gateway must be running locally or on a server.
 * Default: https://localhost:5050
 */

import { NextResponse } from 'next/server';

const IBKR_GATEWAY_URL = process.env.IBKR_GATEWAY_URL || 'https://localhost:5050/v1/api';

// Extract base URL without /v1/api for the login page
function getGatewayBaseUrl(): string {
  const url = IBKR_GATEWAY_URL.replace('/v1/api', '');
  return url;
}

interface AuthStatusResponse {
  authenticated: boolean;
  connected: boolean;
  competing?: boolean;
  fail?: string;
  message?: string;
}

export async function GET() {
  try {
    // Check if IBKR is configured
    if (!process.env.IBKR_GATEWAY_URL) {
      return NextResponse.json({
        configured: false,
        authenticated: false,
        message: 'IBKR Gateway URL not configured',
        loginUrl: null,
      });
    }

    // Try to check authentication status
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(`${IBKR_GATEWAY_URL}/iserver/auth/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Gateway is running but returned error
        return NextResponse.json({
          configured: true,
          authenticated: false,
          gatewayRunning: true,
          message: 'Gateway returned error - authentication required',
          loginUrl: getGatewayBaseUrl(),
        });
      }

      const status: AuthStatusResponse = await response.json();

      return NextResponse.json({
        configured: true,
        authenticated: status.authenticated || false,
        connected: status.connected || false,
        competing: status.competing || false,
        gatewayRunning: true,
        message: status.authenticated
          ? 'Authenticated with IBKR Gateway'
          : 'Not authenticated - please login',
        loginUrl: getGatewayBaseUrl(),
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);

      // Gateway not reachable
      const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown error';
      const isAborted = errorMessage.includes('abort');

      return NextResponse.json({
        configured: true,
        authenticated: false,
        gatewayRunning: false,
        message: isAborted
          ? 'Gateway connection timed out - ensure Client Portal Gateway is running'
          : `Cannot reach Gateway: ${errorMessage}`,
        loginUrl: getGatewayBaseUrl(),
      });
    }
  } catch (error) {
    console.error('IBKR auth check error:', error);
    return NextResponse.json({
      configured: false,
      authenticated: false,
      error: 'Failed to check IBKR authentication',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// POST endpoint to trigger reauthentication
export async function POST() {
  try {
    if (!process.env.IBKR_GATEWAY_URL) {
      return NextResponse.json({
        success: false,
        message: 'IBKR Gateway URL not configured',
      }, { status: 400 });
    }

    // Try to reauthenticate
    const response = await fetch(`${IBKR_GATEWAY_URL}/iserver/reauthenticate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({
        success: false,
        message: `Reauthentication failed: ${errorText}`,
        loginUrl: getGatewayBaseUrl(),
      });
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      message: result.message || 'Reauthentication initiated',
      loginUrl: getGatewayBaseUrl(),
    });
  } catch (error) {
    console.error('IBKR reauthentication error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Reauthentication failed',
      loginUrl: getGatewayBaseUrl(),
    }, { status: 500 });
  }
}

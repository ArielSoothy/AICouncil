import { NextRequest, NextResponse } from 'next/server';
import { testConnection } from '@/lib/alpaca/client';

/**
 * Health check endpoint for Alpaca API connectivity
 * Use this to diagnose connection issues independently from the portfolio UI
 *
 * Success: 200 OK with account details
 * Configuration Error: 503 Service Unavailable (missing credentials)
 * Auth Error: 401 Unauthorized (invalid credentials)
 * Other Errors: 500 Internal Server Error
 *
 * Usage:
 * - Development: http://localhost:3000/api/health/alpaca
 * - Production: https://your-app.vercel.app/api/health/alpaca
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🏥 Health Check: Testing Alpaca API connection...');

    // Test connection and get account info
    const account = await testConnection();

    console.log('✅ Health Check PASSED: Alpaca API is reachable');

    return NextResponse.json({
      status: 'healthy',
      message: 'Alpaca API connection successful',
      timestamp: new Date().toISOString(),
      account: {
        portfolio_value: parseFloat(account.portfolio_value),
        cash: parseFloat(account.cash),
        buying_power: parseFloat(account.buying_power),
        account_status: account.status,
        currency: account.currency,
      },
      environment: {
        hasApiKey: !!process.env.ALPACA_API_KEY,
        hasSecretKey: !!process.env.ALPACA_SECRET_KEY,
        baseUrl: process.env.ALPACA_BASE_URL || 'https://paper-api.alpaca.markets',
        nodeEnv: process.env.NODE_ENV,
      },
    });

  } catch (error) {
    console.error('❌ Health Check FAILED:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    let statusCode = 500;
    let status = 'unhealthy';
    let diagnosis = 'Unknown error occurred';

    // Classify the error
    if (errorMessage.includes('Missing required Alpaca environment variables')) {
      statusCode = 503;
      status = 'misconfigured';
      diagnosis = 'Missing Alpaca API credentials. Add ALPACA_API_KEY and ALPACA_SECRET_KEY to environment variables.';
      console.error('🔴 DIAGNOSIS: Alpaca credentials not configured');
      console.error('👉 FIX: Add credentials to .env.local (dev) or Vercel environment variables (prod)');
    } else if (errorMessage.includes('Unauthorized') || errorMessage.includes('authentication')) {
      statusCode = 401;
      status = 'unauthorized';
      diagnosis = 'Invalid Alpaca API credentials. Check your ALPACA_API_KEY and ALPACA_SECRET_KEY.';
      console.error('🔴 DIAGNOSIS: Alpaca credentials are invalid');
      console.error('👉 FIX: Verify credentials at https://alpaca.markets');
    } else if (errorMessage.includes('rate limit')) {
      statusCode = 429;
      status = 'rate_limited';
      diagnosis = 'Alpaca API rate limit exceeded. Wait before retrying.';
    } else if (errorMessage.includes('timeout') || errorMessage.includes('ECONNREFUSED')) {
      statusCode = 503;
      status = 'unavailable';
      diagnosis = 'Cannot reach Alpaca API. Check network connectivity.';
    }

    return NextResponse.json(
      {
        status,
        message: 'Alpaca API health check failed',
        diagnosis,
        timestamp: new Date().toISOString(),
        error: errorMessage,
        environment: {
          hasApiKey: !!process.env.ALPACA_API_KEY,
          hasSecretKey: !!process.env.ALPACA_SECRET_KEY,
          baseUrl: process.env.ALPACA_BASE_URL || 'https://paper-api.alpaca.markets',
          nodeEnv: process.env.NODE_ENV,
        },
      },
      { status: statusCode }
    );
  }
}

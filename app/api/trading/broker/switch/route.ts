import { NextRequest, NextResponse } from 'next/server'
import { BrokerFactory } from '@/lib/brokers/broker-factory'

type BrokerId = 'alpaca' | 'ibkr'

/**
 * Switch active broker
 * POST /api/trading/broker/switch
 * Body: { brokerId: 'alpaca' | 'ibkr' }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { brokerId } = body as { brokerId: BrokerId }

    if (!brokerId || !['alpaca', 'ibkr'].includes(brokerId)) {
      return NextResponse.json(
        { error: 'Invalid broker ID. Must be "alpaca" or "ibkr"' },
        { status: 400 }
      )
    }

    // Check if broker is available (has required env vars)
    const isAvailable = BrokerFactory.isBrokerAvailable(brokerId)

    if (!isAvailable) {
      const envVars =
        brokerId === 'alpaca'
          ? 'ALPACA_API_KEY and ALPACA_SECRET_KEY'
          : 'IBKR_GATEWAY_URL'

      return NextResponse.json(
        {
          error: `Broker ${brokerId} is not configured. Please set ${envVars} in your environment.`,
        },
        { status: 400 }
      )
    }

    // Set the active broker
    const environment = brokerId === 'ibkr' ? 'live' : 'paper'
    BrokerFactory.setActiveBroker(brokerId, environment)

    // Try to connect
    const broker = BrokerFactory.getActiveBroker()

    try {
      await broker.connect()

      return NextResponse.json({
        success: true,
        broker: {
          id: broker.id,
          name: broker.name,
          environment: broker.environment,
        },
        message: `Successfully switched to ${broker.name}`,
      })
    } catch (connectError) {
      // For IBKR, connection may fail if not authenticated
      if (brokerId === 'ibkr') {
        return NextResponse.json(
          {
            success: false,
            error:
              'IBKR Gateway not authenticated. Please login via the Gateway web interface first.',
            requiresAuth: true,
          },
          { status: 401 }
        )
      }

      throw connectError
    }
  } catch (error) {
    console.error('Failed to switch broker:', error)

    return NextResponse.json(
      {
        error: 'Failed to switch broker',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * Get current active broker info
 * GET /api/trading/broker/switch
 */
export async function GET() {
  try {
    const broker = BrokerFactory.getActiveBroker()
    const availableBrokers = BrokerFactory.getAvailableBrokers()

    return NextResponse.json({
      active: {
        id: broker.id,
        name: broker.name,
        environment: broker.environment,
      },
      available: availableBrokers.map((b) => ({
        id: b.id,
        name: b.name,
        environment: b.environment,
      })),
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to get broker info',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

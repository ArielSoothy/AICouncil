/**
 * Order Execution API
 *
 * POST /api/trading/execute
 *
 * Places orders through the active broker (Alpaca or IBKR).
 * Includes safety validations before execution.
 */

import { NextRequest, NextResponse } from 'next/server'
import { BrokerFactory } from '@/lib/brokers/broker-factory'
import { OrderRequest } from '@/lib/brokers/types'

interface ExecuteOrderRequest {
  symbol: string
  action: 'buy' | 'sell'
  quantity: number
  orderType?: 'market' | 'limit'
  limitPrice?: number
  timeInForce?: 'day' | 'gtc'
}

export async function POST(request: NextRequest) {
  try {
    const body: ExecuteOrderRequest = await request.json()

    // Validate required fields
    if (!body.symbol || !body.action || !body.quantity) {
      return NextResponse.json(
        { error: 'Missing required fields: symbol, action, quantity' },
        { status: 400 }
      )
    }

    // Validate action
    if (!['buy', 'sell'].includes(body.action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "buy" or "sell"' },
        { status: 400 }
      )
    }

    // Validate quantity
    if (body.quantity < 1 || !Number.isInteger(body.quantity)) {
      return NextResponse.json(
        { error: 'Quantity must be a positive integer' },
        { status: 400 }
      )
    }

    // Validate symbol format
    const symbolRegex = /^[A-Z]{1,5}$/
    if (!symbolRegex.test(body.symbol.toUpperCase())) {
      return NextResponse.json(
        { error: 'Invalid symbol format' },
        { status: 400 }
      )
    }

    // Get active broker
    const broker = BrokerFactory.getActiveBroker()

    // Check if broker supports live trading (safety check)
    const isLive = broker.environment === 'live'

    // For SELL orders, verify we have the position
    if (body.action === 'sell') {
      const position = await broker.getPosition(body.symbol.toUpperCase())
      if (!position) {
        return NextResponse.json(
          { error: `No position found for ${body.symbol}` },
          { status: 400 }
        )
      }
      if (position.quantity < body.quantity) {
        return NextResponse.json(
          {
            error: `Insufficient shares. You have ${position.quantity} shares of ${body.symbol}`,
            availableShares: position.quantity
          },
          { status: 400 }
        )
      }
    }

    // For BUY orders, check buying power
    if (body.action === 'buy') {
      const account = await broker.getAccount()
      // Get current price (estimate using quote if available, otherwise use limit price)
      let estimatedCost = body.quantity * (body.limitPrice || 0)

      // If no limit price provided and broker has getQuote, fetch current price
      if (!body.limitPrice && broker.getQuote) {
        try {
          const quote = await broker.getQuote(body.symbol.toUpperCase())
          estimatedCost = body.quantity * quote.askPrice
        } catch {
          // Can't get quote, proceed anyway - broker will reject if insufficient funds
        }
      }

      // Only check buying power if we have an estimate
      if (estimatedCost > 0 && estimatedCost > account.buyingPower) {
        return NextResponse.json(
          {
            error: `Insufficient buying power. Estimated cost: $${estimatedCost.toFixed(2)}, Available: $${account.buyingPower.toFixed(2)}`,
            estimatedCost,
            buyingPower: account.buyingPower
          },
          { status: 400 }
        )
      }
    }

    // Build order request
    const orderRequest: OrderRequest = {
      symbol: body.symbol.toUpperCase(),
      quantity: body.quantity,
      side: body.action,
      type: body.orderType || 'market',
      timeInForce: body.timeInForce || 'day',
      limitPrice: body.limitPrice
    }

    // Place the order
    const order = await broker.placeOrder(orderRequest)

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        symbol: order.symbol,
        side: order.side,
        quantity: order.quantity,
        type: order.type,
        status: order.status,
        submittedAt: order.submittedAt
      },
      broker: {
        id: broker.id,
        name: broker.name,
        environment: broker.environment
      },
      isLive
    })
  } catch (error) {
    console.error('Order execution error:', error)

    // Handle specific broker errors
    if (error instanceof Error) {
      // Check for common error patterns
      if (error.message.includes('insufficient')) {
        return NextResponse.json(
          { error: 'Insufficient funds or buying power', details: error.message },
          { status: 400 }
        )
      }
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Symbol not found', details: error.message },
          { status: 400 }
        )
      }
      if (error.message.includes('market closed')) {
        return NextResponse.json(
          { error: 'Market is closed', details: error.message },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: 'Order execution failed', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Unknown error occurred' },
      { status: 500 }
    )
  }
}

// GET - Check order status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('orderId')

    if (!orderId) {
      // Return all open orders
      const broker = BrokerFactory.getActiveBroker()
      const orders = await broker.getOrders()

      return NextResponse.json({
        orders: orders.map(o => ({
          id: o.id,
          symbol: o.symbol,
          side: o.side,
          quantity: o.quantity,
          filledQuantity: o.filledQuantity,
          status: o.status,
          submittedAt: o.submittedAt
        })),
        broker: {
          id: broker.id,
          name: broker.name,
          environment: broker.environment
        }
      })
    }

    // Return specific order
    const broker = BrokerFactory.getActiveBroker()
    const order = await broker.getOrder(orderId)

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      order: {
        id: order.id,
        symbol: order.symbol,
        side: order.side,
        quantity: order.quantity,
        filledQuantity: order.filledQuantity,
        filledAvgPrice: order.filledAvgPrice,
        status: order.status,
        submittedAt: order.submittedAt,
        filledAt: order.filledAt
      }
    })
  } catch (error) {
    console.error('Order status error:', error)
    return NextResponse.json(
      { error: 'Failed to get order status' },
      { status: 500 }
    )
  }
}

// DELETE - Cancel order
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('orderId')

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID required' },
        { status: 400 }
      )
    }

    const broker = BrokerFactory.getActiveBroker()
    const success = await broker.cancelOrder(orderId)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to cancel order. It may already be filled or cancelled.' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Order ${orderId} cancelled`
    })
  } catch (error) {
    console.error('Order cancel error:', error)
    return NextResponse.json(
      { error: 'Failed to cancel order' },
      { status: 500 }
    )
  }
}

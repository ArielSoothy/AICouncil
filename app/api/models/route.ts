import { NextResponse } from 'next/server'
import { providerRegistry } from '../../../lib/ai-providers/index'

export async function GET() {
  try {
    const availableModels = providerRegistry.getAvailableModels()
    
    return NextResponse.json({
      models: availableModels,
      configured: availableModels.length > 0,
    })
  } catch (error) {
    console.error('Models API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch available models' },
      { status: 500 }
    )
  }
}

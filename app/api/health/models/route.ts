/**
 * Model Health Check API
 *
 * Returns health status for all AI models based on recent failure history.
 * This is a read-only endpoint that doesn't perform active health checks
 * to avoid unnecessary API costs.
 *
 * For active testing, use the Model Tester component (dev only).
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getAllFailureRecords,
  getModelHealthStatus,
  getModelDisplayName,
  clearFailureHistory,
} from '@/lib/trading/model-fallback';
import { MODEL_REGISTRY } from '@/lib/models/model-registry';

export async function GET(request: NextRequest) {
  // Get all models from registry
  const allModels: {
    id: string;
    name: string;
    provider: string;
    health: 'healthy' | 'warning' | 'unhealthy';
    failureCount?: number;
    lastError?: string;
    lastFailed?: string;
  }[] = [];

  // Collect all models from all providers
  for (const [provider, models] of Object.entries(MODEL_REGISTRY)) {
    for (const model of models) {
      const failureRecords = getAllFailureRecords();
      const record = failureRecords.get(model.id);

      allModels.push({
        id: model.id,
        name: model.name,
        provider,
        health: getModelHealthStatus(model.id),
        failureCount: record?.count,
        lastError: record?.lastError,
        lastFailed: record?.lastFailed?.toISOString(),
      });
    }
  }

  // Summary stats
  const healthyCount = allModels.filter(m => m.health === 'healthy').length;
  const warningCount = allModels.filter(m => m.health === 'warning').length;
  const unhealthyCount = allModels.filter(m => m.health === 'unhealthy').length;

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    summary: {
      total: allModels.length,
      healthy: healthyCount,
      warning: warningCount,
      unhealthy: unhealthyCount,
    },
    models: allModels,
  });
}

// POST to clear failure history (admin action)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const modelId = body.modelId;

    if (modelId) {
      // Clear specific model
      clearFailureHistory(modelId);
      return NextResponse.json({
        success: true,
        message: `Cleared failure history for ${getModelDisplayName(modelId)}`,
      });
    } else {
      // Clear all
      clearFailureHistory();
      return NextResponse.json({
        success: true,
        message: 'Cleared all failure history',
      });
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}

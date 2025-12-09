/**
 * MODEL STATUS REPORTER - Test Results Report Generator
 *
 * Generates comprehensive markdown reports from model test results.
 */

import type { ModelInfo, Provider } from '../models/model-registry'
import type { ModelTestResult } from '../models/model-tester'
import { PROVIDER_NAMES, MODEL_REGISTRY } from '../models/model-registry'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface StatusSummary {
  total: number
  working: number
  unreleased: number
  noApiKey: number
  rateLimited: number
  parameterError: number
  serviceError: number
  emptyResponse: number
  untested: number
}

interface ProviderSummary {
  provider: Provider
  name: string
  total: number
  working: number
  failed: number
  avgResponseTime: number
}

// ============================================================================
// MODEL STATUS REPORTER CLASS
// ============================================================================

export class ModelStatusReporter {
  private results: Map<string, ModelTestResult>

  constructor(results: ModelTestResult[]) {
    this.results = new Map(results.map(r => [r.modelId, r]))
  }

  /**
   * Generate comprehensive markdown report
   */
  generateReport(): string {
    const sections = [
      this.generateHeader(),
      this.generateSummary(),
      this.generateProviderBreakdown(),
      this.generateStatusBreakdown(),
      this.generateWorkingModels(),
      this.generateUnreleasedModels(),
      this.generateFailedModels(),
      this.generateRecommendations(),
      this.generateFooter()
    ]

    return sections.join('\n\n')
  }

  /**
   * Generate report header
   */
  private generateHeader(): string {
    const timestamp = new Date().toISOString()
    return `# AI Model Testing Report

**Generated**: ${new Date(timestamp).toLocaleString()}
**Total Models Tested**: ${this.results.size}

---`
  }

  /**
   * Generate summary statistics
   */
  private generateSummary(): string {
    const summary = this.calculateStatusSummary()
    const avgResponseTime = this.calculateAverageResponseTime()

    const workingPercent = ((summary.working / summary.total) * 100).toFixed(1)
    const unreleasedPercent = ((summary.unreleased / summary.total) * 100).toFixed(1)
    const failedCount = summary.total - summary.working - summary.unreleased
    const failedPercent = ((failedCount / summary.total) * 100).toFixed(1)

    return `## Summary Statistics

| Metric | Count | Percentage |
|--------|-------|------------|
| **Total Models** | ${summary.total} | 100% |
| ✅ **Working** | ${summary.working} | ${workingPercent}% |
| 🚧 **Unreleased** | ${summary.unreleased} | ${unreleasedPercent}% |
| ❌ **Failed** | ${failedCount} | ${failedPercent}% |
| 🔑 No API Key | ${summary.noApiKey} | - |
| ⏱️ Rate Limited | ${summary.rateLimited} | - |
| ⚙️ Parameter Error | ${summary.parameterError} | - |
| 🔥 Service Error | ${summary.serviceError} | - |
| 📭 Empty Response | ${summary.emptyResponse} | - |

**Average Response Time**: ${avgResponseTime.toFixed(0)}ms`
  }

  /**
   * Generate provider-by-provider breakdown
   */
  private generateProviderBreakdown(): string {
    const providers = this.calculateProviderSummaries()

    let table = `## Provider Breakdown

| Provider | Total | Working | Failed | Avg Response Time |
|----------|-------|---------|--------|-------------------|
`

    providers.forEach(p => {
      const workingPercent = ((p.working / p.total) * 100).toFixed(0)
      table += `| **${p.name}** | ${p.total} | ✅ ${p.working} (${workingPercent}%) | ❌ ${p.failed} | ${p.avgResponseTime.toFixed(0)}ms |\n`
    })

    return table
  }

  /**
   * Generate status breakdown
   */
  private generateStatusBreakdown(): string {
    const byStatus: Record<string, ModelInfo[]> = {
      working: [],
      unreleased: [],
      no_api_key: [],
      rate_limited: [],
      parameter_error: [],
      service_error: [],
      empty_response: []
    }

    // Group results by status
    this.results.forEach(result => {
      const models = this.getModelsFromRegistry()
      const model = models.find(m => m.id === result.modelId)
      if (model && result.status) {
        if (!byStatus[result.status]) byStatus[result.status] = []
        byStatus[result.status].push(model)
      }
    })

    let output = `## Status Breakdown\n\n`

    const statusLabels: Record<string, string> = {
      working: '✅ Working Models',
      unreleased: '🚧 Unreleased Models',
      no_api_key: '🔑 No API Key',
      rate_limited: '⏱️ Rate Limited',
      parameter_error: '⚙️ Parameter Error',
      service_error: '🔥 Service Error',
      empty_response: '📭 Empty Response'
    }

    Object.entries(byStatus).forEach(([status, models]) => {
      if (models.length > 0) {
        output += `### ${statusLabels[status]} (${models.length})\n\n`
        models.forEach(model => {
          const result = this.results.get(model.id)
          output += `- **${model.name}** (\`${model.id}\`) - ${model.provider}\n`
          if (result?.notes) {
            output += `  - _${result.notes}_\n`
          }
        })
        output += '\n'
      }
    })

    return output
  }

  /**
   * Generate working models list
   */
  private generateWorkingModels(): string {
    const workingModels = Array.from(this.results.values())
      .filter(r => r.status === 'working')
      .sort((a, b) => (a.responseTime || 0) - (b.responseTime || 0))

    if (workingModels.length === 0) {
      return '## Working Models\n\nNo working models found.'
    }

    let output = `## Working Models (${workingModels.length})\n\n`
    output += `| Model | Provider | Response Time |\n`
    output += `|-------|----------|---------------|\n`

    workingModels.forEach(result => {
      const model = this.getModelFromRegistry(result.modelId)
      if (model) {
        output += `| ${model.badge || ''} **${model.name}** | ${PROVIDER_NAMES[model.provider]} | ${result.responseTime}ms |\n`
      }
    })

    return output
  }

  /**
   * Generate unreleased models list
   */
  private generateUnreleasedModels(): string {
    const unreleased = Array.from(this.results.values())
      .filter(r => r.status === 'unreleased')

    if (unreleased.length === 0) {
      return '## Unreleased Models\n\nNo unreleased models found.'
    }

    let output = `## Unreleased Models (${unreleased.length})\n\n`
    output += `These models are defined in the registry but not yet available via API:\n\n`

    // Group by provider
    const byProvider = this.groupByProvider(unreleased)

    Object.entries(byProvider).forEach(([provider, results]) => {
      output += `### ${PROVIDER_NAMES[provider as Provider]} (${results.length})\n\n`
      results.forEach(result => {
        const model = this.getModelFromRegistry(result.modelId)
        if (model) {
          output += `- **${model.name}** (\`${model.id}\`)\n`
        }
      })
      output += '\n'
    })

    return output
  }

  /**
   * Generate failed models list
   */
  private generateFailedModels(): string {
    const failed = Array.from(this.results.values())
      .filter(r => r.status !== 'working' && r.status !== 'unreleased')

    if (failed.length === 0) {
      return '## Failed Models\n\nNo failed models found.'
    }

    let output = `## Failed Models (${failed.length})\n\n`
    output += `These models encountered errors during testing:\n\n`

    failed.forEach(result => {
      const model = this.getModelFromRegistry(result.modelId)
      if (model) {
        output += `### ${model.name} (\`${model.id}\`)\n`
        output += `- **Provider**: ${PROVIDER_NAMES[model.provider]}\n`
        output += `- **Status**: ${result.status}\n`
        output += `- **Error**: ${result.notes}\n\n`
      }
    })

    return output
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(): string {
    const summary = this.calculateStatusSummary()
    let recommendations: string[] = []

    if (summary.working > 0) {
      recommendations.push(`✅ **${summary.working} models are ready for production use**`)
    }

    if (summary.unreleased > 0) {
      recommendations.push(`🚧 **${summary.unreleased} models should be marked as \`isLegacy: true\` or removed** until they're available`)
    }

    if (summary.noApiKey > 0) {
      recommendations.push(`🔑 **${summary.noApiKey} models require API keys** - add to \`.env.local\``)
    }

    if (summary.rateLimited > 0) {
      recommendations.push(`⏱️ **${summary.rateLimited} models hit rate limits** - consider retesting with delays`)
    }

    if (summary.parameterError > 0) {
      recommendations.push(`⚙️ **${summary.parameterError} models have parameter errors** - check provider-specific requirements`)
    }

    if (summary.serviceError > 0) {
      recommendations.push(`🔥 **${summary.serviceError} models had service errors** - may be temporary, retest later`)
    }

    if (recommendations.length === 0) {
      recommendations.push('No specific recommendations at this time.')
    }

    return `## Recommendations\n\n${recommendations.map(r => `- ${r}`).join('\n')}`
  }

  /**
   * Generate footer
   */
  private generateFooter(): string {
    return `---

**Report generated by AI Council Model Testing System**`
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private calculateStatusSummary(): StatusSummary {
    const summary: StatusSummary = {
      total: this.results.size,
      working: 0,
      unreleased: 0,
      noApiKey: 0,
      rateLimited: 0,
      parameterError: 0,
      serviceError: 0,
      emptyResponse: 0,
      untested: 0
    }

    this.results.forEach(result => {
      switch (result.status) {
        case 'working':
          summary.working++
          break
        case 'unreleased':
          summary.unreleased++
          break
        case 'no_api_key':
          summary.noApiKey++
          break
        case 'rate_limited':
          summary.rateLimited++
          break
        case 'parameter_error':
          summary.parameterError++
          break
        case 'service_error':
          summary.serviceError++
          break
        case 'empty_response':
          summary.emptyResponse++
          break
      }
    })

    return summary
  }

  private calculateAverageResponseTime(): number {
    const times = Array.from(this.results.values())
      .filter(r => r.responseTime !== undefined)
      .map(r => r.responseTime!)

    if (times.length === 0) return 0
    return times.reduce((sum, time) => sum + time, 0) / times.length
  }

  private calculateProviderSummaries(): ProviderSummary[] {
    const providers: Record<Provider, ProviderSummary> = {} as any

    // Initialize provider summaries
    Object.keys(MODEL_REGISTRY).forEach(provider => {
      providers[provider as Provider] = {
        provider: provider as Provider,
        name: PROVIDER_NAMES[provider as Provider],
        total: 0,
        working: 0,
        failed: 0,
        avgResponseTime: 0
      }
    })

    // Count results per provider
    this.results.forEach(result => {
      const model = this.getModelFromRegistry(result.modelId)
      if (model) {
        const summary = providers[model.provider]
        summary.total++
        if (result.status === 'working') {
          summary.working++
        } else {
          summary.failed++
        }
      }
    })

    // Calculate average response times
    Object.keys(providers).forEach(provider => {
      const providerResults = Array.from(this.results.values())
        .filter(r => {
          const model = this.getModelFromRegistry(r.modelId)
          return model?.provider === provider
        })
        .filter(r => r.responseTime !== undefined)

      if (providerResults.length > 0) {
        const totalTime = providerResults.reduce((sum, r) => sum + r.responseTime!, 0)
        providers[provider as Provider].avgResponseTime = totalTime / providerResults.length
      }
    })

    return Object.values(providers).filter(p => p.total > 0)
  }

  private groupByProvider(results: ModelTestResult[]): Record<string, ModelTestResult[]> {
    const grouped: Record<string, ModelTestResult[]> = {}

    results.forEach(result => {
      const model = this.getModelFromRegistry(result.modelId)
      if (model) {
        if (!grouped[model.provider]) {
          grouped[model.provider] = []
        }
        grouped[model.provider].push(result)
      }
    })

    return grouped
  }

  private getModelFromRegistry(modelId: string): ModelInfo | null {
    const models = this.getModelsFromRegistry()
    return models.find(m => m.id === modelId) || null
  }

  private getModelsFromRegistry(): ModelInfo[] {
    return Object.values(MODEL_REGISTRY).flat()
  }
}

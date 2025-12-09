#!/usr/bin/env tsx
/**
 * MODEL TESTING SCRIPT
 *
 * Tests all AI models in the registry to verify availability and performance.
 *
 * Usage:
 *   npm run test-models                    # Test all models
 *   npm run test-models -- --provider openai   # Test specific provider
 *   npm run test-models -- --dry-run           # Show what would be tested
 *   npm run test-models -- --retest-failed     # Only test failed models
 */

// Load environment variables from .env.local
import * as fs from 'fs'
import * as path from 'path'

// Load .env.local file
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=')
      if (key && valueParts.length) {
        process.env[key.trim()] = valueParts.join('=').trim()
      }
    }
  })
  console.log('✅ Loaded environment variables from .env.local\n')
} else {
  console.error('❌ .env.local file not found!\n')
}

import { MODEL_REGISTRY, getAllProviders, type Provider, type ModelInfo } from '../lib/models/model-registry'
import { ModelTester, type ModelTestResult } from '../lib/models/model-tester'
import { ModelStatusReporter } from '../lib/testing/model-status-report'

// ============================================================================
// CLI ARGUMENT PARSING
// ============================================================================

interface CLIArgs {
  provider?: Provider
  dryRun: boolean
  retestFailed: boolean
  output: string
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2)

  return {
    provider: args.includes('--provider') ? args[args.indexOf('--provider') + 1] as Provider : undefined,
    dryRun: args.includes('--dry-run'),
    retestFailed: args.includes('--retest-failed'),
    output: args.includes('--output') ? args[args.indexOf('--output') + 1] : 'docs/MODEL_TEST_RESULTS.md'
  }
}

// ============================================================================
// CONSOLE OUTPUT HELPERS
// ============================================================================

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
}

function log(message: string, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`)
}

function logSuccess(message: string) {
  log(`✅ ${message}`, colors.green)
}

function logError(message: string) {
  log(`❌ ${message}`, colors.red)
}

function logWarning(message: string) {
  log(`⚠️  ${message}`, colors.yellow)
}

function logInfo(message: string) {
  log(`ℹ️  ${message}`, colors.blue)
}

function logProgress(current: number, total: number, modelName: string) {
  log(`[${current}/${total}] Testing ${modelName}...`, colors.cyan)
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function main() {
  const args = parseArgs()

  // Print header
  log('\n' + '='.repeat(70), colors.bright)
  log('AI MODEL TESTING SYSTEM', colors.bright)
  log('='.repeat(70) + '\n', colors.bright)

  // Get models to test
  const modelsToTest = getModelsToTest(args)

  if (modelsToTest.length === 0) {
    logWarning('No models to test!')
    process.exit(0)
  }

  logInfo(`Found ${modelsToTest.length} models to test`)
  if (args.provider) {
    logInfo(`Filtering by provider: ${args.provider}`)
  }
  if (args.retestFailed) {
    logInfo('Retesting only failed models')
  }

  // Dry run mode
  if (args.dryRun) {
    log('\n' + colors.yellow + 'DRY RUN MODE - No API calls will be made' + colors.reset + '\n')
    logInfo('Models that would be tested:')
    modelsToTest.forEach((model, i) => {
      console.log(`  ${i + 1}. ${model.name} (${model.id}) - ${model.provider}`)
    })
    log(`\nTotal: ${modelsToTest.length} models\n`)
    process.exit(0)
  }

  // Confirm before proceeding
  logWarning(`\nAbout to test ${modelsToTest.length} models`)
  logWarning('This will make API calls and may incur costs (estimated < $0.01)')
  logWarning('Press Ctrl+C to cancel, or wait 3 seconds to continue...\n')

  await new Promise(resolve => setTimeout(resolve, 3000))

  // Run tests
  log('\n' + '─'.repeat(70) + '\n', colors.gray)
  logInfo('Starting tests...\n')

  const tester = new ModelTester()
  const results: ModelTestResult[] = []

  for (let i = 0; i < modelsToTest.length; i++) {
    const model = modelsToTest[i]
    logProgress(i + 1, modelsToTest.length, model.name)

    try {
      const result = await tester.testModel(model)
      results.push(result)

      // Log result
      if (result.status === 'working') {
        logSuccess(`  ${model.name}: Working (${result.responseTime}ms)`)
      } else if (result.status === 'unreleased') {
        logWarning(`  ${model.name}: Not released yet`)
      } else {
        logError(`  ${model.name}: ${result.status} - ${result.notes?.slice(0, 100)}`)
      }

      // Delay between requests (rate limiting protection)
      if (i < modelsToTest.length - 1) {
        await tester.delay()
      }
    } catch (error) {
      logError(`  ${model.name}: Unexpected error - ${error}`)
      results.push({
        modelId: model.id,
        status: 'service_error',
        notes: `Unexpected error: ${error}`,
        testTimestamp: new Date().toISOString()
      })
    }
  }

  // Generate report
  log('\n' + '─'.repeat(70) + '\n', colors.gray)
  logInfo('Generating report...')

  const reporter = new ModelStatusReporter(results)
  const report = reporter.generateReport()

  // Save report
  const outputPath = path.resolve(process.cwd(), args.output)
  fs.writeFileSync(outputPath, report, 'utf-8')
  logSuccess(`Report saved to: ${outputPath}`)

  // Print summary
  log('\n' + '─'.repeat(70) + '\n', colors.gray)
  log('SUMMARY', colors.bright)
  log('─'.repeat(70) + '\n', colors.gray)

  const working = results.filter(r => r.status === 'working').length
  const unreleased = results.filter(r => r.status === 'unreleased').length
  const failed = results.filter(r => r.status !== 'working' && r.status !== 'unreleased').length

  logSuccess(`Working: ${working} (${((working / results.length) * 100).toFixed(1)}%)`)
  logWarning(`Unreleased: ${unreleased} (${((unreleased / results.length) * 100).toFixed(1)}%)`)
  if (failed > 0) {
    logError(`Failed: ${failed} (${((failed / results.length) * 100).toFixed(1)}%)`)
  }

  // Average response time
  const avgTime = results
    .filter(r => r.responseTime !== undefined)
    .reduce((sum, r) => sum + r.responseTime!, 0) / results.filter(r => r.responseTime !== undefined).length
  logInfo(`Average response time: ${avgTime.toFixed(0)}ms`)

  log('\n' + '='.repeat(70) + '\n', colors.bright)
  logSuccess('Testing complete!')
  logInfo(`View full report: ${outputPath}\n`)
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getModelsToTest(args: CLIArgs): ModelInfo[] {
  let models: ModelInfo[] = []

  if (args.provider) {
    // Test specific provider
    models = MODEL_REGISTRY[args.provider] || []
  } else {
    // Test all providers
    models = Object.values(MODEL_REGISTRY).flat()
  }

  if (args.retestFailed) {
    // Filter only models with error status
    models = models.filter(m =>
      m.status &&
      m.status !== 'working' &&
      m.status !== 'untested'
    )
  }

  return models
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

process.on('uncaughtException', (error) => {
  logError(`Uncaught exception: ${error.message}`)
  console.error(error)
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  logError(`Unhandled rejection: ${reason}`)
  console.error(reason)
  process.exit(1)
})

// Run the script
main().catch(error => {
  logError(`Fatal error: ${error.message}`)
  console.error(error)
  process.exit(1)
})

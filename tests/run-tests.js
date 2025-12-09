#!/usr/bin/env node

/**
 * AI Council Test Runner
 * 
 * Master test runner for all AI Council tests.
 * 
 * Usage:
 *   node tests/run-tests.js                    # Run all tests
 *   node tests/run-tests.js features          # Run only feature tests
 *   node tests/run-tests.js response-format   # Run specific test
 */

const fs = require('fs');
const path = require('path');
const { validateTestEnvironment } = require('./helpers/test-utils');

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

class TestRunner {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async runTest(testPath, testName) {
    console.log(`\n${colorize('▶️ ', 'blue')} Running: ${colorize(testName, 'bright')}`);
    console.log(colorize('-'.repeat(60), 'cyan'));
    
    const startTime = Date.now();
    
    try {
      // Import and run the test module
      delete require.cache[require.resolve(testPath)]; // Clear cache
      const testModule = require(testPath);
      
      // Look for main test function (various naming patterns)
      const testFunction = testModule.default || 
                          testModule[`run${testName.replace('-', '')}Tests`] ||
                          testModule[`run${testName}Tests`] ||
                          testModule.runTests ||
                          testModule;

      if (typeof testFunction !== 'function') {
        throw new Error('No runnable test function found in module');
      }

      const result = await testFunction();
      const duration = Date.now() - startTime;
      
      this.results.total++;
      
      if (result === true) {
        this.results.passed++;
        console.log(`${colorize('✅ PASSED', 'green')} (${duration}ms)`);
        this.results.tests.push({ name: testName, status: 'PASSED', duration });
      } else {
        this.results.failed++;
        console.log(`${colorize('❌ FAILED', 'red')} (${duration}ms)`);
        this.results.tests.push({ name: testName, status: 'FAILED', duration });
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.results.total++;
      this.results.failed++;
      
      console.log(`${colorize('💥 ERROR', 'red')} (${duration}ms)`);
      console.log(colorize(`   ${error.message}`, 'red'));
      
      this.results.tests.push({ 
        name: testName, 
        status: 'ERROR', 
        duration, 
        error: error.message 
      });
    }
  }

  async runAllFeatureTests() {
    const featuresDir = path.join(__dirname, 'features');
    
    if (!fs.existsSync(featuresDir)) {
      console.log(colorize('⚠️  Features directory not found', 'yellow'));
      return;
    }

    const testFiles = fs.readdirSync(featuresDir)
      .filter(file => file.endsWith('.test.js'))
      .sort();

    if (testFiles.length === 0) {
      console.log(colorize('⚠️  No feature test files found', 'yellow'));
      return;
    }

    console.log(colorize(`\n🧪 Running ${testFiles.length} Feature Tests`, 'bright'));
    
    for (const file of testFiles) {
      const testPath = path.join(featuresDir, file);
      const testName = file.replace('.test.js', '');
      await this.runTest(testPath, testName);
    }
  }

  async runAllIntegrationTests() {
    const integrationDir = path.join(__dirname, 'integration');
    
    if (!fs.existsSync(integrationDir)) {
      console.log(colorize('⚠️  Integration directory not found', 'yellow'));
      return;
    }

    const testFiles = fs.readdirSync(integrationDir)
      .filter(file => file.endsWith('.test.js'))
      .sort();

    if (testFiles.length === 0) {
      console.log(colorize('⚠️  No integration test files found', 'yellow'));
      return;
    }

    console.log(colorize(`\n🔌 Running ${testFiles.length} Integration Tests`, 'bright'));
    
    for (const file of testFiles) {
      const testPath = path.join(integrationDir, file);
      const testName = file.replace('.test.js', '');
      await this.runTest(testPath, testName);
    }
  }

  async runSpecificTest(testName) {
    // Look for the test in features first, then integration
    const possiblePaths = [
      path.join(__dirname, 'features', `${testName}.test.js`),
      path.join(__dirname, 'integration', `${testName}.test.js`),
    ];

    for (const testPath of possiblePaths) {
      if (fs.existsSync(testPath)) {
        console.log(colorize(`\n🎯 Running Specific Test: ${testName}`, 'bright'));
        await this.runTest(testPath, testName);
        return;
      }
    }

    console.log(colorize(`❌ Test not found: ${testName}`, 'red'));
    console.log('Available tests:');
    this.listAvailableTests();
  }

  listAvailableTests() {
    const dirs = ['features', 'integration'];
    
    dirs.forEach(dir => {
      const dirPath = path.join(__dirname, dir);
      if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath)
          .filter(file => file.endsWith('.test.js'))
          .map(file => file.replace('.test.js', ''));
          
        if (files.length > 0) {
          console.log(colorize(`  ${dir}:`, 'cyan'), files.join(', '));
        }
      }
    });
  }

  printSummary() {
    console.log('\n' + colorize('='.repeat(80), 'cyan'));
    console.log(colorize('🏁 TEST SUMMARY', 'bright'));
    console.log(colorize('='.repeat(80), 'cyan'));
    
    const passRate = this.results.total > 0 ? 
      Math.round((this.results.passed / this.results.total) * 100) : 0;
    
    console.log(`Total Tests: ${colorize(this.results.total.toString(), 'bright')}`);
    console.log(`Passed: ${colorize(this.results.passed.toString(), 'green')}`);
    console.log(`Failed: ${colorize(this.results.failed.toString(), 'red')}`);
    console.log(`Pass Rate: ${colorize(`${passRate}%`, passRate >= 80 ? 'green' : 'red')}`);
    
    if (this.results.tests.length > 0) {
      console.log('\nDetailed Results:');
      this.results.tests.forEach(test => {
        const statusColor = test.status === 'PASSED' ? 'green' : 'red';
        const status = colorize(test.status, statusColor);
        const duration = colorize(`${test.duration}ms`, 'cyan');
        console.log(`  ${status} ${test.name} (${duration})`);
        
        if (test.error) {
          console.log(`       ${colorize(test.error, 'red')}`);
        }
      });
    }
    
    console.log('\n' + colorize('='.repeat(80), 'cyan'));
    
    if (this.results.failed === 0) {
      console.log(colorize('🎉 All tests passed!', 'green'));
    } else {
      console.log(colorize('⚠️  Some tests failed. See details above.', 'yellow'));
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const runner = new TestRunner();
  
  // Print header
  console.log(colorize('🤖 AI Council Test Runner', 'bright'));
  console.log(colorize('Testing AI debate and consensus features', 'cyan'));
  
  // Check environment
  console.log('\n🔧 Checking test environment...');
  const envReady = await validateTestEnvironment();
  if (!envReady) {
    console.log(colorize('❌ Test environment not ready!', 'red'));
    console.log('Make sure the development server is running:');
    console.log(colorize('  npm run dev', 'cyan'));
    process.exit(1);
  }
  console.log(colorize('✅ Environment ready', 'green'));
  
  // Determine what to run
  if (args.length === 0) {
    // Run all tests
    await runner.runAllFeatureTests();
    await runner.runAllIntegrationTests();
  } else if (args[0] === 'features') {
    // Run only feature tests
    await runner.runAllFeatureTests();
  } else if (args[0] === 'integration') {
    // Run only integration tests
    await runner.runAllIntegrationTests();
  } else if (args[0] === 'list') {
    // List available tests
    console.log('\nAvailable tests:');
    runner.listAvailableTests();
    return;
  } else {
    // Run specific test
    await runner.runSpecificTest(args[0]);
  }
  
  // Print summary
  runner.printSummary();
  
  // Exit with appropriate code
  process.exit(runner.results.failed === 0 ? 0 : 1);
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.log(colorize('\n💥 Uncaught Exception:', 'red'));
  console.log(colorize(error.message, 'red'));
  console.log(error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.log(colorize('\n💥 Unhandled Rejection:', 'red'));
  console.log(colorize(reason.toString(), 'red'));
  process.exit(1);
});

// Run main function
if (require.main === module) {
  main().catch(error => {
    console.error(colorize('Test runner failed:', 'red'), error);
    process.exit(1);
  });
}

module.exports = { TestRunner };
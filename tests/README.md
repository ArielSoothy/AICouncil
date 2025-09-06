# AI Council Testing Framework

Comprehensive testing structure for the AI Council multi-agent debate platform.

## 📁 Directory Structure

```
tests/
├── features/       # Feature-specific tests
├── integration/    # API endpoint tests
├── e2e/           # End-to-end workflow tests
├── ui/            # UI component tests (migrated test pages)
├── helpers/       # Test utilities and common functions
├── fixtures/      # Mock data and test datasets
└── README.md      # This file
```

## 🧪 Test Categories

### Features Tests (`/features/`)
Individual feature testing modules:
- `response-format.test.js` - Response preview format consistency
- `round-tabs.test.js` - Multi-round tab creation and display
- `agent-debate.test.js` - Agent debate mechanics
- `web-search.test.js` - Web search integration
- `consensus.test.js` - Multi-model consensus functionality

### Integration Tests (`/integration/`)
API endpoint and data flow tests:
- `debate-stream.test.js` - Streaming debate API
- `consensus-api.test.js` - Consensus generation API
- `model-providers.test.js` - AI provider integration

### End-to-End Tests (`/e2e/`)
Complete workflow tests:
- `full-debate-workflow.test.js` - Complete debate from start to finish
- `multi-round-debate.test.js` - Multi-round debate scenarios
- `comparison-modes.test.js` - Single vs multi-model comparisons

### UI Tests (`/ui/`)
Migrated test pages for manual testing:
- `benchmark/` - Performance benchmarking
- `memory/` - Memory system testing  
- `accuracy/` - Real-world accuracy testing

### Helpers (`/helpers/`)
Common test utilities:
- `api-client.js` - HTTP client for testing APIs
- `mock-responses.js` - Mock AI provider responses
- `test-data.js` - Common test datasets
- `assertions.js` - Custom test assertions

### Fixtures (`/fixtures/`)
Test data and mock responses:
- `agent-responses/` - Sample agent responses
- `debate-scenarios/` - Test debate scenarios
- `model-configs/` - Test model configurations

## 🚀 Running Tests

### Run All Tests
```bash
npm run test
```

### Run Specific Test Categories
```bash
# Feature tests only
npm run test:features

# Integration tests only  
npm run test:integration

# End-to-end tests only
npm run test:e2e
```

### Run Individual Tests
```bash
# Test specific feature
node tests/features/response-format.test.js

# Test specific integration
node tests/integration/debate-stream.test.js
```

## 📊 Test Coverage

Tests should cover:
- ✅ Response format consistency
- ✅ Multi-round debate mechanics
- ✅ Agent persona behavior
- ✅ API endpoint functionality
- ✅ Error handling and fallbacks
- ✅ Performance benchmarks
- ✅ Memory system functionality

## 🛠️ Writing New Tests

### Feature Test Template
```javascript
const { testFeature } = require('../helpers/api-client');

async function testMyFeature() {
  console.log('🧪 Testing My Feature...');
  
  // Test implementation
  const result = await testFeature();
  
  console.log(result.success ? '✅ PASSED' : '❌ FAILED');
}

module.exports = testMyFeature;
```

### Integration Test Template  
```javascript
const { callAPI } = require('../helpers/api-client');

async function testMyAPI() {
  console.log('🔌 Testing My API...');
  
  // API test implementation
  const response = await callAPI('/api/my-endpoint');
  
  console.log(response.ok ? '✅ API WORKING' : '❌ API FAILED');
}

module.exports = testMyAPI;
```

## 🏗️ Migration Status

### Migrated Test Files
- [x] `test-simple.js` → `features/response-format.test.js`
- [x] `test-fixes.js` → `integration/debate-stream.test.js`
- [ ] Shell scripts → Integration tests
- [ ] Test pages → UI tests

### Legacy Test Files
Located in project root, will be gradually migrated:
- `test-web-search.sh`
- `test-all-features.sh`
- `test-debate-fix.sh`
- And others...

## 🔧 Configuration

Tests use:
- **Node.js** - Runtime environment
- **Fetch API** - HTTP requests
- **Custom assertions** - Test validation
- **JSON fixtures** - Test data
- **Live API endpoints** - Integration testing

## 📝 Best Practices

1. **Descriptive Names**: Use clear, descriptive test file names
2. **Isolated Tests**: Each test should be independent
3. **Mock Data**: Use fixtures for consistent test data
4. **Error Handling**: Test both success and failure scenarios
5. **Documentation**: Comment complex test logic
6. **Performance**: Consider test execution time
7. **Cleanup**: Clean up test artifacts

---

*This testing framework ensures reliable, maintainable testing for the AI Council platform.*